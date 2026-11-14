import {
    calculateStructureUnitPrice
} from "./projectPricing.js";

const diagramLayout = {
    cardWidth: 270,
    horizontalGap: 90,
    verticalGap: 26,
    margin: 40,
    nodeHeaderHeight: 78,
    articleHeight: 36,
    articleLabelColumnWidth: 86
};

const detailPageLayout = {
    maxMetersPerRow: 6
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

const defaultOverviewColors = {
    project: { fill: "#3D557B", header: "#2C3A5C", text: "#ffffff" },
    building: { fill: "#D8E7F0", header: "#4F7191", text: "#173A52" },
    generalPosition: { fill: "#E1E9F2", header: "#687F9D", text: "#26384F" },
    panel: { fill: "#DCEDEA", header: "#578986", text: "#184B4B" },
    field: { fill: "#E8F0E5", header: "#819B77", text: "#2F4A37" },
    meter: { fill: "#F3EBDD", header: "#B18A55", text: "#5B4120" },
    article: { fill: "transparent", header: "transparent", text: "#493C5E" },
    empty: { fill: "#FAFBFC", header: "#E7ECF1", text: "#526173" }
};

function parseOverviewColors(value) {

    let colors = value;

    if (typeof value === "string") {
        try {
            colors = JSON.parse(value);
        } catch {
            colors = {};
        }
    }

    const isColor = color =>
        /^#[0-9a-f]{6}$/i.test(String(color ?? ""));
    const isSurfaceColor = color =>
        isColor(color)
        ||
        String(color ?? "").toLowerCase() === "transparent";

    return Object.fromEntries(
        Object.entries(defaultOverviewColors).map(([type, defaults]) => [
            type,
            {
                ...defaults,
                ...(isSurfaceColor(colors?.[type]?.fill)
                    ? { fill: colors[type].fill }
                    : {}),
                ...(isSurfaceColor(colors?.[type]?.header)
                    ? { header: colors[type].header }
                    : {}),
                ...(isColor(colors?.[type]?.text)
                    ? { text: colors[type].text }
                    : {})
            }
        ])
    );

}

function buildOverviewDocuments({
    project,
    customer,
    nodes = [],
    nodeArticles = [],
    articles = [],
    getArticleIcon = () => "",
    getArticleDiscountPercent = () => 0,
    labels,
    nodeLabels = [],
    nodeLabelSettings = [],
    articleLabels = [],
    articleLabelSettings = [],
    articleLabelHidden = [],
    overviewColors = {},
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
            labels,
            nodeLabels,
            nodeLabelSettings,
            articleLabels,
            articleLabelSettings,
            articleLabelHidden
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
            {
                ...renderOptions,
                overviewColors
            }
        );
    const detailPages =
        buildDetailPageTrees(
            fullTree,
            labels
        ).map(page => ({
            ...page,
            diagram:
                renderTreeDiagram(
                    cloneTree(page.root),
                    labels,
                    "vertical",
                    {
                        ...renderOptions,
                        overviewColors
                    }
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
                labels,
                overviewColors
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
    labels,
    nodeLabels = [],
    nodeLabelSettings = [],
    articleLabels = [],
    articleLabelSettings = [],
    articleLabelHidden = [],
    onSaveOverviewColors = async () => {}
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
                nodeLabels,
                nodeLabelSettings,
                articleLabels,
                articleLabelSettings,
                articleLabelHidden,
                showPrices,
                priceMode,
                overviewColors: parseOverviewColors(project?.overviewColors)
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
                    <button type="button" data-action="overview-colors">
                        ${escapeXml(labels.levelColors)}
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

    const openColors =
        async () => {
            const colors = await openOverviewColorsModal(
                parseOverviewColors(project?.overviewColors),
                labels
            );
            if (!colors) {
                return;
            }
            await onSaveOverviewColors(colors);
            project.overviewColors = JSON.stringify(colors);
            views = buildViews();
            showView(backdrop.dataset.viewMode || "overview");
        };

    backdrop
        .querySelector(
            "[data-action=\"overview-colors\"]"
        )
        .addEventListener(
            "click",
            openColors
        );

    backdrop.addEventListener(
        "click",
        async event => {
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
    priceMode = "list",
    nodeLabels = [],
    nodeLabelSettings = [],
    articleLabels = [],
    articleLabelSettings = [],
    articleLabelHidden = [],
    overviewColors = {}
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
            labels,
            nodeLabels,
            nodeLabelSettings,
            articleLabels,
            articleLabelSettings,
            articleLabelHidden
        });
    calculateTreePriceTotals(root);

    return renderTreeDiagram(
        root,
        labels,
        orientation,
        {
            showArticles,
            showPrices,
            priceMode,
            overviewColors
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
    labels,
    nodeLabels = [],
    nodeLabelSettings = [],
    articleLabels = [],
    articleLabelSettings = [],
    articleLabelHidden = []
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
    const labelsByNodeId =
        new Map();

    nodeLabels.forEach(label => {
        const nodeId = String(label.projectNodeId ?? label.nodeId ?? "");
        if (!nodeId) {
            return;
        }
        if (!labelsByNodeId.has(nodeId)) {
            labelsByNodeId.set(nodeId, []);
        }
        labelsByNodeId.get(nodeId).push({
            text: String(label.text ?? "").trim().slice(0, 24),
            color: /^#[0-9a-f]{6}$/i.test(String(label.color ?? ""))
                ? String(label.color).toLowerCase()
                : "#2f6fb4",
            side: label.side === "right" ? "right" : "left",
            sortOrder: Number(label.sortOrder) || 0,
            isInherited: Boolean(label.isInherited),
            sourceProjectNodeLabelId: label.sourceProjectNodeLabelId ?? label.id
        });
    });
    labelsByNodeId.forEach(items => items.sort(compareOrder));

    const nodeLabelSettingsById = new Map(
        nodeLabelSettings.map(setting => [
            String(setting.projectNodeId ?? setting.nodeId),
            setting
        ])
    );

    const labelsByArticleId =
        new Map();

    articleLabels.forEach(label => {
        const articleId = String(label.projectNodeArticleId ?? label.articleId ?? "");
        if (!articleId) {
            return;
        }
        if (!labelsByArticleId.has(articleId)) {
            labelsByArticleId.set(articleId, []);
        }
        labelsByArticleId.get(articleId).push({
            text: String(label.text ?? "").trim().slice(0, 24),
            color: /^#[0-9a-f]{6}$/i.test(String(label.color ?? ""))
                ? String(label.color).toLowerCase()
                : "#2f6fb4",
            side: label.side === "right" ? "right" : "left",
            sortOrder: Number(label.sortOrder) || 0,
            isInherited: Boolean(label.isInherited),
            sourceProjectNodeLabelId: label.sourceProjectNodeLabelId
        });
    });
    labelsByArticleId.forEach(items => items.sort(compareOrder));

    const articleLabelSettingsById = new Map(
        articleLabelSettings.map(setting => [
            String(setting.projectNodeArticleId ?? setting.articleId),
            setting
        ])
    );
    const articleHiddenLabelsById = new Map();
    articleLabelHidden.forEach(item => {
        const articleId = String(item.projectNodeArticleId ?? item.articleId);
        if (!articleHiddenLabelsById.has(articleId)) {
            articleHiddenLabelsById.set(articleId, new Set());
        }
        articleHiddenLabelsById.get(articleId).add(
            String(item.sourceProjectNodeLabelId ?? item.sourceLabelId)
        );
    });

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
                            customer,
                            nodeArticle
                        ),
                    projectDiscountPercent:
                        project?.projectDiscount,
                    specialPrice:
                        nodeArticle.specialPrice === null
                        || nodeArticle.specialPrice === undefined
                        || String(nodeArticle.specialPrice).trim() === ""
                            ? null
                            : Number(
                                String(nodeArticle.specialPrice)
                                    .replace(",", ".")
                            ),
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
                nodeArticle.id,
            labels: (() => {
                const articleId = String(nodeArticle.id);
                const articleSettings = articleLabelSettingsById.get(articleId);
                const inheritsFromParent = articleSettings == null
                    || (articleSettings.inheritFromParent !== 0 && articleSettings.inheritFromParent !== false);
                const hiddenIds = articleHiddenLabelsById.get(articleId) ?? new Set();
                const nodeSettings = nodeLabelSettingsById.get(nodeId);
                const nodeAllowsInheritance = nodeSettings == null
                    || (nodeSettings.inheritToChildren !== 0 && nodeSettings.inheritToChildren !== false);
                const inherited = inheritsFromParent && nodeAllowsInheritance
                    ? (labelsByNodeId.get(nodeId) ?? [])
                        .filter(label => !hiddenIds.has(String(label.sourceProjectNodeLabelId)))
                        .map(label => ({ ...label, isInherited: true }))
                    : [];
                return [
                    ...inherited,
                    ...(labelsByArticleId.get(articleId) ?? [])
                ];
            })()
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
            labels:
                labelsByNodeId.get(String(node.id)) ?? [],
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
            labels: [],
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
                labels: node.labels ?? [],
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
    root,
    labels = {}
) {
    const pages = [];

    const addPage =
        (
            node,
            path,
            titleSuffix = ""
        ) => {
            pages.push({
                root: node,
                title:
                    `${node.typeLabel}: ${node.name}${titleSuffix ? ` – ${titleSuffix}` : ""}`,
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

            if (node.type === "field") {
                addPage(
                    node,
                    nextPath
                );
                return;
            }

            if (
                node.type === "panel"
                ||
                node.type === "generalPosition"
            ) {
                const fields =
                    node.children.filter(child =>
                        child.type === "field"
                    );
                const directChildren =
                    node.children.filter(child =>
                        child.type !== "field"
                    );

                if (fields.length > 0) {

                    addPage(
                        buildPanelOverviewNode(
                            node,
                            labels
                        ),
                        nextPath,
                        labels.distributionOverview
                            ??
                            "Verteilungsübersicht"
                    );

                    if (
                        node.articles.length > 0
                        ||
                        directChildren.length > 0
                    ) {

                        addPage(
                            {
                                ...node,
                                children: directChildren
                            },
                            nextPath,
                            labels.directContent
                                ??
                                "Direkte Inhalte"
                        );

                    }

                    fields.forEach(child =>
                        visit(
                            child,
                            nextPath
                        )
                    );
                } else {
                    addPage(
                        node,
                        nextPath
                    );
                }
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

                const directChildren =
                    node.children.filter(child =>
                        child.type !== "panel"
                    );

                if (
                    node.articles.length > 0
                    ||
                    directChildren.length > 0
                ) {

                    addPage(
                        {
                            ...node,
                            children: directChildren
                        },
                        nextPath,
                        labels.directContent
                            ??
                            "Direkte Inhalte"
                    );

                }

                node.children
                    .filter(child => child.type === "panel")
                    .forEach(child =>
                        visit(
                            child,
                            nextPath
                        )
                    );

                return;
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

function buildPanelOverviewNode(
    panel,
    labels
) {

    const panelStats =
        getTreeStats(
            panel
        );

    return {
        ...panel,
        meta:
            formatTreeStats(
                panelStats,
                labels
            ),
        articles: [],
        children:
            panel.children.map(child => {
                const childStats =
                    getTreeStats(
                        child
                    );

                return {
                    ...child,
                    meta:
                        formatTreeStats(
                            childStats,
                            labels
                        ),
                    articles: [],
                    children: []
                };
            })
    };
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

    return getNodeHeaderHeight(node)
        +
        (node.meta ? 22 : 0)
        +
        (options.showPrices ? 24 : 0)
        +
        (options.showArticles
            ? node.articles.reduce(
                (total, article) => total + getDiagramArticleHeight(article),
                0
            )
            : 0)
        +
        (
            options.showArticles
            &&
            node.articles.length > 0
                ? 8
                : 0
        );
}

function getDiagramArticleHeight(article) {
    const labelRows =
        getLabelChipRowCount(
            article.labels,
            diagramLayout.articleLabelColumnWidth
        );

    return Math.max(
        diagramLayout.articleHeight,
        labelRows * 18 + 12
    );

}

function getNodeHeaderHeight(node) {
    const labelRows =
        getLabelChipRowCount(
            node.labels,
            diagramLayout.cardWidth - 24
        );

    return diagramLayout.nodeHeaderHeight
        +
        labelRows * 20;

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
        overviewColors:
            parseOverviewColors(options.overviewColors),
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
                <rect width="100%" height="100%" fill="#ffffff" />
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
    if (
        root.type === "field"
        &&
        root.children.length > 0
        &&
        root.children.every(child =>
            child.type === "meter"
            &&
            child.children.length === 0
        )
    ) {
        return layoutFieldMeters(root);
    }

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

function layoutFieldMeters(
    root
) {
    root.layoutMode = "field-meters";

    const columnCount =
        Math.min(
            root.children.length,
            detailPageLayout.maxMetersPerRow
        );
    const rowCount =
        Math.ceil(
            root.children.length
            /
            detailPageLayout.maxMetersPerRow
        );
    const contentWidth =
        columnCount
        *
        diagramLayout.cardWidth
        +
        Math.max(columnCount - 1, 0)
        *
        diagramLayout.verticalGap;
    const rowHeights =
        Array.from(
            { length: rowCount },
            () => 0
        );

    root.children.forEach((child, index) => {
        const row =
            Math.floor(
                index
                /
                detailPageLayout.maxMetersPerRow
            );
        rowHeights[row] =
            Math.max(
                rowHeights[row],
                child.height
            );
    });

    root.depth = 0;
    root.x =
        diagramLayout.margin
        +
        (contentWidth - diagramLayout.cardWidth) / 2;
    root.y = diagramLayout.margin;

    let rowTop =
        root.y
        +
        root.height
        +
        diagramLayout.horizontalGap;

    root.children.forEach((child, index) => {
        const row =
            Math.floor(
                index
                /
                detailPageLayout.maxMetersPerRow
            );
        const column =
            index
            %
            detailPageLayout.maxMetersPerRow;
        const rowColumnCount =
            Math.min(
                root.children.length
                -
                row * detailPageLayout.maxMetersPerRow,
                detailPageLayout.maxMetersPerRow
            );
        const rowOffset =
            (columnCount - rowColumnCount) / 2;

        if (
            column === 0
            &&
            row > 0
        ) {
            rowTop +=
                rowHeights[row - 1]
                +
                diagramLayout.horizontalGap;
        }

        child.depth = row + 1;
        child.fieldMeterRow = row;
        child.fieldMeterColumn = column;
        child.x =
            diagramLayout.margin
            +
            (column + rowOffset)
            *
            (
                diagramLayout.cardWidth
                +
                diagramLayout.verticalGap
            );
        child.y = rowTop;
    });

    return {
        width:
            Math.max(
                contentWidth
                +
                diagramLayout.margin * 2,
                420
            ),
        height:
            rowTop
            +
            rowHeights[rowCount - 1]
            +
            diagramLayout.margin
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
        if (parent.layoutMode === "field-meters") {
            return renderFieldMeterConnector(parent, child);
        }

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

function renderFieldMeterConnector(
    parent,
    child
) {
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
    const endY =
        child.y;
    const firstBusY =
        startY
        +
        diagramLayout.horizontalGap / 2;
    const row =
        Number(child.fieldMeterRow) || 0;
    const rowBusY =
        child.y
        -
        12;

    if (row === 0) {

        return `
            <path
                d="M ${startX} ${startY} V ${rowBusY} H ${endX} V ${endY}"
                fill="none"
                stroke="#8da2bd"
                stroke-width="2"
                stroke-linejoin="round"
            />
            <circle cx="${endX}" cy="${endY}" r="4" fill="#4c8bf5" />
        `;

    }

    const firstRowCount =
        Math.min(
            parent.children.length,
            detailPageLayout.maxMetersPerRow
        );
    const rowRouteX =
        firstRowCount % 2 === 0
            ? startX
            : diagramLayout.margin
                + Math.floor(firstRowCount / 2)
                * (
                    diagramLayout.cardWidth
                    + diagramLayout.verticalGap
                )
                + diagramLayout.cardWidth
                + diagramLayout.verticalGap / 2;

    return `
        <path
            d="M ${startX} ${startY}
               V ${firstBusY}
               H ${rowRouteX}
               V ${rowBusY}
               H ${endX}
               V ${endY}"
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
    const headerHeight =
        getNodeHeaderHeight(node);
    const hasLabels =
        getLabelChipRowCount(
            node.labels,
            diagramLayout.cardWidth - 24
        ) > 0;
    const labelRows =
        getLabelChipRowCount(
            node.labels,
            diagramLayout.cardWidth - 24
        );
    const typeTextOffset =
        hasLabels ? 20 + labelRows * 15 : 20;
    const titleTextOffset =
        hasLabels ? typeTextOffset + 25 : 45;
    const colors =
        options.overviewColors?.[node.type]
        ??
        nodeColors[node.type]
        ??
        nodeColors.empty;
    const cardWidth =
        diagramLayout.cardWidth;
    const typeLabel =
        fitText(
            node.typeLabel.toUpperCase(),
            32,
            cardWidth - 28,
            11,
            700
        );
    const titleLines =
        wrapText(
            node.name,
            28,
            2
        );
    const projectTitle =
        fitText(
            node.name,
            30,
            cardWidth - 32,
            17,
            700
        );
    const projectMeta =
        fitText(
            node.meta,
            38,
            cardWidth - 32,
            12
        );
    const metaText =
        fitText(
            node.meta,
            40,
            cardWidth - 28,
            10.5
        );
    const projectHeaderHeight =
        node.meta ? 76 : 56;
    const projectHeaderTextColor =
        getLabelTextColor(colors.header);
    const projectFillTextColor =
        getLabelTextColor(colors.fill);

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
                <path
                    d="M ${node.x + 12} ${node.y}
                       H ${node.x + cardWidth - 12}
                       Q ${node.x + cardWidth} ${node.y} ${node.x + cardWidth} ${node.y + 12}
                       V ${node.y + projectHeaderHeight}
                       H ${node.x}
                       V ${node.y + 12}
                       Q ${node.x} ${node.y} ${node.x + 12} ${node.y} Z"
                    fill="${colors.header}"
                />
                <text
                    x="${node.x + 16}"
                    y="${node.y + 23}"
                    fill="${projectHeaderTextColor}"
                    font-family="Arial, sans-serif"
                    font-size="12"
                    font-weight="700"
                ${typeLabel.attributes}
                >${escapeXml(typeLabel.text)}</text>
                <text
                    x="${node.x + 16}"
                    y="${node.y + 48}"
                    fill="${projectHeaderTextColor}"
                    font-family="Arial, sans-serif"
                    font-size="17"
                    font-weight="700"
                    ${projectTitle.attributes}
                >${escapeXml(projectTitle.text)}</text>
                ${node.meta ? `
                    <text
                        x="${node.x + 16}"
                        y="${node.y + 70}"
                        fill="${projectHeaderTextColor}"
                        font-family="Arial, sans-serif"
                        font-size="12"
                        ${projectMeta.attributes}
                    >${escapeXml(projectMeta.text)}</text>
                ` : ""}
                ${renderDiagramPrice(
                    node,
                    options,
                    node.x + 16,
                    node.y + (node.meta ? 96 : 76),
                    projectFillTextColor
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
                   V ${node.y + headerHeight}
                   H ${node.x}
                   V ${node.y + 10}
                   Q ${node.x} ${node.y} ${node.x + 10} ${node.y} Z"
                fill="${colors.header}"
            />
            ${renderLabelChips(
                node.labels,
                node.x + 12,
                node.x + cardWidth - 12,
                node.y + 4
            )}
            <text
                x="${node.x + 14}"
                y="${node.y + typeTextOffset}"
                fill="${colors.text}"
                font-family="Arial, sans-serif"
                font-size="11"
                font-weight="700"
                letter-spacing="0.5"
                ${typeLabel.attributes}
            >${escapeXml(typeLabel.text)}</text>
            <text
                x="${node.x + 14}"
                y="${node.y + titleTextOffset}"
                fill="#17283f"
                font-family="Arial, sans-serif"
                font-size="15"
                font-weight="700"
            >${renderTextLines(
                titleLines,
                node.x + 14,
                18,
                cardWidth - 28,
                15,
                700
            )}</text>
            ${node.meta ? `
                <text
                    x="${node.x + 14}"
                    y="${node.y + headerHeight + 16}"
                    fill="#65758a"
                    font-family="Arial, sans-serif"
                    font-size="10.5"
                    ${metaText.attributes}
                >${escapeXml(metaText.text)}</text>
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
                        index,
                        options
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
    const priceText =
        fitText(
            `${options.priceLabel}: ${formatDiagramCurrency(value)}`,
            40,
            diagramLayout.cardWidth - 28,
            11.5,
            700
        );

    return `
        <text
            x="${x}"
            y="${y}"
            fill="${color}"
            font-family="Arial, sans-serif"
            font-size="11.5"
            font-weight="700"
            ${priceText.attributes}
        >${escapeXml(priceText.text)}</text>
    `;
}

function renderDiagramArticle(
    node,
    article,
    index,
    options = {}
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
            : options.overviewColors?.article?.text
                ?? "#26384f";
    const articleColors =
        options.overviewColors?.article
        ??
        defaultOverviewColors.article;
    const articleHeight =
        getDiagramArticleHeight(article);
    const articleLabelGroups =
        getLabelGroups(article.labels);
    const hasLeftLabels =
        articleLabelGroups.left.length > 0;
    const hasRightLabels =
        articleLabelGroups.right.length > 0;
    const leftLabelWidth =
        hasLeftLabels
            ? getLabelChipGroupWidth(
                articleLabelGroups.left,
                diagramLayout.articleLabelColumnWidth
            )
            : 0;
    const rightLabelWidth =
        hasRightLabels
            ? getLabelChipGroupWidth(
                articleLabelGroups.right,
                diagramLayout.articleLabelColumnWidth
            )
            : 0;
    const displayText =
        fitText(
            displayName,
            29,
            diagramLayout.cardWidth
                - 56
                - (hasLeftLabels ? leftLabelWidth + 6 : 0)
                - (hasRightLabels ? rightLabelWidth + 6 : 0),
            11.5,
            700
        );
    const articleNumberText =
        fitText(
            `${article.quantity} × ${article.articleNumber}`,
            32,
            diagramLayout.cardWidth - 56,
            10.5
        );
    const articleOffset =
        node.articles
            .slice(0, index)
            .reduce(
                (total, item) => total + getDiagramArticleHeight(item),
                0
            );
    const top =
        node.y
        +
        getNodeHeaderHeight(node)
        +
        7
        +
        (node.meta ? 22 : 0)
        +
        articleOffset;
    const articleTextX =
        node.x
        +
        44
        +
        (hasLeftLabels ? leftLabelWidth + 6 : 0);
    const articleIconX =
        node.x
        +
        12
        +
        (hasLeftLabels ? leftLabelWidth + 6 : 0);
    const articleLabelLeftX =
        node.x + 12;
    const articleLabelRightX =
        node.x + diagramLayout.cardWidth - 12;
    const articleLabelRightStartX =
        articleLabelRightX
        -
        rightLabelWidth;
    const icon =
        article.icon
            ? `
                <image
                    href="${escapeXml(article.icon)}"
                    x="${articleIconX}"
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
        ${articleColors.fill !== "transparent" ? `
            <rect
                x="${node.x + 8}"
                y="${top - 5}"
                width="${diagramLayout.cardWidth - 16}"
                height="${articleHeight + 1}"
                rx="2"
                fill="${articleColors.fill}"
            />
        ` : ""}
        ${articleColors.header !== "transparent" ? `
            <rect
                x="${node.x + 8}"
                y="${top - 5}"
                width="${diagramLayout.cardWidth - 16}"
                height="3"
                rx="2"
                fill="${articleColors.header}"
            />
        ` : ""}
        ${icon}
        <text
            x="${articleTextX}"
            y="${top + 12}"
            fill="${textColor}"
            font-family="Arial, sans-serif"
            font-size="11.5"
            font-weight="700"
            ${displayText.attributes}
        >${escapeXml(displayText.text)}</text>
        ${hasLeftLabels
            ? renderLabelChips(
                articleLabelGroups.left,
                articleLabelLeftX,
                articleLabelLeftX + leftLabelWidth,
                top + 2
            )
            : ""}
        ${hasRightLabels
            ? renderLabelChips(
                articleLabelGroups.right,
                articleLabelRightStartX,
                articleLabelRightX,
                top + 2
            )
            : ""}
        <text
            x="${articleTextX}"
            y="${top + 27}"
            fill="#69788b"
            font-family="Arial, sans-serif"
            font-size="10.5"
            ${articleNumberText.attributes}
        >${escapeXml(articleNumberText.text)}</text>
    `;
}

function renderLabelChips(
    labels = [],
    leftX,
    rightX,
    y
) {
    const items = labels
        .filter(label => String(label?.text ?? "").trim())
        .slice(0, 6);
    if (items.length === 0) {
        return "";
    }

    const left = items.filter(label => label.side !== "right");
    const right = items.filter(label => label.side === "right");
    const renderGroup = (group, align) => {
        const rows = getLabelChipRows(
            group,
            rightX - leftX
        );
        const gap = 4;

        return rows.map((row, rowIndex) => {
            const total = row.reduce((sum, item) => sum + item.width, 0)
                + Math.max(0, row.length - 1) * gap;
            let cursor = align === "right" ? rightX - total : leftX;

            return row.map(item => {
                const { label, width } = item;
                const x = cursor;
                cursor += width + gap;
                const text = truncateText(label.text, 12);
                const fill = /^#[0-9a-f]{6}$/i.test(label.color)
                    ? label.color
                    : "#2f6fb4";
                const chipY = y + rowIndex * 18;
                return `
                    <g opacity="${label.isInherited ? "0.68" : "1"}">
                        <title>${escapeXml(label.isInherited ? `${text} (geerbt)` : text)}</title>
                        <rect
                            x="${x}"
                            y="${chipY}"
                            width="${width}"
                            height="15"
                            rx="3"
                            fill="${fill}"
                        />
                        <text
                            x="${align === "right" ? x + width - 5 : x + 5}"
                            y="${chipY + 11}"
                            text-anchor="${align === "right" ? "end" : "start"}"
                            fill="${getLabelTextColor(fill)}"
                            font-family="Arial, sans-serif"
                            font-size="8.5"
                            font-weight="700"
                        >${escapeXml(text)}</text>
                    </g>
                `;
            }).join("");
        }).join("");
    };

    return `
        <g class="project-overview-labels">
            ${renderGroup(left, "left")}
            ${renderGroup(right, "right")}
        </g>
    `;
}

function getLabelChipRows(
    labels = [],
    maximumWidth
) {
    const items = labels
        .filter(label => String(label?.text ?? "").trim())
        .slice(0, 6)
        .map(label => ({
            label,
            width: Math.max(
                24,
                Math.min(
                    72,
                    String(label.text).length * 5.2 + 10
                )
            )
        }));
    const rows = [];
    let row = [];
    let rowWidth = 0;

    items.forEach(item => {
        const nextWidth =
            rowWidth
            +
            (row.length > 0 ? 4 : 0)
            +
            item.width;

        if (
            row.length > 0
            &&
            Number.isFinite(maximumWidth)
            &&
            nextWidth > maximumWidth
        ) {
            rows.push(row);
            row = [];
            rowWidth = 0;
        }

        row.push(item);
        rowWidth += (row.length > 1 ? 4 : 0) + item.width;
    });

    if (row.length > 0) {
        rows.push(row);
    }

    return rows;
}

function getLabelGroups(
    labels = []
) {
    const items = labels
        .filter(label => String(label?.text ?? "").trim())
        .slice(0, 6);

    return {
        left: items.filter(label => label?.side !== "right"),
        right: items.filter(label => label?.side === "right")
    };
}

function getLabelChipGroupWidth(
    labels = [],
    maximumWidth
) {
    const gap = 4;

    return getLabelChipRows(labels, maximumWidth)
        .reduce(
            (maximum, row) => Math.max(
                maximum,
                row.reduce((sum, item) => sum + item.width, 0)
                    + Math.max(0, row.length - 1) * gap
            ),
            0
        );
}

function getLabelChipRowCount(
    labels = [],
    maximumWidth
) {
    const { left, right } = getLabelGroups(labels);

    return Math.max(
        getLabelChipRows(left, maximumWidth).length,
        getLabelChipRows(right, maximumWidth).length
    );
}

function getLabelTextColor(color) {
    const value = String(color ?? "").replace("#", "");
    if (value.length !== 6) {
        return "#ffffff";
    }
    const red = Number.parseInt(value.slice(0, 2), 16);
    const green = Number.parseInt(value.slice(2, 4), 16);
    const blue = Number.parseInt(value.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) > 150000
        ? "#17283f"
        : "#ffffff";
}

function openOverviewColorsModal(colors, labels) {
    return new Promise(resolve => {
        const types = [
            ["project", labels.overviewTotal ?? "Gesamt"],
            ["building", labels.nodeTypes.building],
            ["panel", labels.nodeTypes.panel],
            ["field", labels.nodeTypes.field],
            ["meter", labels.nodeTypes.meter],
            ["article", labels.overviewArticle ?? "Artikel"]
        ];
        const backdrop = document.createElement("div");
        backdrop.className = "project-modal-backdrop";
        backdrop.innerHTML = `
            <form class="project-modal project-overview-colors-modal">
                <h3>${escapeXml(labels.levelColors)}</h3>
                <p class="project-properties-hint">${escapeXml(labels.levelColorsHint)}</p>
                <div class="project-overview-color-fields">
                    ${types.map(([type, label]) => `
                        <div class="project-overview-color-row">
                            <strong>${escapeXml(label)}</strong>
                            <label>
                                <span>${escapeXml(labels.colorHeader)}</span>
                                <input type="color" data-color-type="${type}" data-color-part="header" data-transparent="${isTransparentColor(colors[type].header)}" value="${getColorInputValue(colors[type].header)}">
                            </label>
                            <label>
                                <span>${escapeXml(labels.colorFill)}</span>
                                <input type="color" data-color-type="${type}" data-color-part="fill" data-transparent="${isTransparentColor(colors[type].fill)}" value="${getColorInputValue(colors[type].fill)}">
                            </label>
                        </div>
                    `).join("")}
                </div>
                <div class="project-modal-actions">
                    <button type="button" data-action="reset-colors">${escapeXml(labels.resetColors)}</button>
                    <button type="button" data-action="cancel">${escapeXml(labels.close)}</button>
                    <button type="submit">${escapeXml(labels.saveColors)}</button>
                </div>
            </form>
        `;
        const close = value => {
            backdrop.remove();
            resolve(value);
        };
        backdrop.querySelectorAll("input[type=color]").forEach(input => {
            input.addEventListener("input", () => {
                input.dataset.transparent = "false";
            });
        });
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop || event.target.closest("[data-action=cancel]")) {
                close(null);
            }
            if (event.target.closest("[data-action=reset-colors]")) {
                Object.entries(defaultOverviewColors).forEach(([type, parts]) => {
                    ["header", "fill"].forEach(part => {
                        const input = backdrop.querySelector(`[data-color-type="${type}"][data-color-part="${part}"]`);
                        if (input) {
                            input.value = getColorInputValue(parts[part]);
                            input.dataset.transparent = isTransparentColor(parts[part]);
                        }
                    });
                });
            }
        });
        backdrop.querySelector("form").addEventListener("submit", event => {
            event.preventDefault();
            const result = parseOverviewColors(colors);
            backdrop.querySelectorAll("input[data-color-type]").forEach(input => {
                result[input.dataset.colorType][input.dataset.colorPart] =
                    input.dataset.transparent === "true"
                        ? "transparent"
                        : input.value;
            });
            close(result);
        });
        document.body.appendChild(backdrop);
    });
}

function isTransparentColor(value) {
    return String(value ?? "").toLowerCase() === "transparent";
}

function getColorInputValue(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value ?? ""))
        ? value
        : "#ffffff";
}

function fitText(
    value,
    maximumCharacters,
    maximumWidth,
    fontSize,
    fontWeight = 400
) {
    const text =
        truncateText(
            value,
            maximumCharacters
        );

    return {
        text,
        attributes:
            getTextFitAttributes(
                text,
                maximumWidth,
                fontSize,
                fontWeight
            )
    };
}

function getTextFitAttributes(
    value,
    maximumWidth,
    fontSize,
    fontWeight = 400
) {
    const text =
        String(value ?? "");

    if (!text || !Number.isFinite(maximumWidth)) {
        return "";
    }

    const weightFactor =
        Number(fontWeight) >= 700
            ? 0.6
            : 0.52;
    const estimatedWidth =
        Array.from(text).reduce(
            (width, character) => {
                if (character === " ") {
                    return width + fontSize * 0.28;
                }

                if ("il.,:;!'|".includes(character)) {
                    return width + fontSize * 0.28;
                }

                if ("MW@#%&".includes(character)) {
                    return width + fontSize * 0.9;
                }

                return width + fontSize * weightFactor;
            },
            0
        )
        *
        1.08;

    return estimatedWidth > maximumWidth
        ? `textLength="${Math.round(maximumWidth)}" lengthAdjust="spacingAndGlyphs"`
        : "";
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
    lineHeight,
    maximumWidth = null,
    fontSize = 15,
    fontWeight = 700
) {
    return lines.map((line, index) => `
        <tspan
            x="${x}"
            dy="${index === 0 ? 0 : lineHeight}"
            ${getTextFitAttributes(
                line,
                maximumWidth,
                fontSize,
                fontWeight
            )}
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
