import * as i18n from "../utils/i18n.js";

await i18n.loadLanguage();

const view = document.getElementById("view");
let activeSection = "faq";
let faqEntries = [];
let technicalEntries = [];
let articleEntries = [];
let selectedFilter = "";
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
    const entries = activeSection === "faq" ? faqEntries : technicalEntries;
    const filterOptions = isComparison ? [] : getFilterOptions(entries);
    const activeLabel = activeSection === "faq"
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
            renderViewContent();
        });
    });
    if (!isComparison) {
        document.getElementById("knowledge-search").addEventListener("input", renderFilteredEntries);
        document.getElementById("knowledge-filter").addEventListener("change", event => {
            selectedFilter = event.target.value;
            renderFilteredEntries();
        });
    }
    document.getElementById("knowledge-import-button").addEventListener("click", () => {
        document.getElementById("knowledge-import-file").click();
    });
    document.getElementById("knowledge-import-file").addEventListener("change", event => {
        importWorkbook(event.target.files[0]);
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
    const entries = activeSection === "faq" ? faqEntries : technicalEntries;
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
    const count = document.querySelector(".knowledge-list-header span");
    if (count) count.textContent = `${getFilteredEntries().length} ${i18n.t("knowledge.entries")}`;
}

function renderEntries(entries) {
    if (activeSection === "comparison") return renderComparison();
    if (!entries.length) {
        return `<div class="knowledge-empty">${i18n.t(activeSection === "faq" ? "knowledge.noFaq" : "knowledge.noTechnical")}</div>`;
    }
    return activeSection === "faq"
        ? entries.map(renderFaqEntry).join("")
        : `<div class="knowledge-table-wrapper"><table class="knowledge-table">
            <thead><tr>
                <th>${i18n.t("knowledge.articleNumber")}</th>
                <th>${i18n.t("knowledge.deviceType")}</th>
                <th>${i18n.t("knowledge.parameter")}</th>
                <th>${i18n.t("knowledge.value")}</th>
                <th>${i18n.t("knowledge.unit")}</th>
                <th>${i18n.t("knowledge.source")}</th>
            </tr></thead>
            <tbody>${entries.map(renderTechnicalEntry).join("")}</tbody>
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
                ${hasValue ? cell.values.map(value => escapeHtml(value)).join("<br>") : `<span class="knowledge-comparison-missing">${i18n.t("knowledge.comparisonMissing")}</span>`}
                ${cell?.notes.length ? `<small>${escapeHtml(cell.notes.join(" · "))}</small>` : ""}
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
        [i18n.t("articles.productType"), article.salesforceProductType]
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
        <details class="knowledge-faq-entry">
            <summary>
                <span class="knowledge-faq-question">${escapeHtml(entry.question)}</span>
                ${context ? `<span class="knowledge-faq-context">${escapeHtml(context)}</span>` : ""}
            </summary>
            <div class="knowledge-faq-answer">${escapeHtml(entry.answer)}</div>
            ${entry.tags || entry.source ? `<div class="knowledge-faq-meta">
                ${entry.tags ? `<span><strong>${i18n.t("knowledge.tags")}:</strong> ${escapeHtml(entry.tags)}</span>` : ""}
                ${entry.source ? `<span><strong>${i18n.t("knowledge.source")}:</strong> ${escapeHtml(entry.source)}</span>` : ""}
            </div>` : ""}
        </details>
    `;
}

function renderTechnicalEntry(entry) {
    return `<tr>
        <td>${escapeHtml(entry.articleNumber)}</td>
        <td>${escapeHtml(entry.deviceType)}</td>
        <td><strong>${escapeHtml(entry.parameter)}</strong>${entry.category ? `<small>${escapeHtml(entry.category)}</small>` : ""}</td>
        <td>${escapeHtml(entry.value)}${entry.notes ? `<small>${escapeHtml(entry.notes)}</small>` : ""}</td>
        <td>${escapeHtml(entry.unit)}</td>
        <td>${escapeHtml(entry.source)}</td>
    </tr>`;
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

async function loadEntries() {
    const [faqResponse, technicalResponse, articlesResponse] = await Promise.all([
        fetch("/api/knowledge?type=faq"),
        fetch("/api/knowledge?type=technical"),
        fetch("/api/articles")
    ]);
    if (!faqResponse.ok || !technicalResponse.ok || !articlesResponse.ok) throw new Error(i18n.t("knowledge.loadFailed"));
    faqEntries = await faqResponse.json();
    technicalEntries = await technicalResponse.json();
    articleEntries = await articlesResponse.json();
}

export async function renderView() {
    view.innerHTML = `<div class="knowledge-loading">${i18n.t("knowledge.loading")}</div>`;
    try {
        await loadEntries();
        renderViewContent();
    } catch (error) {
        view.innerHTML = `<div class="knowledge-loading knowledge-loading-error">${escapeHtml(error.message || i18n.t("knowledge.loadFailed"))}</div>`;
    }
}
