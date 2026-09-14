import * as i18n from "../utils/i18n.js";
import * as router from "../router.js";
import {
    showAlert,
    showConfirm
} from "../utils/modal.js";
import { openSalesforceCustomerDialog } from "../utils/salesforceCustomers.js";
import { offerSalesforceConnection } from "../utils/salesforceConnection.js";

await i18n.loadLanguage();

const view =
    document.getElementById(
        "view"
    );
let saveTimeout;

function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function renderView(
    customerId
) {

    const [customerResponse, projectsResponse] =
        await Promise.all([
            fetch(`/api/customers/${customerId}`),
            fetch(`/api/projects?customerId=${encodeURIComponent(customerId)}`)
        ]);

    const customer = await customerResponse.json();
    const projects = await projectsResponse.json();
    const salesforceLink = await loadSalesforceCustomerLink(
        customerId,
        customer.salesforceId
    );

    view.innerHTML = `

        <div class="view-header">

            ${escapeHtml(customer.name)}

        </div>

        <div class="view-left"></div>

        <div
            id="customer-content"
            class="view-content"
        >

            <div class="customer-card">

                <div class="customer-card-header">

                    <h2>
                        ${i18n.t("customer.customerData")}:
                    </h2>

                    <div class="customer-card-actions">
                        <button id="salesforce-find-customer" type="button">
                            ${i18n.t("salesforce.searchAndApply")}
                        </button>
                        ${customer.salesforceId ? `
                            <button id="salesforce-refresh-customer" type="button">
                                ${i18n.t("salesforce.refreshCustomer")}
                            </button>` : ""}
                        ${salesforceLink ? `
                            <a class="salesforce-record-link"
                                href="${escapeHtml(salesforceLink.url)}"
                                target="_blank" rel="noopener noreferrer">
                                ${i18n.t("salesforce.openCustomer")}
                            </a>` : ""}
                        <button
                            id="delete-customer"
                            type="button"
                            title="${i18n.t("customer.deleteCustomer")}"
                            aria-label="${i18n.t("customer.deleteCustomer")}"
                        >
                            ${i18n.t("customer.deleteCustomer")}
                        </button>
                    </div>

                </div>

                <div class="customer-form">

                    <div class="customer-form-top">

                        <div class="customer-form-row">

                            <label>
                                ${i18n.t("customers.name")}:
                            </label>

                            <input
                                id="customer-name"
                                value="${escapeHtml(customer.name)}"
                            >

                        </div>

                        <div class="customer-form-row">

                            <label>
                                ${i18n.t("customers.address")}:
                            </label>

                            <input
                                id="customer-street"
                                value="${escapeHtml(customer.street)}"
                            >

                        </div>

                        <div class="customer-form-row">

                            <label>
                                ${i18n.t("customers.postalCode")}:
                            </label>

                            <input
                                id="customer-postal-code"
                                value="${escapeHtml(customer.postalCode)}"
                            >

                        </div>

                        <div class="customer-form-row">

                            <label>
                                ${i18n.t("customer.customerNumber")}:
                            </label>

                            <input
                                id="customer-number"
                                value="${escapeHtml(customer.customerNumber)}"
                            >

                        </div>

                        <div class="customer-form-row">

                            <label>
                                ${i18n.t("customer.city")}:
                            </label>

                            <input
                                id="customer-city"
                                value="${escapeHtml(customer.city)}"
                            >

                        </div>

                        ${customer.salesforceId ? `
                            <div class="customer-salesforce-state">
                                ${i18n.t("salesforce.linked")}
                                ${customer.salesforceSyncedAt ? ` · ${i18n.t("salesforce.lastSync")}: ${new Date(customer.salesforceSyncedAt).toLocaleString()}` : ""}
                            </div>` : ""}

                    </div>

                    <div class="customer-discounts-wrapper">

                        <h3>
                            ${i18n.t("customer.discountGroups")}
                        </h3>

                        <div class="customer-discounts-grid">

                            ${renderDiscounts(customer)}

                        </div>

                    </div>

                    <details class="customer-additional-info-wrapper"
                        ${customer.additionalInfo ? "open" : ""}>
                        <summary>${i18n.t("customer.additionalInfo")}</summary>
                        <textarea id="customer-additional-info"
                            rows="1">${escapeHtml(customer.additionalInfo)}</textarea>
                    </details>

                </div>

            </div>

            <div class="customer-projects-card">
                <div class="customer-projects-header">
                    <h2>${i18n.t("customer.projects")}</h2>
                    <div class="customer-projects-header-actions">
                        <span>${projects.length} ${projects.length === 1 ? i18n.t("customer.projectSingular") : i18n.t("customer.projectPlural")}</span>
                        <button id="add-customer-project" type="button">
                            + ${i18n.t("projects.addProject")}
                        </button>
                    </div>
                </div>

                <div id="customer-project-form" class="customer-project-form hidden">
                    <input id="new-project-name" type="text"
                        placeholder="${i18n.t("projects.projectname")}">
                    <textarea id="new-project-description" rows="1"
                        placeholder="${i18n.t("projects.description")}"></textarea>
                    <button id="cancel-customer-project" type="button">${i18n.t("common.cancel")}</button>
                    <button id="save-customer-project" type="button">${i18n.t("common.save")}</button>
                </div>

                ${projects.length > 0 ? `
                    <table class="customer-projects-table">
                        <thead>
                            <tr>
                                <th>${i18n.t("customer.projectName")}</th>
                                <th>${i18n.t("customer.description")}</th>
                                <th>${i18n.t("common.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${projects.map(project => `
                                <tr class="customer-project-row" data-id="${project.id}" tabindex="0" role="link">
                                    <td>${escapeHtml(project.name)}</td>
                                    <td>${escapeHtml(project.description)}</td>
                                    <td class="customer-project-actions"><button type="button" class="duplicate-customer-project" data-id="${project.id}">${i18n.t("common.duplicate")}</button></td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                ` : `
                    <div class="customer-projects-empty">
                        ${i18n.t("customer.noProjects")}
                    </div>
                `}
            </div>

        </div>

        <div class="view-right"></div>

    `;
    generateHandler(customerId);
    registerCustomerProjectLinks(customerId);
    registerCustomerProjectCreation(customerId);
    registerCustomerDelete(customerId, customer);
    registerSalesforceActions(customerId, customer);
    registerAdditionalInfoAutoResize();

}

function registerAdditionalInfoAutoResize() {
    const textarea = document.getElementById("customer-additional-info");
    if (!textarea) return;
    const resize = () => {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 42), 180)}px`;
    };
    textarea.addEventListener("input", resize);
    textarea.closest("details")?.addEventListener("toggle", resize);
    resize();
}

function registerCustomerProjectCreation(customerId) {
    const form = document.getElementById("customer-project-form");
    const nameInput = document.getElementById("new-project-name");
    const descriptionInput = document.getElementById("new-project-description");
    const addButton = document.getElementById("add-customer-project");
    const saveButton = document.getElementById("save-customer-project");

    addButton?.addEventListener("click", () => {
        form.classList.toggle("hidden");
        if (!form.classList.contains("hidden")) nameInput.focus();
    });
    document.getElementById("cancel-customer-project")?.addEventListener("click", () => {
        form.classList.add("hidden");
        nameInput.value = "";
        descriptionInput.value = "";
    });
    saveButton?.addEventListener("click", async () => {
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.focus();
            return;
        }
        saveButton.disabled = true;
        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId,
                    name,
                    description: descriptionInput.value
                })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || i18n.t("projects.createFailed"));
            }
            await renderView(customerId);
        } catch (error) {
            await showAlert(error.message || i18n.t("projects.createFailed"));
            saveButton.disabled = false;
        }
    });
}

async function loadSalesforceCustomerLink(customerId, salesforceId) {
    if (!salesforceId) return null;
    try {
        const response = await fetch(`/api/salesforce/customers/${customerId}/link`);
        const link = await response.json();
        return response.ok && link?.url ? link : null;
    } catch {
        return null;
    }
}

function registerSalesforceActions(customerId, customer) {
    document.getElementById("salesforce-find-customer")?.addEventListener("click", () => {
        clearTimeout(saveTimeout);
        openSalesforceCustomerDialog({
            localCustomerId: customerId,
            initialFilters: {
                customerNumber: customer.customerNumber,
                name: customer.name
            },
            autoSearch: true,
            onComplete: () => renderView(customerId)
        });
    });

    document.getElementById("salesforce-refresh-customer")?.addEventListener("click", async event => {
        clearTimeout(saveTimeout);
        const button = event.currentTarget;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = i18n.t("salesforce.refreshing");
        try {
            const response = await fetch(`/api/salesforce/customers/${customerId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            await showAlert(i18n.t("salesforce.customerUpdated"));
            await renderView(customerId);
        } catch (error) {
            if (await offerSalesforceConnection(error)) {
                button.disabled = false;
                button.textContent = originalText;
                return button.click();
            }
            await showAlert(error.message ?? i18n.t("salesforce.error"));
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });
}

function registerCustomerProjectLinks(customerId) {
    document.querySelectorAll(".duplicate-customer-project").forEach(button => {
        button.addEventListener("click", async event => {
            event.stopPropagation();
            button.disabled = true;
            try {
                const response = await fetch(`/api/projects/${button.dataset.id}/duplicate`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ copySuffix: i18n.t("common.copySuffix") })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || i18n.t("projects.duplicateFailed"));
                await renderView(customerId);
            } catch (error) {
                await showAlert(error.message || i18n.t("projects.duplicateFailed"));
                button.disabled = false;
            }
        });
    });
    document.querySelectorAll(".customer-project-row").forEach(row => {
        const openProject = () => router.navigate(`/project/${row.dataset.id}`);
        row.addEventListener("click", openProject);
        row.addEventListener("keydown", event => {
            if (event.target.closest("button")) return;
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openProject();
            }
        });
    });
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
            ".customer-form input, .customer-form textarea"
        );

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

                const customerFormData =
                    getCustomerFormData();

                saveTimeout =
                    setTimeout(
                        () => saveCustomer(
                            customerId,
                            customerFormData
                        ),
                        500
                    );

            }
        );

    });

}

function registerCustomerDelete(
    customerId,
    customer
) {

    const deleteButton =
        document.getElementById(
            "delete-customer"
        );

    if (!deleteButton) {

        return;

    }

    deleteButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                await showConfirm(
                    i18n.t("customer.deleteConfirm")
                        .replace("{name}", customer.name ?? ""),
                    {
                        title: i18n.t("customer.deleteCustomer"),
                        confirmText: i18n.t("common.delete"),
                        danger: true
                    }
                );

            if (!confirmed) {

                return;

            }

            clearTimeout(
                saveTimeout
            );

            const response =
                await fetch(
                    `/api/customers/${customerId}`,
                    {
                        method: "DELETE"
                    }
                );

            const result =
                await response.json();

            if (
                !response.ok
                || !result.success
            ) {

                await showAlert(
                    result.error
                    || i18n.t("customer.deleteFailed")
                );

                return;

            }

            router.navigate(
                "/customers"
            );

        }
    );

}

// Speichern
async function saveCustomer(
    customerId,
    customerFormData = getCustomerFormData()
) {

    await fetch(

        `/api/customers/${customerId}`,

        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify(
                customerFormData
            )

        }

    );

}

function getCustomerFormData() {

    return {

                customerNumber:
                    document.getElementById(
                        "customer-number"
                    ).value,

                name:
                    document.getElementById("customer-name").value,

                street:
                    document.getElementById("customer-street").value,

                postalCode:
                    document.getElementById("customer-postal-code").value,

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

    };

}

export {
    renderView
};
