import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");
import * as utils from "../utils/icons.js";
import * as router from "../router.js";

const navbar = document.getElementById('navbar');
const versionResponse = await fetch("/api/version");
const { version } = versionResponse.ok
    ? await versionResponse.json()
    : { version: "unbekannt" };

navbar.innerHTML = `
    <div class="searchBox">
        <input
        type="text"
        placeholder="${i18n.t("navbar.search")}..."
        >
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
        </div>
    </div>
    <div id="navbar-informations">
        <div id="navbar-information-1" class="navbar-information">
        </div>
        <div id="navbar-information-version" class="navbar-information">
            <span>Aktuelle Version: ${version}</span>
            <button
                id="navbar-changelog-button"
                type="button"
                title="Changelog öffnen"
                aria-label="Changelog öffnen"
            >
                ${utils.icons.book}
            </button>
        </div>
    </div>
`;

document.getElementById("navbar-changelog-button").addEventListener(
    "click",
    () => router.navigate("/changelog")
);

// Clickhandler
const navbarItems = document.querySelectorAll(".navbar-item");
navbarItems.forEach(item => {
    item.addEventListener("click", () => {
        // Prüfen, ob in data-vie etwas liegt und rendern
        const view = item.dataset.view;
        router.navigate(`/${view}`);
    });
});

export function setItemsActive(dataView) {
        // active von allen entfernen
        navbarItems.forEach(i => {
            i.classList.remove("active");
        });

        // Item active setzen
        const item = document.querySelector(`[data-view="${dataView}"]`);
        item?.classList.add("active");
}
