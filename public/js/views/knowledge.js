import * as i18n from "../utils/i18n.js";
import { showConfirm } from "../utils/modal.js";
import { showSalesforceProgress, finishSalesforceProgress } from "../utils/salesforceProgress.js";

await i18n.loadLanguage();

const view = document.getElementById("view");
let activeSection = "faq";
let faqEntries = [];
let technicalEntries = [];
let archiveEntries = [];
let articleEntries = [];
let knowledgeRemoteModifiedAt = null;
let selectedFilter = "";
let showArchive = false;
let comparisonSearch = "";
let selectedComparisonArticleKeys = [];
const comparisonArticleInfoDelay = 700;
const comparisonArticleInfoHideDelay = 600;
let comparisonArticleInfoCardShowTimer = null;
let comparisonArticleInfoCardHideTimer = null;
let activeComparisonArticleInfoCard = null;

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}

function renderViewContent() {
    const isComparison = activeSection === "comparison";
    const isArchive = showArchive && !isComparison;
    const entries = isArchive
        ? archiveEntries.filter(entry => entry.archiveEntryType === activeSection)
        : activeSection === "faq" ? faqEntries : technicalEntries;
    const filterOptions = isComparison ? [] : getFilterOptions(entries);
    const activeLabel = isArchive
        ? `${activeSection === "faq" ? i18n.t("knowledge.faq") : i18n.t("knowledge.technical")} – ${i18n.t("knowledge.archiveView")}`
        : activeSection === "faq"
            ? i18n.t("knowledge.faq")
            : activeSection === "technical"
                ? i18n.t("knowledge.technical")
                : i18n.t("knowledge.comparison");
    const entryCount = isComparison
        ? `${getComparisonArticles().length} ${i18n.t("knowledge.articles")}`
        : `${entries.length} ${i18n.t("knowledge.entries")}`;

    view.innerHTML = `
        <div id="knowledge-header" class="view-header">
            <span class="header-text">${i18n.t("knowledge.title")}</span>
            <span class="meta-informations">${i18n.t("knowledge.subtitle")}</span>
        </div>
        <main id="knowledge-content" class="view-content">
            <div class="knowledge-toolbar">
                <div class="knowledge-tabs" role="tablist" aria-label="${i18n.t("knowledge.title")}">
                    <button type="button" role="tab" data-knowledge-section="faq" aria-selected="${activeSection === "faq"}">
                        ${i18n.t("knowledge.faq")}
                    </button>
                    <button type="button" role="tab" data-knowledge-section="technical" aria-selected="${activeSection === "technical"}">
                        ${i18n.t("knowledge.technical")}
                    </button>
                    <button type="button" role="tab" data-knowledge-section="comparison" aria-selected="${isComparison}">
                        ${i18n.t("knowledge.comparison")}
                    </button>
                </div>
                ${isComparison ? "" : `
                    <div class="knowledge-toolbar-filters">
                        <label class="knowledge-search-label" for="knowledge-search">${i18n.t("knowledge.search")}</label>
                        <input id="knowledge-search" type="search" placeholder="${i18n.t("knowledge.searchPlaceholder")}" value="${escapeHtml(document.getElementById("knowledge-search")?.value || "")}">
                        <select id="knowledge-filter" aria-label="${i18n.t("knowledge.filter")}">
                            <option value="">${i18n.t("knowledge.allFilters")}</option>
                            ${filterOptions.map(option => `<option value="${escapeHtml(option)}" ${option === selectedFilter ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
                        </select>
                    </div>
                `}
                <div class="knowledge-toolbar-actions">
                    ${isComparison ? "" : `
                        <button id="knowledge-archive-toggle" type="button" class="knowledge-secondary">
                            ${escapeHtml(i18n.t(isArchive ? "knowledge.activeView" : "knowledge.archiveView"))}
                        </button>
                    `}
                    ${isComparison || isArchive ? "" : `
                        <button id="knowledge-new-button" type="button" class="knowledge-primary">
                            ${i18n.t("knowledge.new")}
                        </button>
                    `}
                    <button id="knowledge-salesforce-sync-button" type="button" class="knowledge-secondary">
                        ${i18n.t("knowledge.salesforceSync")}
                    </button>
                    <button id="knowledge-import-button" type="button" class="knowledge-primary">
                        ${i18n.t("knowledge.import")}
                    </button>
                    <input id="knowledge-import-file" type="file" accept=".xlsx,.xls" hidden>
                </div>
            </div>
            <div class="knowledge-import-hint">
                ${i18n.t("knowledge.importHint")}
            </div>
            <div id="knowledge-status" class="knowledge-status" aria-live="polite"></div>
            <div class="knowledge-list-header">
                <strong>${activeLabel}</strong>
                <span>${entryCount}</span>
            </div>
            <div id="knowledge-list" class="knowledge-list">
                ${renderEntries(entries)}
            </div>
        </main>
    `;

    document.querySelectorAll("[data-knowledge-section]").forEach(button => {
        button.addEventListener("click", () => {
            activeSection = button.dataset.knowledgeSection;
            selectedFilter = "";
            showArchive = false;
            renderViewContent();
        });
    });
    if (!isComparison) {
        document.getElementById("knowledge-search").addEventListener("input", renderFilteredEntries);
        document.getElementById("knowledge-filter").addEventListener("change", event => {
            selectedFilter = event.target.value;
            renderFilteredEntries();
        });
        document.getElementById("knowledge-archive-toggle").addEventListener("click", () => {
            showArchive = !showArchive;
            selectedFilter = "";
            renderViewContent();
        });
        document.getElementById("knowledge-new-button")?.addEventListener("click", () => {
            openKnowledgeEditor(activeSection);
        });
        bindKnowledgeEntryActions();
    }
    document.getElementById("knowledge-import-button").addEventListener("click", () => {
        document.getElementById("knowledge-import-file").click();
    });
    document.getElementById("knowledge-import-file").addEventListener("change", event => {
        importWorkbook(event.target.files[0]);
    });
    document.getElementById("knowledge-salesforce-sync-button").addEventListener("click", () => {
        refreshSalesforceKnowledge();
    });
    if (isComparison) {
        bindComparisonControls();
        bindComparisonArticleInfoCards();
    } else {
        hideComparisonArticleInfoCard(true);
    }
}

function getFilterOptions(entries) {
    const values = new Set();
    entries.forEach(entry => {
        if (activeSection === "faq") {
            String(entry.category || "").split(/[;,]/).map(value => value.trim()).filter(Boolean).forEach(value => values.add(value));
            String(entry.articleReferences || "").split(/[;,]/).map(value => value.trim()).filter(Boolean).forEach(value => values.add(value));
            String(entry.deviceTypes || "").split(/[;,]/).map(value => value.trim()).filter(Boolean).forEach(value => values.add(value));
        } else {
            [entry.articleNumber, entry.deviceType, entry.category].map(value => String(value || "").trim()).filter(Boolean).forEach(value => values.add(value));
        }
    });
    return [...values].sort((a, b) => a.localeCompare(b, i18n.getCurrentLanguage(), { numeric: true, sensitivity: "base" }));
}

function getFilteredEntries() {
    const search = String(document.getElementById("knowledge-search")?.value || "").trim().toLocaleLowerCase();
    const entries = showArchive
        ? archiveEntries.filter(entry => entry.archiveEntryType === activeSection)
        : activeSection === "faq" ? faqEntries : technicalEntries;
    return entries.filter(entry => {
        const values = activeSection === "faq"
            ? [entry.question, entry.answer, entry.category, entry.articleReferences, entry.deviceTypes, entry.tags, entry.source]
            : [entry.articleNumber, entry.deviceType, entry.category, entry.parameter, entry.value, entry.unit, entry.source, entry.notes];
        const filterMatches = !selectedFilter || values.some(value => String(value || "").split(/[;,]/).map(item => item.trim()).includes(selectedFilter));
        const searchMatches = !search || values.some(value => String(value || "").toLocaleLowerCase().includes(search));
        return filterMatches && searchMatches;
    });
}

function renderFilteredEntries() {
    const list = document.getElementById("knowledge-list");
    if (list) list.innerHTML = renderEntries(getFilteredEntries());
    bindKnowledgeEntryActions();
    const count = document.querySelector(".knowledge-list-header span");
    if (count) count.textContent = `${getFilteredEntries().length} ${i18n.t("knowledge.entries")}`;
}

function renderEntries(entries) {
    if (activeSection === "comparison") return renderComparison();
    if (!entries.length) {
        return `<div class="knowledge-empty">${i18n.t(activeSection === "faq" ? "knowledge.noFaq" : "knowledge.noTechnical")}</div>`;
    }
    return activeSection === "faq"
        ? entries.map(showArchive ? renderArchivedFaqEntry : renderFaqEntry).join("")
        : `<div class="knowledge-table-wrapper"><table class="knowledge-table">
            <thead><tr>
                <th>${i18n.t("knowledge.articleNumber")}</th>
                <th>${i18n.t("knowledge.deviceType")}</th>
                <th>${i18n.t("knowledge.parameter")}</th>
                <th>${i18n.t("knowledge.value")}</th>
                <th>${i18n.t("knowledge.unit")}</th>
                <th>${i18n.t("knowledge.source")}</th>
                <th>${i18n.t("knowledge.actions")}</th>
            </tr></thead>
            <tbody>${entries.map(showArchive ? renderArchivedTechnicalEntry : renderTechnicalEntry).join("")}</tbody>
        </table></div>`;
}

function makeComparisonArticleKey(articleNumber, deviceType = "") {
    const normalizedArticleNumber = String(articleNumber || "").trim();
    const normalizedDeviceType = String(deviceType || "").trim();
    return encodeURIComponent(
        normalizedArticleNumber
            ? `article\u001f${normalizedArticleNumber}`
            : `type\u001f${normalizedDeviceType}`
    );
}

function splitComparisonArticleReferences(value) {
    return String(value || "")
        .split(/[;,]/)
        .map(item => item.trim())
        .filter(Boolean);
}

function getComparisonArticles() {
    const articles = new Map();
    const addArticle = ({ articleNumber, deviceType, article = null, category = "" }) => {
        const normalizedArticleNumber = String(articleNumber || "").trim();
        const normalizedDeviceType = String(deviceType || "").trim();
        if (!normalizedArticleNumber && !normalizedDeviceType) return;
        const key = makeComparisonArticleKey(normalizedArticleNumber, normalizedDeviceType);
        if (!articles.has(key)) {
            articles.set(key, {
                key,
                articleNumber: normalizedArticleNumber,
                deviceType: normalizedDeviceType,
                article,
                categories: new Set()
            });
        } else if (!articles.get(key).article && article) {
            articles.get(key).article = article;
        }
        if (!articles.get(key).deviceType && normalizedDeviceType) {
            articles.get(key).deviceType = normalizedDeviceType;
        }
        if (category) articles.get(key).categories.add(String(category).trim());
    };

    articleEntries.forEach(article => addArticle({
        articleNumber: article.articleNumber,
        deviceType: article.manufacturerType,
        article
    }));
    technicalEntries.forEach(entry => {
        const deviceType = String(entry.deviceType || "").trim();
        const articleNumbers = splitComparisonArticleReferences(entry.articleNumber);
        (articleNumbers.length ? articleNumbers : [""]).forEach(articleNumber => {
            addArticle({ articleNumber, deviceType, category: entry.category });
        });
    });

    return [...articles.values()].sort((first, second) => getComparisonArticleLabel(first)
        .localeCompare(getComparisonArticleLabel(second), i18n.getCurrentLanguage(), {
            numeric: true,
            sensitivity: "base"
        }));
}

function getComparisonArticleLabel(article) {
    return [article.articleNumber, article.article?.manufacturerType || article.deviceType]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(" · ");
}

function getSelectedComparisonArticles(articles = getComparisonArticles()) {
    const availableKeys = new Set(articles.map(article => article.key));
    selectedComparisonArticleKeys = selectedComparisonArticleKeys.filter(key => availableKeys.has(key));
    const selectedKeys = new Set(selectedComparisonArticleKeys);
    return articles.filter(article => selectedKeys.has(article.key));
}

function renderComparison() {
    const articles = getComparisonArticles();
    if (!articles.length) {
        return `<div class="knowledge-empty">${i18n.t("knowledge.noComparisonArticles")}</div>`;
    }

    const selectedArticles = getSelectedComparisonArticles(articles);
    const selectedKeys = new Set(selectedArticles.map(article => article.key));
    return `<div class="knowledge-comparison">
        <section class="knowledge-comparison-picker" aria-labelledby="knowledge-comparison-picker-title">
            <div class="knowledge-comparison-picker-header">
                <div>
                    <strong id="knowledge-comparison-picker-title">${i18n.t("knowledge.comparisonSelect")}</strong>
                    <span id="knowledge-comparison-selected-count" class="knowledge-comparison-selection-count">${renderComparisonSelectionCount(selectedArticles.length)}</span>
                </div>
                <button id="knowledge-comparison-clear" type="button" class="knowledge-secondary" ${selectedArticles.length ? "" : "disabled"}>
                    ${i18n.t("knowledge.comparisonClear")}
                </button>
            </div>
            <div class="knowledge-comparison-search-row">
                <label class="knowledge-search-label" for="knowledge-comparison-search">${i18n.t("knowledge.search")}</label>
                <input id="knowledge-comparison-search" type="search" placeholder="${i18n.t("knowledge.comparisonSearchPlaceholder")}" value="${escapeHtml(comparisonSearch)}">
                <div id="knowledge-comparison-chips" class="knowledge-comparison-chips">
                    ${renderComparisonSelectedChips(selectedArticles)}
                </div>
            </div>
            <div id="knowledge-comparison-devices" class="knowledge-comparison-devices">
                ${renderComparisonArticleOptions(articles, selectedKeys)}
            </div>
        </section>
        <section id="knowledge-comparison-result" class="knowledge-comparison-result" aria-live="polite">
            ${renderComparisonResult(selectedArticles)}
        </section>
    </div>`;
}

function renderComparisonSelectionCount(count) {
    const label = count === 1 ? i18n.t("knowledge.article") : i18n.t("knowledge.articles");
    return `${count} ${label} ${i18n.t("knowledge.comparisonSelected")}`;
}

function renderComparisonSelectedChips(selectedArticles) {
    if (!selectedArticles.length) {
        return `<span class="knowledge-comparison-no-selection">${i18n.t("knowledge.comparisonNoSelection")}</span>`;
    }
    return selectedArticles.map(article => `
        <span class="knowledge-comparison-chip ${article.article ? "knowledge-comparison-article" : ""}" ${article.article ? `data-comparison-article-number="${escapeHtml(article.articleNumber)}"` : ""}>
            <span class="knowledge-comparison-chip-label" title="${escapeHtml(getComparisonArticleLabel(article))}">${escapeHtml(getComparisonArticleLabel(article))}</span>
            <button type="button" class="knowledge-comparison-chip-remove" data-comparison-remove="${escapeHtml(article.key)}" aria-label="${escapeHtml(i18n.t("knowledge.comparisonRemove"))}">×</button>
        </span>
    `).join("");
}

function renderComparisonArticleOptions(articles, selectedKeys) {
    const search = comparisonSearch.trim().toLocaleLowerCase();
    const filteredArticles = articles.filter(article => [
        getComparisonArticleLabel(article),
        article.articleNumber,
        article.deviceType,
        article.article?.description,
        ...article.categories
    ].some(value => String(value || "").toLocaleLowerCase().includes(search)));

    if (!filteredArticles.length) {
        return `<div class="knowledge-comparison-no-results">${i18n.t("knowledge.comparisonNoArticles")}</div>`;
    }

    return filteredArticles.map(article => `
        <label class="knowledge-comparison-device ${selectedKeys.has(article.key) ? "is-selected" : ""} ${article.article ? "knowledge-comparison-article" : ""}" ${article.article ? `data-comparison-article-number="${escapeHtml(article.articleNumber)}"` : ""}>
            <input type="checkbox" data-comparison-device="${escapeHtml(article.key)}" ${selectedKeys.has(article.key) ? "checked" : ""}>
            <span>
                <strong>${escapeHtml(getComparisonArticleLabel(article))}</strong>
                ${article.categories.size ? `<small>${escapeHtml([...article.categories].join(" · "))}</small>` : ""}
            </span>
        </label>
    `).join("");
}

function addComparisonRow(rows, { articleKey, parameter, category = "", unit = "", value = "", notes = "" }) {
    const normalizedParameter = String(parameter || "").trim();
    if (!normalizedParameter || !articleKey) return;
    const normalizedCategory = String(category || "").trim();
    const normalizedUnit = String(unit || "").trim();
    const rowKey = [normalizedParameter, normalizedCategory, normalizedUnit]
        .map(item => item.toLocaleLowerCase())
        .join("\u001f");
    if (!rows.has(rowKey)) {
        rows.set(rowKey, {
            parameter: normalizedParameter,
            category: normalizedCategory,
            unit: normalizedUnit,
            values: new Map()
        });
    }
    const row = rows.get(rowKey);
    if (!row.values.has(articleKey)) row.values.set(articleKey, { values: [], notes: [] });
    const cell = row.values.get(articleKey);
    const normalizedValue = String(value || "").trim();
    const normalizedNotes = String(notes || "").trim();
    if (normalizedValue && !cell.values.includes(normalizedValue)) cell.values.push(normalizedValue);
    if (normalizedNotes && !cell.notes.includes(normalizedNotes)) cell.notes.push(normalizedNotes);
}

function buildComparisonRows(selectedArticles) {
    const selectedKeys = new Set(selectedArticles.map(article => article.key));
    const rows = new Map();
    technicalEntries.forEach(entry => {
        const deviceType = String(entry.deviceType || "").trim();
        const articleNumbers = splitComparisonArticleReferences(entry.articleNumber);
        (articleNumbers.length ? articleNumbers : [""]).forEach(articleNumber => {
            const articleKey = makeComparisonArticleKey(articleNumber, deviceType);
            if (!selectedKeys.has(articleKey)) return;
            addComparisonRow(rows, {
                articleKey,
                parameter: entry.parameter,
                category: entry.category,
                unit: entry.unit,
                value: entry.value,
                notes: entry.notes
            });
        });
    });

    return [...rows.values()].sort((first, second) => {
        const categoryCompare = first.category.localeCompare(second.category, i18n.getCurrentLanguage(), { sensitivity: "base" });
        return categoryCompare || first.parameter.localeCompare(second.parameter, i18n.getCurrentLanguage(), { numeric: true, sensitivity: "base" });
    });
}

function renderComparisonResult(selectedDevices) {
    if (selectedDevices.length < 2) {
        return `<div class="knowledge-comparison-placeholder">${i18n.t("knowledge.comparisonSelectHint")}</div>`;
    }

    const rows = buildComparisonRows(selectedDevices);
    if (!rows.length) {
        return `<div class="knowledge-comparison-placeholder">${i18n.t("knowledge.noComparisonData")}</div>`;
    }

    return `<div class="knowledge-comparison-result-header">
        <div>
            <strong>${i18n.t("knowledge.comparisonResult")}</strong>
            <span>${i18n.t("knowledge.comparisonDifferenceHint")}</span>
        </div>
        <button id="knowledge-comparison-copy" type="button" class="knowledge-secondary">
            ${i18n.t("knowledge.comparisonCopy")}
        </button>
    </div>
    <div class="knowledge-table-wrapper">
        <table class="knowledge-table knowledge-comparison-table">
            <thead><tr>
                <th scope="col">${i18n.t("knowledge.parameter")}</th>
                ${selectedDevices.map(article => `<th scope="col">${escapeHtml(getComparisonArticleLabel(article))}</th>`).join("")}
            </tr></thead>
            <tbody>${rows.map(row => renderComparisonRow(row, selectedDevices)).join("")}</tbody>
        </table>
    </div>`;
}

function renderComparisonRow(row, selectedDevices) {
    const normalizedValues = new Set();
    row.values.forEach(cell => cell.values.forEach(value => normalizedValues.add(value.toLocaleLowerCase())));
    const hasDifference = normalizedValues.size > 1;
    return `<tr>
        <th scope="row">
            <strong>${escapeHtml(row.parameter)}</strong>
            ${row.category || row.unit ? `<small>${escapeHtml([row.category, row.unit].filter(Boolean).join(" · "))}</small>` : ""}
        </th>
        ${selectedDevices.map(device => {
            const cell = row.values.get(device.key);
            const hasValue = Boolean(cell?.values.length);
            return `<td class="${hasDifference && hasValue ? "knowledge-comparison-value-different" : ""}">
                <button type="button" class="knowledge-comparison-cell" data-comparison-edit
                    data-comparison-edit-article-number="${escapeHtml(device.articleNumber)}"
                    data-comparison-edit-device-type="${escapeHtml(device.deviceType)}"
                    data-comparison-edit-parameter="${escapeHtml(row.parameter)}"
                    data-comparison-edit-category="${escapeHtml(row.category)}"
                    data-comparison-edit-unit="${escapeHtml(row.unit)}"
                    title="${escapeHtml(i18n.t("knowledge.comparisonEditCell"))}">
                    ${hasValue ? cell.values.map(value => escapeHtml(value)).join("<br>") : `<span class="knowledge-comparison-missing">${i18n.t("knowledge.comparisonMissing")}</span>`}
                    ${cell?.notes.length ? `<small>${escapeHtml(cell.notes.join(" · "))}</small>` : ""}
                </button>
            </td>`;
        }).join("")}
    </tr>`;
}

function comparisonClipboardCell(row, article) {
    const cell = row.values.get(article.key);
    const values = cell?.values || [];
    const notes = cell?.notes || [];
    return [...values, ...notes].join(" | ").replace(/[\t\r\n]+/g, " ").trim();
}

function buildComparisonClipboardText(selectedArticles) {
    const rows = buildComparisonRows(selectedArticles);
    const lines = [[
        i18n.t("knowledge.parameter"),
        ...selectedArticles.map(article => getComparisonArticleLabel(article))
    ]];
    rows.forEach(row => {
        const parameter = [row.parameter, row.unit].filter(Boolean).join(" ");
        lines.push([
            parameter,
            ...selectedArticles.map(article => comparisonClipboardCell(row, article))
        ]);
    });
    return lines
        .map(line => line.map(value => String(value || "").replace(/[\t\r\n]+/g, " ")).join("\t"))
        .join("\n");
}

async function copyComparisonToClipboard(button) {
    const articles = getComparisonArticles();
    const selectedArticles = getSelectedComparisonArticles(articles);
    if (selectedArticles.length < 2) return;
    const clipboardText = buildComparisonClipboardText(selectedArticles);
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(clipboardText);
        } else {
            const helper = document.createElement("textarea");
            helper.value = clipboardText;
            helper.setAttribute("readonly", "");
            helper.style.position = "fixed";
            helper.style.opacity = "0";
            document.body.append(helper);
            helper.select();
            if (!document.execCommand("copy")) throw new Error("copy failed");
            helper.remove();
        }
        button.textContent = i18n.t("knowledge.comparisonCopied");
        const status = document.getElementById("knowledge-status");
        if (status) status.textContent = i18n.t("knowledge.comparisonCopied");
    } catch {
        button.textContent = i18n.t("knowledge.comparisonCopyFailed");
    }
    window.setTimeout(() => {
        if (button.isConnected) button.textContent = i18n.t("knowledge.comparisonCopy");
    }, 1800);
}

function updateComparisonSections() {
    const articles = getComparisonArticles();
    const selectedArticles = getSelectedComparisonArticles(articles);
    const selectedKeys = new Set(selectedArticles.map(article => article.key));
    const options = document.getElementById("knowledge-comparison-devices");
    if (options) options.innerHTML = renderComparisonArticleOptions(articles, selectedKeys);
    const result = document.getElementById("knowledge-comparison-result");
    if (result) result.innerHTML = renderComparisonResult(selectedArticles);
    const chips = document.getElementById("knowledge-comparison-chips");
    if (chips) chips.innerHTML = renderComparisonSelectedChips(selectedArticles);
    const count = document.getElementById("knowledge-comparison-selected-count");
    if (count) count.textContent = renderComparisonSelectionCount(selectedArticles.length);
    const clearButton = document.getElementById("knowledge-comparison-clear");
    if (clearButton) clearButton.disabled = selectedArticles.length === 0;
    bindComparisonDeviceControls();
    bindComparisonChipControls();
    bindComparisonCopyControl();
    bindComparisonCellEditing();
}

function bindComparisonDeviceControls() {
    document.querySelectorAll("[data-comparison-device]").forEach(input => {
        input.addEventListener("change", event => {
            hideComparisonArticleInfoCard(true);
            const key = event.target.dataset.comparisonDevice;
            if (event.target.checked) {
                if (!selectedComparisonArticleKeys.includes(key)) selectedComparisonArticleKeys.push(key);
            } else {
                selectedComparisonArticleKeys = selectedComparisonArticleKeys.filter(item => item !== key);
            }
            updateComparisonSections();
        });
    });
}

function bindComparisonChipControls() {
    document.querySelectorAll("[data-comparison-remove]").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            hideComparisonArticleInfoCard(true);
            const key = button.dataset.comparisonRemove;
            selectedComparisonArticleKeys = selectedComparisonArticleKeys.filter(item => item !== key);
            updateComparisonSections();
        });
    });
}

function bindComparisonCopyControl() {
    document.getElementById("knowledge-comparison-copy")?.addEventListener("click", event => {
        copyComparisonToClipboard(event.currentTarget);
    });
}

function findComparisonEntry(article, row) {
    return technicalEntries.find(entry => {
        const articleNumber = String(entry.articleNumber || "").trim();
        const matchesArticle = article.articleNumber
            ? splitComparisonArticleReferences(articleNumber).includes(article.articleNumber)
            : !articleNumber && String(entry.deviceType || "").trim() === article.deviceType;
        return matchesArticle
            && String(entry.parameter || "").trim() === row.parameter
            && String(entry.category || "").trim() === row.category
            && String(entry.unit || "").trim() === row.unit;
    }) || null;
}

function bindComparisonCellEditing() {
    document.querySelectorAll("[data-comparison-edit]").forEach(button => {
        if (button.dataset.comparisonEditBound === "true") return;
        button.dataset.comparisonEditBound = "true";
        const openEditor = async () => {
            const confirmed = await showConfirm(i18n.t("knowledge.comparisonEditConfirm"), {
                title: i18n.t("knowledge.comparisonEditTitle")
            });
            if (!confirmed) return;
            const article = {
                articleNumber: button.dataset.comparisonEditArticleNumber || "",
                deviceType: button.dataset.comparisonEditDeviceType || ""
            };
            const row = {
                parameter: button.dataset.comparisonEditParameter || "",
                category: button.dataset.comparisonEditCategory || "",
                unit: button.dataset.comparisonEditUnit || ""
            };
            const entry = findComparisonEntry(article, row);
            openTechnicalEditor(entry, {
                articleNumber: article.articleNumber,
                deviceType: article.deviceType,
                parameter: row.parameter,
                category: row.category,
                unit: row.unit
            });
        };
        button.addEventListener("click", event => {
            event.preventDefault();
            openEditor();
        });
        button.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openEditor();
        });
    });
}

function bindComparisonControls() {
    document.getElementById("knowledge-comparison-search")?.addEventListener("input", event => {
        comparisonSearch = event.target.value;
        const articles = getComparisonArticles();
        const selectedArticles = getSelectedComparisonArticles(articles);
        const options = document.getElementById("knowledge-comparison-devices");
        if (options) options.innerHTML = renderComparisonArticleOptions(articles, new Set(selectedArticles.map(article => article.key)));
        bindComparisonDeviceControls();
    });
    document.getElementById("knowledge-comparison-clear")?.addEventListener("click", () => {
        hideComparisonArticleInfoCard(true);
        selectedComparisonArticleKeys = [];
        updateComparisonSections();
    });
    bindComparisonDeviceControls();
    bindComparisonChipControls();
    bindComparisonCopyControl();
    bindComparisonCellEditing();
}

function bindComparisonArticleInfoCards() {
    if (view.dataset.comparisonArticleInfoCardsRegistered === "true") return;
    view.dataset.comparisonArticleInfoCardsRegistered = "true";

    view.addEventListener("pointerover", event => {
        const articleElement = event.target.closest?.(".knowledge-comparison-article");
        if (!articleElement || articleElement.contains(event.relatedTarget)) return;
        scheduleComparisonArticleInfoCard(articleElement, comparisonArticleInfoDelay, {
            x: event.clientX,
            y: event.clientY
        });
    });

    view.addEventListener("pointerout", event => {
        const articleElement = event.target.closest?.(".knowledge-comparison-article");
        if (!articleElement || articleElement.contains(event.relatedTarget)) return;
        scheduleComparisonArticleInfoCardHide();
    });

    view.addEventListener("focusin", event => {
        const articleElement = event.target.closest?.(".knowledge-comparison-article");
        if (articleElement) scheduleComparisonArticleInfoCard(articleElement, 250);
    });

    view.addEventListener("focusout", event => {
        const articleElement = event.target.closest?.(".knowledge-comparison-article");
        if (articleElement && !articleElement.contains(event.relatedTarget)) scheduleComparisonArticleInfoCardHide();
    });

    view.addEventListener("keydown", event => {
        if (event.key === "Escape") hideComparisonArticleInfoCard(true);
    });
}

function scheduleComparisonArticleInfoCard(articleElement, delay, pointerPosition = null) {
    clearTimeout(comparisonArticleInfoCardHideTimer);
    clearTimeout(comparisonArticleInfoCardShowTimer);
    const targetKey = `comparison-article:${articleElement.dataset.comparisonArticleNumber}`;
    if (activeComparisonArticleInfoCard?.dataset.infoTargetKey === targetKey) return;
    comparisonArticleInfoCardShowTimer = setTimeout(() => {
        showComparisonArticleInfoCard(articleElement, pointerPosition);
    }, delay);
}

function scheduleComparisonArticleInfoCardHide() {
    clearTimeout(comparisonArticleInfoCardShowTimer);
    clearTimeout(comparisonArticleInfoCardHideTimer);
    comparisonArticleInfoCardHideTimer = setTimeout(() => hideComparisonArticleInfoCard(), comparisonArticleInfoHideDelay);
}

function hideComparisonArticleInfoCard(immediately = false) {
    clearTimeout(comparisonArticleInfoCardShowTimer);
    clearTimeout(comparisonArticleInfoCardHideTimer);
    if (!activeComparisonArticleInfoCard) return;
    const card = activeComparisonArticleInfoCard;
    activeComparisonArticleInfoCard = null;
    if (immediately) {
        card.remove();
        return;
    }
    card.classList.remove("visible");
    setTimeout(() => card.remove(), 120);
}

function showComparisonArticleInfoCard(articleElement, pointerPosition = null) {
    if (!articleElement.isConnected) return;
    const articleNumber = articleElement.dataset.comparisonArticleNumber;
    const article = articleEntries.find(item => String(item.articleNumber) === String(articleNumber));
    if (!article) return;

    hideComparisonArticleInfoCard(true);
    const currency = article.listPriceCurrency || "EUR";
    const origin = [article.originCountry, article.originRegion].filter(Boolean).join(" / ");
    const rows = [
        [i18n.t("articles.price"), formatComparisonArticlePrice(article.listPrice, currency)],
        [i18n.t("articles.discountGroup"), article.discountGroup],
        [i18n.t("articles.gridVisItems"), article.gridVisItems === null || article.gridVisItems === undefined
            ? ""
            : `${formatComparisonQuantity(article.gridVisItems)} / ${i18n.t("project.unit")}`],
        [i18n.t("articles.manufacturer"), article.manufacturerName],
        [i18n.t("articles.quantityUnit"), article.quantityUnit],
        [i18n.t("articles.ean"), article.ean],
        [i18n.t("articles.origin"), origin],
        [i18n.t("articles.intrastatNumber"), article.intrastatNumber],
        [i18n.t("articles.salesforceFamily"), article.salesforceFamily],
        [i18n.t("articles.productType"), article.salesforceProductType],
        [i18n.t("articles.salesforceSalesStatus"), article.salesforceSalesStatus],
        [i18n.t("articles.discontinuationDate"), formatKnowledgeSalesforceDate(article.salesforceDiscontinuationDate)]
    ].filter(([, value]) => value !== "" && value !== null && value !== undefined);

    const card = document.createElement("aside");
    card.className = "node-article-info-card";
    card.dataset.infoTargetKey = `comparison-article:${articleNumber}`;
    card.dataset.articleNumber = articleNumber;
    card.setAttribute("role", "tooltip");
    card.innerHTML = `
        <div class="node-article-info-content">
            <div class="node-article-info-header">
                <img src="/icons/article.png" alt="">
                <div>
                    <strong>${escapeHtml(article.articleNumber)}</strong>
                    <span>${escapeHtml(article.manufacturerType)}</span>
                </div>
            </div>
            ${rows.length ? `
                <dl class="node-article-info-list">
                    ${rows.map(([label, value]) => `
                        <div>
                            <dt>${escapeHtml(label)}</dt>
                            <dd>${escapeHtml(value)}</dd>
                        </div>
                    `).join("")}
                </dl>
            ` : ""}
            ${article.description ? `
                <div class="node-article-info-description">
                    <strong>${escapeHtml(i18n.t("articles.description"))}</strong>
                    <p>${escapeHtml(article.description)}</p>
                </div>
            ` : ""}
        </div>
    `;
    card.addEventListener("pointerenter", () => clearTimeout(comparisonArticleInfoCardHideTimer));
    card.addEventListener("pointerleave", scheduleComparisonArticleInfoCardHide);
    document.body.append(card);
    activeComparisonArticleInfoCard = card;
    positionComparisonArticleInfoCard(card, articleElement, pointerPosition);
    requestAnimationFrame(() => card.classList.add("visible"));
}

function formatComparisonQuantity(value) {
    return Number(value ?? 0).toLocaleString(i18n.getCurrentLanguage(), { maximumFractionDigits: 2 });
}

function formatKnowledgeSalesforceDate(value) {
    const rawValue = String(value ?? "").trim();
    if (!rawValue) return "";

    const datePart = rawValue.slice(0, 10);
    const date = new Date(`${datePart}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return rawValue;

    return new Intl.DateTimeFormat(i18n.getCurrentLanguage(), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC"
    }).format(date);
}

function formatComparisonArticlePrice(value, currency) {
    if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "";
    return Number(value).toLocaleString(i18n.getCurrentLanguage(), {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function positionComparisonArticleInfoCard(card, articleElement, pointerPosition = null) {
    const margin = 12;
    const anchor = articleElement.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const pointerX = Number.isFinite(Number(pointerPosition?.x)) ? Number(pointerPosition.x) : null;
    const pointerY = Number.isFinite(Number(pointerPosition?.y)) ? Number(pointerPosition.y) : null;
    const maxLeft = Math.max(margin, window.innerWidth - cardRect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - cardRect.height - margin);
    const clampLeft = value => Math.min(Math.max(margin, value), maxLeft);
    const clampTop = value => Math.min(Math.max(margin, value), maxTop);
    let left = anchor.right + margin;
    let opensToRight = true;
    if (left > maxLeft && anchor.left - cardRect.width - margin >= margin) {
        left = anchor.left - cardRect.width - margin;
        opensToRight = false;
    }
    if (left > maxLeft) left = maxLeft;
    const top = clampTop(pointerY === null ? anchor.top : pointerY - 18);
    const anchorY = clampTop(anchor.top + anchor.height / 2);
    const anchorOffset = Math.min(Math.max(18, anchorY - top), Math.max(18, cardRect.height - 18));
    card.classList.toggle("opens-right", opensToRight);
    card.classList.toggle("opens-left", !opensToRight);
    card.style.setProperty("--article-info-anchor-y", `${anchorOffset}px`);
    card.style.left = `${clampLeft(left)}px`;
    card.style.top = `${top}px`;
}

function renderFaqEntry(entry) {
    const context = [entry.category, entry.articleReferences, entry.deviceTypes].filter(Boolean).join(" · ");
    return `
        <details class="knowledge-faq-entry" data-knowledge-entry-id="${escapeHtml(entry.id)}">
            <summary>
                <span class="knowledge-faq-question-wrap">
                    <span class="knowledge-faq-question">${escapeHtml(entry.question)}</span>
                    ${isNewKnowledgeEntry(entry) ? `<span class="knowledge-new-badge">${escapeHtml(i18n.t("knowledge.newLabel"))}</span>` : ""}
                </span>
                ${context ? `<span class="knowledge-faq-context">${escapeHtml(context)}</span>` : ""}
                <span class="knowledge-entry-actions">
                    <button type="button" class="knowledge-row-action" data-knowledge-edit="faq" data-knowledge-id="${escapeHtml(entry.id)}">${escapeHtml(i18n.t("knowledge.edit"))}</button>
                    <button type="button" class="knowledge-row-action knowledge-row-action-archive" data-knowledge-archive="faq" data-knowledge-id="${escapeHtml(entry.id)}">${escapeHtml(i18n.t("knowledge.archive"))}</button>
                </span>
            </summary>
            <div class="knowledge-faq-answer">${escapeHtml(entry.answer)}</div>
            ${entry.tags || entry.source ? `<div class="knowledge-faq-meta">
                ${entry.tags ? `<span><strong>${i18n.t("knowledge.tags")}:</strong> ${escapeHtml(entry.tags)}</span>` : ""}
                ${entry.source ? `<span><strong>${i18n.t("knowledge.source")}:</strong> ${renderKnowledgeSources(entry.source)}</span>` : ""}
            </div>` : ""}
        </details>
    `;
}

function renderTechnicalEntry(entry) {
    const articleName = getKnowledgeArticleName(entry);
    return `<tr>
        <td>${escapeHtml(entry.articleNumber)}</td>
        <td>${renderKnowledgeDeviceLabel(entry, articleName)}</td>
        <td><strong>${escapeHtml(entry.parameter)}</strong>${entry.category ? `<small>${escapeHtml(entry.category)}</small>` : ""}</td>
        <td>${escapeHtml(entry.value)}${entry.notes ? `<small>${escapeHtml(entry.notes)}</small>` : ""}</td>
        <td>${escapeHtml(entry.unit)}</td>
        <td>${renderKnowledgeSources(entry.source)}</td>
        <td class="knowledge-entry-actions-cell">
            <button type="button" class="knowledge-row-action" data-knowledge-edit="technical" data-knowledge-id="${escapeHtml(entry.id)}">${escapeHtml(i18n.t("knowledge.edit"))}</button>
            <button type="button" class="knowledge-row-action knowledge-row-action-archive" data-knowledge-archive="technical" data-knowledge-id="${escapeHtml(entry.id)}">${escapeHtml(i18n.t("knowledge.archive"))}</button>
        </td>
    </tr>`;
}

function renderArchivedFaqEntry(entry) {
    const context = [entry.category, entry.articleReferences, entry.deviceTypes].filter(Boolean).join(" · ");
    return `
        <details class="knowledge-faq-entry knowledge-archived-entry">
            <summary>
                <span class="knowledge-faq-question-wrap">
                    <span class="knowledge-faq-question">${escapeHtml(entry.question)}</span>
                    <span class="knowledge-archived-badge">${escapeHtml(i18n.t("knowledge.archived"))}</span>
                </span>
                ${context ? `<span class="knowledge-faq-context">${escapeHtml(context)}</span>` : ""}
                <span class="knowledge-entry-actions">
                    <button type="button" class="knowledge-row-action" data-knowledge-restore="${escapeHtml(entry.archiveId)}">
                        ${escapeHtml(i18n.t("knowledge.restore"))}
                    </button>
                </span>
            </summary>
            <div class="knowledge-faq-answer">${escapeHtml(entry.answer)}</div>
            <div class="knowledge-faq-meta">
                ${entry.tags ? `<span><strong>${i18n.t("knowledge.tags")}:</strong> ${escapeHtml(entry.tags)}</span>` : ""}
                ${entry.source ? `<span><strong>${i18n.t("knowledge.source")}:</strong> ${renderKnowledgeSources(entry.source)}</span>` : ""}
                <span><strong>${i18n.t("knowledge.archivedAt")}:</strong> ${escapeHtml(formatKnowledgeArchiveDate(entry.archivedAt))}</span>
            </div>
        </details>
    `;
}

function renderArchivedTechnicalEntry(entry) {
    const articleName = getKnowledgeArticleName(entry);
    return `<tr class="knowledge-archived-entry">
        <td>${escapeHtml(entry.articleNumber)}</td>
        <td>${renderKnowledgeDeviceLabel(entry, articleName)}</td>
        <td><strong>${escapeHtml(entry.parameter)}</strong>${entry.category ? `<small>${escapeHtml(entry.category)}</small>` : ""}</td>
        <td>${escapeHtml(entry.value)}${entry.notes ? `<small>${escapeHtml(entry.notes)}</small>` : ""}</td>
        <td>${escapeHtml(entry.unit)}</td>
        <td>${renderKnowledgeSources(entry.source)}${entry.archivedAt ? `<small>${escapeHtml(formatKnowledgeArchiveDate(entry.archivedAt))}</small>` : ""}</td>
        <td class="knowledge-entry-actions-cell">
            <button type="button" class="knowledge-row-action" data-knowledge-restore="${escapeHtml(entry.archiveId)}">
                ${escapeHtml(i18n.t("knowledge.restore"))}
            </button>
        </td>
    </tr>`;
}

function getKnowledgeArticle(entry) {
    const articleNumber = String(entry?.articleNumber || "").split(/[;,]/)[0].trim();
    if (!articleNumber) return null;
    return articleEntries.find(article => String(article.articleNumber || "").trim() === articleNumber) || null;
}

function getKnowledgeArticleName(entry) {
    const article = getKnowledgeArticle(entry);
    return String(article?.manufacturerType || article?.name || "").trim();
}

function renderKnowledgeDeviceLabel(entry, articleName = getKnowledgeArticleName(entry)) {
    const deviceType = String(entry?.deviceType || "").trim();
    if (!articleName || articleName === deviceType) return escapeHtml(deviceType);
    return `<strong class="knowledge-article-name">${escapeHtml(articleName)}</strong><small class="knowledge-device-type">${escapeHtml(deviceType)}</small>`;
}

function formatKnowledgeArchiveDate(value) {
    return formatKnowledgeSalesforceDate(value) || String(value || "");
}

function isNewKnowledgeEntry(entry) {
    const createdAt = Date.parse(entry.createdAt || entry.updatedAt || "");
    if (!Number.isFinite(createdAt)) return false;
    const age = Date.now() - createdAt;
    return age >= 0 && age <= 28 * 24 * 60 * 60 * 1000;
}

function getKnowledgeSourceUrl(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    const candidate = /^www\./i.test(source) ? `https://${source}` : source;
    try {
        const url = new URL(candidate);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function parseKnowledgeSourceValue(value) {
    const source = String(value || "").trim();
    const markdownMatch = source.match(/^\[([\s\S]*)\]\((.+)\)$/);
    if (markdownMatch && getKnowledgeSourceUrl(markdownMatch[2])) {
        return {
            text: markdownMatch[1],
            link: markdownMatch[2]
        };
    }
    return getKnowledgeSourceUrl(source)
        ? { text: "", link: source }
        : { text: source, link: "" };
}

function renderKnowledgeSources(value) {
    const sources = splitKnowledgeChipValues(value, /;/).map(parseKnowledgeSourceValue);
    if (!sources.length) return "";
    return `<span class="knowledge-source-list">${sources.map(source => {
        const url = getKnowledgeSourceUrl(source.link);
        return url
            ? `<a class="knowledge-source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.text || source.link)}</a>`
            : `<span>${escapeHtml(source.text)}</span>`;
    }).join("<span class=\"knowledge-source-separator\">;</span>")}</span>`;
}

function bindKnowledgeEntryActions() {
    document.querySelectorAll("[data-knowledge-edit]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            const entryType = button.dataset.knowledgeEdit;
            const id = Number(button.dataset.knowledgeId);
            if (entryType === "faq") {
                openFaqEditor(faqEntries.find(entry => Number(entry.id) === id) || null);
            } else {
                openTechnicalEditor(technicalEntries.find(entry => Number(entry.id) === id) || null);
            }
        });
    });
    document.querySelectorAll("[data-knowledge-archive]").forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();
            await archiveKnowledgeEntry(button.dataset.knowledgeArchive, Number(button.dataset.knowledgeId));
        });
    });
    document.querySelectorAll("[data-knowledge-restore]").forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();
            await restoreKnowledgeEntry(Number(button.dataset.knowledgeRestore));
        });
    });
}

function closeKnowledgeEditor(overlay) {
    overlay?.remove();
}

function showKnowledgeMutationStatus(result) {
    const status = document.getElementById("knowledge-status");
    if (!status) return;
    status.classList.remove("is-error", "is-warning");
    if (result.synced) {
        status.textContent = i18n.t("knowledge.savedAndSynced");
        return;
    }
    status.textContent = [
        i18n.t("knowledge.savedLocally"),
        result.syncError || i18n.t("knowledge.syncPending")
    ].filter(Boolean).join(" ");
    status.classList.add(result.conflict ? "is-error" : "is-warning");
}

function rememberKnowledgeRemoteVersion(result) {
    if (result?.remoteModifiedAt) knowledgeRemoteModifiedAt = result.remoteModifiedAt;
    else if (result?.localModifiedAt) knowledgeRemoteModifiedAt = result.localModifiedAt;
}

const faqConflictFields = [
    ["question", "knowledge.question"],
    ["answer", "knowledge.answer"],
    ["category", "knowledge.category"],
    ["articleReferences", "knowledge.articleReferences"],
    ["deviceTypes", "knowledge.deviceTypes"],
    ["tags", "knowledge.tags"],
    ["source", "knowledge.source"],
    ["active", "knowledge.active"]
];

const technicalConflictFields = [
    "deviceType", "category", "parameter", "value", "unit", "source", "notes"
];

function conflictText(value) {
    if (typeof value === "boolean") return value ? "Ja" : "Nein";
    const normalized = String(value ?? "").trim();
    return normalized || i18n.t("knowledge.conflictEmpty");
}

function conflictValuesEqual(left, right) {
    if (left === right) return true;
    if (typeof left === "boolean" || typeof right === "boolean") {
        return Boolean(left === true || left === 1 || left === "1") === Boolean(right === true || right === 1 || right === "1");
    }
    return String(left ?? "").trim() === String(right ?? "").trim();
}

function renderConflictField(field, localValue, remoteValue, remoteAvailable, defaultChoice = "local") {
    const different = remoteAvailable && !conflictValuesEqual(localValue, remoteValue);
    return `
        <div class="knowledge-conflict-field ${different ? "is-different" : ""}">
            <div class="knowledge-conflict-field-header">
                <strong>${escapeHtml(i18n.t(field[1]))}</strong>
                <select data-conflict-choice="${escapeHtml(field[0])}">
                    <option value="local" ${defaultChoice === "local" ? "selected" : ""}>${escapeHtml(i18n.t("knowledge.conflictChoiceLocal"))}</option>
                    <option value="remote" ${remoteAvailable ? "" : "disabled"} ${defaultChoice === "remote" ? "selected" : ""}>${escapeHtml(i18n.t("knowledge.conflictChoiceRemote"))}</option>
                </select>
            </div>
            <div class="knowledge-conflict-values">
                <div><span>${escapeHtml(i18n.t("knowledge.conflictLocal"))}</span><p>${escapeHtml(conflictText(localValue))}</p></div>
                <div><span>${escapeHtml(i18n.t("knowledge.conflictRemote"))}</span><p>${escapeHtml(remoteAvailable ? conflictText(remoteValue) : i18n.t("knowledge.conflictNoRemote"))}</p></div>
            </div>
        </div>
    `;
}

function technicalConflictKey(entry) {
    return [entry?.category, entry?.parameter, entry?.unit]
        .map(value => String(value || "").trim().toLocaleLowerCase())
        .join("\u001f");
}

function technicalConflictEntries(payload, result) {
    const localEntries = Array.isArray(payload?.entries) ? payload.entries : [];
    const baselineEntries = Array.isArray(payload?.baselineEntries) ? payload.baselineEntries : [];
    const remoteEntries = Array.isArray(result?.remoteEntries?.technical) ? result.remoteEntries.technical : [];
    const articleNumber = String(localEntries[0]?.articleNumber || baselineEntries[0]?.articleNumber || "").trim();
    const deviceType = String(localEntries[0]?.deviceType || baselineEntries[0]?.deviceType || "").trim();
    const filteredRemote = remoteEntries.filter(entry => articleNumber
        ? String(entry.articleNumber || "").trim() === articleNumber
        : String(entry.deviceType || "").trim() === deviceType);
    const byKey = new Map();
    const add = (side, entry) => {
        const key = technicalConflictKey(entry);
        const row = byKey.get(key) || {};
        row[side] = entry;
        byKey.set(key, row);
    };
    baselineEntries.forEach(entry => add("baseline", entry));
    localEntries.forEach(entry => add("local", entry));
    filteredRemote.forEach(entry => add("remote", entry));
    return [...byKey.values()];
}

function technicalConflictSideChanged(entry, baseline) {
    if (!entry) return Boolean(baseline);
    if (!baseline) return true;
    return technicalConflictFields.some(field => !conflictValuesEqual(entry[field], baseline[field]));
}

function renderTechnicalConflictRow(row, index) {
    const localAvailable = Boolean(row.local);
    const localChoiceAvailable = localAvailable || Boolean(row.baseline);
    const remoteAvailable = Boolean(row.remote);
    const remoteChoiceAvailable = remoteAvailable || Boolean(row.baseline);
    const localChanged = technicalConflictSideChanged(row.local, row.baseline);
    const remoteChanged = technicalConflictSideChanged(row.remote, row.baseline);
    const defaultChoice = remoteChoiceAvailable && remoteChanged && !localChanged ? "remote" : "local";
    const localLabel = row.local
        ? [row.local.parameter, row.local.value, row.local.unit].filter(Boolean).join(" · ")
        : i18n.t("knowledge.conflictNoLocal");
    const remoteLabel = row.remote
        ? [row.remote.parameter, row.remote.value, row.remote.unit].filter(Boolean).join(" · ")
        : i18n.t("knowledge.conflictNoRemote");
    const different = localAvailable && remoteAvailable && !conflictValuesEqual(localLabel, remoteLabel);
    return `
        <div class="knowledge-conflict-field knowledge-conflict-technical-row ${different ? "is-different" : ""}">
            <div class="knowledge-conflict-field-header">
                <strong>${escapeHtml(i18n.t("knowledge.characteristics"))} ${index + 1}</strong>
                <select data-conflict-technical-choice="${index}">
                    <option value="local" ${localChoiceAvailable ? "" : "disabled"} ${defaultChoice === "local" ? "selected" : ""}>${escapeHtml(i18n.t("knowledge.conflictChoiceLocal"))}</option>
                    <option value="remote" ${remoteChoiceAvailable ? "" : "disabled"} ${defaultChoice === "remote" ? "selected" : ""}>${escapeHtml(i18n.t("knowledge.conflictChoiceRemote"))}</option>
                </select>
            </div>
            <div class="knowledge-conflict-values">
                <div><span>${escapeHtml(i18n.t("knowledge.conflictLocal"))}</span><p>${escapeHtml(localLabel)}</p></div>
                <div><span>${escapeHtml(i18n.t("knowledge.conflictRemote"))}</span><p>${escapeHtml(remoteLabel)}</p></div>
            </div>
        </div>
    `;
}

function findConflictFaq(payload, result) {
    const remoteEntries = Array.isArray(result?.remoteEntries?.faq) ? result.remoteEntries.faq : [];
    return remoteEntries.find(entry => payload.externalId && entry.externalId === payload.externalId)
        || remoteEntries.find(entry => payload.question && entry.question === payload.question)
        || null;
}

function openKnowledgeConflict({ url, method, payload, result }) {
    const operation = result.operation || (url.includes("/faq") ? "faq" : "technical");
    const isFaq = operation === "faq";
    const remoteFaq = isFaq ? findConflictFaq(payload, result) : null;
    const technicalRows = isFaq ? [] : technicalConflictEntries(payload, result);
    const faqBaseline = payload.baselineEntry || null;
    const overlay = document.createElement("div");
    overlay.className = "knowledge-editor-backdrop";
    overlay.innerHTML = `
        <form class="knowledge-editor knowledge-conflict-editor" role="dialog" aria-modal="true">
            <div class="knowledge-editor-header">
                <h2>${escapeHtml(i18n.t("knowledge.conflictTitle"))}</h2>
                <button type="button" class="knowledge-editor-close" data-action="cancel" aria-label="${escapeHtml(i18n.t("common.close"))}">×</button>
            </div>
            <div class="knowledge-editor-body">
                <p class="knowledge-conflict-description">${escapeHtml(i18n.t("knowledge.conflictDescription"))}</p>
                ${isFaq
                    ? `<div class="knowledge-conflict-list">${faqConflictFields.map(field => {
                        const localChanged = Boolean(faqBaseline) && !conflictValuesEqual(payload[field[0]], faqBaseline[field[0]]);
                        const remoteChanged = Boolean(remoteFaq && faqBaseline) && !conflictValuesEqual(remoteFaq[field[0]], faqBaseline[field[0]]);
                        const defaultChoice = remoteChanged && !localChanged ? "remote" : "local";
                        return renderConflictField(field, payload[field[0]], remoteFaq?.[field[0]], Boolean(remoteFaq), defaultChoice);
                    }).join("")}</div>`
                    : `<div class="knowledge-conflict-list">${technicalRows.length ? technicalRows.map(renderTechnicalConflictRow).join("") : `<p>${escapeHtml(i18n.t("knowledge.conflictNoTechnical"))}</p>`}</div>`}
                <p class="knowledge-editor-error" data-role="editor-error" role="alert"></p>
            </div>
            <div class="knowledge-editor-actions">
                <button type="button" class="knowledge-secondary" data-action="cancel">${escapeHtml(i18n.t("common.cancel"))}</button>
                <button type="submit" class="knowledge-primary">${escapeHtml(i18n.t("knowledge.conflictResolve"))}</button>
            </div>
        </form>
    `;
    const form = overlay.querySelector("form");
    overlay.querySelectorAll('[data-action="cancel"]').forEach(button => button.addEventListener("click", () => closeKnowledgeEditor(overlay)));
    overlay.addEventListener("mousedown", event => {
        if (event.target === overlay) closeKnowledgeEditor(overlay);
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        let merged;
        if (isFaq) {
            merged = { ...payload };
            const conflictChoices = {};
            faqConflictFields.forEach(([key]) => {
                const choice = form.querySelector(`[data-conflict-choice="${key}"]`)?.value;
                conflictChoices[key] = choice || "local";
                if (choice === "remote" && remoteFaq) merged[key] = remoteFaq[key];
            });
            merged.conflictChoices = conflictChoices;
        } else {
            const rowsByIndex = form.querySelectorAll("[data-conflict-technical-choice]");
            const removedIds = new Set(Array.isArray(payload.removedIds) ? payload.removedIds.map(String) : []);
            const forceLocalKeys = [];
            const forceLocalDeletes = [];
            const entries = [];
            technicalRows.forEach((row, index) => {
                const choice = rowsByIndex[index]?.value || (row.local ? "local" : "remote");
                const selected = choice === "remote" ? row.remote : row.local;
                const key = technicalConflictKey(row.local || row.baseline || row.remote);
                if (selected) {
                    const localId = row.local?.id || "";
                    entries.push({ ...selected, id: localId || selected.id || "" });
                    if (choice === "local") forceLocalKeys.push(key);
                } else if (row.local?.id || row.baseline?.id) {
                    removedIds.add(String(row.local?.id || row.baseline.id));
                    if (choice === "local") forceLocalDeletes.push(key);
                }
            });
            merged = {
                ...payload,
                entries,
                removedIds: [...removedIds],
                forceLocalKeys,
                forceLocalDeletes
            };
        }
        merged.force = true;
        merged.baselineRemoteModifiedAt = result.remoteModifiedAt || payload.baselineRemoteModifiedAt || "";
        submitKnowledgeMutation({ overlay, url, method, payload: merged });
    });
    document.body.appendChild(overlay);
}

async function submitKnowledgeMutation({ overlay, url, method, payload }) {
    const form = overlay.querySelector("form");
    const submitButton = form?.querySelector("[type=submit]");
    const errorElement = form?.querySelector("[data-role=editor-error]");
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = i18n.t("knowledge.saving");
    }
    if (errorElement) errorElement.textContent = "";
    try {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (result.conflict) {
            closeKnowledgeEditor(overlay);
            openKnowledgeConflict({ url, method, payload, result });
            return;
        }
        if (!result.success) throw new Error(result.error || i18n.t("knowledge.saveFailed"));
        rememberKnowledgeRemoteVersion(result);
        closeKnowledgeEditor(overlay);
        await loadEntries();
        renderViewContent();
        showKnowledgeMutationStatus(result);
    } catch (error) {
        if (errorElement) errorElement.textContent = error.message || i18n.t("knowledge.saveFailed");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = i18n.t("knowledge.save");
        }
    }
}

function openKnowledgeEditor(section) {
    if (section === "faq") openFaqEditor();
    if (section === "technical") openTechnicalEditor();
}

function splitKnowledgeChipValues(value, separator = /[;,]/) {
    return [...new Set(String(value || "")
        .split(separator)
        .map(item => item.trim())
        .filter(Boolean))];
}

function renderKnowledgeChipField({ name, label, value, separator = "default", field = "" }) {
    const separatorPattern = separator === "semicolon" ? /;/ : /[;,]/;
    const values = splitKnowledgeChipValues(value, separatorPattern);
    return `
        <div class="knowledge-chip-field" data-chip-field data-chip-name="${escapeHtml(name)}" data-chip-separator="${escapeHtml(separator)}">
            <span class="knowledge-chip-field-label">${escapeHtml(label)}</span>
            <div class="knowledge-chip-list" data-chip-list>
                ${values.map(item => `
                    <span class="knowledge-chip">
                        <span class="knowledge-chip-text">${escapeHtml(item)}</span>
                        <button type="button" class="knowledge-chip-remove" data-chip-remove aria-label="${escapeHtml(i18n.t("knowledge.remove"))}">−</button>
                    </span>
                `).join("")}
            </div>
            <div class="knowledge-chip-add-row">
                <input type="text" data-chip-input placeholder="${escapeHtml(i18n.t("knowledge.addPlaceholder"))}">
                <button type="button" class="knowledge-secondary" data-chip-add>${escapeHtml(i18n.t("knowledge.add"))}</button>
            </div>
            <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(values.join("; "))}" data-chip-hidden ${field ? `data-field="${escapeHtml(field)}"` : ""}>
        </div>
    `;
}

function serializeKnowledgeSourceValue({ text = "", link = "" }) {
    const normalizedText = String(text || "").trim();
    const normalizedLink = String(link || "").trim();
    if (!normalizedText && !normalizedLink) return "";
    if (!normalizedLink) return normalizedText;
    if (!normalizedText) return normalizedLink;
    return `[${normalizedText}](${normalizedLink})`;
}

function renderKnowledgeSourceEditorRow(source = {}, pending = false) {
    return `
        <div class="knowledge-source-editor-row${pending ? " knowledge-source-editor-row-pending" : ""}" data-source-row ${pending ? 'data-source-pending="true"' : ""}>
            <label>
                <span>${escapeHtml(i18n.t("knowledge.sourceText"))}</span>
                <input type="text" data-source-text value="${escapeHtml(source.text)}" placeholder="${escapeHtml(i18n.t("knowledge.sourceTextPlaceholder"))}">
            </label>
            <label>
                <span>${escapeHtml(i18n.t("knowledge.sourceLink"))}</span>
                <input type="url" data-source-link value="${escapeHtml(source.link)}" placeholder="${escapeHtml(i18n.t("knowledge.sourceLinkPlaceholder"))}">
            </label>
            ${pending
                ? `<button type="button" class="knowledge-secondary" data-source-add>${escapeHtml(i18n.t("knowledge.sourceAdd"))}</button>`
                : `<button type="button" class="knowledge-chip-remove knowledge-source-remove" data-source-remove aria-label="${escapeHtml(i18n.t("knowledge.remove"))}">−</button>`}
        </div>
    `;
}

function renderKnowledgeSourceField({ name, label, value, field = "" }) {
    const sources = splitKnowledgeChipValues(value, /;/).map(parseKnowledgeSourceValue);
    return `
        <div class="knowledge-source-field" data-source-field>
            <span class="knowledge-chip-field-label">${escapeHtml(label)}</span>
            <div class="knowledge-source-editor-list" data-source-list>
                ${sources.map(source => renderKnowledgeSourceEditorRow(source)).join("")}
            </div>
            ${renderKnowledgeSourceEditorRow({}, true)}
            <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(sources.map(serializeKnowledgeSourceValue).filter(Boolean).join("; "))}" data-source-hidden ${field ? `data-field="${escapeHtml(field)}"` : ""}>
        </div>
    `;
}

function bindKnowledgeSourceFields(overlay) {
    overlay.querySelectorAll("[data-source-field]").forEach(field => {
        if (field.dataset.sourceBound === "true") return;
        field.dataset.sourceBound = "true";
        const list = field.querySelector("[data-source-list]");
        const pendingRow = field.querySelector('[data-source-row][data-source-pending="true"]');
        const hidden = field.querySelector("[data-source-hidden]");
        const getRows = () => [...list.querySelectorAll("[data-source-row]")];
        const readRow = row => ({
            text: row.querySelector("[data-source-text]")?.value || "",
            link: row.querySelector("[data-source-link]")?.value || ""
        });
        const sync = () => {
            hidden.value = getRows().map(readRow).map(serializeKnowledgeSourceValue).filter(Boolean).join("; ");
        };
        const addPendingSource = () => {
            const source = readRow(pendingRow);
            if (!source.text.trim() && !source.link.trim()) return;
            list.insertAdjacentHTML("beforeend", renderKnowledgeSourceEditorRow(source));
            pendingRow.querySelector("[data-source-text]").value = "";
            pendingRow.querySelector("[data-source-link]").value = "";
            sync();
            pendingRow.querySelector("[data-source-text]").focus();
        };
        pendingRow.querySelector("[data-source-add]").addEventListener("click", addPendingSource);
        pendingRow.querySelectorAll("input").forEach(input => input.addEventListener("keydown", event => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addPendingSource();
        }));
        field.addEventListener("input", event => {
            if (event.target.matches("[data-source-text], [data-source-link]")) sync();
        });
        field.addEventListener("click", event => {
            const removeButton = event.target.closest("[data-source-remove]");
            if (!removeButton) return;
            removeButton.closest("[data-source-row]")?.remove();
            sync();
        });
        sync();
    });
}

function bindKnowledgeChipFields(overlay) {
    overlay.querySelectorAll("[data-chip-field]").forEach(field => {
        const list = field.querySelector("[data-chip-list]");
        const input = field.querySelector("[data-chip-input]");
        const hidden = field.querySelector("[data-chip-hidden]");
        const separator = field.dataset.chipSeparator === "semicolon" ? /;/ : /[;,]/;
        const render = values => {
            const uniqueValues = [...new Set(values.map(item => String(item || "").trim()).filter(Boolean))];
            list.innerHTML = uniqueValues.map(item => `
                <span class="knowledge-chip">
                    <span class="knowledge-chip-text">${escapeHtml(item)}</span>
                    <button type="button" class="knowledge-chip-remove" data-chip-remove aria-label="${escapeHtml(i18n.t("knowledge.remove"))}">−</button>
                </span>
            `).join("");
            hidden.value = uniqueValues.join("; ");
        };
        const currentValues = () => [...list.querySelectorAll(".knowledge-chip-text")].map(element => element.textContent);
        const addValues = rawValue => {
            const values = splitKnowledgeChipValues(rawValue, separator);
            if (!values.length) return;
            render([...currentValues(), ...values]);
            input.value = "";
            input.focus();
        };
        field.querySelector("[data-chip-add]").addEventListener("click", () => addValues(input.value));
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === ";") {
                event.preventDefault();
                addValues(input.value);
            }
        });
        list.addEventListener("click", event => {
            const removeButton = event.target.closest("[data-chip-remove]");
            if (!removeButton) return;
            event.preventDefault();
            const chip = removeButton.closest(".knowledge-chip");
            const removedValue = chip?.querySelector(".knowledge-chip-text")?.textContent;
            render(currentValues().filter(value => value !== removedValue));
        });
    });
}

function openFaqEditor(entry = null) {
    const overlay = document.createElement("div");
    overlay.className = "knowledge-editor-backdrop";
    overlay.innerHTML = `
        <form class="knowledge-editor knowledge-faq-editor" role="dialog" aria-modal="true">
            <div class="knowledge-editor-header">
                <h2>${escapeHtml(entry ? i18n.t("knowledge.editFaq") : i18n.t("knowledge.newFaq"))}</h2>
                <button type="button" class="knowledge-editor-close" data-action="cancel" aria-label="${escapeHtml(i18n.t("common.close"))}">×</button>
            </div>
            <div class="knowledge-editor-body">
                <label><span>${escapeHtml(i18n.t("knowledge.question"))}</span><input name="question" required value="${escapeHtml(entry?.question)}"></label>
                <label><span>${escapeHtml(i18n.t("knowledge.answer"))}</span><textarea name="answer" required rows="7">${escapeHtml(entry?.answer)}</textarea></label>
                <div class="knowledge-editor-grid">
                    <label><span>${escapeHtml(i18n.t("knowledge.category"))}</span><input name="category" value="${escapeHtml(entry?.category)}"></label>
                    ${renderKnowledgeChipField({ name: "articleReferences", label: i18n.t("knowledge.articleReferences"), value: entry?.articleReferences })}
                    ${renderKnowledgeChipField({ name: "deviceTypes", label: i18n.t("knowledge.deviceTypes"), value: entry?.deviceTypes })}
                    ${renderKnowledgeChipField({ name: "tags", label: i18n.t("knowledge.tags"), value: entry?.tags })}
                    ${renderKnowledgeSourceField({ name: "source", label: i18n.t("knowledge.source"), value: entry?.source })}
                    <label class="knowledge-editor-checkbox"><input type="checkbox" name="active" ${entry?.active === 0 ? "" : "checked"}> <span>${escapeHtml(i18n.t("knowledge.active"))}</span></label>
                </div>
                <p class="knowledge-editor-error" data-role="editor-error" role="alert"></p>
            </div>
            <div class="knowledge-editor-actions">
                <button type="button" class="knowledge-secondary" data-action="cancel">${escapeHtml(i18n.t("common.cancel"))}</button>
                <button type="submit" class="knowledge-primary">${escapeHtml(i18n.t("knowledge.save"))}</button>
            </div>
        </form>
    `;
    const form = overlay.querySelector("form");
    bindKnowledgeChipFields(overlay);
    bindKnowledgeSourceFields(overlay);
    overlay.querySelectorAll('[data-action="cancel"]').forEach(button => button.addEventListener("click", () => closeKnowledgeEditor(overlay)));
    overlay.addEventListener("mousedown", event => {
        if (event.target === overlay) closeKnowledgeEditor(overlay);
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        values.active = form.elements.active.checked;
        values.externalId = entry?.externalId || "";
        values.id = entry?.id || "";
        values.baselineRemoteModifiedAt = knowledgeRemoteModifiedAt || "";
        values.baselineEntry = entry ? { ...entry } : null;
        submitKnowledgeMutation({
            overlay,
            url: entry ? `/api/knowledge/faq/${entry.id}` : "/api/knowledge/faq",
            method: entry ? "PUT" : "POST",
            payload: values
        });
    });
    document.body.appendChild(overlay);
    form.elements.question.focus();
}

function technicalGroupForEntry(entry) {
    if (!entry) return [];
    const articleNumber = String(entry.articleNumber || "").trim();
    if (articleNumber) {
        return technicalEntries.filter(item => String(item.articleNumber || "").trim() === articleNumber);
    }
    return technicalEntries.filter(item => String(item.deviceType || "").trim() === String(entry.deviceType || "").trim());
}

function renderTechnicalEditorRow(entry = {}) {
    return `
        <div class="knowledge-technical-editor-row" data-technical-row>
            <input type="hidden" data-field="id" value="${escapeHtml(entry.id)}">
            <input type="hidden" data-field="category" value="${escapeHtml(entry.category)}">
            <label><span>${escapeHtml(i18n.t("knowledge.parameter"))}</span><input data-field="parameter" required value="${escapeHtml(entry.parameter)}"></label>
            <label><span>${escapeHtml(i18n.t("knowledge.value"))}</span><input data-field="value" required value="${escapeHtml(entry.value)}"></label>
            <label><span>${escapeHtml(i18n.t("knowledge.unit"))}</span><input data-field="unit" value="${escapeHtml(entry.unit)}"></label>
            ${renderKnowledgeSourceField({ name: "source", field: "source", label: i18n.t("knowledge.source"), value: entry.source })}
            <label><span>${escapeHtml(i18n.t("knowledge.notes"))}</span><input data-field="notes" value="${escapeHtml(entry.notes)}"></label>
            <button type="button" class="knowledge-row-action knowledge-row-action-archive" data-action="remove-technical-row">${escapeHtml(i18n.t("knowledge.archive"))}</button>
        </div>
    `;
}

function openTechnicalEditor(entry = null, options = {}) {
    const seedEntry = entry ? null : {
        articleNumber: options.articleNumber || "",
        deviceType: options.deviceType || "",
        category: options.category || "",
        parameter: options.parameter || "",
        value: "",
        unit: options.unit || "",
        source: "",
        notes: ""
    };
    const rows = entry ? technicalGroupForEntry(entry) : [seedEntry || {}];
    const articleName = getKnowledgeArticleName(entry || seedEntry);
    const overlay = document.createElement("div");
    overlay.className = "knowledge-editor-backdrop";
    overlay.innerHTML = `
        <form class="knowledge-editor knowledge-technical-editor" role="dialog" aria-modal="true">
            <div class="knowledge-editor-header">
                <h2>${escapeHtml(entry ? i18n.t("knowledge.editTechnical") : i18n.t("knowledge.newTechnical"))}</h2>
                <button type="button" class="knowledge-editor-close" data-action="cancel" aria-label="${escapeHtml(i18n.t("common.close"))}">×</button>
            </div>
            <div class="knowledge-editor-body">
                <div class="knowledge-editor-grid">
                    <label><span>${escapeHtml(i18n.t("knowledge.articleNumber"))}</span><input name="articleNumber" value="${escapeHtml(entry?.articleNumber ?? seedEntry?.articleNumber)}" ${entry ? "readonly" : ""}>${articleName ? `<small class="knowledge-article-name-hint">${escapeHtml(i18n.t("knowledge.articleName"))}: ${escapeHtml(articleName)}</small>` : ""}</label>
                    <label><span>${escapeHtml(i18n.t("knowledge.deviceType"))}</span><input name="deviceType" value="${escapeHtml(entry?.deviceType ?? seedEntry?.deviceType)}"></label>
                </div>
                <div class="knowledge-technical-editor-heading">
                    <strong>${escapeHtml(i18n.t("knowledge.characteristics"))}</strong>
                    <button type="button" class="knowledge-secondary" data-action="add-technical-row">${escapeHtml(i18n.t("knowledge.addCharacteristic"))}</button>
                </div>
                <div class="knowledge-technical-editor-rows" data-role="technical-rows">
                    ${rows.map(renderTechnicalEditorRow).join("")}
                </div>
                <p class="knowledge-editor-error" data-role="editor-error" role="alert"></p>
            </div>
            <div class="knowledge-editor-actions">
                <button type="button" class="knowledge-secondary" data-action="cancel">${escapeHtml(i18n.t("common.cancel"))}</button>
                <button type="submit" class="knowledge-primary">${escapeHtml(i18n.t("knowledge.save"))}</button>
            </div>
        </form>
    `;
    const form = overlay.querySelector("form");
    form._removedTechnicalIds = new Set();
    form._baselineTechnicalEntries = rows.map(row => ({ ...row }));
    bindKnowledgeChipFields(overlay);
    bindKnowledgeSourceFields(overlay);
    overlay.querySelectorAll('[data-action="cancel"]').forEach(button => button.addEventListener("click", () => closeKnowledgeEditor(overlay)));
    overlay.addEventListener("mousedown", event => {
        if (event.target === overlay) closeKnowledgeEditor(overlay);
    });
    const bindTechnicalRowActions = () => {
        overlay.querySelectorAll('[data-action="remove-technical-row"]').forEach(button => {
            if (button.dataset.bound === "true") return;
            button.dataset.bound = "true";
            button.addEventListener("click", () => {
                const row = button.closest("[data-technical-row]");
                const id = row?.querySelector('[data-field="id"]')?.value;
                if (id) form._removedTechnicalIds.add(id);
                row?.remove();
            });
        });
    };
    overlay.querySelector('[data-action="add-technical-row"]').addEventListener("click", () => {
        const rowsContainer = overlay.querySelector('[data-role="technical-rows"]');
        rowsContainer.insertAdjacentHTML("beforeend", renderTechnicalEditorRow());
        bindKnowledgeChipFields(rowsContainer.lastElementChild);
        bindKnowledgeSourceFields(rowsContainer.lastElementChild);
        bindTechnicalRowActions();
    });
    bindTechnicalRowActions();
    form.addEventListener("submit", event => {
        event.preventDefault();
        const articleNumber = form.elements.articleNumber.value.trim();
        const deviceType = form.elements.deviceType.value.trim();
        const entries = [...overlay.querySelectorAll("[data-technical-row]")].map(row => ({
            id: row.querySelector('[data-field="id"]')?.value || "",
            articleNumber,
            deviceType,
            category: row.querySelector('[data-field="category"]')?.value.trim() || "",
            parameter: row.querySelector('[data-field="parameter"]')?.value.trim() || "",
            value: row.querySelector('[data-field="value"]')?.value.trim() || "",
            unit: row.querySelector('[data-field="unit"]')?.value.trim() || "",
            source: row.querySelector('[data-field="source"]')?.value.trim() || "",
            notes: row.querySelector('[data-field="notes"]')?.value.trim() || ""
        })).filter(item => item.id || item.parameter || item.value);
        submitKnowledgeMutation({
            overlay,
            url: "/api/knowledge/technical/group",
            method: "POST",
            payload: {
                entries,
                removedIds: [...form._removedTechnicalIds],
                baselineEntries: form._baselineTechnicalEntries,
                baselineRemoteModifiedAt: knowledgeRemoteModifiedAt || ""
            }
        });
    });
    document.body.appendChild(overlay);
    const focusRow = options.parameter
        ? [...overlay.querySelectorAll("[data-technical-row]")].find(row =>
            row.querySelector('[data-field="parameter"]')?.value.trim() === String(options.parameter).trim()
            && row.querySelector('[data-field="category"]')?.value.trim() === String(options.category || "").trim()
            && row.querySelector('[data-field="unit"]')?.value.trim() === String(options.unit || "").trim())
        : null;
    const focusField = focusRow?.querySelector('[data-field="value"]') || form.elements.articleNumber;
    focusField.focus();
    focusRow?.scrollIntoView({ block: "nearest" });
}

async function archiveKnowledgeEntry(entryType, id) {
    const confirmed = await showConfirm(i18n.t("knowledge.archiveConfirm"), {
        title: i18n.t("knowledge.archiveGlobalTitle")
    });
    if (!confirmed) return;
    try {
        const response = await fetch("/api/knowledge/archive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryType, id, baselineRemoteModifiedAt: knowledgeRemoteModifiedAt || "" })
        });
        const result = await response.json().catch(() => ({}));
        rememberKnowledgeRemoteVersion(result);
        if (result.conflict) {
            const status = document.getElementById("knowledge-status");
            if (status) {
                status.textContent = i18n.t("knowledge.conflictDescription");
                status.classList.add("is-error");
            }
            return;
        }
        if (!result.success) throw new Error(result.error || i18n.t("knowledge.archiveFailed"));
        await loadEntries();
        renderViewContent();
        showKnowledgeMutationStatus(result);
    } catch (error) {
        const status = document.getElementById("knowledge-status");
        if (status) {
            status.textContent = error.message || i18n.t("knowledge.archiveFailed");
            status.classList.add("is-error");
        }
    }
}

async function restoreKnowledgeEntry(archiveId) {
    const confirmed = await showConfirm(i18n.t("knowledge.restoreConfirm"), {
        title: i18n.t("knowledge.restoreGlobalTitle")
    });
    if (!confirmed) return;
    try {
        const response = await fetch(`/api/knowledge/archive/${encodeURIComponent(archiveId)}/restore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ baselineRemoteModifiedAt: knowledgeRemoteModifiedAt || "" })
        });
        const result = await response.json().catch(() => ({}));
        rememberKnowledgeRemoteVersion(result);
        if (result.conflict) {
            const status = document.getElementById("knowledge-status");
            if (status) {
                status.textContent = i18n.t("knowledge.conflictDescription");
                status.classList.add("is-error");
            }
            return;
        }
        if (!result.success) throw new Error(result.error || i18n.t("knowledge.restoreFailed"));
        await loadEntries();
        renderViewContent();
        showKnowledgeMutationStatus(result);
    } catch (error) {
        const status = document.getElementById("knowledge-status");
        if (status) {
            status.textContent = error.message || i18n.t("knowledge.restoreFailed");
            status.classList.add("is-error");
        }
    }
}

async function importWorkbook(file) {
    if (!file) return;
    const status = document.getElementById("knowledge-status");
    status.classList.remove("is-error");
    status.textContent = i18n.t("knowledge.importRunning");
    const formData = new FormData();
    formData.append("file", file);
    try {
        const response = await fetch("/api/knowledge/import", { method: "POST", body: formData });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || i18n.t("knowledge.importFailed"));
        const successMessage = [
            result.faq === null ? "" : `${i18n.t("knowledge.faq")}: ${result.faq}`,
            result.technical === null ? "" : `${i18n.t("knowledge.technical")}: ${result.technical}`
        ].filter(Boolean).join(" · ") + ` ${i18n.t("knowledge.importSuccessful")}`;
        await loadEntries();
        renderViewContent();
        const nextStatus = document.getElementById("knowledge-status");
        nextStatus.textContent = successMessage;
    } catch (error) {
        status.textContent = error.message || i18n.t("knowledge.importFailed");
        status.classList.add("is-error");
    }
}

async function checkSalesforceKnowledge({ force = false } = {}) {
    try {
        const response = await fetch("/api/knowledge/salesforce-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ force })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
            throw new Error(result.error || i18n.t("knowledge.salesforceSyncFailed"));
        }
        return result;
    } catch (error) {
        return {
            success: false,
            connected: false,
            available: false,
            updated: false,
            error: error.message || i18n.t("knowledge.salesforceSyncFailed")
        };
    }
}

function showSalesforceSyncStatus(result, { manual = false } = {}) {
    const status = document.getElementById("knowledge-status");
    if (!status || !result) return;
    status.classList.remove("is-error");
    if (!result.success) {
        status.textContent = result.error || i18n.t("knowledge.salesforceSyncFailed");
        status.classList.add("is-error");
        return;
    }
    if (result.updated) {
        const counts = [
            result.faq === null ? "" : `${i18n.t("knowledge.faq")}: ${result.faq}`,
            result.technical === null ? "" : `${i18n.t("knowledge.technical")}: ${result.technical}`
        ].filter(Boolean).join(" · ");
        status.textContent = `${i18n.t("knowledge.salesforceSyncUpdated")}${counts ? ` ${counts}` : ""}`;
        return;
    }
    if (!manual) return;
    if (!result.connected) {
        status.textContent = i18n.t("knowledge.salesforceSyncNotConnected");
        return;
    }
    if (!result.available) {
        status.textContent = i18n.t("knowledge.salesforceSyncFileNotFound");
        return;
    }
    if (result.upToDate) status.textContent = i18n.t("knowledge.salesforceSyncUpToDate");
}

async function refreshSalesforceKnowledge() {
    const button = document.getElementById("knowledge-salesforce-sync-button");
    if (button) {
        button.disabled = true;
        button.textContent = i18n.t("knowledge.salesforceSyncRunning");
    }
    const progress = showSalesforceProgress("sync");
    try {
        const result = await checkSalesforceKnowledge({ force: true });
        rememberKnowledgeRemoteVersion(result);
        if (result.updated) {
            try {
                await loadEntries();
                renderViewContent();
            } catch (error) {
                const status = document.getElementById("knowledge-status");
                if (status) {
                    status.textContent = error.message || i18n.t("knowledge.loadFailed");
                    status.classList.add("is-error");
                }
                return;
            }
        }
        showSalesforceSyncStatus(result, { manual: true });
    } finally {
        await finishSalesforceProgress(progress);
        const nextButton = document.getElementById("knowledge-salesforce-sync-button");
        if (nextButton) {
            nextButton.disabled = false;
            nextButton.textContent = i18n.t("knowledge.salesforceSync");
        }
    }
}

async function loadEntries() {
    const [faqResponse, technicalResponse, archiveResponse, articlesResponse] = await Promise.all([
        fetch("/api/knowledge?type=faq"),
        fetch("/api/knowledge?type=technical"),
        fetch("/api/knowledge/archive"),
        fetch("/api/articles")
    ]);
    if (!faqResponse.ok || !technicalResponse.ok || !archiveResponse.ok || !articlesResponse.ok) throw new Error(i18n.t("knowledge.loadFailed"));
    faqEntries = await faqResponse.json();
    technicalEntries = await technicalResponse.json();
    const archiveRows = await archiveResponse.json();
    archiveEntries = archiveRows.map(row => ({
        ...(row.record || {}),
        archiveId: row.id,
        archiveEntryType: row.entryType,
        archivedAt: row.archivedAt
    }));
    articleEntries = await articlesResponse.json();
}

export async function renderView() {
    view.innerHTML = `<div class="knowledge-loading">${i18n.t("knowledge.loading")}</div>`;
    const progress = showSalesforceProgress("sync");
    try {
        const salesforceSync = await checkSalesforceKnowledge();
        rememberKnowledgeRemoteVersion(salesforceSync);
        await loadEntries();
        await finishSalesforceProgress(progress);
        renderViewContent();
        showSalesforceSyncStatus(salesforceSync);
    } catch (error) {
        await finishSalesforceProgress(progress);
        view.innerHTML = `<div class="knowledge-loading knowledge-loading-error">${escapeHtml(error.message || i18n.t("knowledge.loadFailed"))}</div>`;
    }
}
