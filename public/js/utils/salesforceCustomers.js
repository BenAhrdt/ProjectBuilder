import * as i18n from "./i18n.js";
import { showAlert } from "./modal.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function readJson(response) {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? i18n.t("salesforce.error"));
    return result;
}

export function openSalesforceCustomerDialog({
    localCustomerId = null,
    initialFilters = {},
    autoSearch = false,
    onComplete
} = {}) {
    const overlay = document.createElement("div");
    overlay.className = "salesforce-dialog-overlay";
    overlay.innerHTML = `
        <div class="salesforce-dialog" role="dialog" aria-modal="true">
            <div class="salesforce-dialog-header">
                <div>
                    <h2>${i18n.t("salesforce.searchCustomers")}</h2>
                    <p>${i18n.t("salesforce.readOnlyHint")}</p>
                </div>
                <div class="salesforce-header-actions">
                    <button type="button" class="salesforce-connect hidden">${i18n.t("salesforce.connect")}</button>
                    <button type="button" class="salesforce-close" aria-label="${i18n.t("common.close")}">×</button>
                </div>
            </div>
            <form class="salesforce-filters">
                <input name="customerNumber" placeholder="${i18n.t("customers.customerNumber")}">
                <input name="name" placeholder="${i18n.t("customers.name")}">
                <input name="postalCode" placeholder="${i18n.t("customers.postalCode")}">
                <input name="city" placeholder="${i18n.t("customers.city")}">
                <button type="submit">${i18n.t("customers.search")}</button>
            </form>
            <div class="salesforce-status">${i18n.t("salesforce.enterFilter")}</div>
            <div class="salesforce-results"></div>
            <div class="salesforce-dialog-actions">
                <button type="button" class="salesforce-cancel">${i18n.t("common.cancel")}</button>
                <button type="button" class="salesforce-import" disabled>${localCustomerId ? i18n.t("salesforce.applyToCustomer") : i18n.t("salesforce.importSelected")}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector(".salesforce-filters");
    const status = overlay.querySelector(".salesforce-status");
    const results = overlay.querySelector(".salesforce-results");
    const importButton = overlay.querySelector(".salesforce-import");
    const connectButton = overlay.querySelector(".salesforce-connect");
    const close = () => overlay.remove();
    let mouseDownOutside = false;

    for (const field of ["customerNumber", "name", "postalCode", "city"]) {
        form.elements[field].value = initialFilters[field] ?? "";
    }

    function updateImportState() {
        importButton.disabled = !overlay.querySelector(".salesforce-result-select:checked");
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const searchButton = form.querySelector('button[type="submit"]');
        const originalText = searchButton.textContent;
        const params = new URLSearchParams(new FormData(form));
        if (![...params.values()].some(value => value.trim())) {
            status.textContent = i18n.t("salesforce.enterFilter");
            return;
        }
        status.textContent = i18n.t("salesforce.searching");
        searchButton.disabled = true;
        searchButton.textContent = i18n.t("salesforce.searchingButton");
        results.innerHTML = "";
        importButton.disabled = true;
        try {
            const customers = await readJson(await fetch(`/api/salesforce/customers?${params}`));
            status.textContent = customers.length
                ? i18n.t("salesforce.results").replace("{count}", customers.length)
                : i18n.t("salesforce.noResults");
            results.innerHTML = customers.length ? `
                <table class="salesforce-results-table">
                    <thead><tr><th></th><th>${i18n.t("customers.customerNumber")}</th><th>${i18n.t("customers.name")}</th><th>${i18n.t("customers.address")}</th><th>${i18n.t("customers.postalCode")}</th><th>${i18n.t("customers.city")}</th><th>${i18n.t("salesforce.localStatus")}</th></tr></thead>
                    <tbody>${customers.map(customer => `
                        <tr>
                            <td><input class="salesforce-result-select" type="${localCustomerId ? "radio" : "checkbox"}" name="salesforce-selection" value="${escapeHtml(customer.salesforceId)}"></td>
                            <td>${escapeHtml(customer.customerNumber)}</td>
                            <td>${escapeHtml(customer.name)}</td>
                            <td>${escapeHtml(customer.street)}</td>
                            <td>${escapeHtml(customer.postalCode)}</td>
                            <td>${escapeHtml(customer.city)}</td>
                            <td>${customer.localCustomerId ? i18n.t("salesforce.alreadyImported") : i18n.t("salesforce.notImported")}</td>
                        </tr>`).join("")}</tbody>
                </table>` : "";
            overlay.querySelectorAll(".salesforce-result-select").forEach(input => input.addEventListener("change", updateImportState));
        } catch (error) {
            status.textContent = error.message;
            connectButton.classList.remove("hidden");
        } finally {
            searchButton.disabled = false;
            searchButton.textContent = originalText;
        }
    });

    importButton.addEventListener("click", async () => {
        const ids = [...overlay.querySelectorAll(".salesforce-result-select:checked")].map(input => input.value);
        if (!ids.length) return;
        importButton.disabled = true;
        status.textContent = i18n.t("salesforce.importing");
        try {
            const response = localCustomerId
                ? await fetch(`/api/salesforce/customers/${localCustomerId}`, {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ salesforceId: ids[0] })
                })
                : await fetch("/api/salesforce/customers/import", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ salesforceIds: ids })
                });
            const result = await readJson(response);
            close();
            await showAlert(localCustomerId
                ? i18n.t("salesforce.customerUpdated")
                : i18n.t("salesforce.importComplete")
                    .replace("{created}", result.created).replace("{updated}", result.updated));
            await onComplete?.();
        } catch (error) {
            status.textContent = error.message;
            importButton.disabled = false;
        }
    });

    connectButton.addEventListener("click", async () => {
        connectButton.disabled = true;
        connectButton.textContent = i18n.t("salesforce.connecting");
        status.textContent = i18n.t("salesforce.completeLogin");
        try {
            await readJson(await fetch("/api/salesforce/login", { method: "POST" }));
            connectButton.classList.add("hidden");
            status.textContent = i18n.t("salesforce.connected");
            if ([...new URLSearchParams(new FormData(form)).values()].some(value => value.trim())) {
                form.requestSubmit();
            }
        } catch (error) {
            status.textContent = error.message;
            connectButton.textContent = i18n.t("salesforce.connect");
            connectButton.disabled = false;
        }
    });

    fetch("/api/salesforce/status")
        .then(response => { if (!response.ok) connectButton.classList.remove("hidden"); })
        .catch(() => connectButton.classList.remove("hidden"));

    overlay.querySelector(".salesforce-close").addEventListener("click", close);
    overlay.querySelector(".salesforce-cancel").addEventListener("click", close);
    overlay.addEventListener("mousedown", event => {
        mouseDownOutside = event.target === overlay;
    });
    overlay.addEventListener("mouseup", event => {
        const mouseUpOutside = event.target === overlay;
        if (mouseDownOutside && mouseUpOutside) close();
        mouseDownOutside = false;
    });
    form.elements.customerNumber.focus();
    if (autoSearch && Object.values(initialFilters).some(value => String(value ?? "").trim())) {
        form.requestSubmit();
    }
}
