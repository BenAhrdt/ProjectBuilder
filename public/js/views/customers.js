import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");

import * as router from "../router.js";

const view =
    document.getElementById("view");

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
            <button id="add-customer-button">
                + ${i18n.t("customers.addCustomer")}
            </button>

        </div>

        <div id="customers-left" class="view-left"></div>

        <div id="customers-content" class="view-content">

            <div id="customer-form-container" class="hidden">

                <div class="customer-form">

                    <input
                        id="customer-number"
                        type="text"
                        placeholder="Kundennummer"
                    >

                    <input
                        id="customer-name"
                        type="text"
                        placeholder="Name"
                    >

                    <input
                        id="customer-city"
                        type="text"
                        placeholder="Stadt"
                    >

                    <textarea
                        id="customer-additional-info"
                        placeholder="Zusatzinformationen"
                    ></textarea>

                    <button id="save-customer-button">

                        Speichern

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
                            ${i18n.t("customers.city")}
                        </th>

                        <th>
                            ${i18n.t("customers.additionalInfo")}
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${customers.map(customer => `

                        <tr class="customer-row" data-id="${customer.id}">

                            <td>
                                ${customer.customerNumber ?? ""}
                            </td>

                            <td>
                                ${customer.name ?? ""}
                            </td>

                            <td>
                                ${customer.city ?? ""}
                            </td>

                            <td>
                                ${customer.additionalInfo ?? ""}
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

            <tr class="customer-row" data-id="${customer.id}">

                <td>
                    ${customer.customerNumber ?? ""}
                </td>

                <td>
                    ${customer.name ?? ""}
                </td>

                <td>
                    ${customer.city ?? ""}
                </td>

                <td>
                    ${customer.additionalInfo ?? ""}
                </td>

            </tr>

        `).join("");

    attachCustomerRowHandlers();

}

export {
    renderView
};
