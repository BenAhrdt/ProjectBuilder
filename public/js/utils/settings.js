const values = new Map();
let loaded = false;

export async function load() {
    if (loaded) return;

    const response = await fetch("/api/settings");
    if (!response.ok) throw new Error("Einstellungen konnten nicht geladen werden");

    const storedValues = await response.json();

    for (const [key, value] of Object.entries(storedValues)) {
        values.set(key, value);
    }

    migrateLocalStorage();
    loaded = true;
}

export function getItem(key) {
    return values.has(key) ? values.get(key) : null;
}

export function setItem(key, value) {
    const stringValue = String(value);
    values.set(key, stringValue);

    fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: stringValue })
    }).then(response => {
        if (!response.ok) throw new Error(`Einstellung ${key} konnte nicht gespeichert werden`);
    }).catch(error => console.error(error));
}

function migrateLocalStorage() {
    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);

        if (!key?.startsWith("projectBuilder.") || values.has(key)) continue;

        const value = localStorage.getItem(key);
        if (value !== null) setItem(key, value);
    }
}
