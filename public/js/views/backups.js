import * as i18n from "../utils/i18n.js";
import { showAlert, showConfirm } from "../utils/modal.js";

await i18n.loadLanguage();

const view = document.getElementById("view");
let selectedRestoreFile = null;
let inspectedBackup = null;

function sectionOptions(prefix, values = {}, disabled = {}) {
    return ["articles", "customers", "projects"].map(section => `
        <label class="backup-option${disabled[section] ? " backup-option-disabled" : ""}">
            <input
                type="checkbox"
                id="${prefix}-${section}"
                ${values[section] ? "checked" : ""}
                ${disabled[section] ? "disabled" : ""}
            >
            ${i18n.t(`backups.${section}`)}
        </label>
    `).join("");
}

async function renderView() {
    const response = await fetch("/api/backups/settings");
    const settings = await response.json();

    view.innerHTML = `
        <div class="view-header backup-view-header">
            ${i18n.t("backups.title")}
        </div>
        <div class="view-left"></div>
        <main class="view-content backup-content">
            <section class="backup-card">
                <h2>${i18n.t("backups.manualTitle")}</h2>
                <p>${i18n.t("backups.manualDescription")}</p>
                <div class="backup-options">
                    ${sectionOptions("manual", { articles: true, customers: true, projects: true })}
                </div>
                <p class="backup-dependency-note">${i18n.t("backups.dependencyNote")}</p>
                <button id="create-manual-backup" class="backup-primary" type="button">
                    ${i18n.t("backups.create")}
                </button>
            </section>

            <section class="backup-card">
                <h2>${i18n.t("backups.automaticTitle")}</h2>
                <label class="backup-switch-row">
                    <input id="automatic-enabled" type="checkbox" ${settings.enabled ? "checked" : ""}>
                    ${i18n.t("backups.automaticEnabled")}
                </label>
                <div class="backup-form-grid">
                    <label>
                        <span>${i18n.t("backups.frequency")}</span>
                        <select id="automatic-frequency">
                            <option value="daily" ${settings.frequency === "daily" ? "selected" : ""}>${i18n.t("backups.daily")}</option>
                            <option value="weekly" ${settings.frequency === "weekly" ? "selected" : ""}>${i18n.t("backups.weekly")}</option>
                            <option value="monthly" ${settings.frequency === "monthly" ? "selected" : ""}>${i18n.t("backups.monthly")}</option>
                        </select>
                    </label>
                    <label class="backup-directory-field">
                        <span>${i18n.t("backups.directory")}</span>
                        <div>
                            <input id="automatic-directory" type="text" value="${escapeAttribute(settings.directory)}">
                            <button id="choose-backup-directory" type="button">${i18n.t("backups.choose")}</button>
                        </div>
                    </label>
                </div>
                <div class="backup-options">
                    ${sectionOptions("automatic", settings.selection)}
                </div>
                <div class="backup-status-grid">
                    <span>${i18n.t("backups.lastBackup")}</span>
                    <strong>${formatDate(settings.lastRunAt)}</strong>
                    <span>${i18n.t("backups.nextBackup")}</span>
                    <strong>${formatDate(settings.nextRunAt)}</strong>
                    <span>${i18n.t("backups.retention")}</span>
                    <strong>${settings.retention}</strong>
                </div>
                ${settings.lastError ? `<p class="backup-error">${escapeHtml(settings.lastError)}</p>` : ""}
                <div class="backup-actions">
                    <button id="save-automatic-settings" class="backup-primary" type="button">${i18n.t("backups.saveSettings")}</button>
                    <button id="run-automatic-backup" type="button">${i18n.t("backups.runNow")}</button>
                </div>
            </section>

            <section class="backup-card">
                <h2>${i18n.t("backups.restoreTitle")}</h2>
                <p>${i18n.t("backups.restoreDescription")}</p>
                <button id="select-restore-file" type="button">${i18n.t("backups.selectFile")}</button>
                <input id="restore-file" type="file" accept=".pbbackup,application/json" hidden>
                <div id="restore-preview" class="backup-restore-preview" hidden></div>
            </section>
        </main>
        <div class="view-right"></div>
    `;

    registerHandlers();
}

function registerHandlers() {
    document.getElementById("create-manual-backup").addEventListener("click", createManualBackup);
    document.getElementById("choose-backup-directory").addEventListener("click", chooseBackupDirectory);
    document.getElementById("save-automatic-settings").addEventListener(
        "click",
        () => saveAutomaticSettings()
    );
    document.getElementById("run-automatic-backup").addEventListener("click", runAutomaticBackup);

    const fileInput = document.getElementById("restore-file");
    document.getElementById("select-restore-file").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => inspectRestoreFile(fileInput.files[0]));
}

function readSelection(prefix) {
    return Object.fromEntries(
        ["articles", "customers", "projects"].map(section => [
            section,
            document.getElementById(`${prefix}-${section}`)?.checked === true
        ])
    );
}

function hasSelection(selection) {
    return Object.values(selection).some(Boolean);
}

async function createManualBackup() {
    const selection = readSelection("manual");
    if (!hasSelection(selection)) {
        await showAlert(i18n.t("backups.selectOne"));
        return;
    }

    const response = await fetch("/api/backups/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection })
    });
    if (!response.ok) {
        const result = await response.json();
        await showAlert(result.error || i18n.t("backups.createFailed"));
        return;
    }

    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "ProjectBuilder-Backup.pbbackup";
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

async function chooseBackupDirectory() {
    if (!window.projectBuilder?.selectBackupDirectory) {
        await showAlert(i18n.t("backups.directoryDialogUnavailable"));
        return;
    }
    const input = document.getElementById("automatic-directory");
    const directory = await window.projectBuilder.selectBackupDirectory(input.value);
    if (directory) input.value = directory;
}

async function saveAutomaticSettings({ showSuccess = true, refresh = true } = {}) {
    const selection = readSelection("automatic");
    if (!hasSelection(selection)) {
        await showAlert(i18n.t("backups.selectOne"));
        return false;
    }
    const response = await fetch("/api/backups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            enabled: document.getElementById("automatic-enabled").checked,
            frequency: document.getElementById("automatic-frequency").value,
            directory: document.getElementById("automatic-directory").value,
            selection
        })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        await showAlert(result.error || i18n.t("backups.settingsFailed"));
        return false;
    }
    if (showSuccess) await showAlert(i18n.t("backups.settingsSaved"));
    if (refresh) await renderView();
    return true;
}

async function runAutomaticBackup() {
    const enabled = document.getElementById("automatic-enabled").checked;
    if (!enabled) {
        await showAlert(i18n.t("backups.enableBeforeRun"));
        return;
    }
    const saved = await saveAutomaticSettings({ showSuccess: false, refresh: false });
    if (!saved) return;
    const response = await fetch("/api/backups/automatic/run", { method: "POST" });
    const result = await response.json();
    await showAlert(
        response.ok && result.success
            ? i18n.t("backups.createdSuccessfully")
            : result.error || i18n.t("backups.createFailed")
    );
    await renderView();
}

async function inspectRestoreFile(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/backups/inspect", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok || !result.success) {
        selectedRestoreFile = null;
        inspectedBackup = null;
        await showAlert(result.error || i18n.t("backups.invalidFile"));
        return;
    }
    selectedRestoreFile = file;
    inspectedBackup = result.backup;
    renderRestorePreview();
}

function renderRestorePreview() {
    const preview = document.getElementById("restore-preview");
    preview.hidden = false;
    preview.innerHTML = `
        <dl>
            <dt>${i18n.t("backups.file")}</dt><dd>${escapeHtml(selectedRestoreFile.name)}</dd>
            <dt>${i18n.t("backups.createdAt")}</dt><dd>${formatDate(inspectedBackup.createdAt)}</dd>
        </dl>
        <div class="backup-options">
            ${sectionOptions("restore", inspectedBackup.available, Object.fromEntries(
                Object.entries(inspectedBackup.available).map(([key, value]) => [key, !value])
            ))}
        </div>
        <div class="backup-counts">
            ${["articles", "customers", "projects"].filter(section => inspectedBackup.available[section]).map(section => `
                <span>${i18n.t(`backups.${section}`)}: <strong>${inspectedBackup.counts[section]}</strong></span>
            `).join("")}
        </div>
        <p class="backup-warning">${i18n.t("backups.restoreWarning")}</p>
        <button id="restore-backup" class="backup-danger" type="button">${i18n.t("backups.restore")}</button>
    `;
    document.getElementById("restore-backup").addEventListener("click", restoreBackup);
}

async function restoreBackup() {
    const selection = readSelection("restore");
    if (!hasSelection(selection)) {
        await showAlert(i18n.t("backups.selectOne"));
        return;
    }
    const confirmed = await showConfirm(i18n.t("backups.restoreConfirm"), {
        title: i18n.t("backups.restoreTitle"),
        confirmText: i18n.t("backups.restore"),
        danger: true
    });
    if (!confirmed) return;

    const formData = new FormData();
    formData.append("file", selectedRestoreFile);
    formData.append("selection", JSON.stringify(selection));
    const response = await fetch("/api/backups/restore", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok || !result.success) {
        await showAlert(result.error || i18n.t("backups.restoreFailed"));
        return;
    }
    await showAlert(i18n.t("backups.restoreSuccessful"));
    await renderView();
}

function formatDate(value) {
    if (!value) return i18n.t("backups.never");
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? i18n.t("backups.never")
        : new Intl.DateTimeFormat(i18n.getCurrentLanguage(), {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

export { renderView };
