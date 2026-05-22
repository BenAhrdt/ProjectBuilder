import { loadLanguage, t } from "./i18n.js";
await loadLanguage("de");
import { icons } from "./icons.js";
import { renderCustomersView } from "./customers.js";
import { renderArticlesView } from "./articles.js";

const renderfunction = {
    "customers": renderCustomersView,
    "articles": renderArticlesView
};
const navbar = document.getElementById('navbar');

navbar.innerHTML = `
    <div class="searchBox">
        <input
        type="text"
        placeholder="${t("navbar.search")}..."
        >
    </div>
    <div id="navbar-item-range">
        <div id="navbar-item-group-1" class="navbar-item-group">
            <div data-view="customers" class="navbar-item active">
                <span class="navbar-item-icon">${icons.user}</span>
                <div class="navbar-item-text">${t("navbar.customers")}</div>
            </div>
            <div data-view="articles" class="navbar-item ">
                <span class="navbar-item-icon">${icons.article}</span>
                <div class="navbar-item-text">${t("navbar.article")}</div>
            </div>
        </div>
    </div>
    <div id="navbar-informations">
        <div id="navbar-information-version" class="navbar-information">
            Version: 1.0.0
        </div>
    </div>
`;

// Clickhandler
const navbarItems = document.querySelectorAll(".navbar-item");
navbarItems.forEach(item => {
    item.addEventListener("click", () => {

        // active von allen entfernen
        navbarItems.forEach(i => {
            i.classList.remove("active");
        });

        // active auf geklicktes Element
        item.classList.add("active");

        // Prüfen, ob in data-vie etwas liegt und rendern
        const view = item.dataset.view;
        if(renderfunction[view]) {
            renderfunction[view]();
        }
    });
});