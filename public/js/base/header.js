import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage();

const header = document.getElementById("header");
const MAX_RESULTS_PER_GROUP = 5;
let searchTimer;
let searchRequestId = 0;

header.innerHTML = `
    <div class="header-brand" aria-label="Janitza">
        <img src="/icons/janitza-logo.svg" alt="Janitza">
    </div>
    <div class="header-space" aria-hidden="true"></div>
    <div class="language-selector">
        <span>${i18n.t("header.language")}</span>
        <div class="language-dropdown">
            <button id="language-select" class="language-dropdown-trigger" type="button"
                aria-label="${i18n.t("header.language")}" aria-haspopup="listbox" aria-expanded="false">
                <img alt="" aria-hidden="true">
                <span class="language-current-label"></span>
                <span class="language-chevron" aria-hidden="true">⌄</span>
            </button>
            <div class="language-dropdown-menu" role="listbox" hidden>
                <button type="button" role="option" data-language="de">
                    <img src="/icons/flags/de.svg" alt=""><span>${i18n.t("language.de")}</span>
                </button>
                <button type="button" role="option" data-language="en">
                    <img src="/icons/flags/gb.svg" alt=""><span>${i18n.t("language.en")}</span>
                </button>
                <button type="button" role="option" data-language="es">
                    <img src="/icons/flags/es.svg" alt=""><span>${i18n.t("language.es")}</span>
                </button>
            </div>
        </div>
    </div>
`;

const languageSelect = document.getElementById("language-select");
if (!document.getElementById("global-search-input")) {
    await new Promise(resolve => document.addEventListener(
        "projectbuilder:navbar-ready",
        resolve,
        { once: true }
    ));
}
const searchInput = document.getElementById("global-search-input");
const resultsElement = document.getElementById("global-search-results");
const searchContainer = searchInput.closest(".global-search");

const languageMenu = document.querySelector(".language-dropdown-menu");
const languageLabels = {
    de: i18n.t("language.de"),
    en: i18n.t("language.en"),
    es: i18n.t("language.es")
};
const languageFlags = { de: "de", en: "gb", es: "es" };
const selectedLanguage = i18n.getCurrentLanguage();

languageSelect.querySelector("img").src = `/icons/flags/${languageFlags[selectedLanguage]}.svg`;
languageSelect.querySelector(".language-current-label").textContent = languageLabels[selectedLanguage];
languageMenu.querySelector(`[data-language="${selectedLanguage}"]`).setAttribute("aria-selected", "true");

languageSelect.addEventListener("click", () => {
    const willOpen = languageMenu.hidden;
    languageMenu.hidden = !willOpen;
    languageSelect.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) languageMenu.querySelector("button")?.focus();
});

languageMenu.querySelectorAll("button").forEach(option => {
    option.addEventListener("click", () => {
        if (i18n.setLanguage(option.dataset.language)) window.location.reload();
    });
});

document.addEventListener("click", event => {
    if (!event.target.closest(".language-dropdown")) closeLanguageMenu();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !languageMenu.hidden) {
        closeLanguageMenu();
        languageSelect.focus();
    }
});

function closeLanguageMenu() {
    languageMenu.hidden = true;
    languageSelect.setAttribute("aria-expanded", "false");
}

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const query = searchInput.value.trim();
    if (query.length < 2) {
        closeResults();
        return;
    }
    resultsElement.hidden = false;
    resultsElement.innerHTML = `<div class="global-search-status">${i18n.t("search.loading")}</div>`;
    searchTimer = setTimeout(() => performSearch(query), 180);
});

searchInput.addEventListener("keydown", event => {
    const options = [...resultsElement.querySelectorAll("button")];
    const currentIndex = options.indexOf(document.activeElement);
    if (event.key === "ArrowDown" && options.length) {
        event.preventDefault();
        options[Math.min(currentIndex + 1, options.length - 1)].focus();
    } else if (event.key === "Escape") {
        closeResults();
        searchInput.blur();
    }
});

resultsElement.addEventListener("keydown", event => {
    const options = [...resultsElement.querySelectorAll("button")];
    const index = options.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
        event.preventDefault();
        (options[index + 1] || options[0])?.focus();
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (index <= 0) searchInput.focus();
        else options[index - 1].focus();
    } else if (event.key === "Escape") {
        closeResults();
        searchInput.focus();
    }
});

document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
    }
});

document.addEventListener("click", event => {
    if (!searchContainer.contains(event.target)) closeResults();
});

async function performSearch(query) {
    const requestId = ++searchRequestId;
    try {
        const projectId = getCurrentProjectId();
        const requests = [
            fetch(`/api/customers?search=${encodeURIComponent(query)}`).then(readJson),
            fetch(`/api/projects?search=${encodeURIComponent(query)}`).then(readJson),
            fetch(`/api/articles?search=${encodeURIComponent(query)}`).then(readJson),
            fetch(`/api/projectNodes/search?search=${encodeURIComponent(query)}`).then(readJson)
        ];
        const [customers, projects, articles, nodes] = await Promise.all(requests);
        if (requestId !== searchRequestId || query !== searchInput.value.trim()) return;
        renderResults(query, projectId, customers, projects, articles, nodes);
    } catch (error) {
        console.error("Global search failed:", error);
        resultsElement.innerHTML = `<div class="global-search-status">${i18n.t("search.error")}</div>`;
    }
}

async function readJson(response) {
    if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
    return response.json();
}

function renderResults(query, projectId, customers, projects, articles, nodes) {
    const currentProjectNodes = nodes.filter(node => String(node.projectId) === String(projectId));
    const otherProjectNodes = nodes.filter(node => String(node.projectId) !== String(projectId));
    const groups = [
        { label: i18n.t("search.currentProject"), type: "node", items: currentProjectNodes,
            title: item => item.path, detail: item => nodeTypeLabel(item.type), projectId },
        { label: i18n.t("search.projectPositions"), type: "node", items: otherProjectNodes,
            title: item => item.path,
            detail: item => [item.projectName, nodeTypeLabel(item.type)].filter(Boolean).join(" · ") },
        { label: i18n.t("search.customers"), type: "customer", items: customers,
            title: item => item.name, detail: item => [item.customerNumber, item.city].filter(Boolean).join(" · ") },
        { label: i18n.t("search.projects"), type: "project", items: projects,
            title: item => item.name, detail: item => item.customerName || item.description || "" },
        { label: i18n.t("search.articles"), type: "article", items: articles,
            title: item => item.articleNumber, detail: item => item.manufacturerType || item.description || "" }
    ].filter(group => group.items.length);

    if (!groups.length) {
        resultsElement.innerHTML = `<div class="global-search-status">${i18n.t("search.noResults")}</div>`;
        return;
    }

    resultsElement.innerHTML = groups.map(group => `
        <section class="global-search-group">
            <h2>${escapeHtml(group.label)}</h2>
            ${group.items.slice(0, MAX_RESULTS_PER_GROUP).map(item => `
                <button type="button" role="option" data-result-type="${group.type}"
                    data-result-id="${escapeHtml(String(item.id ?? item.articleNumber))}"
                    data-project-id="${escapeHtml(String(item.projectId ?? group.projectId ?? ""))}">
                    <span class="global-search-result-title">${highlight(group.title(item), query)}</span>
                    <span class="global-search-result-detail">${highlight(group.detail(item), query)}</span>
                </button>`).join("")}
        </section>`).join("");

    resultsElement.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => openResult(button));
    });
}

function openResult(button) {
    const type = button.dataset.resultType;
    const id = button.dataset.resultId;
    if (type === "customer") navigate(`/customer/${id}`);
    if (type === "project") navigate(`/project/${id}`);
    if (type === "article") {
        sessionStorage.setItem("projectbuilder.pendingArticleSearch", id);
        navigate("/articles");
    }
    if (type === "node") {
        sessionStorage.setItem("projectbuilder.pendingNodeSearch", JSON.stringify({
            projectId: button.dataset.projectId,
            nodeId: id
        }));
        navigate(`/project/${button.dataset.projectId}`);
    }
    searchInput.value = "";
    closeResults();
}

function navigate(path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
}

function getCurrentProjectId() {
    const match = window.location.pathname.match(/^\/project\/(\d+)/);
    return match?.[1] ?? null;
}

function buildNodePath(node, nodes) {
    const path = [node.name];
    let parentId = node.parentId;
    const visited = new Set([String(node.id)]);
    while (parentId != null && !visited.has(String(parentId))) {
        visited.add(String(parentId));
        const parent = nodes.find(item => String(item.id) === String(parentId));
        if (!parent) break;
        path.unshift(parent.name);
        parentId = parent.parentId;
    }
    return path.join(" › ");
}

function nodeTypeLabel(type) {
    return i18n.t(`search.nodeType.${type}`);
}

function normalize(value) {
    return String(value ?? "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function highlight(value, query) {
    const text = String(value ?? "");
    const index = normalize(text).indexOf(normalize(query));
    if (index < 0) return escapeHtml(text);
    return `${escapeHtml(text.slice(0, index))}<mark>${escapeHtml(text.slice(index, index + query.length))}</mark>${escapeHtml(text.slice(index + query.length))}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}

function closeResults() {
    resultsElement.hidden = true;
    resultsElement.innerHTML = "";
}
