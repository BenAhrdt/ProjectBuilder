import assert from "node:assert/strict";
import test from "node:test";

import {
    buildOverviewDiagram,
    buildOverviewDocuments
} from "../public/js/views/projectOverview.js";

const labels = {
    title: "Übersichtsplan",
    project: "Projekt",
    empty: "Projektstruktur",
    noStructure: "Noch keine Struktur angelegt",
    overviewView: "Gesamtübersicht",
    detailView: "Detailseiten",
    page: "Seite",
    summaryFields: "Felder",
    summaryMeters: "Messstellen",
    summaryPositions: "Positionen",
    directContent: "Direkte Inhalte",
    distributionOverview: "Verteilungsübersicht",
    prices: "Preise",
    withoutPrices: "Ohne",
    withPrices: "Anzeigen",
    priceBasis: "Preisbasis",
    price: "Preis",
    listPrices: "Listenpreise",
    discountedPrices: "Rabattiert",
    nodeTypes: {
        building: "Gebäude",
        panel: "Verteilung",
        field: "Feld",
        meter: "Messstelle"
    }
};

test(
    "builds a connected overview with project data and articles",
    () => {
        const diagram =
            buildOverviewDiagram({
                project: {
                    name: "Werk & Produktion"
                },
                customer: {
                    name: "Beispielkunde"
                },
                nodes: [
                    {
                        id: 1,
                        parentId: null,
                        type: "building",
                        name: "Halle 1",
                        sortOrder: 0
                    },
                    {
                        id: 2,
                        parentId: 1,
                        type: "panel",
                        name: "NSHV",
                        sortOrder: 0
                    }
                ],
                nodeArticles: [
                    {
                        id: 1,
                        projectNodeId: 2,
                        articleNumber: "5238002",
                        quantity: 2,
                        sortOrder: 0
                    },
                    {
                        id: 2,
                        projectNodeId: 999,
                        articleNumber: "unrelated",
                        quantity: 1
                    }
                ],
                articles: [
                    {
                        articleNumber: "5238002",
                        manufacturerType: "UMG 800"
                    }
                ],
                getArticleIcon: () =>
                    "/icons/umg800.png",
                articleLabels: [
                    {
                        projectNodeArticleId: 1,
                        text: "Artikel",
                        color: "#2f6fb4",
                        side: "left"
                    }
                ],
                labels
            });

        assert.ok(diagram.width >= 420);
        assert.ok(diagram.height > diagram.width);
        assert.ok(diagram.height >= 220);
        assert.match(
            diagram.svg,
            /Werk &amp; Produktion/
        );
        assert.match(
            diagram.svg,
            /HALLE 1/i
        );
        assert.match(
            diagram.svg,
            /UMG 800/
        );
        assert.match(
            diagram.svg,
            /2 × 5238002/
        );
        assert.match(
            diagram.svg,
            /Artikel/
        );
        assert.match(
            diagram.svg,
            /project-overview-connectors/
        );
        assert.doesNotMatch(
            diagram.svg,
            /unrelated/
        );
    }
);

test(
    "applies custom overview colors to level cards",
    () => {
        const diagram = buildOverviewDiagram({
            project: { name: "Farbprojekt" },
            nodes: [
                {
                    id: 1,
                    parentId: null,
                    type: "building",
                    name: "Gebäude"
                }
            ],
            nodeArticles: [
                {
                    id: 1,
                    projectNodeId: 1,
                    articleNumber: "A-1",
                    quantity: 1
                }
            ],
            articles: [
                {
                    articleNumber: "A-1",
                    manufacturerType: "Artikel"
                }
            ],
            labels,
            overviewColors: {
                building: {
                    header: "#123456",
                    fill: "#abcdef"
                },
                article: {
                    header: "#fedcba",
                    fill: "#fedcba"
                }
            }
        });

        assert.match(diagram.svg, /fill="#123456"/);
        assert.match(diagram.svg, /fill="#abcdef"/);
        assert.match(diagram.svg, /fill="#fedcba"/);
    }
);

test(
    "uses muted colorful defaults from total to article",
    () => {
        const diagram = buildOverviewDiagram({
            project: { name: "Standardfarben" },
            nodes: [
                {
                    id: 1,
                    parentId: null,
                    type: "building",
                    name: "Gebäude"
                },
                {
                    id: 2,
                    parentId: 1,
                    type: "panel",
                    name: "Verteilung"
                },
                {
                    id: 3,
                    parentId: 2,
                    type: "field",
                    name: "Feld"
                },
                {
                    id: 4,
                    parentId: 3,
                    type: "meter",
                    name: "Messstelle"
                }
            ],
            labels
        });

        [
            "#2C3A5C",
            "#3D557B",
            "#4F7191",
            "#D8E7F0",
            "#578986",
            "#DCEDEA",
            "#819B77",
            "#E8F0E5",
            "#B18A55",
            "#F3EBDD"
        ].forEach(color => {
            assert.match(
                diagram.svg,
                new RegExp(`fill="${color}"`, "i")
            );
        });
    }
);

test(
    "lets article rows inherit the parent card background by default",
    () => {
        const diagram = buildOverviewDiagram({
            project: { name: "Transparente Artikel" },
            nodes: [
                {
                    id: 1,
                    parentId: null,
                    type: "field",
                    name: "Feld"
                }
            ],
            nodeArticles: [
                {
                    id: 1,
                    projectNodeId: 1,
                    articleNumber: "A-1",
                    quantity: 1
                }
            ],
            articles: [
                {
                    articleNumber: "A-1",
                    manufacturerType: "Artikel"
                }
            ],
            labels
        });

        assert.match(diagram.svg, /fill="#E8F0E5"/i);
        assert.doesNotMatch(diagram.svg, /fill="#F1EDF6"/i);
    }
);

test(
    "inherits effective node labels to articles without propagating from articles",
    () => {
        const diagram = buildOverviewDiagram({
            project: { name: "Labelprojekt" },
            nodes: [
                {
                    id: 1,
                    parentId: null,
                    type: "meter",
                    name: "Messgruppe"
                }
            ],
            nodeArticles: [
                {
                    id: 1,
                    projectNodeId: 1,
                    articleNumber: "5238002",
                    quantity: 1
                }
            ],
            articles: [
                {
                    articleNumber: "5238002",
                    manufacturerType: "UMG 800"
                }
            ],
            getArticleIcon: () => "/icons/umg800.png",
            nodeLabels: [
                {
                    projectNodeId: 1,
                    text: "AV",
                    color: "#2f6fb4",
                    side: "left"
                }
            ],
            labels
        });

        assert.ok((diagram.svg.match(/>AV</g) ?? []).length >= 2);
    }
);

test(
    "does not pass node labels to articles when child inheritance is disabled",
    () => {
        const diagram = buildOverviewDiagram({
            project: { name: "Labelprojekt" },
            nodes: [
                {
                    id: 1,
                    parentId: null,
                    type: "meter",
                    name: "Messgruppe"
                }
            ],
            nodeArticles: [
                {
                    id: 1,
                    projectNodeId: 1,
                    articleNumber: "5238002",
                    quantity: 1
                }
            ],
            articles: [
                {
                    articleNumber: "5238002",
                    manufacturerType: "UMG 800"
                }
            ],
            getArticleIcon: () => "/icons/umg800.png",
            nodeLabels: [
                {
                    projectNodeId: 1,
                    text: "AV",
                    color: "#2f6fb4",
                    side: "left"
                }
            ],
            nodeLabelSettings: [
                {
                    projectNodeId: 1,
                    inheritToChildren: false
                }
            ],
            labels
        });

        assert.equal((diagram.svg.match(/>AV</g) ?? []).length, 2);
    }
);

test(
    "creates an overview page and suitable detail pages",
    () => {
        const documents =
            buildOverviewDocuments({
                project: {
                    name: "Energieprojekt"
                },
                nodes: [
                    {
                        id: 1,
                        parentId: null,
                        type: "building",
                        name: "Produktion"
                    },
                    {
                        id: 2,
                        parentId: 1,
                        type: "panel",
                        name: "NSHV"
                    },
                    {
                        id: 3,
                        parentId: 2,
                        type: "field",
                        name: "Feld 1"
                    },
                    {
                        id: 4,
                        parentId: 3,
                        type: "meter",
                        name: "Kompressor"
                    },
                    {
                        id: 5,
                        parentId: 1,
                        type: "panel",
                        name: "Unterverteilung"
                    }
                ],
                nodeArticles: [
                    {
                        id: 1,
                        projectNodeId: 4,
                        articleNumber: "5238002",
                        quantity: 1
                    }
                ],
                articles: [
                    {
                        articleNumber: "5238002",
                        manufacturerType: "UMG 800"
                    }
                ],
                labels
            });

        assert.equal(
            documents.detailPages.length,
            3
        );
        assert.equal(
            documents.printablePages.pageCount,
            4
        );
        assert.match(
            documents.overviewDiagram.svg,
            /1 Felder · 1 Messstellen · 1 Positionen/
        );
        assert.doesNotMatch(
            documents.overviewDiagram.svg,
            /Kompressor/
        );
        assert.match(
            documents.detailPages[0].diagram.svg,
            /Feld 1/
        );
        assert.match(
            documents.detailPages[0].title,
            /NSHV.*Verteilungsübersicht/
        );
        assert.match(
            documents.detailPages[1].diagram.svg,
            /Kompressor/
        );
        assert.match(
            documents.printablePages.html,
            /Seite 4 \/ 4/
        );
    }
);

test(
    "creates one detail page per field and wraps meters after six columns",
    () => {
        const nodes = [
            {
                id: 1,
                parentId: null,
                type: "panel",
                name: "Verteilung"
            },
            {
                id: 2,
                parentId: 1,
                type: "field",
                name: "Feld 1"
            },
            ...Array.from(
                { length: 13 },
                (_, index) => ({
                    id: index + 3,
                    parentId: 2,
                    type: "meter",
                    name: `Messstelle ${index + 1}`
                })
            )
        ];
        const documents =
            buildOverviewDocuments({
                project: {
                    name: "Projekt"
                },
                nodes,
                labels
            });
        const detail =
            documents.detailPages[1];
        const meterYPositions =
            [...detail.diagram.svg.matchAll(
                /<g class="project-overview-card" data-type="meter">\s*<rect\s*x="[^"]+"\s*y="([^"]+)"/g
            )].map(match =>
                Number(match[1])
            );

        assert.equal(
            documents.detailPages.length,
            2
        );
        assert.equal(
            detail.title,
            "Feld: Feld 1"
        );
        assert.equal(
            new Set(meterYPositions).size,
            3
        );
        assert.deepEqual(
            meterYPositions.slice(0, 6),
            Array(6).fill(meterYPositions[0])
        );
    }
);

test(
    "keeps direct panel positions and measuring points beside field pages",
    () => {
        const documents =
            buildOverviewDocuments({
                project: {
                    name: "Gemischte Verteilung"
                },
                nodes: [
                    {
                        id: 1,
                        parentId: null,
                        type: "building",
                        name: "Gebäude"
                    },
                    {
                        id: 2,
                        parentId: 1,
                        type: "panel",
                        name: "Verteilung"
                    },
                    {
                        id: 3,
                        parentId: 2,
                        type: "field",
                        name: "Feld 1"
                    },
                    {
                        id: 4,
                        parentId: 3,
                        type: "meter",
                        name: "Messstelle Feld"
                    },
                    {
                        id: 5,
                        parentId: 2,
                        type: "meter",
                        name: "Messstelle direkt"
                    }
                ],
                nodeArticles: [
                    {
                        id: 1,
                        projectNodeId: 2,
                        articleNumber: "PANEL-ARTICLE",
                        quantity: 1
                    },
                    {
                        id: 2,
                        projectNodeId: 5,
                        articleNumber: "DIRECT-METER-ARTICLE",
                        quantity: 1
                    }
                ],
                articles: [
                    {
                        articleNumber: "PANEL-ARTICLE",
                        manufacturerType: "Direktes Gerät"
                    },
                    {
                        articleNumber: "DIRECT-METER-ARTICLE",
                        manufacturerType: "Direktes Messgerät"
                    }
                ],
                labels
            });

        assert.equal(documents.detailPages.length, 3);
        assert.match(documents.detailPages[0].title, /Verteilungsübersicht/);
        assert.match(documents.detailPages[0].diagram.svg, /Feld 1/);
        assert.match(documents.detailPages[1].title, /Direkte Inhalte/);
        assert.match(documents.detailPages[1].diagram.svg, /Messstelle direkt/);
        assert.match(documents.detailPages[1].diagram.svg, /Direktes Ger/);
        assert.match(documents.detailPages[2].diagram.svg, /Messstelle Feld/);
    }
);

test(
    "shows neutral discounted subtotals, keeps articles and wraps long labels",
    () => {
        const documents =
            buildOverviewDocuments({
                project: {
                    name: "Projekt",
                    projectDiscount: 10
                },
                customer: {
                    pg1: 20
                },
                nodes: [
                    {
                        id: 1,
                        parentId: null,
                        type: "panel",
                        name: "NSHV"
                    },
                    {
                        id: 2,
                        parentId: 1,
                        type: "meter",
                        name: "Kompressor & Ladesäulen Besucher"
                    }
                ],
                nodeArticles: [
                    {
                        id: 1,
                        projectNodeId: 2,
                        articleNumber: "1000",
                        quantity: 1
                    }
                ],
                articles: [
                    {
                        articleNumber: "1000",
                        manufacturerType: "Messgerät",
                        discountGroup: "PG1",
                        listPrice: 100
                    }
                ],
                getArticleDiscountPercent: () => 20,
                labels,
                showPrices: true,
                priceMode: "discounted"
            });
        const detailSvg =
            documents.detailPages[0].diagram.svg;

        assert.match(
            detailSvg,
            /Preis: 72,00 €/
        );
        assert.match(
            detailSvg,
            /Messgerät/
        );
        assert.match(
            detailSvg,
            /Kompressor &amp; Ladesäulen/
        );
        assert.match(
            detailSvg,
            /<tspan[\s\S]*Besucher<\/tspan>/
        );
    }
);

test(
    "renders an empty-state card for projects without structure",
    () => {
        const diagram =
            buildOverviewDiagram({
                project: {
                    name: "Leeres Projekt"
                },
                nodes: [],
                nodeArticles: [],
                articles: [],
                labels
            });

        assert.match(
            diagram.svg,
            /Noch keine Struktur angelegt/
        );
        assert.match(
            diagram.svg,
            /data-type="empty"/
        );
    }
);

test(
    "marks optional articles and excludes them from overview prices",
    () => {
        const diagram =
            buildOverviewDiagram({
                project: {
                    name: "Projekt"
                },
                nodes: [
                    {
                        id: 1,
                        parentId: null,
                        type: "meter",
                        name: "Messstelle"
                    }
                ],
                nodeArticles: [
                    {
                        id: 1,
                        projectNodeId: 1,
                        articleNumber: "standard",
                        quantity: 1
                    },
                    {
                        id: 2,
                        projectNodeId: 1,
                        articleNumber: "option",
                        quantity: 1,
                        isOptional: 1
                    }
                ],
                articles: [
                    {
                        articleNumber: "standard",
                        manufacturerType: "Standardgerät",
                        listPrice: 100
                    },
                    {
                        articleNumber: "option",
                        manufacturerType: "Zusatzmodul",
                        listPrice: 50
                    }
                ],
                getArticleDiscountPercent: () => 0,
                labels,
                showPrices: true,
                priceMode: "list"
            });

        assert.match(diagram.svg, /Preis: 100,00/);
        assert.doesNotMatch(diagram.svg, /Preis: 150,00/);
        assert.match(diagram.svg, /\[OPTIONAL\] Zusatzmodul/);
    }
);

test(
    "keeps orphaned nodes visible at the project root",
    () => {
        const diagram =
            buildOverviewDiagram({
                project: {
                    name: "Projekt"
                },
                nodes: [
                    {
                        id: 7,
                        parentId: 404,
                        type: "field",
                        name: "Verwaistes Feld"
                    }
                ],
                nodeArticles: [],
                articles: [],
                labels
            });

        assert.match(
            diagram.svg,
            /Verwaistes Feld/
        );
    }
);
