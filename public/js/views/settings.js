import * as i18n from "../utils/i18n.js";
import { showAlert, showConfirm, showPrompt } from "../utils/modal.js";

await i18n.loadLanguage();

const view = document.getElementById("view");

async function renderView() {
    const [settingsResponse, databaseResponse] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/database/profiles", { cache: "no-store" })
    ]);
    const settings = settingsResponse.ok ? await settingsResponse.json() : {};
    const databaseProfiles = databaseResponse.ok
        ? await databaseResponse.json()
        : { activeProfileId: null, profiles: [] };
    const preferredPort = settings["app.preferredPort"] ?? "0";
    const openInBrowser = settings["app.openInBrowser"] === "true";

    view.innerHTML = `
        <div class="view-header">${i18n.t("settings.title")}</div>
        <div class="view-left"></div>
        <main class="view-content settings-content">
            <section class="settings-card settings-database-card">
                <h2>${i18n.t("settings.databases")}</h2>
                <p>${i18n.t("settings.databasesHint")}</p>
                <div class="settings-database-list">
                    ${databaseProfiles.profiles.length === 0
                        ? `<p>${i18n.t("settings.databaseLoadFailed")}</p>`
                        : databaseProfiles.profiles.map(profile => `
                            <div class="settings-database-row${profile.active ? " is-active" : ""}">
                                <div class="settings-database-name">
                                    <strong>${escapeHtml(profile.name)}</strong>
                                    ${profile.active
                                        ? `<span class="settings-database-active">${i18n.t("settings.databaseActive")}</span>`
                                        : ""}
                                </div>
                                <div class="settings-database-actions">
                                    ${profile.active
                                        ? `<button id="save-database-as" class="settings-secondary" type="button">
                                            ${i18n.t("settings.saveDatabaseAs")}
                                        </button>`
                                        : `
                                            <button
                                                class="settings-secondary database-switch-button"
                                                type="button"
                                                data-profile-id="${escapeAttribute(profile.id)}"
                                            >${i18n.t("settings.switchDatabase")}</button>
                                            ${profile.id !== "default" ? `
                                                <button
                                                    class="settings-danger database-delete-button"
                                                    type="button"
                                                    data-profile-id="${escapeAttribute(profile.id)}"
                                                    data-profile-name="${escapeAttribute(profile.name)}"
                                                >${i18n.t("settings.deleteDatabase")}</button>
                                            ` : ""}
                                        `}
                                </div>
                            </div>
                        `).join("")}
                </div>
                <button id="create-database-profile" class="settings-primary" type="button">
                    ${i18n.t("settings.newDatabase")}
                </button>
            </section>
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
    registerDatabaseProfileActions();
}

function registerDatabaseProfileActions() {
    document.getElementById("save-database-as")?.addEventListener("click", async event => {
        const button = event.currentTarget;
        const name = await showPrompt(i18n.t("settings.databaseCopyNamePrompt"), {
            title: i18n.t("settings.saveDatabaseAs"),
            placeholder: i18n.t("settings.databaseNamePlaceholder")
        });
        if (name === null) return;

        button.disabled = true;
        try {
            const response = await fetch("/api/database/profiles/copy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || i18n.t("settings.databaseCopyFailed"));
            await renderView();
        } catch (error) {
            button.disabled = false;
            await showAlert(error.message || i18n.t("settings.databaseCopyFailed"));
        }
    });

    document.getElementById("create-database-profile")?.addEventListener("click", async event => {
        const button = event.currentTarget;
        const name = await showPrompt(i18n.t("settings.databaseNamePrompt"), {
            title: i18n.t("settings.newDatabase"),
            placeholder: i18n.t("settings.databaseNamePlaceholder")
        });
        if (name === null) return;

        button.disabled = true;
        try {
            const response = await fetch("/api/database/profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || i18n.t("settings.databaseSwitchFailed"));
            await renderView();
        } catch (error) {
            button.disabled = false;
            await showAlert(error.message || i18n.t("settings.databaseSwitchFailed"));
        }
    });

    document.querySelectorAll(".database-switch-button").forEach(button => {
        button.addEventListener("click", async event => {
            const clickedButton = event.currentTarget;
            document.querySelectorAll(".database-switch-button, #create-database-profile")
                .forEach(element => { element.disabled = true; });
            try {
                const response = await fetch("/api/database/active", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profileId: clickedButton.dataset.profileId })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || i18n.t("settings.databaseSwitchFailed"));
                window.location.reload();
            } catch (error) {
                document.querySelectorAll(".database-switch-button, #create-database-profile")
                    .forEach(element => { element.disabled = false; });
                document.querySelector(".settings-database-row.is-active .database-switch-button")
                    ?.setAttribute("disabled", "disabled");
                await showAlert(error.message || i18n.t("settings.databaseSwitchFailed"));
            }
        });
    });

    document.querySelectorAll(".database-delete-button").forEach(button => {
        button.addEventListener("click", async event => {
            const clickedButton = event.currentTarget;
            const profileName = clickedButton.dataset.profileName || "";
            const confirmed = await showConfirm(
                i18n.t("settings.deleteDatabaseConfirm").replace("{name}", profileName),
                {
                    title: i18n.t("settings.deleteDatabase"),
                    confirmText: i18n.t("settings.deleteDatabase"),
                    danger: true
                }
            );
            if (!confirmed) return;

            clickedButton.disabled = true;
            try {
                const response = await fetch(
                    `/api/database/profiles/${encodeURIComponent(clickedButton.dataset.profileId)}`,
                    { method: "DELETE" }
                );
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || i18n.t("settings.deleteDatabaseFailed"));
                }
                await renderView();
            } catch (error) {
                clickedButton.disabled = false;
                await showAlert(error.message || i18n.t("settings.deleteDatabaseFailed"));
            }
        });
    });
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

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}

export { renderView };
