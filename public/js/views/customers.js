import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");

const view = document.getElementById('view');

function renderView() {
    view.innerHTML = `
        <div id="customers.header" class="view-header">
            ${i18n.t("customers.customers")}
        </div>
        <div id="customers-left" class="view-left"></div>
        <div id="customers-content" class="view-content"></div>
        <div id="customers-right" class="view-right"></div>
    `;
}

export {
    renderView
}