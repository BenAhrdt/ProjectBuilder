import { loadLanguage, t } from "./i18n.js"
await loadLanguage("de")
import { icons } from "./icons.js"

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
            <div id="customers" class="navbar-item">
                <span></span>
                <span class="navbar-item-icon">${icons.user}</span>
                <div class="navbat-item-tex">${t("navbar.customers")}</div>
            </div>
        </div>
        <div id="navbar-item-group-2" class="navbar-item-group"></div>
        <div id="navbar-item-group-3" class="navbar-item-group"></div>
    </div>
    <div id="navbar-informations">
        <div id="navbar-information-version" class="navbar-information">
            Version: 1.0.0
        </div>
    </div>
`;