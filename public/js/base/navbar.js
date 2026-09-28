import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage();
import * as utils from "../utils/icons.js";
import * as router from "../router.js";

const navbar = document.getElementById('navbar');
const versionResponse = await fetch("/api/version");
const { version } = versionResponse.ok
    ? await versionResponse.json()
    : { version: i18n.t("navbar.unknownVersion") };
const electronPort = window.projectBuilder ? window.location.port : null;
const websiteHost = i18n.getCurrentLanguage() === "de"
    ? "www.janitza.de"
    : "www.janitza.com";

navbar.innerHTML = `
    <div class="navbar-global-search global-search">
        <label class="global-search-label" for="global-search-input">${i18n.t("search.label")}</label>
        <div class="global-search-control">
            <span class="global-search-icon" aria-hidden="true">⌕</span>
            <input id="global-search-input" type="search"
                placeholder="${i18n.t("search.sidebarPlaceholder")}" autocomplete="off"
                aria-autocomplete="list" aria-controls="global-search-results">
            <kbd>${i18n.t("search.shortcut")}</kbd>
        </div>
        <div id="global-search-results" class="global-search-results" role="listbox" hidden></div>
    </div>
    <div id="navbar-item-range">
        <div id="navbar-item-group-1" class="navbar-item-group">
            <div data-view="customers" class="navbar-item">
                <span class="navbar-item-icon">${utils.icons.user}</span>
                <div class="navbar-item-text">${i18n.t("navbar.customers")}</div>
            </div>
            <div data-view="articles" class="navbar-item ">
                <span class="navbar-item-icon">${utils.icons.article}</span>
                <div class="navbar-item-text">${i18n.t("navbar.article")}</div>
            </div>
            <div data-view="projects" class="navbar-item ">
                <span class="navbar-item-icon">${utils.icons.projects}</span>
                <div class="navbar-item-text">${i18n.t("navbar.projects")}</div>
            </div>
        </div>
        <div id="navbar-item-group-3" class="navbar-item-group">
            <div id="navbar-import-pricelist" data-view="importPricelist" class="navbar-item">
                <span class="navbar-item-icon">${utils.icons.excel}</span>
                <div class="navbar-item-text">${i18n.t("navbar.importPricelist")}</div>
            </div>
            <div id="navbar-settings" class="navbar-item navbar-item-parent" data-nav-toggle="settings"
                role="button" tabindex="0" aria-expanded="false" aria-controls="navbar-settings-submenu">
                <span class="navbar-item-icon">${utils.icons.settings}</span>
                <div class="navbar-item-text">
                    <span>${i18n.t("navbar.settings")}</span>
                    <span class="navbar-item-caret" aria-hidden="true">›</span>
                </div>
                <div id="navbar-settings-submenu" class="navbar-submenu" hidden>
                    <div id="navbar-backups" data-view="backups" class="navbar-item navbar-subitem">
                        <span class="navbar-item-icon">${utils.icons.backup}</span>
                        <div class="navbar-item-text">${i18n.t("navbar.backups")}</div>
                    </div>
                    <div id="navbar-appearance" data-view="settings" class="navbar-item navbar-subitem">
                        <span class="navbar-item-icon">${utils.icons.settings}</span>
                        <div class="navbar-item-text">${i18n.t("navbar.appearance")}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

const appFooter = document.getElementById("app-footer");
if (appFooter) {
    appFooter.innerHTML = `
        <div class="app-footer-spacer" aria-hidden="true"></div>
        <a class="app-footer-website" href="https://${websiteHost}/" target="_blank" rel="noreferrer">
            ${websiteHost}
        </a>
        <div class="app-footer-meta">
            <button
                id="app-footer-changelog-button"
                type="button"
                title="${i18n.t("navbar.openChangelog")}"
                aria-label="${i18n.t("navbar.openChangelog")}"
            >
                ${i18n.t("changelog.title")}
            </button>
            <span class="app-footer-version">${i18n.t("navbar.currentVersion")}: ${version}</span>
            ${electronPort ? `<span class="app-footer-local-port">${i18n.t("navbar.localPort")}: ${electronPort}</span>` : ""}
            <div id="app-footer-update-status" hidden aria-live="polite">
                <div class="app-footer-update-label">
                    <span id="app-footer-update-text"></span>
                    <span id="app-footer-update-percent"></span>
                </div>
                <progress id="app-footer-update-progress" max="100" value="0"></progress>
            </div>
        </div>
    `;
}

document.dispatchEvent(new CustomEvent("projectbuilder:navbar-ready"));

document.getElementById("app-footer-changelog-button")?.addEventListener(
    "click",
    () => {
        setSettingsExpanded(false);
        window.dispatchEvent(new CustomEvent("projectbuilder:close-navigation"));
        router.navigate("/changelog");
    }
);

const updateStatusElement = document.getElementById("app-footer-update-status");
const updateTextElement = document.getElementById("app-footer-update-text");
const updatePercentElement = document.getElementById("app-footer-update-percent");
const updateProgressElement = document.getElementById("app-footer-update-progress");

function renderUpdateStatus(status = {}) {
    if (!updateStatusElement || !updateTextElement || !updatePercentElement || !updateProgressElement) return;
    if (!status.state || status.state === "idle") {
        updateStatusElement.hidden = true;
        return;
    }

    const labels = {
        downloading: "navbar.updateDownloading",
        ready: "navbar.updateReady",
        error: "navbar.updateError"
    };
    const progressVisible = status.state === "downloading" || status.state === "ready";
    const percent = Math.round(Number(status.percent) || 0);

    updateStatusElement.hidden = false;
    updateStatusElement.dataset.state = status.state;
    updateStatusElement.title = status.error || "";
    updateTextElement.textContent = i18n.t(labels[status.state] || "navbar.updatePreparing");
    updatePercentElement.textContent = progressVisible ? `${percent} %` : "";
    updateProgressElement.hidden = !progressVisible;
    updateProgressElement.value = percent;
}

if (window.projectBuilder?.onUpdateStatus) {
    window.projectBuilder.onUpdateStatus(renderUpdateStatus);
    window.projectBuilder.getUpdateStatus?.().then(renderUpdateStatus).catch(() => {});
}

// Clickhandler
const navbarItems = document.querySelectorAll(".navbar-item[data-view]");
navbarItems.forEach(item => {
    item.addEventListener("click", () => {
        setSettingsExpanded(false);
        window.dispatchEvent(new CustomEvent("projectbuilder:close-navigation"));
        // Prüfen, ob in data-vie etwas liegt und rendern
        const view = item.dataset.view;
        router.navigate(`/${view}`);
    });
});

const settingsParent = document.querySelector("[data-nav-toggle=\"settings\"]");
const settingsSubmenu = document.getElementById("navbar-settings-submenu");

function setSettingsExpanded(expanded) {
    settingsSubmenu.hidden = !expanded;
    settingsParent?.classList.toggle("is-expanded", expanded);
    settingsParent?.setAttribute("aria-expanded", String(expanded));
}

settingsParent?.addEventListener("click", event => {
    if (event.target.closest("[data-view]")) return;
    setSettingsExpanded(settingsSubmenu.hidden);
});

settingsParent?.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSettingsExpanded(settingsSubmenu.hidden);
});

document.getElementById("global-search-input")?.addEventListener("focus", () => {
    setSettingsExpanded(false);
});

export function setItemsActive(dataView) {
        settingsParent?.classList.remove("active");
        // active von allen entfernen
        navbarItems.forEach(i => {
            i.classList.remove("active");
        });

        // Item active setzen
        const item = document.querySelector(`[data-view="${dataView}"]`);
        item?.classList.add("active");

        const settingsView = dataView === "settings" || dataView === "backups";
        settingsParent?.classList.toggle("active", settingsView);
        setSettingsExpanded(false);
}
