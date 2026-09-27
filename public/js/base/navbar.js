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
    <div id="navbar-informations">
        <div id="navbar-info-toggle" class="navbar-item navbar-item-parent" role="button" tabindex="0"
            aria-expanded="false" aria-controls="navbar-info-panel">
            <span class="navbar-item-icon">${utils.icons.book}</span>
            <div class="navbar-item-text">
                <span>${i18n.t("navbar.info")}</span>
                <span class="navbar-item-caret" aria-hidden="true">›</span>
            </div>
        </div>
        <div id="navbar-info-panel" hidden>
            <div id="navbar-information-1" class="navbar-information"></div>
            <div id="navbar-information-version" class="navbar-information">
                <div class="navbar-runtime-information">
                    <span>${i18n.t("navbar.currentVersion")}: ${version}</span>
                    ${electronPort ? `<span class="navbar-local-port">${i18n.t("navbar.localPort")}: ${electronPort}</span>` : ""}
                </div>
                <button
                    id="navbar-changelog-button"
                    type="button"
                    title="${i18n.t("navbar.openChangelog")}"
                    aria-label="${i18n.t("navbar.openChangelog")}"
                >
                    ${utils.icons.book}
                </button>
            </div>
            <div id="navbar-update-status" class="navbar-information" hidden aria-live="polite">
                <div class="navbar-update-label">
                    <span id="navbar-update-text"></span>
                    <span id="navbar-update-percent"></span>
                </div>
                <progress id="navbar-update-progress" max="100" value="0"></progress>
            </div>
        </div>
    </div>
`;

document.dispatchEvent(new CustomEvent("projectbuilder:navbar-ready"));

document.getElementById("navbar-changelog-button").addEventListener(
    "click",
    () => {
        setSettingsExpanded(false);
        setInfoExpanded(false);
        window.dispatchEvent(new CustomEvent("projectbuilder:close-navigation"));
        router.navigate("/changelog");
    }
);

const updateStatusElement = document.getElementById("navbar-update-status");
const updateTextElement = document.getElementById("navbar-update-text");
const updatePercentElement = document.getElementById("navbar-update-percent");
const updateProgressElement = document.getElementById("navbar-update-progress");

function renderUpdateStatus(status = {}) {
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
        setInfoExpanded(false);
        window.dispatchEvent(new CustomEvent("projectbuilder:close-navigation"));
        // Prüfen, ob in data-vie etwas liegt und rendern
        const view = item.dataset.view;
        router.navigate(`/${view}`);
    });
});

const settingsParent = document.querySelector("[data-nav-toggle=\"settings\"]");
const settingsSubmenu = document.getElementById("navbar-settings-submenu");
const infoToggle = document.getElementById("navbar-info-toggle");
const infoPanel = document.getElementById("navbar-info-panel");

function setSettingsExpanded(expanded) {
    settingsSubmenu.hidden = !expanded;
    settingsParent?.classList.toggle("is-expanded", expanded);
    settingsParent?.setAttribute("aria-expanded", String(expanded));
}

settingsParent?.addEventListener("click", event => {
    if (event.target.closest("[data-view]")) return;
    setInfoExpanded(false);
    setSettingsExpanded(settingsSubmenu.hidden);
});

settingsParent?.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSettingsExpanded(settingsSubmenu.hidden);
});

function setInfoExpanded(expanded) {
    infoPanel.hidden = !expanded;
    infoToggle?.classList.toggle("is-expanded", expanded);
    infoToggle?.setAttribute("aria-expanded", String(expanded));
}

infoToggle?.addEventListener("click", () => {
    setSettingsExpanded(false);
    setInfoExpanded(infoPanel.hidden);
});

infoToggle?.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setInfoExpanded(infoPanel.hidden);
});

document.getElementById("global-search-input")?.addEventListener("focus", () => {
    setSettingsExpanded(false);
    setInfoExpanded(false);
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
        setInfoExpanded(false);
        setSettingsExpanded(false);
}
