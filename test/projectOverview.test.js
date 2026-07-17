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
            /project-overview-connectors/
        );
        assert.doesNotMatch(
            diagram.svg,
            /unrelated/
        );
    }
);

test(
    "creates an overview page and one detail page per distribution",
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
            2
        );
        assert.equal(
            documents.printablePages.pageCount,
            3
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
            /Kompressor/
        );
        assert.match(
            documents.printablePages.html,
            /Seite 3 \/ 3/
        );
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
