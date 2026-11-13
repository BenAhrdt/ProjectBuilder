import * as i18n from "../utils/i18n.js";

await i18n.loadLanguage();

const view = document.getElementById("view");
let activeSection = "faq";
let faqEntries = [];
let technicalEntries = [];
let selectedFilter = "";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}

function renderViewContent() {
    const entries = activeSection === "faq" ? faqEntries : technicalEntries;
    const filterOptions = getFilterOptions(entries);
    const activeLabel = activeSection === "faq"
        ? i18n.t("knowledge.faq")
        : i18n.t("knowledge.technical");

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
                </div>
                <label class="knowledge-search-label" for="knowledge-search">${i18n.t("knowledge.search")}</label>
                <input id="knowledge-search" type="search" placeholder="${i18n.t("knowledge.searchPlaceholder")}" value="${escapeHtml(document.getElementById("knowledge-search")?.value || "")}">
                <select id="knowledge-filter" aria-label="${i18n.t("knowledge.filter")}">
                    <option value="">${i18n.t("knowledge.allFilters")}</option>
                    ${filterOptions.map(option => `<option value="${escapeHtml(option)}" ${option === selectedFilter ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
                </select>
                <button id="knowledge-import-button" type="button" class="knowledge-primary">
                    ${i18n.t("knowledge.import")}
                </button>
                <input id="knowledge-import-file" type="file" accept=".xlsx,.xls" hidden>
            </div>
            <div class="knowledge-import-hint">
                ${i18n.t("knowledge.importHint")}
            </div>
            <div id="knowledge-status" class="knowledge-status" aria-live="polite"></div>
            <div class="knowledge-list-header">
                <strong>${activeLabel}</strong>
                <span>${entries.length} ${i18n.t("knowledge.entries")}</span>
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
    document.getElementById("knowledge-search").addEventListener("input", renderFilteredEntries);
    document.getElementById("knowledge-filter").addEventListener("change", event => {
        selectedFilter = event.target.value;
        renderFilteredEntries();
    });
    document.getElementById("knowledge-import-button").addEventListener("click", () => {
        document.getElementById("knowledge-import-file").click();
    });
    document.getElementById("knowledge-import-file").addEventListener("change", event => {
        importWorkbook(event.target.files[0]);
    });
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
    const [faqResponse, technicalResponse] = await Promise.all([
        fetch("/api/knowledge?type=faq"),
        fetch("/api/knowledge?type=technical")
    ]);
    if (!faqResponse.ok || !technicalResponse.ok) throw new Error(i18n.t("knowledge.loadFailed"));
    faqEntries = await faqResponse.json();
    technicalEntries = await technicalResponse.json();
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
