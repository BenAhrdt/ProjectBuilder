import { loadLanguage, t } from "./i18n.js";
await loadLanguage("de");


const view = document.getElementById('view');

export function renderArticlesView() {
    view.innerHTML = `
        <div id="articles.header" class="view-header">
            ${t("articles.articles")}
        </div>
        <div id="articles.left" class="view-left"></div>
        <div id="articles.content" class="view-content"></div>
        <div id="articles.right" class="view-right"/></div>
    `;
}
