import * as i18n from "../utils/i18n.js";
import * as router from "../router.js";
import {
    showAlert,
    showConfirm
} from "../utils/modal.js";
import { openSalesforceCustomerDialog } from "../utils/salesforceCustomers.js";
import {
    offerSalesforceConnection,
    withSalesforceConnectionRetry
} from "../utils/salesforceConnection.js";
import { averageOrderValue, calculateSalesMetrics } from "../utils/customerSalesMetrics.js";

await i18n.loadLanguage();

const view =
    document.getElementById(
        "view"
    );
let saveTimeout;
let customerViewState = createCustomerViewState();

function createCustomerViewState(customerId = null) {
    return {
        customerId,
        activeTab: "general",
        projects: null,
        projectsPromise: null,
        sales: null,
        salesPromise: null,
        additionalInfoOpen: null
    };
}

function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function renderView(
    customerId
) {
    if (String(customerViewState.customerId) !== String(customerId)) {
        customerViewState = createCustomerViewState(customerId);
    }
    const customerResponse = await fetch(`/api/customers/${customerId}`);
    const customer = await customerResponse.json();

    view.innerHTML = `

        <div class="view-header">

            ${escapeHtml(customer.name)}

        </div>

        <div class="view-left"></div>

        <div
            id="customer-content"
            class="view-content"
        >

            <div class="customer-tabs" role="tablist"
                aria-label="${i18n.t("customer.sections")}">
                ${renderTab("general", i18n.t("customer.tabGeneral"))}
                ${renderTab("projects", i18n.t("customer.tabProjects"))}
                ${renderTab("sales", i18n.t("customer.tabSales"))}
            </div>

            <section id="customer-panel-general" class="customer-tab-panel"
                role="tabpanel" aria-labelledby="customer-tab-general">

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
                        <span id="salesforce-customer-link"></span>
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
                        ${(customerViewState.additionalInfoOpen ?? Boolean(customer.additionalInfo)) ? "open" : ""}>
                        <summary>${i18n.t("customer.additionalInfo")}</summary>
                        <textarea id="customer-additional-info"
                            rows="1">${escapeHtml(customer.additionalInfo)}</textarea>
                    </details>

                </div>

            </div>

            </section>

            <section id="customer-panel-projects" class="customer-tab-panel" role="tabpanel"
                aria-labelledby="customer-tab-projects" hidden>
                <div id="customer-projects-content"></div>
            </section>

            <section id="customer-panel-sales" class="customer-tab-panel" role="tabpanel"
                aria-labelledby="customer-tab-sales" hidden>
                <div id="customer-sales-content"></div>
            </section>

        </div>

        <div class="view-right"></div>

    `;
    generateHandler(customerId);
    registerCustomerDelete(customerId, customer);
    registerSalesforceActions(customerId, customer);
    registerAdditionalInfoAutoResize();
    registerTabs(customerId, customer);
    if (customer.salesforceId) loadSalesforceCustomerLink(customerId, customer.salesforceId);
    activateTab(customerViewState.activeTab, customerId, customer, false);

}

function renderTab(name, label) {
    const selected = customerViewState.activeTab === name;
    return `<button id="customer-tab-${name}" class="customer-tab" type="button"
        role="tab" aria-selected="${selected}" aria-controls="customer-panel-${name}"
        tabindex="${selected ? 0 : -1}" data-tab="${name}">${label}</button>`;
}

function registerTabs(customerId, customer) {
    const tabs = [...document.querySelectorAll(".customer-tab")];
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activateTab(tab.dataset.tab, customerId, customer));
        tab.addEventListener("keydown", event => {
            let targetIndex = null;
            if (event.key === "ArrowRight") targetIndex = (index + 1) % tabs.length;
            if (event.key === "ArrowLeft") targetIndex = (index - 1 + tabs.length) % tabs.length;
            if (event.key === "Home") targetIndex = 0;
            if (event.key === "End") targetIndex = tabs.length - 1;
            if (targetIndex === null) return;
            event.preventDefault();
            tabs[targetIndex].focus();
            activateTab(tabs[targetIndex].dataset.tab, customerId, customer);
        });
    });
}

function activateTab(name, customerId, customer, focus = true) {
    customerViewState.activeTab = name;
    document.querySelectorAll(".customer-tab").forEach(tab => {
        const selected = tab.dataset.tab === name;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focus) tab.focus();
    });
    document.querySelectorAll(".customer-tab-panel").forEach(panel => {
        panel.hidden = panel.id !== `customer-panel-${name}`;
    });
    if (name === "projects") loadCustomerProjects(customerId);
    if (name === "sales") loadCustomerOrderIntake(customerId, customer);
}

function renderProjects(projects) {
    return `<div class="customer-projects-card">
        <div class="customer-projects-header">
            <h2>${i18n.t("customer.projects")}</h2>
            <div class="customer-projects-header-actions">
                <span>${projects.length} ${projects.length === 1 ? i18n.t("customer.projectSingular") : i18n.t("customer.projectPlural")}</span>
                <button id="add-customer-project" type="button">+ ${i18n.t("projects.addProject")}</button>
            </div>
        </div>
        <div id="customer-project-form" class="customer-project-form hidden">
            <input id="new-project-name" type="text" placeholder="${i18n.t("projects.projectname")}">
            <textarea id="new-project-description" rows="1" placeholder="${i18n.t("projects.description")}"></textarea>
            <button id="cancel-customer-project" type="button">${i18n.t("common.cancel")}</button>
            <button id="save-customer-project" type="button">${i18n.t("common.save")}</button>
        </div>
        ${projects.length ? `<div class="customer-projects-table-wrap"><table class="customer-projects-table">
            <thead><tr><th>${i18n.t("customer.projectName")}</th><th>${i18n.t("customer.description")}</th><th>${i18n.t("common.actions")}</th></tr></thead>
            <tbody>${projects.map(project => `<tr class="customer-project-row" data-id="${project.id}" tabindex="0" role="link">
                <td>${escapeHtml(project.name)}</td><td>${escapeHtml(project.description)}</td>
                <td class="customer-project-actions"><button type="button" class="duplicate-customer-project" data-id="${project.id}">${i18n.t("common.duplicate")}</button></td>
            </tr>`).join("")}</tbody></table></div>` : `<div class="customer-projects-empty">${i18n.t("customer.noProjects")}</div>`}
    </div>`;
}

async function loadCustomerProjects(customerId, force = false) {
    const container = document.getElementById("customer-projects-content");
    const state = customerViewState;
    if (!container) return;
    if (state.projects && !force) {
        container.innerHTML = renderProjects(state.projects);
        registerCustomerProjectLinks(customerId);
        registerCustomerProjectCreation(customerId);
        return;
    }
    if (state.projectsPromise) return state.projectsPromise;
    container.innerHTML = renderTabLoading(i18n.t("customer.projectsLoading"));
    state.projectsPromise = (async () => {
        try {
            const response = await fetch(`/api/projects?customerId=${encodeURIComponent(customerId)}`);
            const projects = await response.json();
            if (!response.ok) throw new Error(projects.error);
            if (customerViewState !== state) return;
            state.projects = projects;
            if (!container.isConnected) return;
            container.innerHTML = renderProjects(projects);
            registerCustomerProjectLinks(customerId);
            registerCustomerProjectCreation(customerId);
        } catch (error) {
            if (customerViewState === state && container.isConnected) {
                container.innerHTML = renderTabError(
                    error.message || i18n.t("customer.projectsLoadFailed"), "retry-projects"
                );
                container.querySelector("#retry-projects")?.addEventListener("click", () =>
                    loadCustomerProjects(customerId, true));
            }
        } finally {
            state.projectsPromise = null;
        }
    })();
    return state.projectsPromise;
}

function renderTabLoading(label) {
    return `<div class="customer-tab-status" role="status"><span class="customer-tab-spinner" aria-hidden="true"></span>${label}</div>`;
}

function renderTabError(message, buttonId) {
    return `<div class="customer-tab-status customer-tab-error" role="alert"><p>${escapeHtml(message)}</p>
        <button id="${buttonId}" type="button">${i18n.t("customer.retry")}</button></div>`;
}

async function loadCustomerOrderIntake(customerId, customer, force = false) {
    const container = document.getElementById("customer-sales-content");
    const state = customerViewState;
    if (!container) return;
    if (!customer.salesforceId) {
        container.innerHTML = `<div class="customer-sales-empty"><h2>${i18n.t("customer.salesUnavailableTitle")}</h2>
            <p>${i18n.t("customer.salesLinkRequired")}</p>
            <button id="salesforce-find-from-sales" type="button">${i18n.t("salesforce.searchAndApply")}</button></div>`;
        document.getElementById("salesforce-find-from-sales")?.addEventListener("click", () =>
            document.getElementById("salesforce-find-customer")?.click());
        return;
    }
    if (state.sales && !force) {
        container.innerHTML = renderSales(state.sales, customer);
        registerSalesPdfExport(customer);
        return;
    }
    if (state.salesPromise) return state.salesPromise;
    container.innerHTML = renderTabLoading(i18n.t("customer.orderIntakeLoading"));
    state.salesPromise = (async () => {
        try {
            const result = await withSalesforceConnectionRetry(async () => {
                const response = await fetch(`/api/salesforce/customers/${customerId}/order-intake`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                return data;
            });
            if (!result.available) throw new Error(i18n.t("customer.orderIntakeUnavailable"));
            if (customerViewState !== state) return;
            state.sales = result;
            if (container.isConnected) {
                container.innerHTML = renderSales(result, customer);
                registerSalesPdfExport(customer);
            }
        } catch (error) {
            if (customerViewState === state && container.isConnected) {
                container.innerHTML = renderTabError(
                    error.message || i18n.t("customer.orderIntakeUnavailable"), "retry-sales");
                container.querySelector("#retry-sales")?.addEventListener("click", () =>
                    loadCustomerOrderIntake(customerId, customer, true));
            }
        } finally {
            state.salesPromise = null;
        }
    })();
    return state.salesPromise;
}

function renderSales(result, customer) {
    const years = result.years ?? [];
    const current = years[0];
    const currentHasData = Boolean(current) && current.hasData !== false;
    const currentAmountComplete = currentHasData && current.amountComplete !== false;
    const metrics = calculateSalesMetrics(years);
    const historyYears = years.slice(0, 10);
    return `<div class="customer-sales-card">
        <div class="customer-sales-print-title">${escapeHtml(customer?.name)}</div>
        <div class="customer-sales-header">
            <div><h2>${i18n.t("customer.salesOverview")}</h2><p>${i18n.t("customer.salesOverviewHint")}</p></div>
            <button id="export-sales-pdf" type="button">${i18n.t("customer.exportPdf")}</button>
        </div>
        <div class="customer-sales-metrics">
            ${renderMetric(i18n.t("customer.orderIntakeYear").replace("{year}", current?.year ?? ""), currentAmountComplete ? formatCurrency(current.orderAmount, result.currency) : "–", currentAmountComplete ? formatChange(current?.changePercent, current?.previousYearHasData) : formatAmountCoverage(current))}
            ${renderMetric(i18n.t("customer.ordersCurrentYear"), currentHasData ? String(current.orderCount ?? 0) : "–", currentHasData ? i18n.t("customer.ordersLabel") : i18n.t("customer.notEnoughData"))}
            ${renderMetric(i18n.t("customer.averageOrderValue"), metrics.currentAverageOrder === null ? "–" : formatCurrency(metrics.currentAverageOrder, result.currency), i18n.t("customer.currentYear"))}
            ${renderMetric(i18n.t("customer.fiveYearAverage"), metrics.fiveYearComparison === null ? "–" : formatPercent(metrics.fiveYearComparison), metrics.fiveYearComparison === null ? i18n.t("customer.notEnoughData") : i18n.t("customer.comparedToFiveYearAverage"))}
            ${renderMetric(i18n.t("customer.fiveYearDevelopment"), metrics.cagr === null ? "–" : `${formatPercent(metrics.cagr)} ${i18n.t("customer.perYear")}`, metrics.fiveYearTotal === null ? i18n.t("customer.notEnoughData") : i18n.t("customer.fiveYearTotalChange").replace("{value}", formatPercent(metrics.fiveYearTotal)).replace("{start}", metrics.trendStartYear).replace("{end}", metrics.trendEndYear))}
        </div>
        <section class="customer-order-intake customer-sales-section">
            <div class="customer-sales-section-heading"><h3>${i18n.t("customer.tenYearOverview")}</h3></div>
            <div class="customer-order-intake-grid customer-order-intake-grid-all">${historyYears.map((item, index) => renderOrderIntakeCard(item, index, result.currency)).join("")}</div></section>
        <section class="customer-order-intake-chart-panel customer-sales-section">
            <div class="customer-sales-section-heading"><h3>${i18n.t("customer.orderIntakeTrend")}</h3></div>
            ${renderOrderIntakeChart(years, result.currency)}
        </section>
    </div>`;
}

function registerSalesPdfExport(customer) {
    const button = document.getElementById("export-sales-pdf");
    if (!button) return;
    button.addEventListener("click", async () => {
        const originalLabel = button.textContent;
        button.disabled = true;
        button.textContent = i18n.t("customer.exportingPdf");
        document.body.classList.add("sales-analysis-printing");
        try {
            if (window.projectBuilder?.exportCurrentViewPdf) {
                await window.projectBuilder.exportCurrentViewPdf(
                    `${i18n.t("customer.salesOverview")} - ${customer?.name || ""}`
                );
            } else {
                window.print();
            }
        } catch (error) {
            await showAlert(error.message || i18n.t("customer.exportPdfFailed"));
        } finally {
            document.body.classList.remove("sales-analysis-printing");
            button.disabled = false;
            button.textContent = originalLabel;
        }
    });
}

function renderMetric(label, value, detail) {
    return `<div class="customer-sales-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></div>`;
}

function formatCurrency(value, currency) {
    return Number(value ?? 0).toLocaleString(i18n.getCurrentLanguage(), { style: "currency", currency: currency || "EUR" });
}

function formatPercent(value) {
    const number = Number(value);
    return `${number > 0 ? "+" : ""}${number.toLocaleString(i18n.getCurrentLanguage(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function formatChange(value, previousYearHasData = true) {
    return value !== null && value !== undefined && previousYearHasData !== false
        ? `${formatPercent(value)} ${i18n.t("customer.comparedToPreviousYear")}`
        : i18n.t("customer.notEnoughData");
}

function renderOrderIntakeCard(item, index, currency) {
    const change = Number(item.changePercent);
    const hasComparison = item.changePercent !== null
        && item.previousYearHasData !== false && Number.isFinite(change);
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
    const hasData = item.hasData !== false;
    const amountComplete = hasData && item.amountComplete !== false;
    const hasKnownAmount = hasData && item.orderAmount !== null
        && item.orderAmount !== undefined && Number.isFinite(Number(item.orderAmount));

    return `
        <div class="customer-order-intake-card${index === 0 ? " current" : ""}">
            <div class="customer-order-intake-period">
                <span>${item.year}${index === 0 ? ` · ${i18n.t("customer.currentYear")}` : ""}:</span>
                <small>${hasData ? `${item.orderCount} ${orderLabel}` : i18n.t("customer.noData")}</small>
            </div>
            <div class="customer-order-intake-value">
                <strong>${hasKnownAmount ? formatCurrency(item.orderAmount, currency) : "–"}</strong>
                <span class="customer-order-intake-trend ${trendClass}"
                    title="${i18n.t("customer.comparedToPreviousYear")}">
                    ${trendValue}
                </span>
            </div>
            <small class="customer-order-average">${amountComplete
                ? `${i18n.t("customer.averageOrderValue")}: ${averageOrderValue(item) === null
                    ? "–" : formatCurrency(averageOrderValue(item), currency)}`
                : escapeHtml(formatAmountCoverage(item))}</small>
        </div>
    `;
}

function renderOrderIntakeChart(years, currency) {
    const values = years.filter(item => item.hasData !== false && item.amountComplete !== false).reverse();
    if (!values.length) return `<p class="customer-order-intake-empty">${i18n.t("customer.notEnoughData")}</p>`;
    const width = 1200;
    const height = 300;
    const left = 96;
    const right = 28;
    const top = 24;
    const bottom = 48;
    const baseline = height - bottom;
    const maximum = Math.max(...values.map(item => Number(item.orderAmount) || 0), 1);
    const axisMaximum = getChartAxisMaximum(maximum);
    const ticks = Array.from({ length: 4 }, (_, index) => {
        const ratio = index / 3;
        return {
            value: axisMaximum * (1 - ratio),
            y: top + ratio * (baseline - top)
        };
    });
    const points = values.map((item, index) => ({
        ...item,
        x: left + index * ((width - left - right) / Math.max(values.length - 1, 1)),
        y: top + (1 - (Number(item.orderAmount) || 0) / axisMaximum) * (baseline - top)
    }));
    const line = points.map(point => `${point.x},${point.y}`).join(" ");
    const area = `${left},${baseline} ${line} ${width - right},${baseline}`;
    const formatValue = value => Number(value).toLocaleString(
        i18n.getCurrentLanguage(),
        { style: "currency", currency: currency || "EUR" }
    );

    return `
        <svg class="customer-order-intake-chart" viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="none"
            role="img" aria-label="${i18n.t("customer.orderIntakeTrend")}">
            <defs>
                <linearGradient id="order-intake-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#4c8bf5" stop-opacity=".28" />
                    <stop offset="100%" stop-color="#4c8bf5" stop-opacity=".02" />
                </linearGradient>
            </defs>
            ${ticks.map(tick => `
                <line x1="${left}" y1="${tick.y}" x2="${width - right}" y2="${tick.y}"
                    class="customer-order-chart-grid-line" />
                <text x="${left - 9}" y="${tick.y + 4}"
                    class="customer-order-chart-y-label">${formatChartAxisValue(tick.value, currency)}</text>
            `).join("")}
            <line x1="${left}" y1="${top}" x2="${left}" y2="${baseline}"
                class="customer-order-chart-axis" />
            <line x1="${left}" y1="${baseline}" x2="${width - right}" y2="${baseline}"
                class="customer-order-chart-axis" />
            <polygon points="${area}" fill="url(#order-intake-area)" />
            <polyline points="${line}" class="customer-order-chart-line" />
            ${points.map(point => `
                <g class="customer-order-chart-point-group">
                    <circle cx="${point.x}" cy="${point.y}" r="5.5"
                        class="customer-order-chart-point" />
                    <circle cx="${point.x}" cy="${point.y}" r="18"
                        class="customer-order-chart-hit" />
                    <text x="${point.x}" y="${height - 16}"
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

function formatAmountCoverage(item) {
    if (!item?.hasData) return i18n.t("customer.notEnoughData");
    const known = Number(item.amountKnownCount) || 0;
    const total = Number(item.orderCount) || 0;
    return i18n.t("customer.incompleteOrderAmounts")
        .replace("{known}", known)
        .replace("{total}", total)
        .replace("{missing}", Math.max(total - known, 0))
        .replace("{orders}", (item.missingOrders ?? []).join(", ") || "–");
}

function getChartAxisMaximum(value) {
    if (value <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / magnitude) * magnitude;
}

function formatChartAxisValue(value, currency) {
    return Number(value).toLocaleString(i18n.getCurrentLanguage(), {
        style: "currency",
        currency: currency || "EUR",
        notation: "compact",
        maximumFractionDigits: 1
    });
}

function renderOrderIntakeChartTooltip(point, formattedValue, chartWidth, chartTop) {
    const tooltipWidth = 204;
    const tooltipHeight = 68;
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
    const hasComparison = point.changePercent !== null
        && point.previousYearHasData !== false && Number.isFinite(change);
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
            <text x="${x + 10}" y="${y + 18}" class="customer-order-chart-tooltip-title">
                ${point.year} · ${point.orderCount} ${orderLabel}
            </text>
            <text x="${x + 10}" y="${y + 39}" class="customer-order-chart-tooltip-value">
                ${formattedValue}
            </text>
            <text x="${x + 10}" y="${y + 59}"
                class="customer-order-chart-tooltip-change ${changeClass}">
                ${changeValue} ${i18n.t("customer.comparedToPreviousYear")}
            </text>
        </g>
    `;
}

function registerAdditionalInfoAutoResize() {
    const textarea = document.getElementById("customer-additional-info");
    if (!textarea) return;
    const details = textarea.closest("details");
    const resize = () => {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 42), 180)}px`;
    };
    textarea.addEventListener("input", resize);
    details?.addEventListener("toggle", () => {
        customerViewState.additionalInfoOpen = details.open;
        resize();
    });
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
            customerViewState.projects = null;
            await loadCustomerProjects(customerId, true);
        } catch (error) {
            await showAlert(error.message || i18n.t("projects.createFailed"));
            saveButton.disabled = false;
        }
    });
}

async function loadSalesforceCustomerLink(customerId, salesforceId) {
    if (!salesforceId) return null;
    try {
        const { response, link } = await withSalesforceConnectionRetry(async () => {
            const response = await fetch(`/api/salesforce/customers/${customerId}/link`);
            const link = await response.json();
            if (!response.ok) throw new Error(link.error);
            return { response, link };
        });
        if (String(customerViewState.customerId) !== String(customerId)) return null;
        const target = document.getElementById("salesforce-customer-link");
        if (target?.isConnected && response.ok && link?.url) {
            target.innerHTML = `<a class="salesforce-record-link" href="${escapeHtml(link.url)}"
                target="_blank" rel="noopener noreferrer">${i18n.t("salesforce.openCustomer")}</a>`;
        }
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
            onComplete: () => {
                customerViewState.sales = null;
                renderView(customerId);
            }
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
            customerViewState.sales = null;
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
                customerViewState.projects = null;
                await loadCustomerProjects(customerId, true);
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
