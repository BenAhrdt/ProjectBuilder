import { loadLanguage, t } from "./i18n.js";
await loadLanguage("de");

const header = document.getElementById('header');

header.innerHTML = `
    <div id="projectname">${t("header.projectname")}</div>
`;