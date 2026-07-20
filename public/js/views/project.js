import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage();

import * as utils from "../utils/icons.js";
import * as router from "../router.js";
import * as settings from "../utils/settings.js";
import {
    openProjectOverview
} from "./projectOverview.js";
import {
    calculateStructureUnitPrice
} from "./projectPricing.js";
import {
    showAlert,
    showConfirm
} from "../utils/modal.js";

let collapsedNodes = new Set();
let currentNodes = [];
let currentArticles = [];
let currentNodeArticles = [];
let currentProject = null;
let currentProjectCustomer = null;
let currentStructurePriceMode = "list";
let draggedArticleNumber = null;
const pendingNodeArticleOrderRequests =
    new Set();
const pendingNodeArticleQuantityRequests =
    new Set();
const articleFavoritesStorageKey =
    "projectBuilder.articleFavorites";
const articleFavoritesCollapsedStorageKey =
    "projectBuilder.articleFavoritesCollapsed";
const projectDescriptionCollapsedStorageKey =
    "projectBuilder.projectDescriptionCollapsed";
const projectStructurePriceModeStorageKey =
    "projectBuilder.projectStructurePriceMode";
const projectStructureWidthStorageKey =
    "projectBuilder.projectStructureWidth";
const defaultProjectStructureWidth = 495;
const minimumProjectStructureWidth = 360;
const minimumProjectArticlesWidth = 480;
const articleIconRules = [
    {
        icon: "hdr1te.png",
        keywords: [
            "1605015",
            "hdr 24v 1te",
            "hdr 24v (1te)",
            "hutschienennetzteil hdr 24v (1te)"
        ]
    },
    {
        icon: "hdr4te.png",
        keywords: [
            "1605014",
            "hdr 24v 4te",
            "hdr 24v (4te)",
            "hutschienennetzteil hdr 24v"
        ]
    },
    {
        icon: "ml301te.png",
        keywords: [
            "1605012",
            "ml30",
            "ml30 1te",
            "ml30-1te"
        ]
    },
    {
        icon: "module-ct8-lp.png",
        keywords: [
            "ct8-lp",
            "ct 8-lp",
            "ct8 lp",
            "ct 8 lp",
            "800-ct8-lp"
        ]
    },
    {
        icon: "module-ct8-a.png",
        keywords: [
            "ct8-a",
            "ct 8-a",
            "ct8 a",
            "ct 8 a",
            "800-ct8-a"
        ]
    },
    {
        icon: "module-ct24.png",
        keywords: [
            "ct24",
            "ct 24",
            "module ct24",
            "modul ct24"
        ]
    },
    {
        icon: "module-ct12.png",
        keywords: [
            "ct12",
            "ct 12",
            "module ct12",
            "modul ct12"
        ]
    },
    {
        icon: "module-di14.png",
        keywords: [
            "di14",
            "di 14",
            "module di14",
            "modul di14"
        ]
    },
    {
        icon: "module-96rcm.png",
        keywords: [
            "96-rcm",
            "96rcm",
            "module 96-rcm",
            "modul 96-rcm"
        ]
    },
    {
        icon: "module-96pts.png",
        keywords: [
            "96-pts",
            "96pts",
            "module 96-pts",
            "modul 96-pts"
        ]
    },
    {
        icon: "module-rj45.png",
        keywords: [
            "rj45",
            "rj 45"
        ]
    },
    {
        icon: "module-con.png",
        keywords: [
            "module con",
            "modul con",
            "con module",
            "con modul"
        ]
    },
    {
        icon: "umg96pql.png",
        keywords: [
            "umg 96-pq-l",
            "umg 96pql",
            "umg96pql",
            "96-pq-l",
            "96pql"
        ]
    },
    {
        icon: "umg96pa.png",
        keywords: [
            "umg 96-pa",
            "umg 96pa",
            "umg96pa",
            "96-pa",
            "96pa"
        ]
    },
    {
        icon: "umg96rm.png",
        keywords: [
            "umg 96-rm",
            "umg 96rm",
            "umg96rm",
            "96-rm",
            "96rm"
        ]
    },
    {
        icon: "umg96s2.png",
        keywords: [
            "umg 96-s2",
            "umg 96s2",
            "umg96s2",
            "96-s2",
            "96s2"
        ]
    },
    {
        icon: "umg96el.png",
        keywords: [
            "umg 96-el",
            "umg 96el",
            "umg96el",
            "96-el",
            "96el"
        ]
    },
    {
        icon: "umg800.png",
        keywords: [
            "umg 800",
            "umg800"
        ]
    },
    {
        icon: "umg801.png",
        keywords: [
            "umg 801",
            "umg801"
        ]
    },
    {
        icon: "umg605.png",
        keywords: [
            "umg 605",
            "umg605"
        ]
    },
    {
        icon: "umg604.png",
        keywords: [
            "umg 604",
            "umg604"
        ]
    },
    {
        icon: "umg512.png",
        keywords: [
            "umg 512",
            "umg512"
        ]
    },
    {
        icon: "umg509.png",
        keywords: [
            "umg 509",
            "umg509"
        ]
    },
    {
        icon: "umg103.png",
        keywords: [
            "umg 103",
            "umg103"
        ]
    },
    {
        icon: "rcm201rogo.png",
        keywords: [
            "rcm 201",
            "rcm201",
            "201-rogo",
            "201 rogo"
        ]
    },
    {
        icon: "rcm202ab.png",
        keywords: [
            "rcm 202",
            "rcm202",
            "202-ab",
            "202 ab"
        ]
    },
    {
        icon: "rogowski.png",
        keywords: [
            "rogowski",
            "rogo"
        ]
    },
    {
        icon: "rd96.png",
        keywords: [
            "5231212",
            "rd 96",
            "rd96"
        ]
    },
    {
        icon: "b21.png",
        keywords: [
            "b21"
        ]
    },
    {
        icon: "b23.png",
        keywords: [
            "b23"
        ]
    },
    {
        icon: "b24.png",
        keywords: [
            "b24"
        ]
    },
    {
        icon: "energy-meter.png",
        keywords: [
            "energiezahler",
            "energy meter",
            "stromzahler"
        ]
    }
];

const view =
    document.getElementById(
        "view"
    );

async function renderView(
    projectId
) {

    await settings.load();

    currentStructurePriceMode =
        getProjectStructurePriceMode(
            projectId
        );

    loadCollapsedNodes(
        projectId
    );

    const response =
        await fetch(
            `/api/projects/${projectId}`
        );

    const project =
        await response.json();

    currentProject =
        project;

    const articleResponse =
        await fetch(
            "/api/articles"
        );

    const articles =
        await articleResponse.json();

    currentArticles =
        articles;

    const customerResponse =
        await fetch(
            "/api/customers"
        );

    const customers =
        await customerResponse.json();

    currentProjectCustomer =
        await loadProjectCustomer(
            project.customerId
        );

    const nodesResponse =
        await fetch(

            `/api/projectNodes/${projectId}`

        );

    const nodes =
        await nodesResponse.json();

    currentNodes =
        nodes;

    const pendingNodeSearch = getPendingNodeSearch(projectId);
    if (pendingNodeSearch) {
        let targetNode = nodes.find(node => String(node.id) === pendingNodeSearch.nodeId);
        while (targetNode?.parentId != null) {
            collapsedNodes.delete(String(targetNode.parentId));
            targetNode = nodes.find(node => String(node.id) === String(targetNode.parentId));
        }
        saveCollapsedNodes(projectId);
    }

    const nodeArticlesResponse =
        await fetch(
            "/api/projectNodeArticles"
        );

    const nodeArticles =
        await nodeArticlesResponse.json();

    currentNodeArticles =
        nodeArticles;

    const nodeTotals =
        calculateNodeTotals(
            nodes,
            nodeArticles,
            articles
        );

    const projectTotals =
        calculateProjectTotals(
            nodes,
            nodeArticles,
            articles,
            currentProjectCustomer,
            project
        );

    const isDescriptionOpen =
        isProjectDescriptionOpen(
            projectId,
            project
        );

    view.innerHTML = `

        <div class="view-header project-view-header">

            <span class="project-view-title">
                ${project.name}
            </span>

            <div
                id="project-price-summary"
                class="project-price-summary"
            >

                ${renderProjectPriceSummary(projectTotals)}

            </div>

        </div>

        <div class="view-left"></div>

        <div
            id="project-content"
            class="view-content"
        >

            <div class="project-card">

                <div class="project-card-header">

                    <h2>
                        ${i18n.t("project.projectData")}
                    </h2>

                    <div class="project-card-header-actions">

                        <button
                            id="show-project-overview"
                            type="button"
                            title="${i18n.t("project.showOverview")}"
                            aria-label="${i18n.t("project.showOverview")}"
                        >
                            <span class="project-overview-button-icon">
                                ${utils.icons.projects}
                            </span>

                            <span>
                                ${i18n.t("project.showOverview")}
                            </span>
                        </button>

                        <button
                            id="export-project-excel"
                            type="button"
                            title="${i18n.t("project.exportExcel")}"
                            aria-label="${i18n.t("project.exportExcel")}"
                        >
                            <span class="export-project-icon">
                                ${utils.icons.excel}
                            </span>

                            <span>
                                ${i18n.t("project.exportExcel")}
                            </span>
                        </button>

                        <button
                            id="export-project-tender"
                            type="button"
                            title="${i18n.t("project.exportTender")}"
                            aria-label="${i18n.t("project.exportTender")}"
                        >
                            <span class="export-project-tender-icon">LV</span>
                            <span>${i18n.t("project.exportTender")}</span>
                        </button>

                        <button
                            id="delete-project"
                            type="button"
                            title="Projekt löschen"
                            aria-label="Projekt löschen"
                        >
                            Projekt löschen
                        </button>

                    </div>

                </div>

               <div class="project-form">

                    <div class="project-form-top">

                        <div class="project-form-row">

                            <label>
                                ${i18n.t("project.projectname")}:
                            </label>

                            <input
                                id="project-name"
                                value="${project.name ?? ""}"
                            >

                        </div>

                        <div class="project-form-row">

                            <label>
                                ${i18n.t("project.customer")}:
                            </label>

                                <select id="project-customer">

                                    <option
                                        value=""
                                        ${!project.customerId ? "selected" : ""}
                                    >
                                        ${i18n.t("project.selectCustomer")}
                                    </option>

                                    ${customers.map(customer => `
                                        <option
                                            value="${customer.id}"
                                            ${customer.id == project.customerId ? "selected" : ""}
                                        >
                                            ${customer.name}
                                        </option>
                                    `).join("")}

                                </select>

                        </div>

                        <div class="project-form-row">

                            <label>
                                ${i18n.t("project.projectDiscount")}:
                            </label>

                            <div class="project-discount-input-wrapper">
                                <input
                                    id="project-discount"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value="${project.projectDiscount ?? 0}"
                                >
                                <span>%</span>
                            </div>

                        </div>

                    </div>

                    <details
                        class="project-description-details"
                        ${isDescriptionOpen ? "open" : ""}
                    >

                        <summary>
                            ${i18n.t("project.description")}:
                        </summary>

                        <textarea
                            id="project-description"
                        >${project.description ?? ""}</textarea>

                    </details>

                </div>

            </div>

            <div class="project-editor">

                <div class="project-structure-card">

                    <div class="project-structure-header">
                        <h2>
                            ${i18n.t("project.projectStructure")}
                        </h2>

                        <div
                            class="project-structure-price-toggle"
                            role="group"
                            aria-label="${i18n.t("project.structurePriceDisplay")}"
                        >
                            <button
                                type="button"
                                data-price-mode="list"
                                class="${currentStructurePriceMode === "list" ? "active" : ""}"
                                aria-pressed="${currentStructurePriceMode === "list"}"
                            >
                                ${i18n.t("project.structureListPrices")}
                            </button>
                            <button
                                type="button"
                                data-price-mode="discounted"
                                class="${currentStructurePriceMode === "discounted" ? "active" : ""}"
                                aria-pressed="${currentStructurePriceMode === "discounted"}"
                            >
                                ${i18n.t("project.structureDiscountedPrices")}
                            </button>
                        </div>
                    </div>

                    <div class="project-root-actions">

                        <button
                            id="add-building"
                            class="project-root-action"
                            type="button"
                            title="${i18n.t("project.addBuilding")}"
                            aria-label="${i18n.t("project.addBuilding")}"
                        >
                            <span class="project-root-action-icon">
                                ${utils.icons.building}
                            </span>

                            <span>
                                ${i18n.t("project.addBuilding")}
                            </span>
                        </button>

                        <button
                            id="add-general-position"
                            class="project-root-action"
                            type="button"
                            title="${i18n.t("project.addGeneralPosition")}"
                            aria-label="${i18n.t("project.addGeneralPosition")}"
                        >
                            <span class="project-root-action-icon">
                                ${utils.icons.generalPosition}
                            </span>

                            <span>
                                ${i18n.t("project.addGeneralPosition")}
                            </span>
                        </button>

                    </div>

                    <div id="project-tree">

                        ${renderNodes(nodes, nodeArticles, articles, nodeTotals)}

                    </div>

                </div>

                <div
                    class="project-editor-resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="${i18n.t("project.resizeStructure")}"
                    title="${i18n.t("project.resizeStructure")}"
                    tabindex="0"
                ></div>

                <div class="project-articles-card">

                    <h2>
                        ${i18n.t("project.articles")}
                    </h2>

                    <div
                        id="project-article-favorites"
                    >

                        ${renderFavoriteArticles(articles)}

                    </div>

                    <input
                        id="project-article-search"
                        placeholder="${i18n.t("project.searchArticles")}..."
                    >

                <div
                    id="project-article-list"
                >

                    ${renderArticleList(articles)}

                </div>

                </div>

            </div>

        </div>

        <div class="view-right"></div>
    `;

    generateHandler(projectId);
    registerProjectOverview(projectId);
    registerProjectExport(projectId);
    registerProjectTenderExport(projectId);
    registerProjectDelete(projectId, project);
    registerProjectDescriptionPersistence(projectId);
    registerProjectStructurePriceToggle(projectId);
    registerProjectEditorResizer(projectId);
    generateNodeHandler(projectId);
    registerNodeButtons(projectId);
    registerArticleDragSources();
    registerArticleDropTargets(projectId);
    registerArticleSearch(articles);
    registerArticleFavorites(articles, projectId);
    registerNodeToggles(projectId);
    registerProjectNodeMenus(projectId);
    registerProjectNodeDragAndDrop(projectId);
    registerNodeArticleMenus(projectId);
    registerNodeArticleQuantityInputs(projectId);
    registerNodeArticleDragAndDrop(projectId);
    registerArticleListLayoutSync();
    syncArticleListHeight();

    if (pendingNodeSearch) {
        sessionStorage.removeItem("projectbuilder.pendingNodeSearch");
        const target = document.querySelector(`.project-node[data-id="${CSS.escape(pendingNodeSearch.nodeId)}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.classList.add("project-node-search-target");
        setTimeout(() => target?.classList.remove("project-node-search-target"), 2400);
    }
}

function getPendingNodeSearch(projectId) {
    try {
        const pending = JSON.parse(sessionStorage.getItem("projectbuilder.pendingNodeSearch") || "null");
        return String(pending?.projectId) === String(projectId)
            ? { ...pending, nodeId: String(pending.nodeId) }
            : null;
    } catch {
        sessionStorage.removeItem("projectbuilder.pendingNodeSearch");
        return null;
    }
}

async function refreshProjectTree(
    projectId
) {

    await waitForPendingNodeArticleQuantities();

    const nodesResponse =
        await fetch(

            `/api/projectNodes/${projectId}`

        );

    currentNodes =
        await nodesResponse.json();

    const nodeArticlesResponse =
        await fetch(
            "/api/projectNodeArticles"
        );

    currentNodeArticles =
        await nodeArticlesResponse.json();

    currentProjectCustomer =
        await loadSelectedProjectCustomer();

    const nodeTotals =
        calculateNodeTotals(
            currentNodes,
            currentNodeArticles,
            currentArticles
        );

    const projectTree =
        document.getElementById(
            "project-tree"
        );

    if (!projectTree) {

        return;

    }

    projectTree.innerHTML =
        renderNodes(
            currentNodes,
            currentNodeArticles,
            currentArticles,
            nodeTotals
        );

    registerNodeButtons(
        projectId
    );

    registerArticleDropTargets(projectId);

    registerNodeToggles(
        projectId
    );

    registerProjectNodeMenus(
        projectId
    );

    registerProjectNodeDragAndDrop(
        projectId
    );

    registerNodeArticleMenus(
        projectId
    );

    registerNodeArticleQuantityInputs(
        projectId
    );

    registerNodeArticleDragAndDrop(
        projectId
    );

    updateProjectPriceSummary();

    syncArticleListHeight();

}

async function loadProjectCustomer(
    customerId
) {

    if (!customerId) {

        return null;

    }

    const response =
        await fetch(
            `/api/customers/${customerId}`
        );

    return await response.json();

}

async function loadSelectedProjectCustomer() {

    const customerSelect =
        document.getElementById(
            "project-customer"
        );

    return await loadProjectCustomer(
        customerSelect?.value
    );

}

function registerArticleListLayoutSync() {

    // CSS now keeps the editor panels sized and scrollable.

}

function syncArticleListHeight() {

    // Kept for existing render/drop call sites; layout is CSS-driven.

}

function renderArticleList(
    articles
) {

    const favoriteArticleNumbers =
        getFavoriteArticleNumbers();

    return articles.map(article => `

        <div
            class="project-article"
            data-article-number="${article.articleNumber}"
            draggable="true"
        >

            <div class="project-article-number">

                ${article.articleNumber}

            </div>

            <div class="project-article-name">

                ${article.manufacturerType ?? ""}

            </div>

            <div class="project-article-price">

                ${article.listPrice ?? ""} €

            </div>

            <div class="project-article-pg">

                ${article.discountGroup ?? ""}

            </div>

            <div class="project-article-icon">
                <button
                    class="article-favorite-toggle ${favoriteArticleNumbers.has(String(article.articleNumber)) ? "active" : ""}"
                    type="button"
                    title="${i18n.t("project.favorite")}"
                    aria-label="${i18n.t("project.toggleFavorite")}"
                    aria-pressed="${favoriteArticleNumbers.has(String(article.articleNumber)) ? "true" : "false"}"
                    data-article-number="${article.articleNumber}"
                >
                    ${favoriteArticleNumbers.has(String(article.articleNumber)) ? "★" : "☆"}
                </button>

                <img
                    src="${getArticleIcon(article)}"
                    alt=""
                >
            </div>

            <div class="project-article-description">

                ${article.description ?? ""}

            </div>

        </div>

    `).join("");

}

function renderFavoriteArticles(
    articles
) {

    const favoriteArticleNumbers =
        getFavoriteArticleNumberList();

    const favoriteArticles =
        favoriteArticleNumbers
            .map(articleNumber =>
                articles.find(article =>
                    String(article.articleNumber)
                    ===
                    String(articleNumber)
                )
            )
            .filter(Boolean);

    if (favoriteArticles.length === 0) {

        return "";

    }

    const isCollapsed =
        areArticleFavoritesCollapsed();

    return `

        <button
            id="project-article-favorites-toggle"
            type="button"
            aria-expanded="${isCollapsed ? "false" : "true"}"
        >
            <span>
                ${isCollapsed ? "▶" : "▼"}
            </span>

            ${i18n.t("project.favorites")}
        </button>

        ${isCollapsed ? "" : `

            <div class="project-article-favorites-list">

                ${favoriteArticles.map(article => `

                    <button
                        class="project-article-favorite"
                        type="button"
                        draggable="true"
                        data-article-number="${article.articleNumber}"
                        title="${i18n.t("project.addArticle")}"
                    >

                        <span class="project-article-favorite-icon">
                            <img
                                src="${getArticleIcon(article)}"
                                alt=""
                            >
                        </span>

                        <span class="project-article-favorite-text">

                            <strong>
                                ${article.articleNumber}
                            </strong>

                            <span>
                                ${article.manufacturerType ?? ""}
                            </span>

                        </span>

                    </button>

                `).join("")}

            </div>

        `}

    `;

}

function areArticleFavoritesCollapsed() {

    return settings.getItem(
        articleFavoritesCollapsedStorageKey
    )
    ===
    "true";

}

function saveArticleFavoritesCollapsed(
    isCollapsed
) {

    settings.setItem(
        articleFavoritesCollapsedStorageKey,
        isCollapsed
            ? "true"
            : "false"
    );

}

function getFavoriteArticleNumbers() {

    return new Set(
        getFavoriteArticleNumberList()
    );

}

function getFavoriteArticleNumberList() {

    try {

        return JSON.parse(
                settings.getItem(
                    articleFavoritesStorageKey
                )
                ||
                "[]"
            ).map(String);

    } catch (error) {

        return [];

    }

}

function saveFavoriteArticleNumberList(
    favoriteArticleNumbers
) {

    settings.setItem(
        articleFavoritesStorageKey,
        JSON.stringify(
            favoriteArticleNumbers.map(String)
        )
    );

}

function saveFavoriteArticleNumbers(
    favoriteArticleNumbers
) {

    settings.setItem(
        articleFavoritesStorageKey,
        JSON.stringify(
            Array.from(
                favoriteArticleNumbers
            )
        )
    );

}

function getProjectStructurePriceMode(
    projectId
) {
    return settings.getItem(
        `${projectStructurePriceModeStorageKey}.${projectId}`
    ) === "discounted"
        ? "discounted"
        : "list";
}

function saveProjectStructurePriceMode(
    projectId,
    priceMode
) {
    settings.setItem(
        `${projectStructurePriceModeStorageKey}.${projectId}`,
        priceMode
    );
}

function getProjectStructureWidth(
    projectId
) {
    const storedWidth = Number(
        settings.getItem(
            `${projectStructureWidthStorageKey}.${projectId}`
        )
    );

    return Number.isFinite(storedWidth)
        && storedWidth >= minimumProjectStructureWidth
        ? storedWidth
        : defaultProjectStructureWidth;
}

function saveProjectStructureWidth(
    projectId,
    width
) {
    settings.setItem(
        `${projectStructureWidthStorageKey}.${projectId}`,
        String(Math.round(width))
    );
}

function registerProjectEditorResizer(
    projectId
) {
    const editor =
        document.querySelector(
            ".project-editor"
        );
    const resizer =
        editor?.querySelector(
            ".project-editor-resizer"
        );

    if (!editor || !resizer) {
        return;
    }

    let preferredWidth =
        getProjectStructureWidth(projectId);
    let renderedWidth = preferredWidth;
    let dragStartX = 0;
    let dragStartWidth = 0;

    const applyWidth = width => {
        const maximumWidth = Math.max(
            minimumProjectStructureWidth,
            editor.clientWidth
                - resizer.offsetWidth
                - minimumProjectArticlesWidth
        );

        renderedWidth = Math.min(
            maximumWidth,
            Math.max(
                minimumProjectStructureWidth,
                width
            )
        );

        editor.style.setProperty(
            "--project-structure-width",
            `${renderedWidth}px`
        );
        resizer.setAttribute(
            "aria-valuemin",
            String(minimumProjectStructureWidth)
        );
        resizer.setAttribute(
            "aria-valuemax",
            String(Math.round(maximumWidth))
        );
        resizer.setAttribute(
            "aria-valuenow",
            String(Math.round(renderedWidth))
        );
    };

    const finishResize = event => {
        if (!resizer.classList.contains("dragging")) {
            return;
        }

        resizer.classList.remove("dragging");
        document.body.classList.remove(
            "project-editor-resizing"
        );

        if (resizer.hasPointerCapture(event.pointerId)) {
            resizer.releasePointerCapture(event.pointerId);
        }

        preferredWidth = renderedWidth;
        saveProjectStructureWidth(
            projectId,
            preferredWidth
        );
    };

    resizer.addEventListener(
        "pointerdown",
        event => {
            if (event.button !== 0) {
                return;
            }

            dragStartX = event.clientX;
            dragStartWidth = renderedWidth;
            resizer.classList.add("dragging");
            document.body.classList.add(
                "project-editor-resizing"
            );
            resizer.setPointerCapture(event.pointerId);
            event.preventDefault();
        }
    );

    resizer.addEventListener(
        "pointermove",
        event => {
            if (!resizer.classList.contains("dragging")) {
                return;
            }

            applyWidth(
                dragStartWidth
                    + event.clientX
                    - dragStartX
            );
        }
    );

    resizer.addEventListener("pointerup", finishResize);
    resizer.addEventListener("pointercancel", finishResize);
    resizer.addEventListener(
        "keydown",
        event => {
            if (event.key !== "ArrowLeft"
                && event.key !== "ArrowRight") {
                return;
            }

            preferredWidth = renderedWidth
                + (event.key === "ArrowRight" ? 10 : -10);
            applyWidth(preferredWidth);
            preferredWidth = renderedWidth;
            saveProjectStructureWidth(
                projectId,
                preferredWidth
            );
            event.preventDefault();
        }
    );
    resizer.addEventListener(
        "dblclick",
        () => {
            preferredWidth = defaultProjectStructureWidth;
            applyWidth(preferredWidth);
            saveProjectStructureWidth(
                projectId,
                renderedWidth
            );
        }
    );

    applyWidth(preferredWidth);

    if (typeof ResizeObserver !== "undefined") {
        const resizeObserver = new ResizeObserver(
            () => applyWidth(preferredWidth)
        );
        resizeObserver.observe(editor);
    }
}

function registerProjectStructurePriceToggle(
    projectId
) {
    const toggle =
        document.querySelector(
            ".project-structure-price-toggle"
        );

    if (!toggle) {
        return;
    }

    toggle.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    "button[data-price-mode]"
                );

            if (!button) {
                return;
            }

            currentStructurePriceMode =
                button.dataset.priceMode
                ===
                "discounted"
                    ? "discounted"
                    : "list";

            saveProjectStructurePriceMode(
                projectId,
                currentStructurePriceMode
            );

            toggle
                .querySelectorAll(
                    "button[data-price-mode]"
                )
                .forEach(toggleButton => {
                    const isActive =
                        toggleButton.dataset.priceMode
                        ===
                        currentStructurePriceMode;
                    toggleButton.classList.toggle(
                        "active",
                        isActive
                    );
                    toggleButton.setAttribute(
                        "aria-pressed",
                        String(isActive)
                    );
                });

            updateProjectStructurePrices();
        }
    );
}

// Render Nodes
function renderNodes(nodes, nodeArticles, articles, nodeTotals) {
    return renderChildNodes(nodes, nodeArticles, articles, nodeTotals, null);
}

function renderChildNodes(nodes, nodeArticles, articles, nodeTotals, parentId) {

    const getArticlesForNode =
        nodeId =>
            nodeArticles.filter(
                article =>
                    String(article.projectNodeId)
                    ===
                    String(nodeId)
            )
            .sort(compareNodeArticleOrder);

    return nodes
        .filter(node =>
            String(node.parentId) === String(parentId)
            ||
            (
                parentId === null
                &&
                node.parentId === null
            )
        )
        .sort(compareProjectNodeOrder)

        .map(node => {

            const nextNodeType =
                getNextNodeType(node.type);

            const addNodeLabel =
                nextNodeType
                    ? getAddNodeLabel(
                        nextNodeType.type
                    )
                    : "";

            return `

            <div class="project-node-wrapper">

                <div
                    class="project-node"
                    data-id="${node.id}"
                    data-type="${node.type}"
                    data-parent-id="${node.parentId ?? ""}"
                    draggable="true"
                >

                    <span class="project-node-main">

                    <span
                        class="node-toggle"
                        data-id="${node.id}"
                    >

                        ${isNodeCollapsed(node.id)
                            ? "▶"
                            : "▼"}

                    </span>

                        ${getNodeIcon(node.type)}

                        <span class="project-node-name">
                            ${node.name}
                        </span>

                        <span class="project-node-total">
                            (${formatCurrency(nodeTotals.get(String(node.id)) ?? 0)})
                        </span>

                    </span>

                    ${nextNodeType ? `

                        <button
                            class="node-add"
                            type="button"
                            data-id="${node.id}"
                            data-type="${node.type}"
                            title="${addNodeLabel}"
                            aria-label="${addNodeLabel}"
                        >

                            +

                        </button>

                    ` : ""}

                    <div class="project-node-menu">

                        <button
                            class="project-node-menu-button"
                            type="button"
                            title="${i18n.t("project.positionMenu")}"
                            aria-label="${i18n.t("project.openPositionMenu")}"
                        >
                            ⋮
                        </button>

                        <div class="project-node-menu-options">

                            ${node.type === "meter" ? `
                                <button
                                    type="button"
                                    data-action="properties"
                                >
                                    ${i18n.t("project.properties")}
                                </button>
                            ` : ""}

                            <button
                                type="button"
                                data-action="position-name"
                            >
                                ${i18n.t("project.positionName")}
                            </button>

                            <button
                                type="button"
                                data-action="duplicate"
                            >
                                ${i18n.t("project.duplicate")}
                            </button>

                            <button
                                type="button"
                                data-action="delete"
                            >
                                ${i18n.t("project.delete")}
                            </button>

                        </div>

                    </div>

                </div>

                <div
                    class="project-node-children"
                    style="
                        display:
                        ${
                            isNodeCollapsed(node.id)
                                ? "none"
                                : "block"
                        };
                    "
                >
                    ${getArticlesForNode(node.id).map(nodeArticle => {

                        const fullArticle =
                            articles.find(
                                article =>
                                    article.articleNumber
                                    ===
                                    nodeArticle.articleNumber
                            );
                        return renderNodeArticle(
                            node.id,
                            nodeArticle.articleNumber,
                            fullArticle,
                            nodeArticle
                        );

                    }).join("")}

                    ${renderChildNodes(
                        nodes,
                        nodeArticles,
                        articles,
                        nodeTotals,
                        node.id
                    )}

                </div>

            </div>

        `;

        }).join("");

}

function compareProjectNodeOrder(
    first,
    second
) {

    const firstSortOrder =
        Number.isFinite(
            Number(first.sortOrder)
        )
            ? Number(first.sortOrder)
            : Number(first.id);

    const secondSortOrder =
        Number.isFinite(
            Number(second.sortOrder)
        )
            ? Number(second.sortOrder)
            : Number(second.id);

    if (firstSortOrder !== secondSortOrder) {

        return firstSortOrder - secondSortOrder;

    }

    return Number(first.id) - Number(second.id);

}

function renderNodeArticle(
    nodeId,
    articleNumber,
    fullArticle,
    nodeArticle = {}
) {

    const quantity =
        Number(nodeArticle.quantity) || 1;

    const unitPrice =
        getStructureArticleUnitPrice(
            fullArticle
        );

    const total =
        unitPrice
        *
        quantity;

    return `

        <div
            class="node-article"
            data-id="${nodeArticle.id ?? ""}"
            data-node-id="${nodeId}"
            data-article-number="${articleNumber}"
            data-quantity="${quantity}"
            draggable="true"
        >

            <input
                class="node-article-quantity-input"
                type="number"
                value="${quantity}"
                min="1"
                step="1"
                inputmode="numeric"
                title="${i18n.t("project.quantity")}"
                aria-label="${i18n.t("project.quantity")}"
            >

            <img
                src="${getArticleIcon(fullArticle)}"
                alt=""
            >

            <div class="node-article-content">

                ${nodeArticle.positionName ? `

                    <div class="node-article-position-name">

                        ${nodeArticle.positionName}

                    </div>

                ` : ""}

                <div class="node-article-header">

                    <span class="node-article-number">

                        ${articleNumber}

                    </span>

                    ${nodeArticle.isOptional ? `<span class="node-article-property-badge">${i18n.t("project.optional")}</span>` : ""}
                    ${nodeArticle.isAlternative ? `<span class="node-article-property-badge">${i18n.t("project.alternative")}</span>` : ""}

                    <span class="node-article-price">

                        ${formatQuantity(quantity)} x
                        ${formatCurrency(unitPrice)}
                        =
                        ${formatCurrency(total)}

                    </span>

                </div>

                <div class="node-article-name">

                    ${fullArticle?.manufacturerType ?? ""}

                </div>

            </div>

            <div class="node-article-menu">

                <button
                    class="node-article-menu-button"
                    type="button"
                    title="${i18n.t("project.positionMenu")}"
                    aria-label="${i18n.t("project.openPositionMenu")}"
                >
                    ⋮
                </button>

                <div class="node-article-menu-options">

                    <button
                        type="button"
                        data-action="properties"
                    >
                        ${i18n.t("project.properties")}
                    </button>

                    <button
                        type="button"
                        data-action="position-name"
                    >
                        ${i18n.t("project.positionName")}
                    </button>

                    <button
                        type="button"
                        data-action="duplicate"
                    >
                        ${i18n.t("project.duplicate")}
                    </button>

                    <button
                        type="button"
                        data-action="delete"
                    >
                        ${i18n.t("project.delete")}
                    </button>

                </div>

            </div>

        </div>

    `;

}

function compareNodeArticleOrder(
    firstArticle,
    secondArticle
) {

    const firstSortOrder =
        Number.isFinite(
            Number(firstArticle.sortOrder)
        )
            ? Number(firstArticle.sortOrder)
            : Number(firstArticle.id);

    const secondSortOrder =
        Number.isFinite(
            Number(secondArticle.sortOrder)
        )
            ? Number(secondArticle.sortOrder)
            : Number(secondArticle.id);

    return firstSortOrder - secondSortOrder;

}

function calculateNodeTotals(
    nodes,
    nodeArticles,
    articles
) {

    const articleByNumber =
        new Map(
            articles.map(article => [
                String(article.articleNumber),
                article
            ])
        );

    const childNodesByParent =
        new Map();

    nodes.forEach(node => {

        const key =
            String(node.parentId);

        if (!childNodesByParent.has(key)) {

            childNodesByParent.set(
                key,
                []
            );

        }

        childNodesByParent
            .get(key)
            .push(node);

    });

    const nodeArticlesByNode =
        new Map();

    nodeArticles.forEach(nodeArticle => {

        const key =
            String(nodeArticle.projectNodeId);

        if (!nodeArticlesByNode.has(key)) {

            nodeArticlesByNode.set(
                key,
                []
            );

        }

        nodeArticlesByNode
            .get(key)
            .push(nodeArticle);

    });

    const totals =
        new Map();

    const calculateNodeTotal =
        node => {

            const nodeId =
                String(node.id);

            const ownTotal =
                (
                    nodeArticlesByNode.get(nodeId)
                    ||
                    []
                ).reduce(
                    (sum, nodeArticle) => {

                        const article =
                            articleByNumber.get(
                                String(nodeArticle.articleNumber)
                            );

                        return sum
                            +
                            getNodeArticleTotal(
                                nodeArticle,
                                article
                            );

                    },
                    0
                );

            const childTotal =
                (
                    childNodesByParent.get(nodeId)
                    ||
                    []
                ).reduce(
                    (sum, childNode) =>
                        sum
                        +
                        calculateNodeTotal(childNode),
                    0
                );

            const total =
                ownTotal
                +
                childTotal;

            totals.set(
                nodeId,
                total
            );

            return total;

        };

    nodes
        .filter(node =>
            node.parentId === null
        )
        .forEach(calculateNodeTotal);

    return totals;

}

function calculateProjectTotals(
    nodes,
    nodeArticles,
    articles,
    customer,
    project = {}
) {

    const projectNodeIds =
        new Set(
            nodes.map(node =>
                String(node.id)
            )
        );

    const articleByNumber =
        new Map(
            articles.map(article => [
                String(article.articleNumber),
                article
            ])
        );

    const totals =
        nodeArticles
            .filter(nodeArticle =>
                projectNodeIds.has(
                    String(nodeArticle.projectNodeId)
                )
            )
            .reduce(
                (totals, nodeArticle) => {

                    const article =
                        articleByNumber.get(
                            String(nodeArticle.articleNumber)
                        );

                    const quantity =
                        Number(nodeArticle.quantity)
                        ||
                        1;

                    const listUnitPrice =
                        getArticleUnitPrice(article);

                    const discountPercent =
                        getArticleDiscountPercent(
                            article,
                            customer
                        );

                    const listTotal =
                        listUnitPrice
                        *
                        quantity;

                    const discountedTotal =
                        listTotal
                        *
                        (1 - (discountPercent / 100));

                    if (nodeArticle.isOptional) {
                        totals.optionalListTotal += listTotal;
                        totals.optionalDiscountedTotal += discountedTotal;

                        return totals;

                    }

                    if (nodeArticle.isAlternative) {
                        totals.alternativeListTotal += listTotal;
                        totals.alternativeDiscountedTotal += discountedTotal;

                        return totals;

                    }

                    totals.listPrice +=
                        listTotal;

                    totals.discount +=
                        listTotal
                        -
                        discountedTotal;

                    totals.discountedPrice +=
                        discountedTotal;

                    return totals;

                },
                {
                    listPrice: 0,
                    discount: 0,
                    projectDiscount: 0,
                    discountedPrice: 0,
                    optionalListTotal: 0,
                    optionalDiscountedTotal: 0,
                    alternativeListTotal: 0,
                    alternativeDiscountedTotal: 0
                }
            );

    const projectDiscountPercent =
        normalizeDiscountPercent(
            project?.projectDiscount
        );

    totals.projectDiscount =
        totals.discountedPrice
        *
        (projectDiscountPercent / 100);

    totals.discountedPrice -=
        totals.projectDiscount;

    totals.optionalDiscountedTotal *=
        1 - (projectDiscountPercent / 100);

    totals.alternativeDiscountedTotal *=
        1 - (projectDiscountPercent / 100);

    return totals;

}

function renderProjectPriceSummary(
    totals
) {

    const showDiscountedPrices =
        currentStructurePriceMode === "discounted";

    const optionalTotal = showDiscountedPrices
        ? totals.optionalDiscountedTotal
        : totals.optionalListTotal;

    const alternativeTotal = showDiscountedPrices
        ? totals.alternativeDiscountedTotal
        : totals.alternativeListTotal;

    return `

        <div class="project-price-summary-item">

            <span>
                ${i18n.t("project.listPrice")}
            </span>

            <strong>
                ${formatCurrency(totals.listPrice)}
            </strong>

        </div>

        <div class="project-price-summary-item">

            <span>
                ${i18n.t("project.discount")}
            </span>

            <strong>
                ${formatCurrency(totals.discount)}
            </strong>

        </div>

        <div class="project-price-summary-item">

            <span>
                ${i18n.t("project.projectDiscount")}
            </span>

            <strong>
                ${formatCurrency(totals.projectDiscount ?? 0)}
            </strong>

        </div>

        <div class="project-price-summary-item project-price-summary-total">

            <span>
                ${i18n.t("project.discountedPrice")}
            </span>

            <strong>
                ${formatCurrency(totals.discountedPrice)}
            </strong>

        </div>

        <div class="project-price-summary-item project-price-summary-special">

            <span>
                ${i18n.t("project.optionalTotal")}
            </span>

            <strong>
                ${formatCurrency(optionalTotal ?? 0)}
            </strong>

        </div>

        <div class="project-price-summary-item project-price-summary-special">

            <span>
                ${i18n.t("project.alternativeTotal")}
            </span>

            <strong>
                ${formatCurrency(alternativeTotal ?? 0)}
            </strong>

        </div>

    `;

}

function updateProjectPriceSummary() {

    const summary =
        document.getElementById(
            "project-price-summary"
        );

    if (!summary) {

        return;

    }

    summary.innerHTML =
        renderProjectPriceSummary(
            calculateProjectTotals(
                currentNodes,
                currentNodeArticles,
                currentArticles,
                currentProjectCustomer,
                currentProject
            )
        );

}

function getArticleDiscountPercent(
    article = {},
    customer = {}
) {

    const discountGroup =
        String(article?.discountGroup ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");

    const discountKey =
        discountGroup.match(/^pg\d+$/)
            ? discountGroup
            : `pg${discountGroup.match(/\d+/)?.[0] ?? ""}`;

    const discount =
        Number(customer?.[discountKey]);

    return Number.isFinite(discount)
        ? Math.min(
            Math.max(discount, 0),
            100
        )
        : 0;

}

function normalizeDiscountPercent(
    value
) {

    const discount =
        Number(value);

    return Number.isFinite(discount)
        ? Math.min(
            Math.max(discount, 0),
            100
        )
        : 0;

}

function getNodeArticleTotal(
    nodeArticle,
    article
) {

    if (nodeArticle.isOptional || nodeArticle.isAlternative) {

        return 0;

    }

    return getStructureArticleUnitPrice(article)
        *
        (Number(nodeArticle.quantity) || 1);

}

function getStructureArticleUnitPrice(
    article
) {
    const listPrice =
        getArticleUnitPrice(article);

    return calculateStructureUnitPrice({
        listPrice,
        customerDiscountPercent:
            getArticleDiscountPercent(
                article,
                currentProjectCustomer
            ),
        projectDiscountPercent:
            currentProject?.projectDiscount,
        priceMode:
            currentStructurePriceMode
    });
}

function getArticleUnitPrice(
    article = {}
) {

    const price =
        Number(article.listPrice);

    return Number.isFinite(price)
        ? price
        : 0;

}

function formatCurrency(
    value
) {

    return `${Number(value || 0).toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} €`;

}

function formatQuantity(
    value
) {

    return Number(value || 1).toLocaleString("de-DE", {
        maximumFractionDigits: 2
    });

}

function updateProjectNodeTotals() {

    const totals =
        calculateNodeTotals(
            currentNodes,
            currentNodeArticles,
            currentArticles
        );

    document
        .querySelectorAll(
            ".project-node"
        )
        .forEach(node => {

            const total =
                totals.get(
                    String(node.dataset.id)
                )
                ??
                0;

            const totalElement =
                node.querySelector(
                    ".project-node-total"
                );

            if (totalElement) {

                totalElement.textContent =
                    `(${formatCurrency(total)})`;

            }

        });

    updateProjectPriceSummary();

}

function getCurrentArticleByNumber(
    articleNumber
) {

    return currentArticles.find(
        article =>
            String(article.articleNumber)
            ===
            String(articleNumber)
    );

}

function upsertCurrentNodeArticle(
    nodeArticle
) {

    const index =
        currentNodeArticles.findIndex(
            item =>
                String(item.id)
                ===
                String(nodeArticle.id)
        );

    if (index === -1) {

        currentNodeArticles.unshift(
            nodeArticle
        );

        return;

    }

    currentNodeArticles[index] =
        nodeArticle;

}

function removeCurrentNodeArticle(
    positionId
) {

    currentNodeArticles =
        currentNodeArticles.filter(
            nodeArticle =>
                String(nodeArticle.id)
                !==
                String(positionId)
        );

}

function updateCurrentNode(
    updatedNode
) {

    const index =
        currentNodes.findIndex(
            node =>
                String(node.id)
                ===
                String(updatedNode.id)
        );

    if (index !== -1) {

        currentNodes[index] =
            updatedNode;

    }

}

function openProjectModal({
    title,
    label,
    type = "text",
    value = "",
    min,
    step
}) {

    return new Promise(resolve => {

        const modal =
            document.createElement(
                "div"
            );

        modal.className =
            "project-modal-backdrop";

        modal.innerHTML = `

            <form class="project-modal">

                <h3>
                    ${title}
                </h3>

                <label>
                    ${label}
                </label>

                <input
                    class="project-modal-input"
                    type="${type}"
                    value="${escapeAttribute(value)}"
                    ${min !== undefined ? `min="${min}"` : ""}
                    ${step !== undefined ? `step="${step}"` : ""}
                >

                <div class="project-modal-actions">

                    <button
                        type="button"
                        data-action="cancel"
                    >
                        ${i18n.t("project.cancel")}
                    </button>

                    <button
                        type="submit"
                    >
                        ${i18n.t("project.save")}
                    </button>

                </div>

            </form>

        `;

        const close =
            result => {

                modal.remove();

                resolve(
                    result
                );

            };

        modal.addEventListener(
            "mousedown",
            event => {

                if (event.target === modal) {

                    close(null);

                }

            }
        );

        modal
            .querySelector(
                "[data-action=\"cancel\"]"
            )
            .addEventListener(
                "click",
                () => close(null)
            );

        modal
            .querySelector(
                "form"
            )
            .addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    close(
                        modal.querySelector(
                            ".project-modal-input"
                        ).value
                    );

                }
            );

        document.body.appendChild(
            modal
        );

        modal
            .querySelector(
                ".project-modal-input"
            )
            .select();

    });

}

function openMeterPropertiesModal(
    node
) {

    return new Promise(resolve => {

        const modal =
            document.createElement("div");

        modal.className =
            "project-modal-backdrop";

        const options =
            (selectedValue, values) =>
                values.map(value => `
                    <option
                        value="${escapeAttribute(value)}"
                        ${value === selectedValue ? "selected" : ""}
                    >${value || "Bitte auswählen"}</option>
                `).join("");

        const automaticDeviceDesignation =
            getAutomaticMeterDeviceDesignation(node.id);
        const automaticLocation =
            getAutomaticMeterLocation(node.id);

        modal.innerHTML = `
            <form class="project-modal project-properties-modal">
                <h3>${i18n.t("project.properties")}</h3>

                <fieldset>
                    <legend>${i18n.t("project.dataCollectionPlan")}</legend>

                    <label>
                        ${i18n.t("project.physicalQuantity")}
                        <input
                            name="physicalQuantity"
                            value="${escapeAttribute(node.physicalQuantity || "kWh") }"
                        >
                    </label>

                    <label>
                        ${i18n.t("project.deviceDesignation")}
                        <input
                            name="deviceDesignation"
                            value="${escapeAttribute(node.deviceDesignation || automaticDeviceDesignation)}"
                            placeholder="${escapeAttribute(automaticDeviceDesignation)}"
                        >
                    </label>

                    <label>
                        ${i18n.t("project.dataCollectionLocation")}
                        <input
                            name="dataCollectionLocation"
                            value="${escapeAttribute(node.dataCollectionLocation || automaticLocation)}"
                            placeholder="${escapeAttribute(automaticLocation)}"
                        >
                    </label>

                    <label>
                        ${i18n.t("project.fundingObject")}
                        <select name="fundingObject">
                            ${options(node.fundingObject || "", ["", "Ja", "Nein"])}
                        </select>
                    </label>

                    <label>
                        ${i18n.t("project.responsibility")}
                        <input
                            name="responsibility"
                            value="${escapeAttribute(node.responsibility || "") }"
                        >
                    </label>

                    <label>
                        ${i18n.t("project.collectionFrequency")}
                        <input
                            name="collectionFrequency"
                            value="${escapeAttribute(node.collectionFrequency || "") }"
                            placeholder="z. B. Viertelstündlich"
                        >
                    </label>

                    <label>
                        ${i18n.t("project.thirdPartyQuantity")}
                        <select name="thirdPartyQuantity">
                            ${options(node.thirdPartyQuantity || "", ["", "Ja", "Nein"])}
                        </select>
                    </label>
                </fieldset>

                <div class="project-modal-actions">
                    <button type="button" data-action="cancel">
                        ${i18n.t("project.cancel")}
                    </button>
                    <button type="submit">
                        ${i18n.t("project.save")}
                    </button>
                </div>
            </form>
        `;

        const close = result => {

            modal.remove();
            resolve(result);

        };

        modal.addEventListener("mousedown", event => {

            if (event.target === modal) {

                close(null);

            }

        });

        modal.querySelector("[data-action=\"cancel\"]")
            .addEventListener("click", () => close(null));

        modal.querySelector("form")
            .addEventListener("submit", event => {

                event.preventDefault();

                const formData =
                    new FormData(event.currentTarget);

                const enteredLocation =
                    String(formData.get("dataCollectionLocation") || "").trim();

                close({
                    physicalQuantity: String(formData.get("physicalQuantity") || "kWh").trim() || "kWh",
                    deviceDesignation: String(formData.get("deviceDesignation") || "").trim(),
                    dataCollectionLocation:
                        enteredLocation === automaticLocation
                            ? ""
                            : enteredLocation,
                    fundingObject: String(formData.get("fundingObject") || ""),
                    responsibility: String(formData.get("responsibility") || "").trim(),
                    collectionFrequency: String(formData.get("collectionFrequency") || "").trim(),
                    thirdPartyQuantity: String(formData.get("thirdPartyQuantity") || "")
                });

            });

        document.body.appendChild(modal);

        modal.querySelector("[name=\"physicalQuantity\"]").focus();

    });

}

function getAutomaticMeterDeviceDesignation(
    nodeId
) {

    const designations =
        currentNodeArticles
            .filter(position =>
                String(position.projectNodeId) === String(nodeId)
            )
            .map(position => {

                const article =
                    getCurrentArticleByNumber(position.articleNumber);

                return article?.manufacturerType
                    || position.positionName
                    || position.articleNumber
                    || "";

            })
            .filter(Boolean);

    return designations.find(value => /UMG/i.test(value))
        || designations.find(value => /Modul/i.test(value))
        || "";

}

function getAutomaticMeterLocation(
    nodeId
) {

    const nodesById =
        new Map(
            currentNodes.map(node => [
                String(node.id),
                node
            ])
        );
    const path = [];
    const visited = new Set();
    let node =
        nodesById.get(String(nodeId));

    while (node && !visited.has(String(node.id))) {

        visited.add(String(node.id));
        path.unshift(node.name ?? "");
        node = node.parentId === null || node.parentId === undefined
            ? null
            : nodesById.get(String(node.parentId));

    }

    return path.filter(Boolean).join(" / ");

}

function openArticlePropertiesModal(
    nodeArticle
) {

    return new Promise(resolve => {

        const modal = document.createElement("div");
        modal.className = "project-modal-backdrop";
        modal.innerHTML = `
            <form class="project-modal project-properties-modal">
                <h3>${i18n.t("project.properties")}</h3>
                <fieldset>
                    <legend>${i18n.t("project.general")}</legend>
                    <label class="project-properties-checkbox">
                        <input
                            type="checkbox"
                            name="isOptional"
                            ${nodeArticle.isOptional ? "checked" : ""}
                        >
                        <span>${i18n.t("project.optional")}</span>
                    </label>
                    <label class="project-properties-checkbox">
                        <input
                            type="checkbox"
                            name="isAlternative"
                            ${nodeArticle.isAlternative ? "checked" : ""}
                        >
                        <span>${i18n.t("project.alternative")}</span>
                    </label>
                </fieldset>
                <p class="project-properties-hint">
                    ${i18n.t("project.optionalAlternativeHint")}
                </p>
                <div class="project-modal-actions">
                    <button type="button" data-action="cancel">${i18n.t("project.cancel")}</button>
                    <button type="submit">${i18n.t("project.save")}</button>
                </div>
            </form>
        `;

        const close = result => {
            modal.remove();
            resolve(result);
        };

        modal.addEventListener("mousedown", event => {
            if (event.target === modal) close(null);
        });
        modal.querySelector("[data-action=\"cancel\"]")
            .addEventListener("click", () => close(null));
        modal.querySelector("form").addEventListener("submit", event => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            close({
                isOptional: formData.has("isOptional"),
                isAlternative: formData.has("isAlternative")
            });
        });

        document.body.appendChild(modal);

    });

}

function escapeAttribute(
    value
) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("\"", "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

}

function getNodeIdKey(
    nodeId
) {

    return String(nodeId);

}

function isNodeCollapsed(
    nodeId
) {

    return collapsedNodes.has(
        getNodeIdKey(nodeId)
    );

}

function getCollapsedNodesStorageKey(
    projectId
) {

    return `projectBuilder.collapsedNodes.${projectId}`;

}

function loadCollapsedNodes(
    projectId
) {

    try {

        collapsedNodes =
            new Set(
                JSON.parse(
                    settings.getItem(
                        getCollapsedNodesStorageKey(
                            projectId
                        )
                    )
                    ||
                    "[]"
                ).map(String)
            );

    } catch (error) {

        collapsedNodes =
            new Set();

    }

}

function saveCollapsedNodes(
    projectId
) {

    settings.setItem(
        getCollapsedNodesStorageKey(
            projectId
        ),
        JSON.stringify(
            Array.from(
                collapsedNodes
            )
        )
    );

}

function getProjectDescriptionCollapsedStorageKey(
    projectId
) {

    return `${projectDescriptionCollapsedStorageKey}.${projectId}`;

}

function isProjectDescriptionOpen(
    projectId,
    project
) {

    const storedValue =
        settings.getItem(
            getProjectDescriptionCollapsedStorageKey(
                projectId
            )
        );

    if (storedValue === "true") {

        return false;

    }

    if (storedValue === "false") {

        return true;

    }

    return Boolean(
        project.description
    );

}

function registerProjectDescriptionPersistence(
    projectId
) {

    const descriptionDetails =
        document.querySelector(
            ".project-description-details"
        );

    if (!descriptionDetails) {

        return;

    }

    descriptionDetails.addEventListener(
        "toggle",
        () => {

            settings.setItem(
                getProjectDescriptionCollapsedStorageKey(
                    projectId
                ),
                descriptionDetails.open
                    ? "false"
                    : "true"
            );

        }
    );

}

function getAddNodeLabel(
    type
) {

    return i18n.t(
        `project.addNode.${type}`
    );

}

function generateNodeHandler(
    projectId
) {

    const registerRootNodeButton =
        ({
            buttonId,
            type,
            title,
            defaultName
        }) => {

            document
                .getElementById(
                    buttonId
                )
                .addEventListener(
                    "click",
                    async () => {

                        const name =
                            await openProjectModal({
                                title,
                                label: i18n.t("project.positionName"),
                                value: defaultName
                            });

                        if (name === null) {

                            return;

                        }

                        await createProjectNode({
                            projectId,
                            parentId: null,
                            type,
                            name:
                                name.trim()
                                ||
                                defaultName
                        });

                        await refreshProjectTree(
                            projectId
                        );

                    }
                );

        };

    registerRootNodeButton({
        buttonId: "add-building",
        type: "building",
        title: i18n.t("project.addBuilding"),
        defaultName: i18n.t("project.newBuilding")
    });

    registerRootNodeButton({
        buttonId: "add-general-position",
        type: "generalPosition",
        title: i18n.t("project.addGeneralPosition"),
        defaultName: i18n.t("project.newGeneralPosition")
    });

}


function registerNodeButtons(
    projectId
) {

    document
        .querySelectorAll(
            ".node-add"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const parentId =
                        button.dataset.id;

                    const parentType =
                        button.dataset.type;

                    const nextNodeType =
                        getNextNodeType(
                            parentType
                        );

                    if (!nextNodeType) {

                        return;

                    }

                    const newType =
                        nextNodeType.type;

                    const newName =
                        nextNodeType.name;

                    const name =
                        await openProjectModal({
                            title: getAddNodeLabel(
                                newType
                            ),
                            label: i18n.t("project.positionName"),
                            value: newName
                        });

                    if (name === null) {

                        return;

                    }

                    await createProjectNode({
                        projectId,
                        parentId,
                        type: newType,
                        name:
                            name.trim()
                            ||
                            newName
                    });

                    await refreshProjectTree(
                        projectId
                    );

                }
            );

        });

}

async function createProjectNode({
    projectId,
    parentId,
    type,
    name
}) {

    const response =
        await fetch(

            "/api/projectNodes",

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    projectId,
                    parentId,
                    type,
                    name

                })

            }

        );

    return await response.json();

}

// Autosave
let saveTimeout;

function generateHandler(
    projectId
) {

    const inputs =
        document.querySelectorAll(
            "input, textarea, select"
        );

    inputs.forEach(input => {

        if (input.id === "project-discount") {

            input.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key !== "ArrowUp"
                        &&
                        event.key !== "ArrowDown"
                    ) {

                        return;

                    }

                    event.preventDefault();

                    const currentValue =
                        Number(input.value);

                    const nextValue =
                        event.key === "ArrowUp"
                            ? Math.ceil(
                                Number.isFinite(currentValue)
                                    ? currentValue
                                    : 0
                            )
                            : Math.floor(
                                Number.isFinite(currentValue)
                                    ? currentValue
                                    : 0
                            );

                    const adjustedValue =
                        event.key === "ArrowUp"
                            && nextValue === currentValue
                                ? nextValue + 1
                                : event.key === "ArrowDown"
                                    && nextValue === currentValue
                                        ? nextValue - 1
                                        : nextValue;

                    input.value =
                        Math.min(
                            Math.max(adjustedValue, 0),
                            100
                        );

                    input.dispatchEvent(
                        new Event(
                            "input",
                            {
                                bubbles: true
                            }
                        )
                    );

                }
            );

        }

        input.addEventListener(
            "input",
            () => {

                if (input.id === "project-discount") {

                    if (Number(input.value) > 100) {

                        input.value = 100;

                    }

                    if (Number(input.value) < 0) {

                        input.value = 0;

                    }

                    currentProject = {
                        ...(currentProject ?? {}),
                        projectDiscount:
                            input.value
                    };

                    updateProjectStructurePrices();

                }

                clearTimeout(
                    saveTimeout
                );

                saveTimeout =
                    setTimeout(
                        () => saveProject(projectId),
                        500
                    );

            }
        );

    });

    const customerSelect =
        document.getElementById(
            "project-customer"
        );

    customerSelect?.addEventListener(
        "change",
        async () => {

            clearTimeout(
                saveTimeout
            );

            await saveProject(
                projectId
            );

            currentProjectCustomer =
                await loadProjectCustomer(
                    customerSelect.value
                );

            updateProjectStructurePrices();

        }
    );

}

function registerProjectExport(
    projectId
) {

    const exportButton =
        document.getElementById(
            "export-project-excel"
        );

    if (!exportButton) {

        return;

    }

    exportButton.addEventListener(
        "click",
        async () => {

            clearTimeout(
                saveTimeout
            );

            await saveProject(
                projectId
            );

            window.location.href =
                `/api/projects/${projectId}/export.xlsx`;

        }
    );

}

function registerProjectTenderExport(projectId) {
    const button = document.getElementById("export-project-tender");
    if (!button) return;

    button.addEventListener("click", async () => {
        clearTimeout(saveTimeout);
        await saveProject(projectId);
        const selection = await openTenderExportModal();
        if (!selection) return;

        const formats = selection.format === "both"
            ? ["word", "gaeb"]
            : [selection.format];
        for (const format of formats) {
            const downloaded = await downloadTenderFile(
                projectId,
                format,
                selection
            );
            if (!downloaded) break;
        }
    });
}

async function downloadTenderFile(
    projectId,
    format,
    selection
) {
    const response = await fetch(
        `/api/projects/${projectId}/tender?format=${format}&prices=${selection.prices}&gaebType=${selection.gaebType}`
    );
    const contentType = String(
        response.headers.get("content-type") ?? ""
    ).toLowerCase();
    const expectedType = format === "word"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/xml";

    if (!response.ok || !contentType.includes(expectedType)) {
        let detail = "";
        try {
            const payload = await response.json();
            detail = payload.error ?? "";
        } catch {
            detail = contentType.includes("text/html")
                ? "Der laufende Server hat statt der Exportdatei eine HTML-Seite geliefert."
                : `Unerwarteter Dateityp: ${contentType || "unbekannt"}`;
        }
        await showAlert(
            `${format === "word" ? "Word" : "GAEB"}-Export fehlgeschlagen. ${detail}`.trim(),
            { title: "Ausschreibungsexport" }
        );
        return false;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const projectName = sanitizeDownloadFilename(
        currentProject?.name || "Projekt"
    );
    const extension = format === "word"
        ? "docx"
        : `x${selection.gaebType}`;
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${projectName}-Ausschreibung.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
}

function sanitizeDownloadFilename(value) {
    return String(value ?? "Projekt")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120)
        || "Projekt";
}

function openTenderExportModal() {
    return new Promise(resolve => {
        const modal = document.createElement("div");
        modal.className = "project-modal-backdrop";
        modal.innerHTML = `
            <form class="project-modal project-tender-modal">
                <h3>${i18n.t("project.tenderTitle")}</h3>
                <p>${i18n.t("project.tenderDescription")}</p>
                <fieldset>
                    <legend>${i18n.t("project.tenderFormat")}</legend>
                    <label><input type="radio" name="format" value="word" checked> Word (.docx)</label>
                    <label><input type="radio" name="format" value="gaeb"> GAEB XML</label>
                    <label><input type="radio" name="format" value="both"> ${i18n.t("project.tenderBoth")}</label>
                </fieldset>
                <fieldset class="project-tender-gaeb-types">
                    <legend>${i18n.t("project.tenderGaebType")}</legend>
                    <label><input type="radio" name="gaebType" value="81"> X81 – ${i18n.t("project.tenderX81")}</label>
                    <label><input type="radio" name="gaebType" value="82"> X82 – ${i18n.t("project.tenderX82")}</label>
                    <label><input type="radio" name="gaebType" value="83" checked> X83 – ${i18n.t("project.tenderX83")}</label>
                    <label><input type="radio" name="gaebType" value="84"> X84 – ${i18n.t("project.tenderX84")}</label>
                </fieldset>
                <fieldset>
                    <legend>${i18n.t("project.tenderPrices")}</legend>
                    <label><input type="radio" name="prices" value="none" checked> ${i18n.t("project.tenderNoPrices")}</label>
                    <label><input type="radio" name="prices" value="list"> ${i18n.t("project.tenderListPrices")}</label>
                    <label><input type="radio" name="prices" value="discounted"> ${i18n.t("project.tenderDiscountedPrices")}</label>
                </fieldset>
                <p class="project-tender-hint">${i18n.t("project.tenderHint")}</p>
                <div class="project-modal-actions">
                    <button type="button" data-action="cancel">${i18n.t("project.cancel")}</button>
                    <button type="submit">${i18n.t("project.tenderCreate")}</button>
                </div>
            </form>`;
        const close = result => {
            modal.remove();
            resolve(result);
        };
        modal.addEventListener("mousedown", event => {
            if (event.target === modal) close(null);
        });
        modal.querySelector("[data-action=cancel]").addEventListener("click", () => close(null));
        const synchronizePrices = () => {
            const format = modal.querySelector("input[name=format]:checked").value;
            const usesGaeb = format !== "word";
            const gaebType = modal.querySelector("input[name=gaebType]:checked").value;
            const requiresPrices = gaebType === "82" || gaebType === "84";
            const noPrices = modal.querySelector("input[name=prices][value=none]");
            const listPrices = modal.querySelector("input[name=prices][value=list]");
            modal.querySelectorAll("input[name=gaebType]").forEach(input => {
                input.disabled = !usesGaeb;
            });
            noPrices.disabled = usesGaeb && requiresPrices;
            if (usesGaeb && requiresPrices && noPrices.checked) listPrices.checked = true;
            modal.querySelectorAll("input[name=prices]:not([value=none])").forEach(input => {
                input.disabled = usesGaeb && !requiresPrices;
            });
            if (usesGaeb && !requiresPrices) noPrices.checked = true;
        };
        modal.querySelectorAll("input[name=gaebType]").forEach(input => {
            input.addEventListener("change", synchronizePrices);
        });
        modal.querySelectorAll("input[name=format]").forEach(input => {
            input.addEventListener("change", synchronizePrices);
        });
        synchronizePrices();
        modal.querySelector("form").addEventListener("submit", event => {
            event.preventDefault();
            close({
                format: new FormData(event.currentTarget).get("format"),
                prices: new FormData(event.currentTarget).get("prices"),
                gaebType: new FormData(event.currentTarget).get("gaebType")
            });
        });
        document.body.appendChild(modal);
        modal.querySelector("input").focus();
    });
}

function updateProjectStructurePrices() {

    document
        .querySelectorAll(
            ".node-article"
        )
        .forEach(articleElement => {
            const article =
                getCurrentArticleByNumber(
                    articleElement.dataset.articleNumber
                );
            const quantity =
                Number(
                    articleElement
                        .querySelector(
                            ".node-article-quantity-input"
                        )
                        ?.value
                    ??
                    articleElement.dataset.quantity
                )
                ||
                1;
            const unitPrice =
                getStructureArticleUnitPrice(
                    article
                );
            const priceElement =
                articleElement.querySelector(
                    ".node-article-price"
                );

            if (priceElement) {
                priceElement.textContent =
                    `${formatQuantity(quantity)} x ${formatCurrency(unitPrice)} = ${formatCurrency(unitPrice * quantity)}`;
            }
        });

    updateProjectNodeTotals();
}

function registerProjectOverview(
    projectId
) {
    const overviewButton =
        document.getElementById(
            "show-project-overview"
        );

    if (!overviewButton) {
        return;
    }

    overviewButton.addEventListener(
        "click",
        async () => {
            clearTimeout(
                saveTimeout
            );
            await saveProject(
                projectId
            );

            const currentName =
                document.getElementById(
                    "project-name"
                )?.value
                ??
                currentProject?.name
                ??
                "";

            openProjectOverview({
                project: {
                    ...(currentProject ?? {}),
                    name: currentName
                },
                customer:
                    currentProjectCustomer,
                nodes:
                    currentNodes,
                nodeArticles:
                    currentNodeArticles,
                articles:
                    currentArticles,
                getArticleIcon,
                getArticleDiscountPercent,
                labels: {
                    title:
                        i18n.t("project.overviewTitle"),
                    project:
                        i18n.t("project.overviewProject"),
                    empty:
                        i18n.t("project.overviewEmpty"),
                    noStructure:
                        i18n.t("project.overviewNoStructure"),
                    zoomIn:
                        i18n.t("project.overviewZoomIn"),
                    zoomOut:
                        i18n.t("project.overviewZoomOut"),
                    fit:
                        i18n.t("project.overviewFit"),
                    print:
                        i18n.t("project.overviewPrint"),
                    close:
                        i18n.t("project.overviewClose"),
                    hint:
                        i18n.t("project.overviewHint"),
                    overviewView:
                        i18n.t("project.overviewView"),
                    detailView:
                        i18n.t("project.overviewDetailView"),
                    page:
                        i18n.t("project.overviewPage"),
                    summaryFields:
                        i18n.t("project.overviewSummaryFields"),
                    summaryMeters:
                        i18n.t("project.overviewSummaryMeters"),
                    summaryPositions:
                        i18n.t("project.overviewSummaryPositions"),
                    prices:
                        i18n.t("project.overviewPrices"),
                    withoutPrices:
                        i18n.t("project.overviewWithoutPrices"),
                    withPrices:
                        i18n.t("project.overviewWithPrices"),
                    priceBasis:
                        i18n.t("project.overviewPriceBasis"),
                    price:
                        i18n.t("project.overviewPrice"),
                    listPrices:
                        i18n.t("project.structureListPrices"),
                    discountedPrices:
                        i18n.t("project.structureDiscountedPrices"),
                    nodeTypes: {
                        building:
                            i18n.t("project.overviewBuilding"),
                        generalPosition:
                            i18n.t("project.overviewGeneralPosition"),
                        panel:
                            i18n.t("project.overviewPanel"),
                        field:
                            i18n.t("project.overviewField"),
                        meter:
                            i18n.t("project.overviewMeter")
                    }
                }
            });
        }
    );
}

function registerProjectDelete(
    projectId,
    project
) {

    const deleteButton =
        document.getElementById(
            "delete-project"
        );

    if (!deleteButton) {

        return;

    }

    deleteButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                await showConfirm(
                    `Projekt "${project.name ?? ""}" wirklich löschen?`,
                    {
                        title: "Projekt löschen",
                        confirmText: "Löschen",
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
                    `/api/projects/${projectId}`,
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
                    || "Projekt konnte nicht gelöscht werden."
                );

                return;

            }

            router.navigate(
                "/projects"
            );

        }
    );

}

async function saveProject(
    projectId
) {

    await fetch(

        `/api/projects/${projectId}`,

        {

            method: "PUT",

            headers: {

                "Content-Type":
                    "application/json"

            },

            body: JSON.stringify({

                name:
                    document.getElementById(
                        "project-name"
                    ).value,

                customerId:
                    document.getElementById(
                        "project-customer"
                    ).value || null,

                projectDiscount:
                    document.getElementById(
                        "project-discount"
                    ).value || 0,

                description:
                    document.getElementById(
                        "project-description"
                    ).value

            })

        }

    );

}


function getNodeIcon(
    type
) {

    switch(type) {

        case "building":
            return utils.icons.building;

        case "generalPosition":
            return utils.icons.generalPosition;

        case "panel":
            return utils.icons.panel;

        case "field":
            return utils.icons.field;

        case "meter":
            return utils.icons.meter;

        default:
            return "📄";

    }

}

function getNextNodeType(
    type
) {

    switch(type) {

        case "building":

            return {

                type: "panel",

                name: i18n.t("project.newPanel")

            };

        case "panel":

            return {

                type: "field",

                name: i18n.t("project.newField")

            };

        case "field":

            return {

                type: "meter",

                name: i18n.t("project.newMeter")

            };

        default:

            return null;

    }

}


function registerArticleDragSources() {

    document
        .querySelectorAll(
            ".project-article"
        )
        .forEach(articleElement => {

            if (
                articleElement.dataset.articleDragRegistered
                ===
                "true"
            ) {

                return;

            }

            articleElement.dataset.articleDragRegistered =
                "true";

            articleElement.addEventListener(
                "dragstart",
                event => {

                    if (
                        event.target.closest(
                            ".article-favorite-toggle"
                        )
                    ) {

                        event.preventDefault();
                        return;

                    }

                    articleElement.classList.add(
                        "dragging"
                    );

                    draggedArticleNumber =
                        articleElement.dataset.articleNumber;

                    event.dataTransfer.effectAllowed =
                        "copy";

                    event.dataTransfer.setData(
                        "application/x-project-article-number",
                        articleElement.dataset.articleNumber
                    );

                    event.dataTransfer.setData(
                        "text/plain",
                        articleElement.dataset.articleNumber
                    );

                }
            );

            articleElement.addEventListener(
                "dragend",
                () => {

                    articleElement.classList.remove(
                        "dragging"
                    );

                    clearArticleDropIndicators();

                    draggedArticleNumber =
                        null;

                }

            );

        });

}

function registerArticleDropTargets(
    projectId
) {

    document
        .querySelectorAll(
            ".project-node[data-type=\"meter\"], .project-node[data-type=\"generalPosition\"]"
        )
        .forEach(node => {

            const dropTarget =
                node.closest(
                    ".project-node-wrapper"
                );

            if (!dropTarget) {

                return;

            }

            if (
                dropTarget.dataset.articleDropRegistered
                ===
                "true"
            ) {

                return;

            }

            dropTarget.dataset.articleDropRegistered =
                "true";

            const handleArticleDragOver =
                event => {

                    const articleNumber =
                        getDraggedArticleNumber(
                            event
                        );

                    if (!articleNumber) {

                        return;

                    }

                    event.preventDefault();
                    event.stopPropagation();

                    event.dataTransfer.dropEffect =
                        "copy";

                    node.classList.add(
                        "article-drop-over"
                    );

                };

            dropTarget.addEventListener(
                "dragleave",
                event => {

                    if (
                        dropTarget.contains(
                            event.relatedTarget
                        )
                    ) {

                        return;

                    }

                    node.classList.remove(
                        "article-drop-over"
                    );

                }
            );

            const handleArticleDrop =
                async event => {

                    const articleNumber =
                        getDraggedArticleNumber(
                            event
                        );

                    if (!articleNumber) {

                        return;

                    }

                    event.preventDefault();
                    event.stopPropagation();

                    node.classList.remove(
                        "article-drop-over"
                    );

                    const fullArticle =
                        getCurrentArticleByNumber(
                            articleNumber
                        );

                    await addArticleToNode(
                        node.dataset.id,
                        articleNumber,
                        fullArticle,
                        projectId
                    );

                    draggedArticleNumber =
                        null;

                };

            dropTarget.addEventListener(
                "dragover",
                handleArticleDragOver,
                true
            );

            dropTarget.addEventListener(
                "drop",
                handleArticleDrop,
                true
            );

        });

}

function getDraggedArticleNumber(
    event
) {

    return draggedArticleNumber
    ||
    event.dataTransfer.getData(
        "application/x-project-article-number"
    );

}

function registerArticleSearch(
    articles
) {

    const search =
        document.getElementById(
            "project-article-search"
        );

    if (!search) {

        return;

    }

    search.addEventListener(
        "input",
        () => {

            const searchQuery =
                normalizeSearchText(
                    search.value
                );

            document
                .querySelectorAll(
                    ".project-article"
                )
                .forEach(articleElement => {

                    const article =
                        articles.find(item =>
                            String(item.articleNumber)
                            ===
                            String(articleElement.dataset.articleNumber)
                        );

                    const haystack =
                        getArticleSearchText(
                            article
                        );

                    const matches =
                        searchQuery.length === 0
                        ||
                        haystack.includes(
                            searchQuery
                        );

                    articleElement.style.display =
                        matches
                            ? ""
                            : "none";

                });

        }
    );

}

function getArticleSearchText(
    article = {}
) {

    return normalizeSearchText(
        Object
            .values(article)
            .filter(value =>
                value !== null
                &&
                value !== undefined
            )
            .join(" ")
    );

}

function normalizeSearchText(
    value
) {

    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

}

function registerArticleFavorites(
    articles,
    projectId
) {

    registerArticleFavoriteButtons(
        articles,
        projectId
    );

    registerArticleFavoritesToggle(
        articles,
        projectId
    );

    registerFavoriteArticleDragAndDrop();

    syncArticleListHeight();

}

function registerArticleFavoriteButtons(
    articles,
    projectId
) {

    document
        .querySelectorAll(
            ".article-favorite-toggle"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    const articleNumber =
                        String(
                            button.dataset.articleNumber
                        );

                    const favoriteArticleNumbers =
                        getFavoriteArticleNumbers();

                    if (
                        favoriteArticleNumbers.has(
                            articleNumber
                        )
                    ) {

                        favoriteArticleNumbers.delete(
                            articleNumber
                        );

                    } else {

                        favoriteArticleNumbers.add(
                            articleNumber
                        );

                    }

                    saveFavoriteArticleNumbers(
                        favoriteArticleNumbers
                    );

                    syncArticleFavoriteButtons(
                        articleNumber,
                        favoriteArticleNumbers.has(
                            articleNumber
                        )
                    );

                    renderArticleFavoritesPanel(
                        articles,
                        projectId
                    );

                }
            );

        });

}

function syncArticleFavoriteButtons(
    articleNumber,
    isFavorite
) {

    document
        .querySelectorAll(
            `.article-favorite-toggle[data-article-number="${articleNumber}"]`
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                isFavorite
            );

            button.setAttribute(
                "aria-pressed",
                isFavorite
                    ? "true"
                    : "false"
            );

            button.textContent =
                isFavorite
                    ? "★"
                    : "☆";

        });

}

function renderArticleFavoritesPanel(
    articles,
    projectId
) {

    const favorites =
        document.getElementById(
            "project-article-favorites"
        );

    if (!favorites) {

        return;

    }

    favorites.innerHTML =
        renderFavoriteArticles(
            articles
        );

    registerArticleFavoritesToggle(
        articles,
        projectId
    );

    registerFavoriteArticleDragAndDrop();

    syncArticleListHeight();

}

function registerArticleFavoritesToggle(
    articles,
    projectId
) {

    const toggle =
        document.getElementById(
            "project-article-favorites-toggle"
        );

    if (!toggle) {

        return;

    }

    toggle.addEventListener(
        "click",
        () => {

            saveArticleFavoritesCollapsed(
                !areArticleFavoritesCollapsed()
            );

            renderArticleFavoritesPanel(
                articles,
                projectId
            );

            syncArticleListHeight();

        }
    );

}

function registerFavoriteArticleDragAndDrop() {

    document
        .querySelectorAll(
            ".project-article-favorite"
        )
        .forEach(favorite => {

            if (
                favorite.dataset.favoriteDragRegistered
                ===
                "true"
            ) {

                return;

            }

            favorite.dataset.favoriteDragRegistered =
                "true";

            favorite.addEventListener(
                "dragstart",
                event => {

                    event.stopPropagation();

                    favorite.classList.add(
                        "dragging"
                    );

                    draggedArticleNumber =
                        favorite.dataset.articleNumber;

                    event.dataTransfer.effectAllowed =
                        "copyMove";

                    event.dataTransfer.setData(
                        "application/x-project-article-number",
                        favorite.dataset.articleNumber
                    );

                    event.dataTransfer.setData(
                        "text/plain",
                        favorite.dataset.articleNumber
                    );

                }
            );

            favorite.addEventListener(
                "dragend",
                () => {

                    favorite.classList.remove(
                        "dragging"
                    );

                    clearArticleDropIndicators();

                    draggedArticleNumber =
                        null;

                    favorite.dataset.wasDragged =
                        "true";

                    saveFavoriteOrderFromDom();

                    window.setTimeout(
                        () => {

                            favorite.dataset.wasDragged =
                                "false";

                        },
                        150
                    );

                }
            );

            favorite.addEventListener(
                "dragover",
                event => {

                    const draggedFavorite =
                        document.querySelector(
                            ".project-article-favorite.dragging"
                        );

                    if (
                        !draggedFavorite
                        ||
                        draggedFavorite === favorite
                    ) {

                        return;

                    }

                    event.preventDefault();

                    const favoriteRect =
                        favorite.getBoundingClientRect();

                    const insertAfter =
                        event.clientX
                        >
                        favoriteRect.left
                        +
                        favoriteRect.width / 2;

                    insertElementBeforeIfChanged(
                        favorite.parentElement,
                        draggedFavorite,
                        insertAfter
                            ? favorite.nextSibling
                            : favorite
                    );

                }
            );

            favorite.addEventListener(
                "drop",
                event => {

                    event.preventDefault();

                    saveFavoriteOrderFromDom();

                }
            );

        });

}

function saveFavoriteOrderFromDom() {

    saveFavoriteArticleNumberList(
        Array.from(
            document.querySelectorAll(
                ".project-article-favorite"
            )
        ).map(favorite =>
            favorite.dataset.articleNumber
        )
    );

}

function insertElementBeforeIfChanged(
    parentElement,
    element,
    referenceElement
) {

    if (
        !parentElement
        ||
        element === referenceElement
        ||
        element.nextSibling === referenceElement
    ) {

        return;

    }

    parentElement.insertBefore(
        element,
        referenceElement
    );

}

function clearArticleDropIndicators() {

    document
        .querySelectorAll(
            ".project-node.article-drop-over"
        )
        .forEach(node => {

            node.classList.remove(
                "article-drop-over"
            );

        });

}

function markNodeArticleDropTarget(
    node
) {

    clearArticleDropIndicators();

    node.classList.add(
        "article-drop-over"
    );

}

async function addArticleToNode(
    nodeId,
    articleNumber,
    fullArticle,
    projectId
) {

    const response =
        await fetch(

            "/api/projectNodeArticles",

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    projectNodeId:
                        nodeId,

                    articleNumber

                })

            }

        );

    const nodeArticle =
        await response.json();

    upsertCurrentNodeArticle(
        nodeArticle
    );

    console.log(

        "Artikel hinzugefügt",

        articleNumber,

        "zu Node",

        nodeId

    );

    const targetNode =
        document.querySelector(
            `.project-node[data-id="${nodeId}"]`
        );

    if (!targetNode) {

        return;

    }

    const children =
        targetNode.parentElement.querySelector(
            ".project-node-children"
        );

    if (!children) {

        return;

    }

    collapsedNodes.delete(
        String(nodeId)
    );

    children.style.display =
        "block";

    const toggle =
        targetNode.querySelector(
            ".node-toggle"
        );

    if (toggle) {

        toggle.textContent =
            "▼";

    }

    const childNodeWrapper =
        children.querySelector(
            ":scope > .project-node-wrapper"
        );

    if (childNodeWrapper) {

        childNodeWrapper.insertAdjacentHTML(

                "beforebegin",

                renderNodeArticle(
                nodeId,
                articleNumber,
                fullArticle,
                nodeArticle
            )
        );

    } else {

        children.insertAdjacentHTML(

                "beforeend",

            renderNodeArticle(
                nodeId,
                articleNumber,
                fullArticle,
                nodeArticle
            )
        );

    }

    registerNodeArticleMenus(
        projectId
    );

    registerNodeArticleDragAndDrop(
        projectId
    );

    updateProjectNodeTotals();

    syncArticleListHeight();

}

async function loadNodeArticles(
    nodeId
) {

    const response =
        await fetch(

            `/api/projectNodeArticles/${nodeId}`

        );

    return await response.json();

}

function registerNodeToggles(
    projectId
) {

    document
        .querySelectorAll(
            ".node-toggle"
        )
        .forEach(toggle => {

        toggle.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                const wrapper =
                    toggle.closest(
                        ".project-node-wrapper"
                    );

                const children =
                    wrapper.querySelector(
                        ":scope > .project-node-children"
                    );

                if (!children)
                    return;

                const isHidden =
                    children.style.display === "none";

                const nodeId =
                    getNodeIdKey(
                        toggle.dataset.id
                    );

                children.style.display =
                    isHidden
                        ? "block"
                        : "none";

                if (isHidden) {

                    collapsedNodes.delete(
                        nodeId
                    );

                } else {

                    collapsedNodes.add(
                        nodeId
                    );

                }

                toggle.textContent =
                    isHidden
                        ? "▼"
                        : "▶";

                saveCollapsedNodes(
                    projectId
                );

                syncArticleListHeight();

            }
        );

        });

}

function getArticleIcon(
    article = {}
) {

    if (
        isDlArticle(
            article
        )
    ) {

        return "/icons/dl.png";

    }

    if (
        isCtArticle(
            article
        )
    ) {

        return "/icons/ct-.png";

    }

    if (
        isGridVisArticle(
            article
        )
    ) {

        return "/icons/gridvis.png";

    }

    if (
        isRio3Article(
            article
        )
    ) {

        return "/icons/rio3.png";

    }

    if (
        isRd96Article(
            article
        )
    ) {

        return "/icons/rd96.png";

    }

    const primaryText =
        normalizeSearchText(
            [
                article.articleNumber,
                article.manufacturerType
            ]
                .filter(value =>
                    value !== null
                    &&
                    value !== undefined
                )
                .join(" ")
        );

    const matchingPrimaryRule =
        articleIconRules.find(rule =>
            rule.keywords.some(keyword =>
                primaryText.includes(
                    normalizeSearchText(
                        keyword
                    )
                )
            )
        );

    if (
        matchingPrimaryRule
    ) {

        return `/icons/${matchingPrimaryRule.icon}`;

    }

    const text =
        getArticleSearchText(
            article
        );

    const matchingFallbackRule =
        articleIconRules.find(rule =>
            rule.keywords.some(keyword =>
                text.includes(
                    normalizeSearchText(
                        keyword
                    )
                )
            )
        );

    if (
        matchingFallbackRule
    ) {

        return `/icons/${matchingFallbackRule.icon}`;

    }

    return "/icons/article.png";

}

function isDlArticle(
    article = {}
) {

    return String(article.articleNumber ?? "")
        .trim()
        .toLowerCase()
        .startsWith("dl");

}

function isCtArticle(
    article = {}
) {

    return [
        article.articleNumber,
        article.manufacturerType
    ].some(value =>
        String(value ?? "")
            .trim()
            .toLowerCase()
            .startsWith("ct-")
    );

}

function isGridVisArticle(
    article = {}
) {

    return String(article.manufacturerType ?? "")
        .trim()
        .toLowerCase()
        .includes("gridvis");

}

function isRio3Article(
    article = {}
) {

    return [
        article.articleNumber,
        article.manufacturerType
    ].some(value =>
        String(value ?? "")
            .trim()
            .toLowerCase()
            .startsWith("roi 3")
    );

}

function isRd96Article(
    article = {}
) {

    return String(article.articleNumber ?? "")
        .trim()
        ===
        "5231212";

}

function registerProjectNodeDragAndDrop(
    projectId
) {

    document
        .querySelectorAll(
            ".project-node"
        )
        .forEach(node => {

            if (
                node.dataset.nodeDragRegistered
                ===
                "true"
            ) {

                return;

            }

            node.dataset.nodeDragRegistered =
                "true";

            node.addEventListener(
                "dragstart",
                event => {

                    if (
                        event.target.closest(
                            "button, .node-toggle, .project-node-menu"
                        )
                    ) {

                        event.preventDefault();

                        return;

                    }

                    closeProjectMenus();

                    const wrapper =
                        node.closest(
                            ".project-node-wrapper"
                        );

                    node.dataset.originalNodePosition =
                        getProjectNodePositionSignature(
                            wrapper
                        );

                    wrapper.classList.add(
                        "node-dragging"
                    );

                    event.dataTransfer.effectAllowed =
                        "move";

                    event.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                            id:
                                node.dataset.id,
                            type:
                                node.dataset.type
                        })
                    );

                }
            );

            node.addEventListener(
                "dragend",
                async () => {

                    const wrapper =
                        node.closest(
                            ".project-node-wrapper"
                        );

                    const originalPosition =
                        node.dataset.originalNodePosition
                        ||
                        "";

                    delete node.dataset.originalNodePosition;

                    if (
                        wrapper
                        &&
                        originalPosition
                        &&
                        originalPosition
                        !==
                        getProjectNodePositionSignature(
                            wrapper
                        )
                    ) {

                        await saveProjectNodePosition(
                            wrapper,
                            projectId
                        );

                    }

                    document
                        .querySelectorAll(
                            ".project-node-wrapper.node-dragging, .project-node.node-drag-over"
                        )
                        .forEach(element => {

                            element.classList.remove(
                                "node-dragging",
                                "node-drag-over"
                            );

                        });

                }
            );

            node.addEventListener(
                "dragover",
                event => {

                    const draggedWrapper =
                        document.querySelector(
                            ".project-node-wrapper.node-dragging"
                        );

                    if (!draggedWrapper) {

                        return;

                    }

                    const draggedNode =
                        draggedWrapper.querySelector(
                            ".project-node"
                        );

                    const targetWrapper =
                        node.closest(
                            ".project-node-wrapper"
                        );

                    if (
                        !draggedNode
                        ||
                        !canDropProjectNode(
                            draggedNode,
                            node
                        )
                    ) {

                        return;

                    }

                    event.preventDefault();

                    node.classList.add(
                        "node-drag-over"
                    );

                    moveProjectNodeInDom(
                        draggedWrapper,
                        targetWrapper,
                        draggedNode,
                        node,
                        event
                    );

                }
            );

            node.addEventListener(
                "dragleave",
                () => {

                    node.classList.remove(
                        "node-drag-over"
                    );

                }
            );

            node.addEventListener(
                "drop",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    node.classList.remove(
                        "node-drag-over"
                    );

                }
            );

        });

}

function canDropProjectNode(
    draggedNode,
    targetNode
) {

    if (
        draggedNode.dataset.id
        ===
        targetNode.dataset.id
    ) {

        return false;

    }

    const draggedWrapper =
        draggedNode.closest(
            ".project-node-wrapper"
        );

    const targetWrapper =
        targetNode.closest(
            ".project-node-wrapper"
        );

    if (
        draggedWrapper.contains(
            targetWrapper
        )
    ) {

        return false;

    }

    if (
        draggedNode.dataset.type
        ===
        targetNode.dataset.type
    ) {

        return true;

    }

    return getValidParentType(
        draggedNode.dataset.type
    )
    ===
    targetNode.dataset.type;

}

function moveProjectNodeInDom(
    draggedWrapper,
    targetWrapper,
    draggedNode,
    targetNode,
    event
) {

    if (
        draggedNode.dataset.type
        ===
        targetNode.dataset.type
    ) {

        const targetRect =
            targetNode.getBoundingClientRect();

        const insertAfter =
            event.clientY
            >
            targetRect.top
            +
            targetRect.height / 2;

        targetWrapper.parentElement.insertBefore(
            draggedWrapper,
            insertAfter
                ? targetWrapper.nextSibling
                : targetWrapper
        );

        return;

    }

    const targetChildren =
        targetWrapper.querySelector(
            ":scope > .project-node-children"
        );

    if (targetChildren) {

        targetChildren.appendChild(
            draggedWrapper
        );

    }

}

function getValidParentType(
    type
) {

    switch(type) {

        case "building":
            return null;

        case "generalPosition":
            return null;

        case "panel":
            return "building";

        case "field":
            return "panel";

        case "meter":
            return "field";

        default:
            return null;

    }

}

function getProjectNodeParentIdFromDom(
    nodeWrapper
) {

    const parentWrapper =
        nodeWrapper
            .parentElement
            .closest(
                ".project-node-wrapper"
            );

    return parentWrapper
        ? parentWrapper.querySelector(
            ":scope > .project-node"
        ).dataset.id
        : null;

}

function getProjectNodePositionSignature(
    nodeWrapper
) {

    if (!nodeWrapper) {

        return "";

    }

    const parentId =
        getProjectNodeParentIdFromDom(
            nodeWrapper
        )
        ??
        "";

    const siblings =
        Array.from(
            nodeWrapper.parentElement.querySelectorAll(
                ":scope > .project-node-wrapper"
            )
        ).map(wrapper =>
            wrapper.querySelector(
                ":scope > .project-node"
            ).dataset.id
        );

    return JSON.stringify({
        parentId,
        siblings
    });

}

async function saveProjectNodePosition(
    nodeWrapper,
    projectId
) {

    const node =
        nodeWrapper.querySelector(
            ":scope > .project-node"
        );

    const parentId =
        getProjectNodeParentIdFromDom(
            nodeWrapper
        );

    const siblings =
        Array.from(
            nodeWrapper.parentElement.querySelectorAll(
                ":scope > .project-node-wrapper"
            )
        ).map(wrapper =>
            wrapper.querySelector(
                ":scope > .project-node"
            ).dataset.id
        );

    const sortOrder =
        siblings.indexOf(
            node.dataset.id
        );

    const currentNode =
        currentNodes.find(item =>
            String(item.id)
            ===
            String(node.dataset.id)
        );

    if (currentNode) {

        currentNode.parentId =
            parentId;

        currentNode.sortOrder =
            sortOrder;

    }

    siblings.forEach((siblingId, index) => {

        const sibling =
            currentNodes.find(item =>
                String(item.id)
                ===
                String(siblingId)
            );

        if (sibling) {

            sibling.parentId =
                parentId;

            sibling.sortOrder =
                index;

        }

    });

    try {

        const response =
            await fetch(

                `/api/projectNodes/${node.dataset.id}/move`,

                {

                    method: "PATCH",

                    keepalive: true,

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({
                        parentId,
                        sortOrder,
                        siblings
                    })

                }

            );

        if (!response.ok) {

            throw new Error(
                "Position konnte nicht gespeichert werden."
            );

        }

        const updatedNode =
            await response.json();

        updateCurrentNode(
            updatedNode
        );

    } catch (error) {

        console.error(
            error
        );

        refreshProjectTree(
            projectId
        );

    }

    updateProjectNodeTotals();

    syncArticleListHeight();

}

function registerProjectNodeMenus(
    projectId
) {

    document
        .querySelectorAll(
            ".project-node"
        )
        .forEach(node => {

            if (
                node.dataset.nodeMenuRegistered
                ===
                "true"
            ) {

                return;

            }

            node.dataset.nodeMenuRegistered =
                "true";

            const menuButton =
                node.querySelector(
                    ".project-node-menu-button"
                );

            const menuOptions =
                node.querySelector(
                    ".project-node-menu-options"
                );

            if (
                !menuButton
                ||
                !menuOptions
            ) {

                return;

            }

            menuButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    closeProjectMenus(
                        menuOptions
                    );

                    menuOptions.classList.toggle(
                        "open"
                    );

                }
            );

            menuOptions.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();

                    const actionButton =
                        event.target.closest(
                            "button"
                        );

                    if (!actionButton) {

                        return;

                    }

                    menuOptions.classList.remove(
                        "open"
                    );

                    const nodeId =
                        node.dataset.id;

                    const action =
                        actionButton.dataset.action;

                    if (action === "properties") {

                        const currentNode =
                            currentNodes.find(item =>
                                String(item.id) === String(nodeId)
                            );

                        const properties =
                            await openMeterPropertiesModal(currentNode ?? {});

                        if (properties === null) {

                            return;

                        }

                        const updatedNode =
                            await updateProjectNode(
                                nodeId,
                                properties
                            );

                        updateCurrentNode(updatedNode);

                        return;

                    }

                    if (action === "position-name") {

                        const currentName =
                            node
                                .querySelector(
                                    ".project-node-name"
                                )
                                ?.textContent
                                .trim()
                            ||
                            "";

                        const name =
                            await openProjectModal({
                                title: i18n.t("project.positionName"),
                                label: i18n.t("project.positionName"),
                                value: currentName
                            });

                        if (name === null) {

                            return;

                        }

                        const updatedNode =
                            await updateProjectNode(
                                nodeId,
                                {
                                    name:
                                        name.trim()
                                }
                            );

                        updateCurrentNode(
                            updatedNode
                        );

                        const nameElement =
                            node.querySelector(
                                ".project-node-name"
                            );

                        if (nameElement) {

                            nameElement.textContent =
                                updatedNode.name;

                        }

                        return;

                    }

                    if (action === "duplicate") {

                        await waitForPendingNodeArticleQuantities();

                        await waitForPendingNodeArticleOrders();

                        await fetch(

                            `/api/projectNodes/${nodeId}/duplicate`,

                            {
                                method: "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body: JSON.stringify({
                                    copySuffix:
                                        i18n.t("project.copySuffix")
                                })
                            }

                        );

                        await refreshProjectTree(
                            projectId
                        );

                        return;

                    }

                    if (action === "delete") {

                        await waitForPendingNodeArticleQuantities();

                        await fetch(

                            `/api/projectNodes/${nodeId}`,

                            {
                                method: "DELETE"
                            }

                        );

                        await refreshProjectTree(
                            projectId
                        );

                    }

                }
            );

        });

}

function closeProjectMenus(
    exceptMenu = null
) {

    document
        .querySelectorAll(
            ".node-article-menu-options.open, .project-node-menu-options.open"
        )
        .forEach(openMenu => {

            if (openMenu !== exceptMenu) {

                openMenu.classList.remove(
                    "open"
                );

            }

        });

}

function registerNodeArticleMenus(
    projectId
) {

    document
        .querySelectorAll(
            ".node-article"
        )
        .forEach(article => {

            if (
                article.dataset.menuRegistered
                ===
                "true"
            ) {

                return;

            }

            article.dataset.menuRegistered =
                "true";

            const menuButton =
                article.querySelector(
                    ".node-article-menu-button"
                );

            const menuOptions =
                article.querySelector(
                    ".node-article-menu-options"
                );

            if (
                !menuButton
                ||
                !menuOptions
            ) {

                return;

            }

            menuButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    closeProjectMenus(
                        menuOptions
                    );

                    menuOptions.classList.toggle(
                        "open"
                    );

                }
            );

            menuOptions.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();

                    const actionButton =
                        event.target.closest(
                            "button"
                        );

                    if (!actionButton) {

                        return;

                    }

                    menuOptions.classList.remove(
                        "open"
                    );

                    const positionId =
                        article.dataset.id;

                    if (!positionId) {

                        return;

                    }

                    const action =
                        actionButton.dataset.action;

                    if (action === "properties") {

                        const currentPosition =
                            currentNodeArticles.find(item =>
                                String(item.id) === String(positionId)
                            ) ?? {};

                        const properties =
                            await openArticlePropertiesModal(currentPosition);

                        if (properties === null) {

                            return;

                        }

                        const updatedNodeArticle =
                            await updateNodeArticlePosition(positionId, properties);

                        updateNodeArticleElement(article, updatedNodeArticle, projectId);

                        return;

                    }

                    if (action === "position-name") {

                        const currentName =
                            article
                                .querySelector(
                                    ".node-article-position-name"
                                )
                                ?.textContent
                                .trim()
                            ||
                            "";

                        const positionName =
                            await openProjectModal({
                                title: i18n.t("project.positionName"),
                                label: i18n.t("project.positionName"),
                                value: currentName
                            });

                        if (positionName === null) {

                            return;

                        }

                        const updatedNodeArticle =
                            await updateNodeArticlePosition(
                                positionId,
                                {
                                    positionName:
                                        positionName.trim()
                                }
                            );

                        updateNodeArticleElement(
                            article,
                            updatedNodeArticle,
                            projectId
                        );

                        return;

                    }

                    if (action === "duplicate") {

                        await duplicateNodeArticle(
                            article,
                            projectId
                        );

                        return;

                    }

                    if (action === "delete") {

                        await waitForPendingNodeArticleQuantities();

                        await fetch(

                            `/api/projectNodeArticles/${positionId}`,

                            {
                                method: "DELETE"
                            }

                        );

                        removeCurrentNodeArticle(
                            positionId
                        );

                        article.remove();

                        updateProjectNodeTotals();

                        syncArticleListHeight();

                    }

                }
            );

        });

}

function registerNodeArticleQuantityInputs(
    projectId
) {

    document
        .querySelectorAll(
            ".node-article-quantity-input"
        )
        .forEach(input => {

            if (
                input.dataset.quantityRegistered
                ===
                "true"
            ) {

                return;

            }

            input.dataset.quantityRegistered =
                "true";

            const article =
                input.closest(
                    ".node-article"
                );

            const saveQuantity =
                async () => {

                    const quantity =
                        Number(input.value);

                    if (
                        !Number.isInteger(quantity)
                        ||
                        quantity <= 0
                    ) {

                        input.value =
                            article?.dataset.quantity
                            ||
                            "1";

                        await showAlert(
                            i18n.t("project.quantityValidation")
                        );

                        return;

                    }

                    if (
                        String(quantity)
                        ===
                        article.dataset.quantity
                    ) {

                        return;

                    }

                    const request =
                        updateNodeArticlePosition(
                            article.dataset.id,
                            { quantity }
                        )
                            .then(updatedNodeArticle => {

                                updateNodeArticleElement(
                                    article,
                                    updatedNodeArticle,
                                    projectId
                                );

                            });

                    pendingNodeArticleQuantityRequests.add(
                        request
                    );

                    try {

                        await request;

                    } finally {

                        pendingNodeArticleQuantityRequests.delete(
                            request
                        );

                    }

                };

            input.addEventListener(
                "click",
                event => event.stopPropagation()
            );

            input.addEventListener(
                "keydown",
                event => {

                    event.stopPropagation();

                    if (event.key === "Enter") {

                        event.preventDefault();
                        input.blur();

                    }

                }
            );

            input.addEventListener(
                "change",
                saveQuantity
            );

        });

}

function registerNodeArticleDragAndDrop(
    projectId
) {

    document
        .querySelectorAll(
            ".node-article"
        )
        .forEach(article => {

            if (
                article.dataset.dragRegistered
                ===
                "true"
            ) {

                return;

            }

            article.dataset.dragRegistered =
                "true";

            article.addEventListener(
                "dragstart",
                event => {

                    const nodeId =
                        article.dataset.nodeId;

                    closeProjectMenus();

                    article.classList.add(
                        "dragging"
                    );

                    article.dataset.originalNodeId =
                        nodeId;

                    article.dataset.originalOrder =
                        getNodeArticleOrderSignature(
                            nodeId
                        );

                    event.dataTransfer.effectAllowed =
                        "move";

                    event.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({
                            id:
                                article.dataset.id,
                            nodeId:
                                article.dataset.nodeId
                        })
                    );

                }
            );

            article.addEventListener(
                "dragend",
                async () => {

                    const nodeId =
                        article.dataset.nodeId;

                    const originalNodeId =
                        article.dataset.originalNodeId
                        ||
                        nodeId;

                    const originalOrder =
                        article.dataset.originalOrder
                        ||
                        "";

                    const wasDropHandled =
                        article.dataset.dropHandled
                        ===
                        "true";

                    article.classList.remove(
                        "dragging"
                    );

                    document
                        .querySelectorAll(
                            ".node-article.drag-over"
                        )
                        .forEach(item => {

                            item.classList.remove(
                                "drag-over"
                            );

                        });

                    clearArticleDropIndicators();

                    delete article.dataset.dropHandled;
                    delete article.dataset.originalOrder;
                    delete article.dataset.originalNodeId;

                    if (wasDropHandled) {

                        return;

                    }

                    if (
                        originalNodeId
                        !==
                        nodeId
                    ) {

                        await updateNodeArticlePosition(
                            article.dataset.id,
                            {
                                projectNodeId:
                                    nodeId,
                                sortOrder:
                                    getNodeArticleIndex(
                                        article
                                    )
                            }
                        );

                        await Promise.all([
                            saveNodeArticleOrder(
                                originalNodeId
                            ),
                            saveNodeArticleOrder(
                                nodeId
                            )
                        ]);

                        updateProjectNodeTotals();
                        syncArticleListHeight();

                        return;

                    }

                    if (
                        originalOrder
                        &&
                        originalOrder
                        !==
                        getNodeArticleOrderSignature(
                            nodeId
                        )
                    ) {

                        await saveNodeArticleOrder(
                            nodeId
                        );

                    }

                }
            );

            article.addEventListener(
                "dragover",
                event => {

                    const draggedArticle =
                        document.querySelector(
                            ".node-article.dragging"
                        );

                    if (
                        !draggedArticle
                        ||
                        draggedArticle === article
                    ) {

                        return;

                    }

                    const targetNodeId =
                        article.dataset.nodeId;

                    const originalNodeId =
                        draggedArticle.dataset.originalNodeId
                        ||
                        draggedArticle.dataset.nodeId;

                    event.preventDefault();
                    event.stopPropagation();

                    event.dataTransfer.dropEffect =
                        "move";

                    article.classList.add(
                        "drag-over"
                    );

                    if (
                        originalNodeId
                        !==
                        targetNodeId
                    ) {

                        return;

                    }

                    const articleRect =
                        article.getBoundingClientRect();

                    const insertAfter =
                        event.clientY
                        >
                        articleRect.top
                        +
                        articleRect.height / 2;

                    draggedArticle.dataset.nodeId =
                        targetNodeId;

                    insertElementBeforeIfChanged(
                        article.parentElement,
                        draggedArticle,
                        insertAfter
                            ? article.nextSibling
                            : article
                    );

                }
            );

            article.addEventListener(
                "dragleave",
                () => {

                    article.classList.remove(
                        "drag-over"
                    );

                }
            );

            article.addEventListener(
                "drop",
                event => {

                    const draggedArticle =
                        document.querySelector(
                            ".node-article.dragging"
                        );

                    if (!draggedArticle) {

                        return;

                    }

                    event.preventDefault();
                    event.stopPropagation();

                    article.classList.remove(
                        "drag-over"
                    );

                    syncArticleListHeight();

                }
            );

        });

    registerNodeArticleDropTargets(
        projectId
    );

}

function registerNodeArticleDropTargets(
    projectId
) {

    document
        .querySelectorAll(
            ".project-node[data-type=\"meter\"], .project-node[data-type=\"generalPosition\"]"
        )
        .forEach(node => {

            const dropTarget =
                node.closest(
                    ".project-node-wrapper"
                );

            if (!dropTarget) {

                return;

            }

            if (
                dropTarget.dataset.nodeArticleDropRegistered
                ===
                "true"
            ) {

                return;

            }

            dropTarget.dataset.nodeArticleDropRegistered =
                "true";

            dropTarget.addEventListener(
                "dragover",
                event => {

                    const draggedArticle =
                        document.querySelector(
                            ".node-article.dragging"
                        );

                    if (!draggedArticle) {

                        return;

                    }

                    if (
                        event.target.closest(
                            ".project-node-wrapper"
                        )
                        !==
                        dropTarget
                    ) {

                        return;

                    }

                    if (
                        (
                            draggedArticle.dataset.originalNodeId
                            ||
                            draggedArticle.dataset.nodeId
                        )
                        ===
                        node.dataset.id
                        &&
                        event.target.closest(
                            ".node-article"
                        )
                    ) {

                        return;

                    }

                    event.preventDefault();
                    event.stopPropagation();

                    event.dataTransfer.dropEffect =
                        "move";

                    markNodeArticleDropTarget(
                        node
                    );

                },
                true
            );

            dropTarget.addEventListener(
                "dragleave",
                event => {

                    if (
                        dropTarget.contains(
                            event.relatedTarget
                        )
                    ) {

                        return;

                    }

                    node.classList.remove(
                        "article-drop-over"
                    );

                }
            );

            dropTarget.addEventListener(
                "drop",
                async event => {

                    const draggedArticle =
                        document.querySelector(
                            ".node-article.dragging"
                        );

                    if (!draggedArticle) {

                        return;

                    }

                    if (
                        event.target.closest(
                            ".project-node-wrapper"
                        )
                        !==
                        dropTarget
                    ) {

                        return;

                    }

                    if (
                        (
                            draggedArticle.dataset.originalNodeId
                            ||
                            draggedArticle.dataset.nodeId
                        )
                        ===
                        node.dataset.id
                        &&
                        event.target.closest(
                            ".node-article"
                        )
                    ) {

                        return;

                    }

                    event.preventDefault();
                    event.stopPropagation();

                    node.classList.remove(
                        "article-drop-over"
                    );

                    await moveNodeArticleToNodeAndSave(
                        draggedArticle,
                        node.dataset.id,
                        projectId
                    );

                    syncArticleListHeight();

                },
                true
            );

        });

}

function moveNodeArticleElementToNode(
    article,
    nodeId
) {

    const targetNode =
        document.querySelector(
            `.project-node[data-id="${nodeId}"]`
        );

    if (!targetNode) {

        return;

    }

    const children =
        targetNode
            .closest(
                ".project-node-wrapper"
            )
            ?.querySelector(
                ":scope > .project-node-children"
            );

    if (!children) {

        return;

    }

    article.dataset.nodeId =
        nodeId;

    const childNodeWrapper =
        children.querySelector(
            ":scope > .project-node-wrapper"
        );

    insertElementBeforeIfChanged(
        children,
        article,
        childNodeWrapper
    );

}

async function moveNodeArticleToNodeAndSave(
    article,
    targetNodeId,
    projectId
) {

    const originalNodeId =
        article.dataset.originalNodeId
        ||
        article.dataset.nodeId;

    moveNodeArticleElementToNode(
        article,
        targetNodeId
    );

    if (
        originalNodeId
        ===
        targetNodeId
    ) {

        return;

    }

    article.dataset.dropHandled =
        "true";

    await updateNodeArticlePosition(
        article.dataset.id,
        {
            projectNodeId:
                targetNodeId,
            sortOrder:
                getNodeArticleIndex(
                    article
                )
        }
    );

    await Promise.all([
        saveNodeArticleOrder(
            originalNodeId
        ),
        saveNodeArticleOrder(
            targetNodeId
        )
    ]);

    updateProjectNodeTotals();

    await refreshProjectTree(
        projectId
    );

}

function getNodeArticleIndex(
    article
) {

    return Array
        .from(
            document.querySelectorAll(
                `.node-article[data-node-id="${article.dataset.nodeId}"]`
            )
        )
        .indexOf(
            article
        );

}

function saveNodeArticleOrder(
    nodeId
) {

    const orderedArticles =
        Array.from(
            document.querySelectorAll(
                `.node-article[data-node-id="${nodeId}"]`
            )
        );

    const positions =
        orderedArticles.map((article, index) => ({

            id:
                article.dataset.id,

            sortOrder:
                index

        }));

    currentNodeArticles =
        currentNodeArticles.map(nodeArticle => {

            const position =
                positions.find(
                    item =>
                        String(item.id)
                        ===
                        String(nodeArticle.id)
                );

            if (!position) {

                return nodeArticle;

            }

            return {
                ...nodeArticle,
                sortOrder:
                    position.sortOrder
            };

        });

    const request =
        fetch(

            `/api/projectNodeArticles/reorder/${nodeId}`,

            {

                method: "PATCH",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({
                    positions
                })

            }

        )
            .then(response => {

                if (!response.ok) {

                    throw new Error(
                        "Artikelreihenfolge konnte nicht gespeichert werden."
                    );

                }

                return response.json();

            })
            .catch(error => {

                console.error(
                    error
                );

            });

    pendingNodeArticleOrderRequests.add(
        request
    );

    request.finally(() => {

        pendingNodeArticleOrderRequests.delete(
            request
        );

    });

    return request;

}

function getNodeArticleOrderSignature(
    nodeId
) {

    return Array
        .from(
            document.querySelectorAll(
                `.node-article[data-node-id="${nodeId}"]`
            )
        )
        .map(article =>
            article.dataset.id
        )
        .join(",");

}

async function waitForPendingNodeArticleOrders() {

    if (
        pendingNodeArticleOrderRequests.size === 0
    ) {

        return;

    }

    await Promise.all(
        pendingNodeArticleOrderRequests
    );

}

async function waitForPendingNodeArticleQuantities() {

    if (
        pendingNodeArticleQuantityRequests.size === 0
    ) {

        return;

    }

    await Promise.all(
        pendingNodeArticleQuantityRequests
    );

}

async function updateNodeArticlePosition(
    positionId,
    data
) {

    const response =
        await fetch(

            `/api/projectNodeArticles/${positionId}`,

            {

                method: "PATCH",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify(
                    data
                )

            }

        );

    if (!response.ok) {

        throw new Error(
            "Artikelposition konnte nicht gespeichert werden."
        );

    }

    const updatedNodeArticle =
        await response.json();

    upsertCurrentNodeArticle(
        updatedNodeArticle
    );

    return updatedNodeArticle;

}

async function updateProjectNode(
    nodeId,
    data
) {

    const response =
        await fetch(

            `/api/projectNodes/${nodeId}`,

            {

                method: "PATCH",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify(
                    data
                )

            }

        );

    return await response.json();

}

async function duplicateNodeArticle(
    articleElement,
    projectId
) {

    await waitForPendingNodeArticleQuantities();

    const sourceNodeArticle =
        currentNodeArticles.find(
            nodeArticle =>
                String(nodeArticle.id)
                ===
                String(articleElement.dataset.id)
        );

    if (!sourceNodeArticle) {

        return;

    }

    const response =
        await fetch(

            "/api/projectNodeArticles",

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    projectNodeId:
                        sourceNodeArticle.projectNodeId,

                    articleNumber:
                        sourceNodeArticle.articleNumber,

                    quantity:
                        sourceNodeArticle.quantity ?? 1,

                    positionName:
                        sourceNodeArticle.positionName ?? null

                })

            }

        );

    const duplicatedNodeArticle =
        await response.json();

    upsertCurrentNodeArticle(
        duplicatedNodeArticle
    );

    const fullArticle =
        getCurrentArticleByNumber(
            duplicatedNodeArticle.articleNumber
        );

    articleElement.insertAdjacentHTML(

        "beforebegin",

        renderNodeArticle(
            duplicatedNodeArticle.projectNodeId,
            duplicatedNodeArticle.articleNumber,
            fullArticle,
            duplicatedNodeArticle
        )

    );

    registerNodeArticleMenus(
        projectId
    );

    registerNodeArticleQuantityInputs(
        projectId
    );

    registerNodeArticleDragAndDrop(
        projectId
    );

    updateProjectNodeTotals();

    syncArticleListHeight();

}

function updateNodeArticleElement(
    articleElement,
    nodeArticle,
    projectId
) {

    upsertCurrentNodeArticle(
        nodeArticle
    );

    const fullArticle =
        getCurrentArticleByNumber(
            nodeArticle.articleNumber
        );

    articleElement.outerHTML =
        renderNodeArticle(
            nodeArticle.projectNodeId,
            nodeArticle.articleNumber,
            fullArticle,
            nodeArticle
        );

    const updatedArticleElement =
        document.querySelector(
            `.node-article[data-id="${nodeArticle.id}"]`
        );

    if (updatedArticleElement) {

        registerNodeArticleMenus(
            projectId
        );

        registerNodeArticleQuantityInputs(
            projectId
        );

        registerNodeArticleDragAndDrop(
            projectId
        );

    }

    updateProjectNodeTotals();

    syncArticleListHeight();

}

document.addEventListener(
    "click",
    () => {

        closeProjectMenus();

    }
);

export {
    renderView
};
