import * as i18n from "./utils/i18n.js";
await i18n.loadLanguage("de");
import * as router from "./router.js";

// Bei Seitenstart die aktuelle URL rendern
router.renderRoute(window.location.pathname);

// Vor / Zurück im Browser ermöglichen
window.addEventListener("popstate", () => {
    router.renderRoute(window.location.pathname);
});