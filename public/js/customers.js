import { loadLanguage, t } from "./i18n.js";
await loadLanguage("de");

const view = document.getElementById('view');

export function renderCustomersView(){
    view.innerHTML = `
        <div id="customers.header" class="view-header">
            ${t("customers.customers")}
        </div>
        <div id="customers.left" class="view-left"></div>
        <div id="customers.content" class="view-content"/></div>
        <div id="customers.right" class="view-right"/></div>
    `;
}