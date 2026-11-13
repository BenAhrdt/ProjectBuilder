import * as i18n from "../utils/i18n.js";
import {
    GRIDVIS_DAYS_PER_YEAR,
    calculateLicenseExpansion,
    calculateMismatchedRenewal,
    calculateReactivation
} from "../utils/gridVisCalculations.js";

await i18n.loadLanguage();

const view = document.getElementById("view");
const selectedProjectStorageKey = "projectbuilder.gridvisItems.selectedProject";
let projects = [];
let articles = [];
let selectedProjectId = "";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}

function formatNumber(value) {
    return Number(value).toLocaleString(i18n.getCurrentLanguage(), {
        maximumFractionDigits: 2
    });
}

function renderInput(id, label, unit = "", placeholder = "") {
    return `
        <label class="gridvis-items-field" for="${id}">
            <span class="gridvis-items-field-label">${label}</span>
            <small class="gridvis-items-field-unit">${unit}</small>
            <input id="${id}" type="number" min="0" step="1" placeholder="${placeholder}" inputmode="numeric">
        </label>
    `;
}

function renderYearSelect(id, label) {
    return `
        <label class="gridvis-items-field" for="${id}">
            <span class="gridvis-items-field-label">${label}</span>
            <small class="gridvis-items-field-unit">Jahre</small>
            <select id="${id}" class="gridvis-items-field-select">
                <option value="1" selected>1</option>
                <option value="3">3</option>
            </select>
        </label>
    `;
}

function renderCard({ id, title, description, formula, fields, output, copyLabel }) {
    return `
        <section class="gridvis-items-card" data-calculator="${id}">
            <div class="gridvis-items-card-header">
                <h2>${title}</h2>
                <p>${description}</p>
            </div>
            <div class="gridvis-items-form">
                ${fields.join("")}
            </div>
            <div class="gridvis-items-formula">
                <strong>${i18n.t("gridvisItems.formula")}</strong>
                <code>${formula}</code>
            </div>
            <div class="gridvis-items-result" aria-live="polite">
                <div>
                    <span>${output.label}</span>
                    <strong data-output="${output.key}">—</strong>
                </div>
                ${output.secondary ? `
                    <div>
                        <span>${output.secondary.label}</span>
                        <strong data-output="${output.secondary.key}">—</strong>
                    </div>
                ` : ""}
            </div>
            <p class="gridvis-items-error" data-error="${id}" hidden></p>
            <button type="button" class="gridvis-items-copy" data-copy="${id}" disabled>
                ${copyLabel}
            </button>
        </section>
    `;
}

function renderShell() {
    const projectOptions = projects.map(project => `
        <option value="${escapeHtml(project.id)}" ${String(project.id) === String(selectedProjectId) ? "selected" : ""}>
            ${escapeHtml(project.name || i18n.t("gridvisItems.unnamedProject"))}
        </option>
    `).join("");

    view.innerHTML = `
        <div id="gridvis-items-header" class="view-header">
            <span class="header-text">${i18n.t("gridvisItems.title")}</span>
            <span class="meta-informations">${i18n.t("gridvisItems.subtitle")}</span>
        </div>
        <div id="gridvis-items-content" class="view-content">
            <div class="gridvis-items-toolbar">
                <div class="gridvis-items-toolbar-heading">
                    <strong>${i18n.t("gridvisItems.projectContext")}</strong>
                    <span>${i18n.t("gridvisItems.projectContextHint")}</span>
                </div>
                <select id="gridvis-items-project" aria-label="${i18n.t("gridvisItems.projectContext")}">
                    <option value="">${i18n.t("gridvisItems.noProject")}</option>
                    ${projectOptions}
                </select>
                <button id="gridvis-items-load-project" type="button" class="gridvis-items-button" disabled>
                    ${i18n.t("gridvisItems.loadProject")}
                </button>
                <div id="gridvis-items-project-summary" class="gridvis-items-project-summary" aria-live="polite">
                    ${i18n.t("gridvisItems.noProjectSelected")}
                </div>
            </div>
            <div class="gridvis-items-notice">
                <strong>${i18n.t("gridvisItems.noticeTitle")}</strong>
                <span>${i18n.t("gridvisItems.noticeText")}</span>
            </div>
            <div class="gridvis-items-grid">
                ${renderCard({
                    id: "expansion",
                    title: i18n.t("gridvisItems.expansionTitle"),
                    description: i18n.t("gridvisItems.expansionDescription"),
                    formula: "[(Items Bestand × Rest-AZR Bestand) + (Items Erweiterung × AZR Erweiterung × 365)] / Items NEU",
                    fields: [
                        renderInput("gridvis-expansion-existing-items", i18n.t("gridvisItems.existingItems"), "Items"),
                        renderInput("gridvis-expansion-existing-azr", i18n.t("gridvisItems.existingAzr"), "Tage"),
                        renderInput("gridvis-expansion-added-items", i18n.t("gridvisItems.addedItems"), "Items"),
                        renderYearSelect("gridvis-expansion-added-azr", i18n.t("gridvisItems.addedAzr"))
                    ],
                    output: {
                        label: i18n.t("gridvisItems.newAzr"),
                        key: "expansion-azr",
                        secondary: { label: i18n.t("gridvisItems.newItems"), key: "expansion-items" }
                    },
                    copyLabel: i18n.t("gridvisItems.copyResult")
                })}
                ${renderCard({
                    id: "renewal",
                    title: i18n.t("gridvisItems.renewalTitle"),
                    description: i18n.t("gridvisItems.renewalDescription"),
                    formula: "[(Items Bestand × Rest-AZR) + (Items Verlängerung × Jahre × 365)] / Items Bestand",
                    fields: [
                        renderInput("gridvis-renewal-existing-items", i18n.t("gridvisItems.existingItems"), "Items"),
                        renderInput("gridvis-renewal-existing-azr", i18n.t("gridvisItems.existingAzr"), "Tage"),
                        renderInput("gridvis-renewal-items", i18n.t("gridvisItems.renewalItems"), "Items"),
                        renderYearSelect("gridvis-renewal-years", i18n.t("gridvisItems.renewalYears"))
                    ],
                    output: {
                        label: i18n.t("gridvisItems.newAzr"),
                        key: "renewal-azr",
                        secondary: { label: i18n.t("gridvisItems.renewalDays"), key: "renewal-days" }
                    },
                    copyLabel: i18n.t("gridvisItems.copyResult")
                })}
                ${renderCard({
                    id: "reactivation",
                    title: i18n.t("gridvisItems.reactivationTitle"),
                    description: i18n.t("gridvisItems.reactivationDescription"),
                    formula: "Σ(aktive/geparkte Items × jeweilige Rest-AZR) / aktive Items NEU",
                    fields: [
                        renderInput("gridvis-reactivation-active-items", i18n.t("gridvisItems.activeItems"), "Items"),
                        renderInput("gridvis-reactivation-active-azr", i18n.t("gridvisItems.activeAzr"), "Tage"),
                        renderInput("gridvis-reactivation-group-1-items", i18n.t("gridvisItems.parkedItems").replace("{number}", "1"), "Items", "0"),
                        renderInput("gridvis-reactivation-group-1-azr", i18n.t("gridvisItems.parkedAzr").replace("{number}", "1"), "Tage", "0"),
                        renderInput("gridvis-reactivation-group-2-items", i18n.t("gridvisItems.parkedItems").replace("{number}", "2"), "Items", "0"),
                        renderInput("gridvis-reactivation-group-2-azr", i18n.t("gridvisItems.parkedAzr").replace("{number}", "2"), "Tage", "0")
                    ],
                    output: {
                        label: i18n.t("gridvisItems.newAzr"),
                        key: "reactivation-azr",
                        secondary: { label: i18n.t("gridvisItems.activeItemsNew"), key: "reactivation-items" }
                    },
                    copyLabel: i18n.t("gridvisItems.copyResult")
                })}
            </div>
        </div>
    `;

    document.getElementById("gridvis-items-project").addEventListener("change", event => {
        selectedProjectId = event.target.value;
        localStorage.setItem(selectedProjectStorageKey, selectedProjectId);
        const button = document.getElementById("gridvis-items-load-project");
        button.disabled = !selectedProjectId;
        if (!selectedProjectId) {
            document.getElementById("gridvis-items-project-summary").textContent = i18n.t("gridvisItems.noProjectSelected");
        }
    });
    document.getElementById("gridvis-items-load-project").addEventListener("click", loadSelectedProject);
    document.querySelectorAll("#gridvis-items-content input, #gridvis-items-content select").forEach(input => {
        input.addEventListener("input", updateCalculations);
        input.addEventListener("change", updateCalculations);
    });
    document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", () => copyResult(button.dataset.copy)));

    const projectButton = document.getElementById("gridvis-items-load-project");
    projectButton.disabled = !selectedProjectId;
    updateCalculations();
}

async function loadSelectedProject() {
    if (!selectedProjectId) return;
    const summary = document.getElementById("gridvis-items-project-summary");
    const button = document.getElementById("gridvis-items-load-project");
    button.disabled = true;
    summary.textContent = i18n.t("gridvisItems.loadingProject");

    try {
        const [nodesResponse, positionsResponse] = await Promise.all([
            fetch(`/api/projectNodes/${encodeURIComponent(selectedProjectId)}`),
            fetch(`/api/projectNodeArticles?projectId=${encodeURIComponent(selectedProjectId)}`)
        ]);
        if (!nodesResponse.ok || !positionsResponse.ok) throw new Error(i18n.t("gridvisItems.projectLoadFailed"));
        const [nodes, positions] = await Promise.all([nodesResponse.json(), positionsResponse.json()]);
        const nodesById = new Map(nodes.map(node => [String(node.id), node]));
        const articlesByNumber = new Map(articles.map(article => [String(article.articleNumber), article]));
        let totalItems = 0;
        let unchecked = 0;

        positions.forEach(position => {
            if (Number(position.isOptional) === 1 || Number(position.isAlternative) === 1) return;
            const article = articlesByNumber.get(String(position.articleNumber));
            const items = Number(article?.gridVisItems);
            if (!Number.isFinite(items)) {
                unchecked += 1;
                return;
            }
            totalItems += items * (Number(position.quantity) || 1);
        });

        const project = projects.find(item => String(item.id) === String(selectedProjectId));
        const nodeCount = nodesById.size;
        summary.innerHTML = `<strong>${escapeHtml(project?.name || i18n.t("gridvisItems.unnamedProject"))}</strong>: ${formatNumber(totalItems)} ${i18n.t("gridvisItems.items")}`
            + (unchecked ? ` · <span class="gridvis-items-warning">${unchecked} ${i18n.t("gridvisItems.uncheckedPositions")}</span>` : "")
            + ` · ${nodeCount} ${i18n.t("gridvisItems.structureNodes")}`;

        setInputValue("gridvis-expansion-existing-items", totalItems);
        setInputValue("gridvis-renewal-existing-items", totalItems);
        setInputValue("gridvis-reactivation-active-items", totalItems);
        updateCalculations();
    } catch (error) {
        summary.textContent = error.message || i18n.t("gridvisItems.projectLoadFailed");
    } finally {
        button.disabled = false;
    }
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = Number.isFinite(value) ? String(value) : "";
}

function readInput(id) {
    return document.getElementById(id)?.value ?? "";
}

function hasAnyValue(ids) {
    return ids.some(id => readInput(id) !== "");
}

function setOutput(key, value, suffix = "") {
    const output = document.querySelector(`[data-output="${key}"]`);
    if (output) output.textContent = value === null ? "—" : `${formatNumber(value)}${suffix}`;
}

function updateCalculations() {
    const results = {};
    const errors = {};

    try {
        const fields = ["gridvis-expansion-existing-items", "gridvis-expansion-existing-azr", "gridvis-expansion-added-items", "gridvis-expansion-added-azr"];
        if (!hasAnyValue(fields)) throw new Error("");
        if (fields.some(id => readInput(id) === "")) throw new Error(i18n.t("gridvisItems.fillAllFields"));
        results.expansion = calculateLicenseExpansion({
            existingItems: readInput("gridvis-expansion-existing-items"),
            existingAzrDays: readInput("gridvis-expansion-existing-azr"),
            expansionItems: readInput("gridvis-expansion-added-items"),
            expansionAzrDays: Number(readInput("gridvis-expansion-added-azr")) * GRIDVIS_DAYS_PER_YEAR
        });
    } catch (error) { errors.expansion = error.message; }

    try {
        const fields = ["gridvis-renewal-existing-items", "gridvis-renewal-existing-azr", "gridvis-renewal-items", "gridvis-renewal-years"];
        if (!hasAnyValue(fields)) throw new Error("");
        if (fields.some(id => readInput(id) === "")) throw new Error(i18n.t("gridvisItems.fillAllFields"));
        results.renewal = calculateMismatchedRenewal({
            existingItems: readInput("gridvis-renewal-existing-items"),
            existingAzrDays: readInput("gridvis-renewal-existing-azr"),
            renewalItems: readInput("gridvis-renewal-items"),
            renewalYears: readInput("gridvis-renewal-years")
        });
    } catch (error) { errors.renewal = error.message; }

    try {
        const fields = ["gridvis-reactivation-active-items", "gridvis-reactivation-active-azr"];
        const allFields = [...fields, "gridvis-reactivation-group-1-items", "gridvis-reactivation-group-1-azr", "gridvis-reactivation-group-2-items", "gridvis-reactivation-group-2-azr"];
        if (!hasAnyValue(allFields)) throw new Error("");
        if (fields.some(id => readInput(id) === "")) throw new Error(i18n.t("gridvisItems.fillAllFields"));
        results.reactivation = calculateReactivation({
            activeItems: readInput("gridvis-reactivation-active-items"),
            activeAzrDays: readInput("gridvis-reactivation-active-azr"),
            parkedGroups: [
                { items: readInput("gridvis-reactivation-group-1-items"), azrDays: readInput("gridvis-reactivation-group-1-azr") },
                { items: readInput("gridvis-reactivation-group-2-items"), azrDays: readInput("gridvis-reactivation-group-2-azr") }
            ]
        });
    } catch (error) { errors.reactivation = error.message; }

    setOutput("expansion-azr", results.expansion?.azrDays ?? null, ` ${i18n.t("gridvisItems.days")}`);
    setOutput("expansion-items", results.expansion?.totalItems ?? null, ` ${i18n.t("gridvisItems.items")}`);
    setOutput("renewal-azr", results.renewal?.azrDays ?? null, ` ${i18n.t("gridvisItems.days")}`);
    setOutput("renewal-days", results.renewal?.renewalDays ?? null, ` ${i18n.t("gridvisItems.days")}`);
    setOutput("reactivation-azr", results.reactivation?.azrDays ?? null, ` ${i18n.t("gridvisItems.days")}`);
    setOutput("reactivation-items", results.reactivation?.totalItems ?? null, ` ${i18n.t("gridvisItems.items")}`);

    ["expansion", "renewal", "reactivation"].forEach(id => {
        const card = document.querySelector(`[data-calculator="${id}"]`);
        const error = document.querySelector(`[data-error="${id}"]`);
        const copy = document.querySelector(`[data-copy="${id}"]`);
        error.textContent = errors[id] || "";
        error.hidden = !errors[id];
        copy.disabled = Boolean(errors[id]);
        card.classList.toggle("has-error", Boolean(errors[id]));
    });
    window.__gridVisItemResults = results;
}

async function copyResult(id) {
    const result = window.__gridVisItemResults?.[id];
    if (!result) return;
    const text = id === "expansion"
        ? `${i18n.t("gridvisItems.expansionTitle")}: ${formatNumber(result.totalItems)} ${i18n.t("gridvisItems.items")}, ${i18n.t("gridvisItems.newAzr")}: ${formatNumber(result.azrDays)} ${i18n.t("gridvisItems.days")}`
        : id === "renewal"
            ? `${i18n.t("gridvisItems.renewalTitle")}: ${i18n.t("gridvisItems.newAzr")}: ${formatNumber(result.azrDays)} ${i18n.t("gridvisItems.days")}`
            : `${i18n.t("gridvisItems.reactivationTitle")}: ${formatNumber(result.totalItems)} ${i18n.t("gridvisItems.items")}, ${i18n.t("gridvisItems.newAzr")}: ${formatNumber(result.azrDays)} ${i18n.t("gridvisItems.days")}`;

    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const helper = document.createElement("textarea");
        helper.value = text;
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
    }
}

export async function renderView() {
    view.innerHTML = `<div class="gridvis-items-loading">${i18n.t("gridvisItems.loading")}</div>`;
    try {
        const [projectsResponse, articlesResponse] = await Promise.all([
            fetch("/api/projects"),
            fetch("/api/articles")
        ]);
        if (!projectsResponse.ok || !articlesResponse.ok) throw new Error(i18n.t("gridvisItems.loadFailed"));
        projects = await projectsResponse.json();
        articles = await articlesResponse.json();
        const pathProjectId = window.location.pathname.startsWith("/project/")
            ? window.location.pathname.split("/")[2]
            : "";
        selectedProjectId = pathProjectId || localStorage.getItem(selectedProjectStorageKey) || "";
        if (!projects.some(project => String(project.id) === String(selectedProjectId))) selectedProjectId = "";
        renderShell();
    } catch (error) {
        view.innerHTML = `<div class="gridvis-items-loading gridvis-items-loading-error">${escapeHtml(error.message || i18n.t("gridvisItems.loadFailed"))}</div>`;
    }
}
