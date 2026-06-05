import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");

import * as utils from "../utils/icons.js";

let selectedNodeId = null;
let collapsedNodes = new Set();

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

    const nodeArticlesResponse =
        await fetch(
            "/api/projectNodeArticles"
        );

    const nodeArticles =
        await nodeArticlesResponse.json();

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
                    Projektdaten
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
                                Kunde:
                            </label>

                                <select id="project-customer">

                                    <option
                                        value=""
                                        ${!project.customerId ? "selected" : ""}
                                    >
                                        Kunde auswählen
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
                        Projektstruktur
                    </h2>

                    <button
                        id="add-building"
                    >
                        + Gebäude
                    </button>

                    <div id="project-tree">

                        ${renderNodes(nodes, nodeArticles, articles)}

                    </div>

                </div>

                <div class="project-articles-card">

                    <h2>
                        Artikel
                    </h2>

                    <input
                        id="project-article-search"
                        placeholder="Artikel suchen..."
                    >

                <div
                    id="project-article-list"
                >

                    ${articles.map(article => `

                        <div
                            class="project-article"
                            data-article-number="${article.articleNumber}"
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
                                <img
                                    src="${getArticleIcon(article)}"
                                    alt=""
                                >
                            </div>

                            <div class="project-article-description">

                                ${article.description ?? ""}

                            </div>

                        </div>

                    `).join("")}

                </div>

                </div>

            </div>

        </div>

        <div class="view-right"></div>
    `;

    generateHandler(projectId);
    generateNodeHandler(projectId);
    registerNodeButtons(projectId);
    registerNodeSelection();
    registerArticleSelection(articles);
    registerNodeToggles(projectId);
    registerNodeArticleDelete();
}

// Render Nodes
function renderNodes(nodes, nodeArticles, articles) {
    return renderChildNodes(nodes, nodeArticles, articles, null);
}

function renderChildNodes(nodes, nodeArticles, articles, parentId) {

    const getArticlesForNode =
        nodeId =>
            nodeArticles.filter(
                article =>
                    String(article.projectNodeId)
                    ===
                    String(nodeId)
            );

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

        .map(node => `

            <div class="project-node-wrapper">

                <div
                    class="project-node"
                    data-id="${node.id}"
                    data-type="${node.type}"
                >

                    <span>

                    <span
                        class="node-toggle"
                        data-id="${node.id}"
                    >

                        ${collapsedNodes.has(node.id)
                            ? "▶"
                            : "▼"}

                    </span>

                        ${getNodeIcon(node.type)}

                        ${node.name}

                    </span>

                    ${getNextNodeType(node.type) ? `

                        <button
                            class="node-add"
                            data-id="${node.id}"
                            data-type="${node.type}"
                        >

                            +

                        </button>

                    ` : ""}

                </div>

                <div
                    class="project-node-children"
                    style="
                        display:
                        ${
                            collapsedNodes.has(node.id)
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
                        return `

                            <div
                                class="node-article"
                                data-node-id="${node.id}"
                                data-article-number="${nodeArticle.articleNumber}"
                            >

                                <img
                                    src="${getArticleIcon(fullArticle)}"
                                    alt=""
                                >

                                <div class="node-article-content">

                                    <div class="node-article-header">

                                        <span class="node-article-number">

                                            ${nodeArticle.articleNumber}

                                        </span>

                                        <span class="node-article-price">

                                            (${fullArticle?.listPrice ?? ""} €)

                                        </span>

                                    </div>

                                    <div class="node-article-name">

                                        ${fullArticle?.manufacturerType ?? ""}

                                    </div>

                                </div>

                            </div>

                        `;

                    }).join("")}

                    ${renderChildNodes(
                        nodes,
                        nodeArticles,
                        articles,
                        node.id
                    )}

                </div>

            </div>

        `).join("");

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

                            parentId: null,

                            type:
                                "building",

                            name:
                                "Neues Gebäude"

                        })

                    }

                );

                renderView(
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

                    let newType =
                        null;

                    let newName =
                        null;

                    switch(parentType) {

                        case "building":

                            newType =
                                "panel";

                            newName =
                                "Neue Verteilung";

                            break;

                        case "panel":

                            newType =
                                "field";

                            newName =
                                "Neues Feld";

                            break;

                        case "field":

                            newType =
                                "meter";

                            newName =
                                "Neue Messstelle";

                            break;

                        default:

                            return;

                    }

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

                                type:
                                    newType,

                                name:
                                    newName

                            })

                        }

                    );

                    renderView(
                        projectId
                    );

                }
            );

        });

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

                name: "Neue Verteilung"

            };

        case "panel":

            return {

                type: "field",

                name: "Neues Feld"

            };

        case "field":

            return {

                type: "meter",

                name: "Neue Messstelle"

            };

        default:

            return null;

    }

}


function registerNodeSelection() {

    document
        .querySelectorAll(
            ".project-node"
        )
        .forEach(node => {

            node.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".project-node"
                        )
                        .forEach(item => {

                            item.classList.remove(
                                "selected"
                            );

                        });

                    node.classList.add(
                        "selected"
                    );

                    selectedNodeId =
                        node.dataset.id;

                }
            );

        });

}


function registerArticleSelection(articles) {

    document
        .querySelectorAll(
            ".project-article"
        )
        .forEach(article => {

            article.addEventListener(
                "click",
                async () => {

                    if (!selectedNodeId) {

                        alert(
                            "Bitte zuerst eine Messstelle auswählen."
                        );

                        return;

                    }

                    const articleNumber =
                        article.dataset.articleNumber;

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
                                    selectedNodeId,

                                articleNumber

                            })

                        }

                    );

                    console.log(

                        "Artikel hinzugefügt",

                        articleNumber,

                        "zu Node",

                        selectedNodeId

                    );

                    const fullArticle =
                        articles.find(
                            item =>
                                item.articleNumber
                                ===
                                articleNumber
                        );

                    const selectedNode =
                        document.querySelector(
                            `.project-node[data-id="${selectedNodeId}"]`
                        );

                    const children =
                        selectedNode.parentElement.querySelector(
                            ".project-node-children"
                        );

                        children.insertAdjacentHTML(

                            "afterbegin",

                            `

                                <div
                                    class="node-article"
                                    data-node-id="${selectedNodeId}"
                                    data-article-number="${articleNumber}"
                                >

                                    <img
                                        src="${getArticleIcon(fullArticle)}"
                                        alt=""
                                    >

                                    <span>

                                        ${articleNumber}

                                    </span>

                                </div>

                            `
                        );

                }

            );

        });

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

                children.style.display =
                    isHidden
                        ? "block"
                        : "none";

                toggle.textContent =
                    isHidden
                        ? "▼"
                        : "▶";

            }
        );

        });

}

function getArticleIcon(
    article
) {

    const text = `

        ${article.manufacturerType ?? ""}
        ${article.description ?? ""}

    `.toLowerCase();

    if (
        text.includes(
            "b21"
        )
    ) {

        return "/icons/b21.png";

    }

    if (
        text.includes(
            "b23"
        )
    ) {

        return "/icons/b23.png";

    }

    if (
        text.includes(
            "b24"
        )
    ) {

        return "/icons/b24.png";

    }

    if (
        text.includes(
            "umg 800"
        )
    ) {

        return "/icons/umg800.png";

    }

    return "/icons/article.png";

}

function registerNodeArticleDelete() {

    document
        .querySelectorAll(
            ".node-article"
        )
        .forEach(article => {

            article.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();

                    const nodeId =
                        article.dataset.nodeId;

                    const articleNumber =
                        article.dataset.articleNumber;

                    await fetch(

                        `/api/projectNodeArticles/${nodeId}/${articleNumber}`,

                        {
                            method: "DELETE"
                        }

                    );

                    article.remove();

                }
            );

        });

}

export {
    renderView
};