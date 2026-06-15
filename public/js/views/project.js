import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");

import * as utils from "../utils/icons.js";

let collapsedNodes = new Set();
let currentNodes = [];
let currentArticles = [];
let currentNodeArticles = [];
let articleLayoutResizeRegistered = false;
let draggedArticleNumber = null;
const pendingNodeArticleOrderRequests =
    new Set();
const articleFavoritesStorageKey =
    "projectBuilder.articleFavorites";
const articleFavoritesCollapsedStorageKey =
    "projectBuilder.articleFavoritesCollapsed";
const minimumArticleListHeight =
    420;
const articleIconRules = [
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

    const response =
        await fetch(
            `/api/projects/${projectId}`
        );

    const project =
        await response.json();

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

    const nodesResponse =
        await fetch(

            `/api/projectNodes/${projectId}`

        );

    const nodes =
        await nodesResponse.json();

    currentNodes =
        nodes;

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

    view.innerHTML = `

        <div class="view-header">

            ${project.name}

        </div>

        <div class="view-left"></div>

        <div
            id="project-content"
            class="view-content"
        >

            <div class="project-card">

                <h2>
                    ${i18n.t("project.projectData")}
                </h2>

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

                    </div>

                    <div class="project-description-wrapper">

                        <label>
                            ${i18n.t("project.description")}:
                        </label>

                        <textarea
                            id="project-description"
                        >${project.description ?? ""}</textarea>

                    </div>

                </div>

            </div>

            <div class="project-editor">

                <div class="project-structure-card">

                    <h2>
                        ${i18n.t("project.projectStructure")}
                    </h2>

                    <button
                        id="add-building"
                        type="button"
                        title="${i18n.t("project.addBuilding")}"
                        aria-label="${i18n.t("project.addBuilding")}"
                    >
                        <span class="add-building-icon">
                            ${utils.icons.building}
                        </span>

                        <span>
                            ${i18n.t("project.addBuilding")}
                        </span>
                    </button>

                    <div id="project-tree">

                        ${renderNodes(nodes, nodeArticles, articles, nodeTotals)}

                    </div>

                </div>

                <div class="project-articles-card">

                    <h2>
                        ${i18n.t("project.articles")}
                    </h2>

                    <input
                        id="project-article-search"
                        placeholder="${i18n.t("project.searchArticles")}..."
                    >

                    <div
                        id="project-article-favorites"
                    >

                        ${renderFavoriteArticles(articles)}

                    </div>

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
    registerNodeArticleDragAndDrop(projectId);
    registerArticleListLayoutSync();
    syncArticleListHeight();
}

async function refreshProjectTree(
    projectId
) {

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

    registerNodeArticleDragAndDrop(
        projectId
    );

    syncArticleListHeight();

}

function registerArticleListLayoutSync() {

    if (articleLayoutResizeRegistered) {

        return;

    }

    articleLayoutResizeRegistered =
        true;

    window.addEventListener(
        "resize",
        syncArticleListHeight
    );

}

function syncArticleListHeight() {

    requestAnimationFrame(
        () => {

            const structureCard =
                document.querySelector(
                    ".project-structure-card"
                );

            const articlesCard =
                document.querySelector(
                    ".project-articles-card"
                );

            const articleList =
                document.getElementById(
                    "project-article-list"
                );

            if (
                !structureCard
                ||
                !articlesCard
                ||
                !articleList
            ) {

                return;

            }

            structureCard.style.minHeight =
                "";

            articlesCard.style.height =
                "";

            articleList.style.height =
                "";

            const structureHeight =
                structureCard.getBoundingClientRect().height;

            const articlesCardRect =
                articlesCard.getBoundingClientRect();

            const articleListRect =
                articleList.getBoundingClientRect();

            const articlesCardStyles =
                getComputedStyle(
                    articlesCard
                );

            const paddingBottom =
                parseFloat(
                    articlesCardStyles.paddingBottom
                )
                ||
                0;

            const articleListTopOffset =
                articleListRect.top
                -
                articlesCardRect.top;

            const minimumArticleCardHeight =
                articleListTopOffset
                +
                minimumArticleListHeight
                +
                paddingBottom;

            const targetHeight =
                Math.max(
                    structureHeight,
                    minimumArticleCardHeight
                );

            structureCard.style.minHeight =
                `${targetHeight}px`;

            articlesCard.style.height =
                `${targetHeight}px`;

            const availableHeight =
                targetHeight
                -
                articleListTopOffset
                -
                paddingBottom;

            articleList.style.height =
                `${Math.max(availableHeight, minimumArticleListHeight)}px`;

        }
    );

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

    return localStorage.getItem(
        articleFavoritesCollapsedStorageKey
    )
    ===
    "true";

}

function saveArticleFavoritesCollapsed(
    isCollapsed
) {

    localStorage.setItem(
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
                localStorage.getItem(
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

    localStorage.setItem(
        articleFavoritesStorageKey,
        JSON.stringify(
            favoriteArticleNumbers.map(String)
        )
    );

}

function saveFavoriteArticleNumbers(
    favoriteArticleNumbers
) {

    localStorage.setItem(
        articleFavoritesStorageKey,
        JSON.stringify(
            Array.from(
                favoriteArticleNumbers
            )
        )
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

function renderNodeArticle(
    nodeId,
    articleNumber,
    fullArticle,
    nodeArticle = {}
) {

    const quantity =
        Number(nodeArticle.quantity) || 1;

    const total =
        getArticleUnitPrice(fullArticle)
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

                    <span class="node-article-price">

                        ${formatQuantity(quantity)} x
                        ${formatCurrency(getArticleUnitPrice(fullArticle))}
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
                        data-action="position-name"
                    >
                        ${i18n.t("project.positionName")}
                    </button>

                    <button
                        type="button"
                        data-action="quantity"
                    >
                        ${i18n.t("project.quantity")}
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

function getNodeArticleTotal(
    nodeArticle,
    article
) {

    return getArticleUnitPrice(article)
        *
        (Number(nodeArticle.quantity) || 1);

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

    document
        .getElementById(
            "add-building"
        )
        .addEventListener(
            "click",
            async () => {

                const name =
                    await openProjectModal({
                        title: i18n.t("project.addBuilding"),
                        label: i18n.t("project.positionName"),
                        value: i18n.t("project.newBuilding")
                    });

                if (name === null) {

                    return;

                }

                await createProjectNode({
                    projectId,
                    parentId: null,
                    type: "building",
                    name:
                        name.trim()
                        ||
                        i18n.t("project.newBuilding")
                });

                await refreshProjectTree(
                    projectId
                );

            }
        );

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

        input.addEventListener(
            "input",
            () => {

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
            ".project-node[data-type=\"meter\"]"
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

            dropTarget.addEventListener(
                "dragover",
                event => {

                    const articleNumber =
                        getDraggedArticleNumber(
                            event
                        );

                    if (!articleNumber) {

                        return;

                    }

                    event.preventDefault();

                    event.dataTransfer.dropEffect =
                        "copy";

                    node.classList.add(
                        "article-drop-over"
                    );

                }
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

                }
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

            const searchTerms =
                normalizeSearchText(
                    search.value
                )
                .split(" ")
                .filter(Boolean);

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
                        searchTerms.length === 0
                        ||
                        searchTerms.every(term =>
                            haystack.includes(
                                term
                            )
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

                syncArticleListHeight();

            }
        );

        });

}

function getArticleIcon(
    article = {}
) {

    const text =
        getArticleSearchText(
            article
        );

    const matchingRule =
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
        matchingRule
    ) {

        return `/icons/${matchingRule.icon}`;

    }

    return "/icons/article.png";

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

                    node
                        .closest(
                            ".project-node-wrapper"
                        )
                        .classList.add(
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
                () => {

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

                    node.classList.remove(
                        "node-drag-over"
                    );

                    const draggedWrapper =
                        document.querySelector(
                            ".project-node-wrapper.node-dragging"
                        );

                    if (!draggedWrapper) {

                        return;

                    }

                    saveProjectNodePosition(
                        draggedWrapper,
                        projectId
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

function saveProjectNodePosition(
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
            siblings.indexOf(
                node.dataset.id
            );

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

    fetch(

        `/api/projectNodes/${node.dataset.id}/move`,

        {

            method: "PATCH",

            headers: {

                "Content-Type":
                    "application/json"

            },

            body: JSON.stringify({
                parentId,
                siblings
            })

        }

    ).catch(() => {

        refreshProjectTree(
            projectId
        );

    });

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

                    if (action === "quantity") {

                        const currentQuantity =
                            article.dataset.quantity
                            ||
                            "1";

                        const quantity =
                            await openProjectModal({
                                title: i18n.t("project.quantity"),
                                label: i18n.t("project.quantity"),
                                type: "number",
                                value: currentQuantity,
                                min: "1",
                                step: "1"
                            });

                        if (quantity === null) {

                            return;

                        }

                        const normalizedQuantity =
                            Number(
                                quantity.replace(
                                    ",",
                                    "."
                                )
                            );

                        if (
                            !Number.isFinite(
                                normalizedQuantity
                            )
                            ||
                            !Number.isInteger(
                                normalizedQuantity
                            )
                            ||
                            normalizedQuantity <= 0
                        ) {

                            alert(
                                i18n.t("project.quantityValidation")
                            );

                            return;

                        }

                        const updatedNodeArticle =
                            await updateNodeArticlePosition(
                                positionId,
                                {
                                    quantity:
                                        normalizedQuantity
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

                    closeProjectMenus();

                    article.classList.add(
                        "dragging"
                    );

                    article.dataset.originalOrder =
                        getNodeArticleOrderSignature(
                            article.dataset.nodeId
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
                () => {

                    const nodeId =
                        article.dataset.nodeId;

                    const originalOrder =
                        article.dataset.originalOrder
                        ||
                        "";

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

                    delete article.dataset.originalOrder;

                    if (
                        originalOrder
                        &&
                        originalOrder
                        !==
                        getNodeArticleOrderSignature(
                            nodeId
                        )
                    ) {

                        saveNodeArticleOrder(
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
                        ||
                        draggedArticle.dataset.nodeId
                        !==
                        article.dataset.nodeId
                    ) {

                        return;

                    }

                    event.preventDefault();

                    event.dataTransfer.dropEffect =
                        "move";

                    article.classList.add(
                        "drag-over"
                    );

                    const articleRect =
                        article.getBoundingClientRect();

                    const insertAfter =
                        event.clientY
                        >
                        articleRect.top
                        +
                        articleRect.height / 2;

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

    return await response.json();

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
