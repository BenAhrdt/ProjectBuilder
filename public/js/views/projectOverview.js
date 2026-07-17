import {
    calculateStructureUnitPrice
} from "./projectPricing.js";

const diagramLayout = {
    cardWidth: 270,
    horizontalGap: 90,
    verticalGap: 26,
    margin: 40,
    nodeHeaderHeight: 78,
    articleHeight: 36
};

const printPageLayout = {
    width: 1120,
    height: 790,
    gap: 26
};

const nodeColors = {
    project: {
        fill: "#1f3552",
        header: "#1f3552",
        text: "#ffffff"
    },
    building: {
        fill: "#f4f8fd",
        header: "#dbe9f8",
        text: "#1f3552"
    },
    generalPosition: {
        fill: "#f8f5fd",
        header: "#e8def8",
        text: "#463267"
    },
    panel: {
        fill: "#f3f8f6",
        header: "#d9ede4",
        text: "#1f5e38"
    },
    field: {
        fill: "#fff9ef",
        header: "#f9e8c4",
        text: "#73510d"
    },
    meter: {
        fill: "#fff6f5",
        header: "#f8ddda",
        text: "#7a2921"
    },
    empty: {
        fill: "#f8fafc",
        header: "#eef2f6",
        text: "#526173"
    }
};

function buildOverviewDocuments({
    project,
    customer,
    nodes = [],
    nodeArticles = [],
    articles = [],
    getArticleIcon = () => "",
    getArticleDiscountPercent = () => 0,
    labels,
    showPrices = false,
    priceMode = "list"
}) {
    const fullTree =
        buildOverviewTree({
            project,
            customer,
            nodes,
            nodeArticles,
            articles,
            getArticleIcon,
            getArticleDiscountPercent,
            labels
        });
    calculateTreePriceTotals(
        fullTree
    );
    const renderOptions = {
        showArticles: true,
        showPrices,
        priceMode
    };
    const overviewDiagram =
        renderTreeDiagram(
            buildSummaryTree(
                fullTree,
                labels
            ),
            labels,
            "vertical",
            renderOptions
        );
    const detailPages =
        buildDetailPageTrees(
            fullTree
        ).map(page => ({
            ...page,
            diagram:
                renderTreeDiagram(
                    cloneTree(page.root),
                    labels,
                    "vertical",
                    renderOptions
                )
        }));

    return {
        overviewDiagram,
        detailPages,
        printablePages:
            renderPrintablePages({
                overviewDiagram,
                detailPages,
                project,
                labels
            })
    };
}

function openProjectOverview({
    project,
    customer,
    nodes,
    nodeArticles,
    articles,
    getArticleIcon,
    getArticleDiscountPercent,
    labels
}) {
    document
        .querySelector(
            ".project-overview-backdrop"
        )
        ?.remove();

    let showPrices = true;
    let priceMode = "discounted";
    let views;

    const buildViews =
        () => {
            const {
                overviewDiagram,
                printablePages
            } = buildOverviewDocuments({
                project,
                customer,
                nodes,
                nodeArticles,
                articles,
                getArticleIcon,
                getArticleDiscountPercent,
                labels,
                showPrices,
                priceMode
            });

            return {
                overview: {
                    width: overviewDiagram.width,
                    height: overviewDiagram.height,
                    content: overviewDiagram.svg
                },
                details: {
                    width: printPageLayout.width,
                    height:
                        printablePages.pageCount
                        *
                        printPageLayout.height
                        +
                        Math.max(
                            printablePages.pageCount - 1,
                            0
                        )
                        *
                        printPageLayout.gap,
                    content: printablePages.html
                }
            };
        };

    views = buildViews();

    const backdrop =
        document.createElement(
            "div"
        );

    backdrop.className =
        "project-overview-backdrop";

    backdrop.innerHTML = `
        <section
            class="project-overview-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="${escapeXml(labels.title)}"
        >
            <header class="project-overview-header">
                <div class="project-overview-heading">
                    <h2>${escapeXml(labels.title)}</h2>
                    <span>${escapeXml(project?.name ?? "")}</span>
                </div>

                <div class="project-overview-toolbar">
                    <div class="project-overview-view-controls">
                        <button
                            type="button"
                            data-action="view-overview"
                            class="active"
                        >${escapeXml(labels.overviewView)}</button>
                        <button
                            type="button"
                            data-action="view-details"
                        >${escapeXml(labels.detailView)}</button>
                    </div>

                    <div class="project-overview-option-controls">
                        <span>${escapeXml(labels.prices)}</span>
                        <button
                            type="button"
                            data-action="prices-none"
                            class="active"
                            aria-pressed="true"
                        >${escapeXml(labels.withoutPrices)}</button>
                        <button
                            type="button"
                            data-action="prices-show"
                            aria-pressed="false"
                        >${escapeXml(labels.withPrices)}</button>
                    </div>

                    <div class="project-overview-option-controls project-overview-price-mode is-disabled">
                        <span>${escapeXml(labels.priceBasis)}</span>
                        <button
                            type="button"
                            data-action="price-list"
                            class="active"
                            aria-pressed="true"
                        >${escapeXml(labels.listPrices)}</button>
                        <button
                            type="button"
                            data-action="price-discounted"
                            aria-pressed="false"
                        >${escapeXml(labels.discountedPrices)}</button>
                    </div>

                    <div class="project-overview-zoom-controls">
                        <button
                            type="button"
                            data-action="zoom-out"
                            title="${escapeXml(labels.zoomOut)}"
                            aria-label="${escapeXml(labels.zoomOut)}"
                        >−</button>
                        <output data-role="zoom-level">100 %</output>
                        <button
                            type="button"
                            data-action="zoom-in"
                            title="${escapeXml(labels.zoomIn)}"
                            aria-label="${escapeXml(labels.zoomIn)}"
                        >+</button>
                    </div>

                    <button type="button" data-action="fit">
                        ${escapeXml(labels.fit)}
                    </button>
                    <button type="button" data-action="print" class="primary">
                        ${escapeXml(labels.print)}
                    </button>
                    <button
                        type="button"
                        data-action="close"
                        class="icon-only"
                        title="${escapeXml(labels.close)}"
                        aria-label="${escapeXml(labels.close)}"
                    >×</button>
                </div>
            </header>

            <div class="project-overview-hint">
                ${escapeXml(labels.hint)}
            </div>

            <div class="project-overview-viewport">
                <div class="project-overview-stage"></div>
            </div>
        </section>
    `;

    document.body.appendChild(
        backdrop
    );
    document.body.classList.add(
        "project-overview-open"
    );

    const viewport =
        backdrop.querySelector(
            ".project-overview-viewport"
        );
    const stage =
        backdrop.querySelector(
            ".project-overview-stage"
        );
    const zoomOutput =
        backdrop.querySelector(
            "[data-role=\"zoom-level\"]"
        );

    let scale = 1;
    let activeViewName =
        "details";

    const getActiveView =
        () => views[activeViewName];

    const applyScale =
        nextScale => {
            scale = Math.min(
                Math.max(nextScale, 0.08),
                2.5
            );
            const activeView =
                getActiveView();
            stage.style.width =
                `${activeView.width * scale}px`;
            stage.style.height =
                `${activeView.height * scale}px`;
            stage.style.setProperty(
                "--project-overview-scale",
                String(scale)
            );
            zoomOutput.value =
                `${Math.round(scale * 100)} %`;
            zoomOutput.textContent =
                zoomOutput.value;
        };

    const fitDiagram =
        () => {
            const activeView =
                getActiveView();
            const horizontalScale =
                (viewport.clientWidth - 32)
                /
                activeView.width;
            const verticalScale =
                (viewport.clientHeight - 32)
                /
                activeView.height;

            applyScale(
                activeViewName === "details"
                    ? Math.min(
                        horizontalScale,
                        1
                    )
                    : Math.min(
                        horizontalScale,
                        verticalScale,
                        1
                    )
            );

            viewport.scrollLeft = 0;
            viewport.scrollTop = 0;
        };

    const showView =
        viewName => {
            activeViewName =
                viewName;
            const activeView =
                getActiveView();
            stage.innerHTML =
                activeView.content;
            backdrop.dataset.viewMode =
                viewName;
            backdrop
                .querySelectorAll(
                    ".project-overview-view-controls button"
                )
                .forEach(button => {
                    const isActive =
                        button.dataset.action
                        ===
                        `view-${viewName}`;
                    button.classList.toggle(
                        "active",
                        isActive
                    );
                    button.setAttribute(
                        "aria-pressed",
                        String(isActive)
                    );
                });

            window.requestAnimationFrame(
                fitDiagram
            );
        };

    const syncPriceControls =
        () => {
            const priceModeControls =
                backdrop.querySelector(
                    ".project-overview-price-mode"
                );

            backdrop
                .querySelectorAll(
                    "[data-action=\"prices-none\"], [data-action=\"prices-show\"]"
                )
                .forEach(button => {
                    const isActive =
                        button.dataset.action
                        ===
                        (showPrices
                            ? "prices-show"
                            : "prices-none");
                    button.classList.toggle(
                        "active",
                        isActive
                    );
                    button.setAttribute(
                        "aria-pressed",
                        String(isActive)
                    );
                });

            priceModeControls.classList.toggle(
                "is-disabled",
                !showPrices
            );
            priceModeControls
                .querySelectorAll(
                    "button"
                )
                .forEach(button => {
                    const isActive =
                        button.dataset.action
                        ===
                        (priceMode === "discounted"
                            ? "price-discounted"
                            : "price-list");
                    button.disabled =
                        !showPrices;
                    button.classList.toggle(
                        "active",
                        isActive
                    );
                    button.setAttribute(
                        "aria-pressed",
                        String(isActive)
                    );
                });
        };

    const rebuildPriceView =
        () => {
            views = buildViews();
            syncPriceControls();
            showView(activeViewName);
        };

    const close =
        () => {
            document.removeEventListener(
                "keydown",
                handleKeydown
            );
            document.body.classList.remove(
                "project-overview-open"
            );
            backdrop.remove();
        };

    const handleKeydown =
        event => {
            if (event.key === "Escape") {
                close();
            }
        };

    backdrop.addEventListener(
        "click",
        event => {
            const action =
                event.target.closest(
                    "[data-action]"
                )?.dataset.action;

            if (action === "close") {
                close();
            } else if (action === "zoom-in") {
                applyScale(scale + 0.1);
            } else if (action === "zoom-out") {
                applyScale(scale - 0.1);
            } else if (action === "fit") {
                fitDiagram();
            } else if (action === "view-overview") {
                showView("overview");
            } else if (action === "view-details") {
                showView("details");
            } else if (action === "prices-none") {
                showPrices = false;
                rebuildPriceView();
            } else if (action === "prices-show") {
                showPrices = true;
                rebuildPriceView();
            } else if (
                action === "price-list"
                &&
                showPrices
            ) {
                priceMode = "list";
                rebuildPriceView();
            } else if (
                action === "price-discounted"
                &&
                showPrices
            ) {
                priceMode = "discounted";
                rebuildPriceView();
            } else if (action === "print") {
                const previousTitle =
                    document.title;
                document.title =
                    `${project?.name ?? labels.title} - ${labels.title}`;
                window.print();
                document.title =
                    previousTitle;
            } else if (event.target === backdrop) {
                close();
            }
        }
    );

    viewport.addEventListener(
        "wheel",
        event => {
            if (!event.ctrlKey) {
                return;
            }

            event.preventDefault();
            applyScale(
                scale
                +
                (event.deltaY < 0 ? 0.1 : -0.1)
            );
        },
        {
            passive: false
        }
    );

    registerViewportPanning(
        viewport
    );
    document.addEventListener(
        "keydown",
        handleKeydown
    );

    syncPriceControls();
    showView("details");
}

function registerViewportPanning(
    viewport
) {
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let activePointerId = null;

    viewport.addEventListener(
        "pointerdown",
        event => {
            if (event.button !== 0) {
                return;
            }

            activePointerId =
                event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            startScrollLeft =
                viewport.scrollLeft;
            startScrollTop =
                viewport.scrollTop;
            viewport.classList.add(
                "is-panning"
            );
            viewport.setPointerCapture(
                event.pointerId
            );
        }
    );

    viewport.addEventListener(
        "pointermove",
        event => {
            if (
                activePointerId
                !==
                event.pointerId
            ) {
                return;
            }

            viewport.scrollLeft =
                startScrollLeft
                -
                (event.clientX - startX);
            viewport.scrollTop =
                startScrollTop
                -
                (event.clientY - startY);
        }
    );

    const stopPanning =
        event => {
            if (
                activePointerId
                !==
                event.pointerId
            ) {
                return;
            }

            activePointerId = null;
            viewport.classList.remove(
                "is-panning"
            );
        };

    viewport.addEventListener(
        "pointerup",
        stopPanning
    );
    viewport.addEventListener(
        "pointercancel",
        stopPanning
    );
}

function buildOverviewDiagram({
    project,
    customer,
    nodes = [],
    nodeArticles = [],
    articles = [],
    getArticleIcon = () => "",
    getArticleDiscountPercent = () => 0,
    labels,
    orientation = "vertical",
    showArticles = true,
    showPrices = false,
    priceMode = "list"
}) {
    const root =
        buildOverviewTree({
            project,
            customer,
            nodes,
            nodeArticles,
            articles,
            getArticleIcon,
            getArticleDiscountPercent,
            labels
        });
    calculateTreePriceTotals(root);

    return renderTreeDiagram(
        root,
        labels,
        orientation,
        {
            showArticles,
            showPrices,
            priceMode
        }
    );
}

function buildOverviewTree({
    project,
    customer,
    nodes,
    nodeArticles,
    articles,
    getArticleIcon,
    getArticleDiscountPercent,
    labels
}) {
    const articleByNumber =
        new Map(
            articles.map(article => [
                String(article.articleNumber),
                article
            ])
        );
    const nodeIds =
        new Set(
            nodes.map(node =>
                String(node.id)
            )
        );
    const articlesByNode =
        new Map();
    const childrenByParent =
        new Map();

    nodeArticles.forEach(nodeArticle => {
        const nodeId =
            String(nodeArticle.projectNodeId);

        if (!nodeIds.has(nodeId)) {
            return;
        }

        if (!articlesByNode.has(nodeId)) {
            articlesByNode.set(
                nodeId,
                []
            );
        }

        const article =
            articleByNumber.get(
                String(nodeArticle.articleNumber)
            )
            ??
            {};

        articlesByNode.get(nodeId).push({
            articleNumber:
                nodeArticle.articleNumber,
            name:
                nodeArticle.positionName
                ||
                article.manufacturerType
                ||
                nodeArticle.articleNumber,
            quantity:
                Number(nodeArticle.quantity) || 1,
            icon:
                getArticleIcon(article),
            listTotal:
                (Number(article.listPrice) || 0)
                *
                (Number(nodeArticle.quantity) || 1),
            discountedTotal:
                calculateStructureUnitPrice({
                    listPrice:
                        article.listPrice,
                    customerDiscountPercent:
                        getArticleDiscountPercent(
                            article,
                            customer
                        ),
                    projectDiscountPercent:
                        project?.projectDiscount,
                    priceMode:
                        "discounted"
                })
                *
                (Number(nodeArticle.quantity) || 1),
            isOptional:
                Boolean(nodeArticle.isOptional),
            isAlternative:
                Boolean(nodeArticle.isAlternative),
            sortOrder:
                nodeArticle.sortOrder,
            id:
                nodeArticle.id
        });
    });

    nodes.forEach(node => {
        const parentKey =
            node.parentId === null
            ||
            !nodeIds.has(String(node.parentId))
                ? "root"
                : String(node.parentId);

        if (!childrenByParent.has(parentKey)) {
            childrenByParent.set(
                parentKey,
                []
            );
        }

        childrenByParent.get(parentKey).push(node);
    });

    childrenByParent.forEach(children =>
        children.sort(compareOrder)
    );
    articlesByNode.forEach(items =>
        items.sort(compareOrder)
    );

    const makeNode =
        node => ({
            id: String(node.id),
            type: node.type,
            typeLabel:
                labels.nodeTypes[node.type]
                ??
                node.type,
            name: node.name ?? "",
            meta: "",
            articles:
                articlesByNode.get(
                    String(node.id)
                )
                ??
                [],
            children:
                (
                    childrenByParent.get(
                        String(node.id)
                    )
                    ??
                    []
                ).map(makeNode)
        });

    const rootChildren =
        (
            childrenByParent.get("root")
            ??
            []
        ).map(makeNode);

    if (rootChildren.length === 0) {
        rootChildren.push({
            id: "empty",
            type: "empty",
            typeLabel: labels.empty,
            name: labels.noStructure,
            meta: "",
            articles: [],
            children: []
        });
    }

    return {
        id: "project",
        type: "project",
        typeLabel: labels.project,
        name: project?.name ?? "",
        meta:
            customer?.name
            ??
            "",
        articles: [],
        children: rootChildren
    };
}

function buildSummaryTree(
    root,
    labels
) {
    const cloneSummaryNode =
        node => {
            const isSummaryBoundary =
                node.type === "panel"
                ||
                node.type === "generalPosition"
                ||
                node.type === "empty";
            const stats =
                getTreeStats(node);

            return {
                id: node.id,
                type: node.type,
                typeLabel: node.typeLabel,
                name: node.name,
                meta:
                    node.type === "project"
                        ? node.meta
                        : formatTreeStats(
                            stats,
                            labels
                        ),
                articles: [],
                listTotal: node.listTotal,
                discountedTotal: node.discountedTotal,
                children:
                    isSummaryBoundary
                        ? []
                        : node.children.map(
                            cloneSummaryNode
                        )
            };
        };

    return cloneSummaryNode(root);
}

function calculateTreePriceTotals(
    node
) {
    const ownTotals =
        node.articles.reduce(
            (totals, article) => {

                if (article.isOptional || article.isAlternative) {

                    return totals;

                }

                return {
                    list:
                        totals.list
                        +
                        article.listTotal,
                    discounted:
                        totals.discounted
                        +
                        article.discountedTotal
                };

            },
            {
                list: 0,
                discounted: 0
            }
        );
    const childTotals =
        node.children.reduce(
            (totals, child) => {
                calculateTreePriceTotals(child);

                return {
                    list:
                        totals.list
                        +
                        child.listTotal,
                    discounted:
                        totals.discounted
                        +
                        child.discountedTotal
                };
            },
            {
                list: 0,
                discounted: 0
            }
        );

    node.listTotal =
        ownTotals.list
        +
        childTotals.list;
    node.discountedTotal =
        ownTotals.discounted
        +
        childTotals.discounted;
}

function getTreeStats(
    root
) {
    const stats = {
        fields: 0,
        meters: 0,
        positions: 0
    };

    const visit =
        node => {
            if (node.type === "field") {
                stats.fields++;
            } else if (node.type === "meter") {
                stats.meters++;
            }

            stats.positions +=
                node.articles.length;
            node.children.forEach(visit);
        };

    visit(root);
    return stats;
}

function formatTreeStats(
    stats,
    labels
) {
    const parts = [];

    if (stats.fields > 0) {
        parts.push(
            `${stats.fields} ${labels.summaryFields}`
        );
    }

    if (stats.meters > 0) {
        parts.push(
            `${stats.meters} ${labels.summaryMeters}`
        );
    }

    if (stats.positions > 0) {
        parts.push(
            `${stats.positions} ${labels.summaryPositions}`
        );
    }

    return parts.join(" · ");
}

function buildDetailPageTrees(
    root
) {
    const pages = [];

    const addPage =
        (
            node,
            path
        ) => {
            pages.push({
                root: node,
                title:
                    `${node.typeLabel}: ${node.name}`,
                breadcrumb:
                    path
                        .map(item => item.name)
                        .filter(Boolean)
                        .join(" › ")
            });
        };

    const visit =
        (
            node,
            path
        ) => {
            const nextPath = [
                ...path,
                node
            ];

            if (
                node.type === "panel"
                ||
                node.type === "generalPosition"
            ) {
                addPage(
                    node,
                    nextPath
                );
                return;
            }

            if (node.type === "building") {
                const hasPanel =
                    containsNodeType(
                        node,
                        "panel"
                    );

                if (!hasPanel) {
                    addPage(
                        node,
                        nextPath
                    );
                    return;
                }
            }

            if (
                node.type !== "building"
                &&
                node.type !== "empty"
            ) {
                addPage(
                    node,
                    nextPath
                );
                return;
            }

            node.children.forEach(child =>
                visit(
                    child,
                    nextPath
                )
            );
        };

    root.children.forEach(child =>
        visit(
            child,
            [root]
        )
    );

    return pages;
}

function containsNodeType(
    root,
    type
) {
    return root.children.some(child =>
        child.type === type
        ||
        containsNodeType(
            child,
            type
        )
    );
}

function cloneTree(
    node
) {
    return {
        ...node,
        articles:
            node.articles.map(article => ({
                ...article
            })),
        children:
            node.children.map(cloneTree)
    };
}

function renderPrintablePages({
    overviewDiagram,
    detailPages,
    project,
    labels
}) {
    const pages = [
        {
            title: labels.overviewView,
            breadcrumb:
                project?.name ?? "",
            diagram: overviewDiagram
        },
        ...detailPages
    ];

    return {
        pageCount: pages.length,
        html: `
            <div class="project-overview-print-pages">
                ${pages.map((page, index) => `
                    <section class="project-overview-print-page">
                        <header>
                            <div>
                                <h3>${escapeXml(page.title)}</h3>
                                <p>${escapeXml(page.breadcrumb)}</p>
                            </div>
                            <span>
                                ${escapeXml(labels.page)} ${index + 1} / ${pages.length}
                            </span>
                        </header>
                        <div class="project-overview-print-diagram">
                            ${page.diagram.svg}
                        </div>
                    </section>
                `).join("")}
            </div>
        `
    };
}

function compareOrder(
    first,
    second
) {
    const firstOrder =
        Number.isFinite(Number(first.sortOrder))
            ? Number(first.sortOrder)
            : Number(first.id) || 0;
    const secondOrder =
        Number.isFinite(Number(second.sortOrder))
            ? Number(second.sortOrder)
            : Number(second.id) || 0;

    return firstOrder - secondOrder;
}

function getCardHeight(
    node,
    options
) {
    if (node.type === "project") {
        return (node.meta ? 86 : 70)
            +
            (options.showPrices ? 24 : 0);
    }

    return diagramLayout.nodeHeaderHeight
        +
        (node.meta ? 22 : 0)
        +
        (options.showPrices ? 24 : 0)
        +
        (options.showArticles
            ? node.articles.length
            : 0)
        *
        diagramLayout.articleHeight
        +
        (
            options.showArticles
            &&
            node.articles.length > 0
                ? 8
                : 0
        );
}

function collectDiagramNodes(
    node,
    collection
) {
    collection.push(node);
    node.children.forEach(child =>
        collectDiagramNodes(
            child,
            collection
        )
    );
}

function renderTreeDiagram(
    root,
    labels,
    orientation = "vertical",
    options = {}
) {
    const renderOptions = {
        showArticles:
            options.showArticles !== false,
        showPrices:
            options.showPrices === true,
        priceMode:
            options.priceMode === "discounted"
                ? "discounted"
                : "list",
        priceLabel:
            labels.price
    };
    const allNodes = [];
    collectDiagramNodes(
        root,
        allNodes
    );
    allNodes.forEach(node => {
        node.height =
            getCardHeight(
                node,
                renderOptions
            );
    });

    const dimensions =
        orientation === "horizontal"
            ? layoutHorizontalTree(root)
            : layoutVerticalTree(root);
    const connectors = [];
    const cards = [];

    allNodes.forEach(node => {
        node.children.forEach(child => {
            connectors.push(
                renderConnector(
                    node,
                    child,
                    orientation
                )
            );
        });
        cards.push(
            renderDiagramCard(
                node,
                renderOptions
            )
        );
    });

    return {
        ...dimensions,
        svg: `
            <svg
                class="project-overview-svg"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 ${dimensions.width} ${dimensions.height}"
                width="${dimensions.width}"
                height="${dimensions.height}"
                role="img"
                aria-label="${escapeXml(labels.title)}"
            >
                <rect width="100%" height="100%" fill="#f7f9fc" />
                <g class="project-overview-connectors">
                    ${connectors.join("")}
                </g>
                <g class="project-overview-cards">
                    ${cards.join("")}
                </g>
            </svg>
        `
    };
}

function layoutVerticalTree(
    root
) {
    const depthHeights = [];

    const measure =
        (
            node,
            depth
        ) => {
            node.depth = depth;
            depthHeights[depth] =
                Math.max(
                    depthHeights[depth] ?? 0,
                    node.height
                );

            const childrenWidth =
                node.children.reduce(
                    (sum, child, index) =>
                        sum
                        +
                        measure(
                            child,
                            depth + 1
                        )
                        +
                        (index > 0
                            ? diagramLayout.verticalGap
                            : 0),
                    0
                );

            node.childrenWidth =
                childrenWidth;
            node.subtreeWidth =
                Math.max(
                    diagramLayout.cardWidth,
                    childrenWidth
                );

            return node.subtreeWidth;
        };

    measure(root, 0);

    const depthTops = [];
    let nextTop =
        diagramLayout.margin;

    depthHeights.forEach((height, depth) => {
        depthTops[depth] =
            nextTop;
        nextTop +=
            height
            +
            (depth < depthHeights.length - 1
                ? diagramLayout.horizontalGap
                : 0);
    });

    const place =
        (
            node,
            left
        ) => {
            node.x =
                left
                +
                (node.subtreeWidth - diagramLayout.cardWidth) / 2;
            node.y =
                depthTops[node.depth];

            let childLeft =
                left
                +
                (node.subtreeWidth - node.childrenWidth) / 2;

            node.children.forEach(child => {
                place(
                    child,
                    childLeft
                );
                childLeft +=
                    child.subtreeWidth
                    +
                    diagramLayout.verticalGap;
            });
        };

    place(
        root,
        diagramLayout.margin
    );

    return {
        width:
            Math.max(
                root.subtreeWidth
                +
                diagramLayout.margin * 2,
                420
            ),
        height:
            Math.max(
                nextTop
                +
                diagramLayout.margin,
                220
            )
    };
}

function layoutHorizontalTree(
    root
) {
    const measure =
        (
            node,
            depth
        ) => {
            node.depth = depth;
            const childrenHeight =
                node.children.reduce(
                    (sum, child, index) =>
                        sum
                        +
                        measure(
                            child,
                            depth + 1
                        )
                        +
                        (index > 0
                            ? diagramLayout.verticalGap
                            : 0),
                    0
                );
            node.childrenHeight =
                childrenHeight;
            node.subtreeHeight =
                Math.max(
                    node.height,
                    childrenHeight
                );

            return node.subtreeHeight;
        };

    measure(root, 0);

    const place =
        (
            node,
            top
        ) => {
            node.x =
                diagramLayout.margin
                +
                node.depth
                *
                (
                    diagramLayout.cardWidth
                    +
                    diagramLayout.horizontalGap
                );
            node.y =
                top
                +
                (node.subtreeHeight - node.height) / 2;

            let childTop =
                top
                +
                (node.subtreeHeight - node.childrenHeight) / 2;

            node.children.forEach(child => {
                place(
                    child,
                    childTop
                );
                childTop +=
                    child.subtreeHeight
                    +
                    diagramLayout.verticalGap;
            });
        };

    place(
        root,
        diagramLayout.margin
    );

    const allNodes = [];
    collectDiagramNodes(
        root,
        allNodes
    );
    const maxDepth =
        allNodes.reduce(
            (maximum, node) =>
                Math.max(maximum, node.depth),
            0
        );

    return {
        width:
            diagramLayout.margin * 2
            +
            (maxDepth + 1) * diagramLayout.cardWidth
            +
            maxDepth * diagramLayout.horizontalGap,
        height:
            Math.max(
                root.subtreeHeight
                +
                diagramLayout.margin * 2,
                220
            )
    };
}

function renderConnector(
    parent,
    child,
    orientation
) {
    if (orientation === "vertical") {
        const startX =
            parent.x
            +
            diagramLayout.cardWidth / 2;
        const startY =
            parent.y
            +
            parent.height;
        const endX =
            child.x
            +
            diagramLayout.cardWidth / 2;
        const endY = child.y;
        const middleY =
            startY
            +
            (endY - startY) / 2;

        return `
            <path
                d="M ${startX} ${startY} V ${middleY} H ${endX} V ${endY}"
                fill="none"
                stroke="#8da2bd"
                stroke-width="2"
                stroke-linejoin="round"
            />
            <circle cx="${endX}" cy="${endY}" r="4" fill="#4c8bf5" />
        `;
    }

    const startX =
        parent.x
        +
        diagramLayout.cardWidth;
    const startY =
        parent.y
        +
        parent.height / 2;
    const endX = child.x;
    const endY =
        child.y
        +
        child.height / 2;
    const middleX =
        startX
        +
        (endX - startX) / 2;

    return `
        <path
            d="M ${startX} ${startY} H ${middleX} V ${endY} H ${endX}"
            fill="none"
            stroke="#8da2bd"
            stroke-width="2"
            stroke-linejoin="round"
        />
        <circle cx="${endX}" cy="${endY}" r="4" fill="#4c8bf5" />
    `;
}

function renderDiagramCard(
    node,
    options
) {
    const colors =
        nodeColors[node.type]
        ??
        nodeColors.empty;
    const cardWidth =
        diagramLayout.cardWidth;
    const titleLines =
        wrapText(
            node.name,
            28,
            2
        );

    if (node.type === "project") {
        return `
            <g class="project-overview-card" data-type="project">
                <rect
                    x="${node.x}"
                    y="${node.y}"
                    width="${cardWidth}"
                    height="${node.height}"
                    rx="12"
                    fill="${colors.fill}"
                    stroke="#15263d"
                    stroke-width="2"
                />
                <text
                    x="${node.x + 16}"
                    y="${node.y + 23}"
                    fill="#bcd0ea"
                    font-family="Arial, sans-serif"
                    font-size="12"
                    font-weight="700"
                >${escapeXml(node.typeLabel)}</text>
                <text
                    x="${node.x + 16}"
                    y="${node.y + 48}"
                    fill="#ffffff"
                    font-family="Arial, sans-serif"
                    font-size="17"
                    font-weight="700"
                >${escapeXml(truncateText(node.name, 30))}</text>
                ${node.meta ? `
                    <text
                        x="${node.x + 16}"
                        y="${node.y + 70}"
                        fill="#dbe7f5"
                        font-family="Arial, sans-serif"
                        font-size="12"
                    >${escapeXml(truncateText(node.meta, 38))}</text>
                ` : ""}
                ${renderDiagramPrice(
                    node,
                    options,
                    node.x + 16,
                    node.y + (node.meta ? 96 : 76),
                    "#ffffff"
                )}
            </g>
        `;
    }

    return `
        <g class="project-overview-card" data-type="${escapeXml(node.type)}">
            <rect
                x="${node.x}"
                y="${node.y}"
                width="${cardWidth}"
                height="${node.height}"
                rx="10"
                fill="${colors.fill}"
                stroke="#b8c6d8"
                stroke-width="1.5"
            />
            <path
                d="M ${node.x + 10} ${node.y}
                   H ${node.x + cardWidth - 10}
                   Q ${node.x + cardWidth} ${node.y} ${node.x + cardWidth} ${node.y + 10}
                   V ${node.y + diagramLayout.nodeHeaderHeight}
                   H ${node.x}
                   V ${node.y + 10}
                   Q ${node.x} ${node.y} ${node.x + 10} ${node.y} Z"
                fill="${colors.header}"
            />
            <text
                x="${node.x + 14}"
                y="${node.y + 20}"
                fill="${colors.text}"
                font-family="Arial, sans-serif"
                font-size="11"
                font-weight="700"
                letter-spacing="0.5"
            >${escapeXml(node.typeLabel.toUpperCase())}</text>
            <text
                x="${node.x + 14}"
                y="${node.y + 45}"
                fill="#17283f"
                font-family="Arial, sans-serif"
                font-size="15"
                font-weight="700"
            >${renderTextLines(
                titleLines,
                node.x + 14,
                18
            )}</text>
            ${node.meta ? `
                <text
                    x="${node.x + 14}"
                    y="${node.y + diagramLayout.nodeHeaderHeight + 16}"
                    fill="#65758a"
                    font-family="Arial, sans-serif"
                    font-size="10.5"
                >${escapeXml(truncateText(node.meta, 40))}</text>
            ` : ""}
            ${renderDiagramPrice(
                node,
                options,
                node.x + 14,
                node.y + node.height - 8,
                "#26384f"
            )}
            ${options.showArticles
                ? node.articles.map((article, index) =>
                    renderDiagramArticle(
                        node,
                        article,
                        index
                    )
                ).join("")
                : ""}
        </g>
    `;
}

function renderDiagramPrice(
    node,
    options,
    x,
    y,
    color
) {
    if (!options.showPrices) {
        return "";
    }

    const isDiscounted =
        options.priceMode === "discounted";
    const value =
        isDiscounted
            ? node.discountedTotal
            : node.listTotal;

    return `
        <text
            x="${x}"
            y="${y}"
            fill="${color}"
            font-family="Arial, sans-serif"
            font-size="11.5"
            font-weight="700"
        >${escapeXml(options.priceLabel)}: ${escapeXml(formatDiagramCurrency(value))}</text>
    `;
}

function renderDiagramArticle(
    node,
    article,
    index
) {
    const markers = [
        article.isOptional ? "OPTIONAL" : "",
        article.isAlternative ? "ALTERNATIV" : ""
    ].filter(Boolean);
    const displayName =
        markers.length > 0
            ? `[${markers.join(" / ")}] ${article.name}`
            : article.name;
    const textColor =
        markers.length > 0
            ? "#9a6700"
            : "#26384f";
    const top =
        node.y
        +
        diagramLayout.nodeHeaderHeight
        +
        7
        +
        (node.meta ? 22 : 0)
        +
        index * diagramLayout.articleHeight;
    const icon =
        article.icon
            ? `
                <image
                    href="${escapeXml(article.icon)}"
                    x="${node.x + 12}"
                    y="${top + 2}"
                    width="24"
                    height="24"
                    preserveAspectRatio="xMidYMid meet"
                />
            `
            : "";

    return `
        ${index > 0 ? `
            <line
                x1="${node.x + 12}"
                y1="${top - 4}"
                x2="${node.x + diagramLayout.cardWidth - 12}"
                y2="${top - 4}"
                stroke="#dce3ec"
            />
        ` : ""}
        ${icon}
        <text
            x="${node.x + 44}"
            y="${top + 12}"
            fill="${textColor}"
            font-family="Arial, sans-serif"
            font-size="11.5"
            font-weight="700"
        >${escapeXml(truncateText(displayName, 29))}</text>
        <text
            x="${node.x + 44}"
            y="${top + 27}"
            fill="#69788b"
            font-family="Arial, sans-serif"
            font-size="10.5"
        >${escapeXml(`${article.quantity} × ${article.articleNumber}`)}</text>
    `;
}

function wrapText(
    value,
    maximumCharacters,
    maximumLines
) {
    const words =
        String(value ?? "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    const lines = [];

    words.forEach(word => {
        const currentLine =
            lines[lines.length - 1];
        const candidate =
            currentLine
                ? `${currentLine} ${word}`
                : word;

        if (!currentLine) {
            lines.push(
                truncateText(
                    word,
                    maximumCharacters
                )
            );
            return;
        }

        if (candidate.length <= maximumCharacters) {
            if (currentLine) {
                lines[lines.length - 1] =
                    candidate;
            }
            return;
        }

        if (lines.length < maximumLines) {
            lines.push(
                truncateText(
                    word,
                    maximumCharacters
                )
            );
        } else {
            lines[maximumLines - 1] =
                truncateText(
                    `${lines[maximumLines - 1]} ${word}`,
                    maximumCharacters
                );
        }
    });

    return lines.length > 0
        ? lines.slice(0, maximumLines)
        : [""];
}

function renderTextLines(
    lines,
    x,
    lineHeight
) {
    return lines.map((line, index) => `
        <tspan
            x="${x}"
            dy="${index === 0 ? 0 : lineHeight}"
        >${escapeXml(line)}</tspan>
    `).join("");
}

function formatDiagramCurrency(
    value
) {
    return `${Number(value || 0).toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} €`;
}

function truncateText(
    value,
    maximumLength
) {
    const text =
        String(value ?? "");

    return text.length > maximumLength
        ? `${text.slice(0, maximumLength - 1)}…`
        : text;
}

function escapeXml(
    value
) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&apos;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export {
    buildOverviewDiagram,
    buildOverviewDocuments,
    openProjectOverview
};
