import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage();

import * as router from "../router.js";
import { showAlert } from "../utils/modal.js";
import { openSalesforceCustomerDialog } from "../utils/salesforceCustomers.js";

const view =
    document.getElementById("view");

function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function renderView() {

    // --------------------------------------------------
    // Kunden laden
    // --------------------------------------------------

    const response =
        await fetch("/api/customers");

    const customers =
        await response.json();

    // --------------------------------------------------
    // Rendern
    // --------------------------------------------------

    view.innerHTML = `

        <div id="customers-header" class="view-header">

            <span class="header-text">

                ${i18n.t("customers.customers")}

            </span>

            <div class="header-search">

                <div class="searchBox">

                    <input
                        id="customers-search"
                        type="text"
                        placeholder="${i18n.t("customers.search")}..."
                    >

                </div>

            </div>

            <div
                id="customers-meta-infomrations"
                class="meta-informations"
            >

                ${i18n.t("customers.customerCount")}:
                ${customers.length}

            </div>
            <div class="customers-header-actions">
                <button id="salesforce-search-button" class="customers-action-button customers-action-secondary">
                    ${i18n.t("salesforce.importCustomers")}
                </button>
                <button id="salesforce-refresh-button" class="customers-action-button customers-action-secondary">
                    ${i18n.t("salesforce.refreshLinked")}
                </button>
                <button id="add-customer-button" class="customers-action-button customers-action-primary">
                    + ${i18n.t("customers.addCustomer")}
                </button>
            </div>

        </div>

        <div id="customers-left" class="view-left"></div>

        <div id="customers-content" class="view-content">

            <div id="customer-form-container" class="hidden">

                <div class="customer-form">

                    <input
                        id="customer-number"
                        type="text"
                        placeholder="${i18n.t("customers.customerNumber")}"
                    >

                    <input
                        id="customer-name"
                        type="text"
                        placeholder="${i18n.t("customers.name")}"
                    >

                    <input
                        id="customer-street"
                        type="text"
                        placeholder="${i18n.t("customers.address")}"
                    >

                    <input
                        id="customer-postal-code"
                        type="text"
                        placeholder="${i18n.t("customers.postalCode")}"
                    >

                    <input
                        id="customer-city"
                        type="text"
                        placeholder="${i18n.t("customers.city")}"
                    >

                    <textarea
                        id="customer-additional-info"
                        placeholder="${i18n.t("customers.additionalInfo")}"
                    ></textarea>

                    <button id="save-customer-button">

                        ${i18n.t("common.save")}

                    </button>

                </div>

            </div>

            <table class="customers-table">

                <thead>

                    <tr>

                        <th>
                            ${i18n.t("customers.customerNumber")}:
                        </th>

                        <th>
                            ${i18n.t("customers.name")}
                        </th>

                        <th>
                            ${i18n.t("customers.address")}
                        </th>

                        <th>
                            ${i18n.t("customers.postalCode")}
                        </th>

                        <th>
                            ${i18n.t("customers.city")}
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${customers.map(customer => `

                        <tr class="customer-row" data-id="${customer.id}" tabindex="0" role="link">

                            <td>
                                ${escapeHtml(customer.customerNumber)}
                            </td>

                            <td>
                                ${escapeHtml(customer.name)}
                            </td>

                            <td>
                                ${escapeHtml(customer.street)}
                            </td>

                            <td>
                                ${escapeHtml(customer.postalCode)}
                            </td>

                            <td>
                                ${escapeHtml(customer.city)}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

        <div id="customers-right" class="view-right"></div>

    `;

    generateHandler();

}

// --------------------------------------------------
// Suche
// --------------------------------------------------

function generateHandler() {

    const searchInput =
        document.getElementById(
            "customers-search"
        );

    searchInput.addEventListener(
        "input",
        async () => {

            const value =
                searchInput.value;

            const response =
                await fetch(
                    `/api/customers?search=${value}`
                );

            const customers =
                await response.json();

            renderCustomers(customers);

        }
    );

    // Kuden hinzufügen
    const addCustomerButton =
        document.getElementById(
            "add-customer-button"
        );

    const formContainer =
        document.getElementById(
            "customer-form-container"
        );

    addCustomerButton.addEventListener(
        "click",
        () => {

            formContainer.classList.toggle(
                "hidden"
            );

        }
    );

    document.getElementById("salesforce-search-button").addEventListener("click", () => {
        openSalesforceCustomerDialog({ onComplete: renderView });
    });

    document.getElementById("salesforce-refresh-button").addEventListener("click", async event => {
        const button = event.currentTarget;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = i18n.t("salesforce.refreshing");
        try {
            const response = await fetch("/api/salesforce/customers/refresh", { method: "POST" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            await showAlert(i18n.t("salesforce.refreshComplete").replace("{count}", result.updated));
            await renderView();
        } catch (error) {
            await showAlert(error.message ?? i18n.t("salesforce.error"));
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });


    // Speicher Button
    const saveCustomerButton =
        document.getElementById(
            "save-customer-button"
        );

    saveCustomerButton.addEventListener(
        "click",
        async () => {

            const customerNumber =
                document.getElementById(
                    "customer-number"
                ).value;

            const name =
                document.getElementById(
                    "customer-name"
                ).value;

            const city =
                document.getElementById(
                    "customer-city"
                ).value;

            const street = document.getElementById("customer-street").value;
            const postalCode = document.getElementById("customer-postal-code").value;

            const additionalInfo =
                document.getElementById(
                    "customer-additional-info"
                ).value;

            // --------------------------------------------------
            // API
            // --------------------------------------------------

            await fetch(
                "/api/customers",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        customerNumber,
                        name,
                        street,
                        postalCode,
                        city,
                        additionalInfo
                    })
                }
            );

            // --------------------------------------------------
            // Neu rendern
            // --------------------------------------------------

            renderView();

        }
    );

    attachCustomerRowHandlers();

}

function attachCustomerRowHandlers() {

    document
        .querySelectorAll(
            ".customer-row"
        )
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {

                    const customerId =
                        row.dataset.id;

                    router.navigate(`/customer/${customerId}`)
                }
            );

            row.addEventListener(
                "keydown",
                event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.navigate(`/customer/${row.dataset.id}`);
                    }
                }
            );

        });

}

// --------------------------------------------------
// Tabelle rendern
// --------------------------------------------------

function renderCustomers(customers) {

    const tbody =
        document.querySelector(
            ".customers-table tbody"
        );

    tbody.innerHTML =
        customers.map(customer => `

            <tr class="customer-row" data-id="${customer.id}" tabindex="0" role="link">

                <td>
                    ${escapeHtml(customer.customerNumber)}
                </td>

                <td>
                    ${escapeHtml(customer.name)}
                </td>

                <td>
                    ${escapeHtml(customer.street)}
                </td>

                <td>
                    ${escapeHtml(customer.postalCode)}
                </td>

                <td>
                    ${escapeHtml(customer.city)}
                </td>

            </tr>

        `).join("");

    attachCustomerRowHandlers();

}

export {
    renderView
};
