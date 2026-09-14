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

                    ${customer.salesforceId ? `
                        <section id="customer-order-intake"
                            class="customer-order-intake"
                            aria-live="polite">
                            <h3>${i18n.t("customer.orderIntake")}</h3>
                            <div class="customer-order-intake-grid">
                                ${renderOrderIntakeLoading()}
                            </div>
                        </section>
                    ` : ""}

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
    if (customer.salesforceId) loadCustomerOrderIntake(customerId);

}

function renderOrderIntakeLoading() {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => `
        <div class="customer-order-intake-card loading">
            <span>${currentYear - index}${index === 0 ? ` · ${i18n.t("customer.currentYear")}` : ""}</span>
            <strong>–</strong>
            <small>${i18n.t("customer.orderIntakeLoading")}</small>
        </div>
    `).join("");
}

async function loadCustomerOrderIntake(customerId) {
    const section = document.getElementById("customer-order-intake");
    if (!section) return;

    try {
        const response = await fetch(
            `/api/salesforce/customers/${customerId}/order-intake`
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!result.available) {
            section.innerHTML = `<h3>${i18n.t("customer.orderIntake")}</h3>
                <p class="customer-order-intake-empty">${i18n.t("customer.orderIntakeUnavailable")}</p>`;
            return;
        }

        const grid = section.querySelector(".customer-order-intake-grid");
        if (!grid) return;
        const visibleYears = result.years.slice(0, 5);
        const earlierYears = result.years.slice(5, 10);
        grid.innerHTML = visibleYears.map((item, index) =>
            renderOrderIntakeCard(item, index, result.currency)
        ).join("");

        section.insertAdjacentHTML("beforeend", `
            <details class="customer-order-intake-details">
                <summary>${i18n.t("customer.moreOrderIntakeDetails")}</summary>
                <div class="customer-order-intake-details-content">
                    <div>
                        <h4>${i18n.t("customer.earlierYears")}</h4>
                        <div class="customer-order-intake-history-grid">
                            ${earlierYears.map(item =>
                                renderOrderIntakeCard(item, -1, result.currency)
                            ).join("")}
                        </div>
                    </div>
                    <div class="customer-order-intake-chart-panel">
                        <h4>${i18n.t("customer.orderIntakeTrend")}</h4>
                        ${renderOrderIntakeChart(result.years, result.currency)}
                    </div>
                </div>
            </details>
        `);
    } catch {
        if (!section.isConnected) return;
        section.innerHTML = `<h3>${i18n.t("customer.orderIntake")}</h3>
            <p class="customer-order-intake-empty">${i18n.t("customer.orderIntakeUnavailable")}</p>`;
    }
}

function renderOrderIntakeCard(item, index, currency) {
    const change = Number(item.changePercent);
    const hasComparison = item.changePercent !== null && Number.isFinite(change);
    const trendClass = change > 0 ? "positive" : change < 0 ? "negative" : "neutral";
    const trendValue = hasComparison
        ? `${change > 0 ? "+" : ""}${change.toLocaleString(
            i18n.getCurrentLanguage(),
            { minimumFractionDigits: 1, maximumFractionDigits: 1 }
        )} %`
        : "–";
    const orderLabel = item.orderCount === 1
        ? i18n.t("customer.orderSingular")
        : i18n.t("customer.orderPlural");

    return `
        <div class="customer-order-intake-card${index === 0 ? " current" : ""}">
            <div class="customer-order-intake-period">
                <span>${item.year}${index === 0 ? ` · ${i18n.t("customer.currentYear")}` : ""}:</span>
                <small>${item.orderCount} ${orderLabel}</small>
            </div>
            <div class="customer-order-intake-value">
                <strong>${Number(item.orderAmount).toLocaleString(
                    i18n.getCurrentLanguage(),
                    { style: "currency", currency: currency || "EUR" }
                )}</strong>
                <span class="customer-order-intake-trend ${trendClass}"
                    title="${i18n.t("customer.comparedToPreviousYear")}">
                    ${trendValue}
                </span>
            </div>
        </div>
    `;
}

function renderOrderIntakeChart(years, currency) {
    const values = [...years].reverse();
    const width = 720;
    const height = 176;
    const left = 18;
    const right = 18;
    const top = 14;
    const bottom = 28;
    const baseline = height - bottom;
    const maximum = Math.max(...values.map(item => Number(item.orderAmount) || 0), 1);
    const points = values.map((item, index) => ({
        ...item,
        x: left + index * ((width - left - right) / Math.max(values.length - 1, 1)),
        y: top + (1 - (Number(item.orderAmount) || 0) / maximum) * (baseline - top)
    }));
    const line = points.map(point => `${point.x},${point.y}`).join(" ");
    const area = `${left},${baseline} ${line} ${width - right},${baseline}`;
    const formatValue = value => Number(value).toLocaleString(
        i18n.getCurrentLanguage(),
        { style: "currency", currency: currency || "EUR" }
    );

    return `
        <svg class="customer-order-intake-chart" viewBox="0 0 ${width} ${height}"
            role="img" aria-label="${i18n.t("customer.orderIntakeTrend")}">
            <defs>
                <linearGradient id="order-intake-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#4c8bf5" stop-opacity=".28" />
                    <stop offset="100%" stop-color="#4c8bf5" stop-opacity=".02" />
                </linearGradient>
            </defs>
            <line x1="${left}" y1="${baseline}" x2="${width - right}" y2="${baseline}"
                class="customer-order-chart-axis" />
            <polygon points="${area}" fill="url(#order-intake-area)" />
            <polyline points="${line}" class="customer-order-chart-line" />
            ${points.map(point => `
                <g class="customer-order-chart-point-group">
                    <circle cx="${point.x}" cy="${point.y}" r="4"
                        class="customer-order-chart-point" />
                    <circle cx="${point.x}" cy="${point.y}" r="13"
                        class="customer-order-chart-hit" />
                    <text x="${point.x}" y="${height - 8}"
                        class="customer-order-chart-label">${point.year}</text>
                    ${renderOrderIntakeChartTooltip(
                        point,
                        formatValue(point.orderAmount),
                        width,
                        top
                    )}
                </g>
            `).join("")}
        </svg>
    `;
}

function renderOrderIntakeChartTooltip(point, formattedValue, chartWidth, chartTop) {
    const tooltipWidth = 184;
    const tooltipHeight = 59;
    const x = Math.min(
        Math.max(4, point.x - tooltipWidth / 2),
        chartWidth - tooltipWidth - 4
    );
    const y = point.y - tooltipHeight - 10 < chartTop
        ? point.y + 11
        : point.y - tooltipHeight - 10;
    const orderLabel = point.orderCount === 1
        ? i18n.t("customer.orderSingular")
        : i18n.t("customer.orderPlural");
    const change = Number(point.changePercent);
    const hasComparison = point.changePercent !== null && Number.isFinite(change);
    const changeValue = hasComparison
        ? `${change > 0 ? "+" : ""}${change.toLocaleString(
            i18n.getCurrentLanguage(),
            { minimumFractionDigits: 1, maximumFractionDigits: 1 }
        )} %`
        : "–";
    const changeClass = change > 0
        ? "positive"
        : change < 0
            ? "negative"
            : "neutral";

    return `
        <g class="customer-order-chart-tooltip">
            <rect x="${x}" y="${y}" width="${tooltipWidth}" height="${tooltipHeight}" rx="7" />
            <text x="${x + 9}" y="${y + 16}" class="customer-order-chart-tooltip-title">
                ${point.year} · ${point.orderCount} ${orderLabel}
            </text>
            <text x="${x + 9}" y="${y + 33}" class="customer-order-chart-tooltip-value">
                ${formattedValue}
            </text>
            <text x="${x + 9}" y="${y + 50}"
                class="customer-order-chart-tooltip-change ${changeClass}">
                ${changeValue} ${i18n.t("customer.comparedToPreviousYear")}
            </text>
        </g>
    `;
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
