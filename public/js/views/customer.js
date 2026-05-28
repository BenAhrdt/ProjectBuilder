import * as i18n from "../utils/i18n.js";

await i18n.loadLanguage("de");

const view =
    document.getElementById(
        "view"
    );
let saveTimeout;

async function renderView(
    customerId
) {

    const response =
        await fetch(

            `/api/customers/${customerId}`

        );

    const customer =
        await response.json();

    view.innerHTML = `

        <div class="view-header">

            ${customer.name}

        </div>

        <div class="view-left"></div>

        <div
            id="customer-content"
            class="view-content"
        >

            <div class="customer-card">

                <h2>
                    ${i18n.t("customer.customerData")}:
                </h2>

                <div class="customer-form">

                    <div class="customer-form-top">

                        <div class="customer-form-row">

                            <label>
                                ${i18n.t("customer.customerNumber")}:
                            </label>

                            <input
                                id="customer-number"
                                value="${customer.customerNumber ?? ""}"
                            >

                        </div>

                        <div class="customer-form-row">

                            <label>
                                ${i18n.t("customer.city")}:
                            </label>

                            <input
                                id="customer-city"
                                value="${customer.city ?? ""}"
                            >

                        </div>

                    </div>

                    <div class="customer-discounts-wrapper">

                        <h3>
                            Rabattgruppen
                        </h3>

                        <div class="customer-discounts-grid">

                            ${renderDiscounts(customer)}

                        </div>

                    </div>

                    <div class="customer-additional-info-wrapper">

                        <label>
                            ${i18n.t("customer.additionalInfo")}:
                        </label>

                        <textarea
                            id="customer-additional-info"
                        >${customer.additionalInfo ?? ""}</textarea>

                    </div>

                </div>

            </div>

        </div>

        <div class="view-right"></div>

    `;
    generateHandler(customerId);

}

function renderDiscounts(
    customer
) {

    let html = "";

    for (
        let i = 1;
        i <= 10;
        i++
    ) {
        if(i === 2 || i > 8) continue;
        html += `
            <div class="discount-row">

                <label>
                    PG${i}
                </label>

                <div class="discount-input-wrapper">
                    <input
                        id="discount-pg${i}"
                        class="discount-input"
                        type="number"
                        min="0"
                        max="100"
                        value="${customer[`pg${i}`] ?? ""}"
                    >
                    <span>%</span>
                </div>

            </div>

        `;

    }

    return html;

}

function generateHandler(customerId) {

    const inputs =
        document.querySelectorAll(
            "input, textarea"
        );

    let saveTimeout;

    inputs.forEach(input => {

        input.addEventListener(
            "input",
            () => {

                // Rabattgruppen validieren
                if (
                    input.classList.contains(
                        "discount-input"
                    )
                ) {

                    if (
                        Number(input.value) > 100
                    ) {

                        input.value = 100;

                    }

                    if (
                        Number(input.value) < 0
                    ) {

                        input.value = 0;

                    }

                }

                clearTimeout(
                    saveTimeout
                );

                saveTimeout =
                    setTimeout(
                        () => saveCustomer(customerId),
                        500
                    );

            }
        );

    });

}

// Speichern
async function saveCustomer(customerId) {

    await fetch(

        `/api/customers/${customerId}`,

        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                customerNumber:
                    document.getElementById(
                        "customer-number"
                    ).value,

                city:
                    document.getElementById(
                        "customer-city"
                    ).value,

                additionalInfo:
                    document.getElementById(
                        "customer-additional-info"
                    ).value,

                pg1:
                    document.getElementById(
                        "discount-pg1"
                    )?.value ?? "",

                pg2:
                    document.getElementById(
                        "discount-pg2"
                    )?.value ?? "",

                pg3:
                    document.getElementById(
                        "discount-pg3"
                    )?.value ?? "",

                pg4:
                    document.getElementById(
                        "discount-pg4"
                    )?.value ?? "",

                pg5:
                    document.getElementById(
                        "discount-pg5"
                    )?.value ?? "",

                pg6:
                    document.getElementById(
                        "discount-pg6"
                    )?.value ?? "",

                pg7:
                    document.getElementById(
                        "discount-pg7"
                    )?.value ?? "",

                pg8:
                    document.getElementById(
                        "discount-pg8"
                    )?.value ?? "",

                pg9:
                    document.getElementById(
                        "discount-pg9"
                    )?.value ?? "",

                pg10:
                    document.getElementById(
                        "discount-pg10"
                    )?.value ?? ""

            })

        }

    );

}

export {
    renderView
};