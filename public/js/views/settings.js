import * as i18n from "../utils/i18n.js";
import { showAlert } from "../utils/modal.js";

await i18n.loadLanguage();

const view = document.getElementById("view");

async function renderView() {
    const response = await fetch("/api/settings");
    const settings = response.ok ? await response.json() : {};
    const preferredPort = settings["app.preferredPort"] ?? "0";
    const openInBrowser = settings["app.openInBrowser"] === "true";

    view.innerHTML = `
        <div class="view-header">${i18n.t("settings.title")}</div>
        <div class="view-left"></div>
        <main class="view-content settings-content">
            <section class="settings-card">
                <h2>${i18n.t("settings.application")}</h2>
                <label class="settings-field">
                    <span>${i18n.t("settings.preferredPort")}</span>
                    <input id="settings-preferred-port" type="number" min="0" max="65535"
                        step="1" value="${escapeAttribute(preferredPort)}">
                    <small>${i18n.t("settings.portHint")}</small>
                    <small class="settings-current-port">${i18n.t("settings.currentPort").replace("{port}", window.location.port)}</small>
                </label>
                <label class="settings-checkbox">
                    <input id="settings-open-in-browser" type="checkbox" ${openInBrowser ? "checked" : ""}>
                    <span>${i18n.t("settings.openInBrowser")}</span>
                </label>
                <p>${i18n.t("settings.browserHint")}</p>
                <p class="settings-restart-hint">${i18n.t("settings.restartHint")}</p>
                <button id="save-app-settings" class="settings-primary" type="button">
                    ${i18n.t("settings.save")}
                </button>
            </section>
        </main>
        <div class="view-right"></div>
    `;

    document.getElementById("save-app-settings").addEventListener("click", saveSettings);
}

async function saveSettings() {
    const portInput = document.getElementById("settings-preferred-port");
    const port = Number(portInput.value);
    if (!Number.isInteger(port) || (port !== 0 && (port < 1024 || port > 65535))) {
        await showAlert(i18n.t("settings.invalidPort"));
        portInput.focus();
        return;
    }

    const values = {
        "app.preferredPort": String(port),
        "app.openInBrowser": String(document.getElementById("settings-open-in-browser").checked)
    };
    try {
        const responses = await Promise.all(Object.entries(values).map(([key, value]) =>
            fetch(`/api/settings/${encodeURIComponent(key)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value })
            })
        ));
        if (responses.some(item => !item.ok)) throw new Error();
        await showAlert(i18n.t("settings.saved"));
    } catch {
        await showAlert(i18n.t("settings.saveFailed"));
    }
}

function escapeAttribute(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}

export { renderView };
