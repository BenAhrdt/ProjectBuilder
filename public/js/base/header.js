import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");

const header = document.getElementById('header');

header.innerHTML = `
    <div id="projectname">${i18n.t("header.projectname")}</div>
`;