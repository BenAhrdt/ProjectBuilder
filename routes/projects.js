import express from "express";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import multer from "multer";
import XLSX from "xlsx";

import * as database
from "../database/index.js";

const router =
    express.Router();

const upload =
    multer({
        dest: "uploads/"
    });

const exportVersion =
    1;

const projectNodeTypeLabels = {
    building: "Gebäude",
    generalPosition: "Allgemeine Positionsebene",
    panel: "Verteilung",
    field: "Feld",
    meter: "Messstelle"
};

const commercialDiscountGroupOrder = [
    "PG1",
    "PG5",
    "PG8",
    "PG3",
    "PG7",
    "PG6",
    "PG4"
];

const excelIconColumnWidth =
    10;

const excelIconAnchorCorrection = {
    column: 0,
    row: 0.03
};

const exportArticleIconRules = [
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

router.get(
    "/:id/export.xlsx",
    async (req, res) => {

        const project =
            database.projects.prepare(`

                SELECT
                    projects.*,
                    customers.customerNumber,
                    customers.name AS customerName,
                    customers.city AS customerCity,
                    customers.additionalInfo AS customerAdditionalInfo,
                    customers.pg1,
                    customers.pg2,
                    customers.pg3,
                    customers.pg4,
                    customers.pg5,
                    customers.pg6,
                    customers.pg7,
                    customers.pg8,
                    customers.pg9,
                    customers.pg10

                FROM projects

                LEFT JOIN customers
                ON customers.id = projects.customerId

                WHERE projects.id = ?

            `).get(
                req.params.id
            );

        if (!project) {

            res.status(404).json({
                error: "Projekt nicht gefunden"
            });

            return;

        }

        const nodes =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE projectId = ?

                ORDER BY
                    COALESCE(sortOrder, id) ASC,
                    id ASC

            `).all(
                req.params.id
            );

        const nodeIds =
            nodes.map(node =>
                node.id
            );

        const nodeArticles =
            nodeIds.length === 0
                ? []
                : database.projectNodeArticles.prepare(`

                    SELECT
                        projectNodeArticles.*,
                        articles.ean,
                        articles.manufacturerType,
                        articles.manufacturerName,
                        articles.quantityUnit,
                        articles.listPrice,
                        articles.listPriceCurrency,
                        articles.discountGroup,
                        articles.description

                    FROM projectNodeArticles

                    LEFT JOIN articles
                    ON articles.articleNumber = projectNodeArticles.articleNumber

                    WHERE projectNodeArticles.projectNodeId IN (
                        ${nodeIds.map(() => "?").join(",")}
                    )

                    ORDER BY
                        projectNodeArticles.projectNodeId ASC,
                        COALESCE(projectNodeArticles.sortOrder, projectNodeArticles.id) ASC,
                        projectNodeArticles.id ASC

                `).all(
                    ...nodeIds
                );

        const exportData =
            buildProjectExportData(
                project,
                nodes,
                nodeArticles
            );

        const buffer =
            await buildProjectWorkbookBuffer(
                exportData
            );

        const filename =
            `${sanitizeFilename(project.name || "Projekt")}.xlsx`;

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );

        res.send(
            buffer
        );

    }
);

router.get(
    "/",
    (req, res) => {

        const search =
            req.query.search ?? "";

        const projects =
            database.projects.prepare(`

            SELECT

                projects.id,

                projects.customerId,

                projects.name,

                projects.description,

                customers.name AS customerName

            FROM projects

            LEFT JOIN customers
            ON customers.id = projects.customerId

            WHERE

                projects.name LIKE @search

                OR projects.description LIKE @search

            ORDER BY projects.name

            `).all({

                search:
                    `%${search}%`

            });

        res.json(
            projects
        );

    }
);

router.post(
    "/import/preview",
    upload.single("file"),
    (req, res) => {

        try {

            const payload =
                readProjectImportPayload(
                    req.file
                );

            const validation =
                validateProjectImportPayload(
                    payload
                );

            res.json({
                ok: true,
                projectName:
                    payload.project?.name ?? "",
                customerId:
                    payload.project?.customerId ?? null,
                nodeCount:
                    payload.nodes.length,
                positionCount:
                    payload.positions.length,
                missingArticleNumbers:
                    validation.missingArticleNumbers
            });

        } catch (error) {

            res.status(400).json({
                ok: false,
                error:
                    error.message
            });

        } finally {

            removeUploadedFile(
                req.file
            );

        }

    }
);

router.post(
    "/import",
    upload.single("file"),
    (req, res) => {

        try {

            const payload =
                readProjectImportPayload(
                    req.file
                );

            const validation =
                validateProjectImportPayload(
                    payload
                );

            if (validation.missingArticleNumbers.length > 0) {

                res.status(400).json({
                    ok: false,
                    error: "Artikel fehlen in der Artikeldatenbank.",
                    missingArticleNumbers:
                        validation.missingArticleNumbers
                });

                return;

            }

            const importedProject =
                importProjectPayload(
                    payload
                );

            res.json({
                ok: true,
                project:
                    importedProject
            });

        } catch (error) {

            res.status(400).json({
                ok: false,
                error:
                    error.message
            });

        } finally {

            removeUploadedFile(
                req.file
            );

        }

    }
);

router.get(
    "/:id",
    (req, res) => {

        const project =
            database.projects.prepare(`

                SELECT *

                FROM projects

                WHERE id = ?

            `).get(
                req.params.id
            );

        res.json(
            project
        );

    }
);

router.post(
    "/",
    (req, res) => {

        database.projects.prepare(`

            INSERT INTO projects (

                customerId,
                name,
                description,
                projectDiscount

            )

            VALUES (

                @customerId,
                @name,
                @description,
                @projectDiscount

            )

        `).run({

            customerId:
                req.body.customerId,

            name:
                req.body.name,

            description:
                req.body.description,

            projectDiscount:
                req.body.projectDiscount ?? 0

        });

        res.json({

            success: true

        });

    }
);

router.put(
    "/:id",
    (req, res) => {

        database.projects.prepare(`

            UPDATE projects

            SET

                customerId = @customerId,

                name = @name,

                description = @description,

                projectDiscount = @projectDiscount

            WHERE id = @id

        `).run({

            id:
                req.params.id,

            customerId:
                req.body.customerId,

            name:
                req.body.name,

            description:
                req.body.description,

            projectDiscount:
                req.body.projectDiscount ?? 0

        });

        res.json({

            success: true

        });

    }
);

router.delete(
    "/:id",
    (req, res) => {

        const project =
            database.projects.prepare(`

                SELECT *

                FROM projects

                WHERE id = ?

            `).get(
                req.params.id
            );

        if (!project) {

            res.status(404).json({
                success: false,
                error: "Projekt nicht gefunden"
            });

            return;

        }

        const deleteProject =
            database.projects.transaction(projectId => {

                database.projectNodeArticles.prepare(`

                    DELETE FROM projectNodeArticles

                    WHERE projectNodeId IN (

                        SELECT id

                        FROM projectNodes

                        WHERE projectId = ?

                    )

                `).run(
                    projectId
                );

                database.projectNodes.prepare(`

                    DELETE FROM projectNodes

                    WHERE projectId = ?

                `).run(
                    projectId
                );

                database.projects.prepare(`

                    DELETE FROM projects

                    WHERE id = ?

                `).run(
                    projectId
                );

            });

        deleteProject(
            req.params.id
        );

        res.json({
            success: true
        });

    }
);

function buildProjectExportData(
    project,
    nodes,
    nodeArticles
) {

    const nodesById =
        new Map(
            nodes.map(node => [
                String(node.id),
                node
            ])
        );

    const childrenByParent =
        new Map();

    nodes.forEach(node => {

        const parentKey =
            node.parentId === null
            ||
            node.parentId === undefined
                ? "root"
                : String(node.parentId);

        if (!childrenByParent.has(parentKey)) {

            childrenByParent.set(
                parentKey,
                []
            );

        }

        childrenByParent
            .get(parentKey)
            .push(node);

    });

    childrenByParent.forEach(children => {

        children.sort(compareSortOrder);

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

    nodeArticlesByNode.forEach(articles => {

        articles.sort(compareSortOrder);

    });

    const orderedNodes =
        [];

    const nodeContextById =
        new Map();

    const walkNode =
        (
            node,
            context = {
                building: "",
                panel: "",
                field: "",
                meter: "",
                path: []
            },
            depth = 0
        ) => {

            const nextContext = {
                ...context,
                path: [
                    ...context.path,
                    node.name ?? ""
                ]
            };

            if (node.type === "building") {

                nextContext.building =
                    node.name ?? "";

            }

            if (node.type === "panel") {

                nextContext.panel =
                    node.name ?? "";

            }

            if (node.type === "field") {

                nextContext.field =
                    node.name ?? "";

            }

            if (node.type === "meter") {

                nextContext.meter =
                    node.name ?? "";

            }

            const nodeContext = {
                ...nextContext,
                depth,
                pathText:
                    nextContext.path.join(" / ")
            };

            nodeContextById.set(
                String(node.id),
                nodeContext
            );

            orderedNodes.push({
                ...node,
                ...nodeContext
            });

            (
                childrenByParent.get(
                    String(node.id)
                )
                ||
                []
            ).forEach(childNode =>
                walkNode(
                    childNode,
                    nextContext,
                    depth + 1
                )
            );

        };

    (
        childrenByParent.get("root")
        ||
        []
    ).forEach(node =>
        walkNode(node)
    );

    const positions =
        [];

    orderedNodes.forEach((node, nodeOrder) => {

        (
            nodeArticlesByNode.get(
                String(node.id)
            )
            ||
            []
        ).forEach(nodeArticle => {

            const quantity =
                Number(nodeArticle.quantity)
                ||
                1;

            const listUnitPrice =
                getListPrice(
                    nodeArticle
                );

            const discountPercent =
                getDiscountPercent(
                    nodeArticle.discountGroup,
                    project
                );

            const discountedUnitPrice =
                roundCurrency(
                    listUnitPrice
                    *
                    (1 - (discountPercent / 100))
                );

            const listTotal =
                roundCurrency(
                    listUnitPrice
                    *
                    quantity
                );

            const discountedTotal =
                roundCurrency(
                    discountedUnitPrice
                    *
                    quantity
                );

            const position = {
                id:
                    nodeArticle.id,
                nodeId:
                    node.id,
                nodeOrder,
                positionOrder:
                    positions.length,
                sortOrder:
                    nodeArticle.sortOrder ?? 0,
                articleNumber:
                    nodeArticle.articleNumber,
                positionName:
                    nodeArticle.positionName ?? "",
                quantity,
                building:
                    node.building,
                panel:
                    node.panel,
                field:
                    node.field,
                meter:
                    node.meter,
                path:
                    node.pathText,
                manufacturerType:
                    nodeArticle.manufacturerType ?? "",
                manufacturerName:
                    nodeArticle.manufacturerName ?? "",
                description:
                    nodeArticle.description ?? "",
                ean:
                    nodeArticle.ean ?? "",
                unit:
                    nodeArticle.quantityUnit ?? "",
                listUnitPrice,
                currency:
                    nodeArticle.listPriceCurrency ?? "EUR",
                discountGroup:
                    nodeArticle.discountGroup ?? "",
                discountPercent,
                discountedUnitPrice,
                listTotal,
                discountTotal:
                    roundCurrency(
                        listTotal
                        -
                        discountedTotal
                    ),
                discountedTotal
            };

            position.icon =
                getExportIconName(
                    position
                );

            positions.push(
                position
            );

        });

    });

    const totals =
        positions.reduce(
            (sum, position) => ({
                listPrice:
                    sum.listPrice
                    +
                    position.listTotal,
                discount:
                    sum.discount
                    +
                    position.discountTotal,
                discountedPrice:
                    sum.discountedPrice
                    +
                    position.discountedTotal
            }),
            {
                listPrice: 0,
                discount: 0,
                discountedPrice: 0
            }
        );

    const projectDiscountPercent =
        normalizeDiscountPercent(
            project.projectDiscount
        );

    totals.projectDiscount =
        roundCurrency(
            totals.discountedPrice
            *
            (projectDiscountPercent / 100)
        );

    totals.discountedPrice =
        roundCurrency(
            totals.discountedPrice
            -
            totals.projectDiscount
        );

    return {
        project,
        nodes,
        nodesById,
        orderedNodes,
        positions,
        totals
    };

}

function readProjectImportPayload(
    file
) {

    if (!file?.path) {

        throw new Error("Keine Importdatei hochgeladen.");

    }

    const workbook =
        XLSX.readFile(
            file.path
        );

    const importSheet =
        workbook.Sheets.Importdaten;

    if (!importSheet) {

        throw new Error("Das Blatt 'Importdaten' fehlt.");

    }

    const rows =
        XLSX.utils.sheet_to_json(
            importSheet,
            {
                header: 1,
                blankrows: false
            }
        );

    const payloadRow =
        rows.find(row =>
            String(row?.[0] ?? "")
                .trim()
            ===
            "payloadJson"
        );

    if (!payloadRow?.[1]) {

        throw new Error("payloadJson wurde in 'Importdaten' nicht gefunden.");

    }

    let payload;

    try {

        payload =
            JSON.parse(
                String(payloadRow[1])
            );

    } catch (error) {

        throw new Error("payloadJson ist kein gültiges JSON.");

    }

    if (
        !payload
        ||
        typeof payload !== "object"
    ) {

        throw new Error("Importdaten sind ungültig.");

    }

    return payload;

}

function validateProjectImportPayload(
    payload
) {

    if (
        !payload.project
        ||
        !Array.isArray(payload.nodes)
        ||
        !Array.isArray(payload.positions)
    ) {

        throw new Error("Importdaten enthalten kein gültiges Projekt.");

    }

    const nodeIds =
        new Set(
            payload.nodes.map(node =>
                String(node.id)
            )
        );

    const positionsWithMissingNode =
        payload.positions.filter(position =>
            !nodeIds.has(
                String(position.nodeId)
            )
        );

    if (positionsWithMissingNode.length > 0) {

        throw new Error("Mindestens eine Position verweist auf eine fehlende Strukturposition.");

    }

    const articleNumbers =
        Array.from(
            new Set(
                payload.positions
                    .map(position =>
                        String(position.articleNumber ?? "")
                            .trim()
                    )
                    .filter(Boolean)
            )
        );

    const existingArticleNumbers =
        new Set(
            database.articles.prepare(`

                SELECT articleNumber

                FROM articles

            `).all()
                .map(article =>
                    String(article.articleNumber)
                )
        );

    const missingArticleNumbers =
        articleNumbers.filter(articleNumber =>
            !existingArticleNumbers.has(articleNumber)
        );

    return {
        missingArticleNumbers
    };

}

function importProjectPayload(
    payload
) {

    const transaction =
        database.projects.transaction(() => {

            const insertProject =
                database.projects.prepare(`

                    INSERT INTO projects (
                        customerId,
                        name,
                        description,
                        projectDiscount
                    )

                    VALUES (
                        @customerId,
                        @name,
                        @description,
                        @projectDiscount
                    )

                `);

            const insertNode =
                database.projects.prepare(`

                    INSERT INTO projectNodes (
                        projectId,
                        parentId,
                        type,
                        name,
                        sortOrder
                    )

                    VALUES (
                        @projectId,
                        @parentId,
                        @type,
                        @name,
                        @sortOrder
                    )

                `);

            const insertPosition =
                database.projects.prepare(`

                    INSERT INTO projectNodeArticles (
                        projectNodeId,
                        articleNumber,
                        quantity,
                        positionName,
                        sortOrder
                    )

                    VALUES (
                        @projectNodeId,
                        @articleNumber,
                        @quantity,
                        @positionName,
                        @sortOrder
                    )

                `);

            const projectResult =
                insertProject.run({
                    customerId:
                        getImportCustomerId(
                            payload.project.customerId
                        ),
                    name:
                        payload.project.name ?? "Importiertes Projekt",
                    description:
                        payload.project.description ?? "",
                    projectDiscount:
                        payload.project.projectDiscount ?? 0
                });

            const newProjectId =
                projectResult.lastInsertRowid;

            const oldToNewNodeId =
                new Map();

            getNodesInImportOrder(
                payload.nodes
            ).forEach(node => {

                const parentId =
                    node.parentId === null
                    ||
                    node.parentId === undefined
                        ? null
                        : oldToNewNodeId.get(
                            String(node.parentId)
                        );

                const result =
                    insertNode.run({
                        projectId:
                            newProjectId,
                        parentId:
                            parentId ?? null,
                        type:
                            node.type,
                        name:
                            node.name ?? "",
                        sortOrder:
                            Number(node.sortOrder) || 0
                    });

                oldToNewNodeId.set(
                    String(node.id),
                    result.lastInsertRowid
                );

            });

            payload.positions
                .slice()
                .sort(compareSortOrder)
                .forEach(position => {

                    const newNodeId =
                        oldToNewNodeId.get(
                            String(position.nodeId)
                        );

                    if (!newNodeId) {

                        throw new Error("Position konnte keiner importierten Strukturposition zugeordnet werden.");

                    }

                    insertPosition.run({
                        projectNodeId:
                            newNodeId,
                        articleNumber:
                            String(position.articleNumber ?? "")
                                .trim(),
                        quantity:
                            Number(position.quantity) || 1,
                        positionName:
                            position.positionName || null,
                        sortOrder:
                            Number(position.sortOrder) || 0
                    });

                });

            return database.projects.prepare(`

                SELECT *

                FROM projects

                WHERE id = ?

            `).get(
                newProjectId
            );

        });

    return transaction();

}

function getImportCustomerId(
    customerId
) {

    if (!customerId) {

        return null;

    }

    const customer =
        database.customers.prepare(`

            SELECT id

            FROM customers

            WHERE id = ?

        `).get(
            customerId
        );

    return customer?.id ?? null;

}

function getNodesInImportOrder(
    nodes
) {

    const nodesByParent =
        new Map();

    nodes.forEach(node => {

        const parentKey =
            node.parentId === null
            ||
            node.parentId === undefined
                ? "root"
                : String(node.parentId);

        if (!nodesByParent.has(parentKey)) {

            nodesByParent.set(
                parentKey,
                []
            );

        }

        nodesByParent
            .get(parentKey)
            .push(node);

    });

    nodesByParent.forEach(children =>
        children.sort(compareSortOrder)
    );

    const orderedNodes =
        [];

    const appendChildren =
        parentKey => {

            (
                nodesByParent.get(parentKey)
                ||
                []
            ).forEach(node => {

                orderedNodes.push(node);

                appendChildren(
                    String(node.id)
                );

            });

        };

    appendChildren("root");

    return orderedNodes;

}

function removeUploadedFile(
    file
) {

    if (!file?.path) {

        return;

    }

    try {

        fs.unlinkSync(
            file.path
        );

    } catch (error) {

        // Upload cleanup should not hide the import result.

    }

}

function buildProjectWorkbook(
    exportData
) {

    const workbook =
        XLSX.utils.book_new();

    const projectSheet =
        buildProjectSheet(
            exportData
        );

    const positionsSheet =
        buildPositionsSheet(
            exportData.positions
        );

    const printSheet =
        buildPrintableStructureSheet(
            exportData
        );

    const printSheetListPrices =
        buildPrintableStructureSheet(
            exportData,
            {
                includeDiscounts: false,
                priceMode: "list",
                sheetTitle: "Projektstruktur Listenpreise"
            }
        );

    const printSheetWithoutDiscounts =
        buildPrintableStructureSheet(
            exportData,
            {
                includeDiscounts: false,
                priceMode: "discounted",
                sheetTitle: "Projektstruktur ohne Rabatte"
            }
        );

    const printSheetWithoutPrices =
        buildPrintableStructureSheet(
            exportData,
            {
                includePrices: false,
                includeDiscounts: false,
                sheetTitle: "Projektstruktur ohne Preise"
            }
        );

    const commercialSheet =
        buildCommercialSummarySheet(
            exportData
        );

    const structureSheet =
        buildStructureSheet(
            exportData.orderedNodes
        );

    const importSheet =
        buildImportSheet(
            exportData
        );

    XLSX.utils.book_append_sheet(
        workbook,
        projectSheet,
        "Projekt"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        printSheet,
        "Druckansicht"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        printSheetListPrices,
        "Druck Listenpreise"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        printSheetWithoutDiscounts,
        "Druck ohne Rabatte"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        printSheetWithoutPrices,
        "Druck ohne Preise"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        commercialSheet,
        "Kaufmännisch"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        positionsSheet,
        "Positionen"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        structureSheet,
        "Struktur"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        importSheet,
        "Importdaten"
    );

    workbook.Props = {
        Title:
            exportData.project.name ?? "Projekt",
        Subject:
            "ProjectBuilder Export",
        Author:
            "ProjectBuilder",
        CreatedDate:
            new Date()
    };

    return workbook;

}

async function buildProjectWorkbookBuffer(
    exportData
) {

    const workbook =
        new ExcelJS.Workbook();

    workbook.creator =
        "ProjectBuilder";

    workbook.created =
        new Date();

    workbook.modified =
        new Date();

    const imageCache =
        new Map();

    buildExcelProjectSheet(
        workbook,
        exportData
    );

    buildExcelPrintableStructureSheet(
        workbook,
        exportData,
        imageCache
    );

    buildExcelPrintableStructureSheet(
        workbook,
        exportData,
        imageCache,
        {
            sheetName: "Druck Listenpreise",
            includeDiscounts: false,
            priceMode: "list",
            title: "Projektstruktur Listenpreise"
        }
    );

    buildExcelPrintableStructureSheet(
        workbook,
        exportData,
        imageCache,
        {
            sheetName: "Druck ohne Rabatte",
            includeDiscounts: false,
            priceMode: "discounted",
            title: "Projektstruktur ohne Rabatte"
        }
    );

    buildExcelPrintableStructureSheet(
        workbook,
        exportData,
        imageCache,
        {
            sheetName: "Druck ohne Preise",
            includePrices: false,
            includeDiscounts: false,
            title: "Projektstruktur ohne Preise"
        }
    );

    buildExcelCommercialSummarySheet(
        workbook,
        exportData,
        imageCache
    );

    buildExcelPositionsSheet(
        workbook,
        exportData.positions,
        imageCache
    );

    buildExcelStructureSheet(
        workbook,
        exportData.orderedNodes
    );

    buildExcelImportSheet(
        workbook,
        exportData
    );

    return await workbook.xlsx.writeBuffer();

}

function buildExcelProjectSheet(
    workbook,
    {
        project,
        totals,
        positions,
        orderedNodes
    }
) {

    const sheet =
        workbook.addWorksheet(
            "Projekt",
            {
                pageSetup: {
                    paperSize: 9,
                    orientation: "portrait",
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 1
                }
            }
        );

    sheet.columns = [
        {
            width: 28
        },
        {
            width: 42
        },
        {
            width: 18
        },
        {
            width: 22
        }
    ];

    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value =
        "ProjectBuilder Export";
    sheet.getCell("A1").font = {
        bold: true,
        size: 18,
        color: {
            argb: "FF1F3552"
        }
    };

    [
        [],
        [
            "Projekt",
            project.name ?? ""
        ],
        [
            "Kunde",
            project.customerName ?? ""
        ],
        [
            "Kundennummer",
            project.customerNumber ?? ""
        ],
        [
            "Ort",
            project.customerCity ?? ""
        ],
        [
            "Beschreibung",
            project.description ?? ""
        ],
        [],
        [
            "Positionen",
            positions.length
        ],
        [
            "Strukturelemente",
            orderedNodes.length
        ],
        [],
        [
            "Listenpreis gesamt",
            roundCurrency(totals.listPrice)
        ],
        [
            "Rabatt gesamt",
            roundCurrency(totals.discount)
        ],
        ...renderProjectDiscountRows(totals),
        [
            "Rabattierter Preis gesamt",
            roundCurrency(totals.discountedPrice)
        ],
        [],
        [
            "Export-Version",
            exportVersion
        ],
        [
            "Exportiert am",
            new Date()
        ]
    ].forEach(row =>
        sheet.addRow(row)
    );

    sheet.eachRow(row => {

        const label =
            row.getCell(1).value;

        if (
            [
                "Listenpreis gesamt",
                "Rabatt gesamt",
                "Projektrabatt",
                "Rabattierter Preis gesamt"
            ].includes(label)
        ) {

            row.getCell(2).numFmt =
                "#,##0.00 €";

        }

        if (label === "Exportiert am") {

            row.getCell(2).numFmt =
                "dd.mm.yyyy hh:mm";

        }

    });

    styleExcelKeyValueSheet(sheet);

}

function buildExcelPrintableStructureSheet(
    workbook,
    exportData,
    imageCache,
    options = {}
) {

    const {
        project,
        totals,
        orderedNodes,
        positions
    } = exportData;

    const includePrices =
        options.includePrices !== false;

    const includeDiscounts =
        includePrices
        && options.includeDiscounts !== false;

    const priceMode =
        options.priceMode === "discounted"
            ? "discounted"
            : "list";

    const projectDiscountFactor =
        1
        -
        (
            normalizeDiscountPercent(
                project.projectDiscount
            )
            /
            100
        );

    const columns = [
        {
            header: "Struktur / Position",
            key: "label",
            width: 54
        },
        {
            header: "Menge",
            key: "quantity",
            width: 9
        },
        {
            header: "Artikelnummer",
            key: "articleNumber",
            width: 16
        },
        {
            header: "Hersteller-Typ",
            key: "manufacturerType",
            width: 42
        },
        ...(
            includePrices
                ? [
                    {
                        header: "Einzelpreis",
                        key: "listUnitPrice",
                        width: 26
                    },
                    ...(
                        includeDiscounts
                            ? [
                                {
                                    header: "Rabatt %",
                                    key: "discountPercent",
                                    width: 10
                                },
                                {
                                    header: "Gesamt rabattiert",
                                    key: "discountedTotal",
                                    width: 18
                                }
                            ]
                : [
                    {
                        header: "Gesamtpreis",
                        key: "totalPrice",
                        width: 18
                    }
                ]
                    )
                ]
                : []
        ),
        {
            header: "Icon",
            key: "icon",
            width: excelIconColumnWidth
        }
    ];

    const iconColumnIndex =
        columns.length;

    const sheet =
        workbook.addWorksheet(
            options.sheetName ?? "Druckansicht",
            {
                pageSetup: {
                    paperSize: 9,
                    orientation: "landscape",
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0
                }
            }
        );

    sheet.columns =
        columns;

    sheet.spliceRows(1, 1);
    sheet.mergeCells(
        1,
        1,
        1,
        columns.length
    );
    sheet.getCell("A1").value =
        options.title ?? "Projektstruktur";
    sheet.getCell("A1").font = {
        bold: true,
        size: 18,
        color: {
            argb: "FF1F3552"
        }
    };

    sheet.addRow([
        "Projekt",
        project.name ?? "",
        "",
        "Kunde",
        project.customerName ?? ""
    ]);
    sheet.mergeCells("B2:C2");
    sheet.mergeCells(
        2,
        5,
        2,
        columns.length
    );
    sheet.addRow([
        "Kundennummer",
        project.customerNumber ?? "",
        "",
        "Ort",
        project.customerCity ?? ""
    ]);
    sheet.mergeCells("B3:C3");
    sheet.mergeCells(
        3,
        5,
        3,
        columns.length
    );
    sheet.addRow([]);

    if (includePrices) {

        sheet.addRow(
            includeDiscounts
                ? [
                    "Listenpreis gesamt",
                    roundCurrency(totals.listPrice),
                    "Rabatt gesamt",
                    roundCurrency(totals.discount),
                    "Rabattierter Preis gesamt",
                    roundCurrency(totals.discountedPrice)
                ]
                : [
                    "Gesamtpreis",
                    roundCurrency(
                        priceMode === "discounted"
                            ? totals.discountedPrice
                            : totals.listPrice
                    )
                ]
        );

        if (
            includeDiscounts
            && hasProjectDiscount(totals)
        ) {

            sheet.addRow([
                "Projektrabatt",
                roundCurrency(totals.projectDiscount),
                "",
                "",
                "",
                ""
            ]);

        }

    }

    sheet.addRow([]);

    const headerRow =
        sheet.addRow(
            columns.map(column =>
                column.header
            )
        );

    styleExcelHeaderRow(headerRow);

    const positionsByNodeId =
        groupPositionsByNodeId(
            positions
        );

    orderedNodes.forEach(node => {

        const row =
            sheet.addRow([
                `${"  ".repeat(node.depth)}${projectNodeTypeLabels[node.type] ?? node.type}: ${node.name ?? ""}`
            ]);

        row.font = {
            bold: true,
            color: {
                argb: "FF1F3552"
            }
        };

        row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFEAF1F8"
            }
        };

        (
            positionsByNodeId.get(
                String(node.id)
            )
            ||
            []
        ).forEach(position => {

            const label =
                position.positionName
                    ? `${position.positionName} - ${position.manufacturerType}`
                    : position.manufacturerType;

            const positionRow =
                sheet.addRow(
                    [
                        `${"  ".repeat(node.depth + 1)}${label}`,
                        position.quantity,
                        position.articleNumber,
                        position.manufacturerType,
                        ...(
                            includePrices
                                ? [
                                    priceMode === "discounted"
                                        ? roundCurrency(
                                            position.discountedUnitPrice
                                            *
                                            projectDiscountFactor
                                        )
                                        : position.listUnitPrice,
                                    includeDiscounts
                                        ? position.discountPercent / 100
                                        : roundCurrency(
                                            (
                                                priceMode === "discounted"
                                                    ? position.discountedTotal
                                                    : position.listTotal
                                            )
                                            *
                                            (
                                                priceMode === "discounted"
                                                    ? projectDiscountFactor
                                                    : 1
                                            )
                                        ),
                                    ...(
                                        includeDiscounts
                                            ? [
                                                position.discountedTotal
                                            ]
                                            : []
                                    )
                                ]
                                : []
                        ),
                        ""
                    ]
                );

            positionRow.height =
                position.icon
                    ? 38
                    : 18;

            if (includePrices) {

                positionRow.getCell(5).numFmt =
                    "#,##0.00 €";

                if (includeDiscounts) {

                    positionRow.getCell(6).numFmt =
                        "0.00%";
                    positionRow.getCell(7).numFmt =
                        "#,##0.00 €";

                } else {

                    positionRow.getCell(6).numFmt =
                        "#,##0.00 €";

                }

            }

            addExcelIcon(
                workbook,
                sheet,
                imageCache,
                position.icon,
                iconColumnIndex,
                positionRow.number,
                {
                    maxWidth: 34,
                    maxHeight: 34
                }
            );

        });

    });

    if (includePrices) {

        sheet.getCell("B5").numFmt =
            "#,##0.00 €";

        if (includeDiscounts) {

            sheet.getCell("D5").numFmt =
                "#,##0.00 €";
            sheet.getCell("F5").numFmt =
                "#,##0.00 €";

            if (hasProjectDiscount(totals)) {

                sheet.getCell("B6").numFmt =
                    "#,##0.00 €";

            }

        }

    }

    sheet.views = [
        {
            state: "frozen",
            ySplit: headerRow.number
        }
    ];

    sheet.pageSetup.printTitlesRow =
        `${headerRow.number}:${headerRow.number}`;
    sheet.pageSetup.printArea =
        `A1:${getExcelColumnName(columns.length)}${sheet.lastRow.number}`;

    styleExcelWorksheet(sheet);

    setExcelColumnWidths(
        sheet,
        columns.map(column =>
            column.width
        )
    );

}

function buildExcelCommercialSummarySheet(
    workbook,
    exportData,
    imageCache
) {

    const {
        project,
        totals,
        positions
    } = exportData;

    const sheet =
        workbook.addWorksheet(
            "Kaufmännisch",
            {
                pageSetup: {
                    paperSize: 9,
                    orientation: "landscape",
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0
                }
            }
        );

    const columns = [
        {
            header: "Artikelnummer",
            key: "articleNumber",
            width: 16
        },
        {
            header: "Hersteller-Typ",
            key: "manufacturerType",
            width: 44
        },
        {
            header: "Hersteller",
            key: "manufacturerName",
            width: 26
        },
        {
            header: "Menge gesamt",
            key: "quantity",
            width: 14
        },
        {
            header: "Einheit",
            key: "unit",
            width: 10
        },
        {
            header: "Listenpreis/Stk.",
            key: "listUnitPrice",
            width: 16
        },
        {
            header: "Rabattgruppe(n)",
            key: "discountGroups",
            width: 15
        },
        {
            header: "Ø Rabatt %",
            key: "averageDiscount",
            width: 12
        },
        {
            header: "Preis rabattiert/Stk.",
            key: "discountedUnitPrice",
            width: 18
        },
        {
            header: "Gesamt Liste",
            key: "listTotal",
            width: 16
        },
        {
            header: "Rabattbetrag",
            key: "discountTotal",
            width: 16
        },
        {
            header: "Gesamt rabattiert",
            key: "discountedTotal",
            width: 18
        },
        {
            header: "Vorkommen",
            key: "occurrences",
            width: 12
        },
        {
            header: "Icon",
            key: "icon",
            width: excelIconColumnWidth
        }
    ];

    sheet.columns =
        columns.map(column => ({
            key: column.key,
            width: column.width
        }));

    sheet.mergeCells(
        1,
        1,
        1,
        columns.length
    );
    sheet.getCell("A1").value =
        "Kaufmännische Übersicht";
    sheet.getCell("A1").font = {
        bold: true,
        size: 18,
        color: {
            argb: "FF1F3552"
        }
    };

    sheet.addRow([
        "Projekt",
        project.name ?? "",
        "",
        "Kunde",
        project.customerName ?? ""
    ]);
    sheet.mergeCells("B2:C2");
    sheet.mergeCells(
        2,
        5,
        2,
        columns.length
    );
    sheet.addRow([
        "Kundennummer",
        project.customerNumber ?? "",
        "",
        "Ort",
        project.customerCity ?? ""
    ]);
    sheet.mergeCells("B3:C3");
    sheet.mergeCells(
        3,
        5,
        3,
        columns.length
    );
    sheet.addRow([]);
    const totalsRow =
        sheet.addRow([
            "Listenpreis gesamt",
            roundCurrency(totals.listPrice),
            "Rabatt gesamt",
            roundCurrency(totals.discount),
            "Rabattierter Preis gesamt",
            "",
            "",
            roundCurrency(totals.discountedPrice)
        ]);
    sheet.mergeCells(
        totalsRow.number,
        5,
        totalsRow.number,
        7
    );

    if (hasProjectDiscount(totals)) {

        sheet.addRow([
            "Projektrabatt",
            roundCurrency(totals.projectDiscount),
            "",
            "",
            "",
            ""
        ]);

    }

    sheet.addRow([]);

    const headerRow =
        sheet.addRow(
            columns.map(column =>
                column.header
            )
        );

    styleExcelHeaderRow(
        headerRow
    );

    getCommercialSummaries(positions)
        .forEach(summary => {

            const row =
                sheet.addRow(summary);

            row.getCell("icon").value =
                null;

            row.height =
                summary.icon
                    ? 38
                    : 18;

            row.getCell("averageDiscount").numFmt =
                "0.00%";

            [
                "listUnitPrice",
                "discountedUnitPrice",
                "listTotal",
                "discountTotal",
                "discountedTotal"
            ].forEach(key => {

                row.getCell(key).numFmt =
                    "#,##0.00 €";

            });

            addExcelIcon(
                workbook,
                sheet,
                imageCache,
                summary.icon,
                14,
                row.number,
                {
                    maxWidth: 34,
                    maxHeight: 34
                }
            );

        });

    sheet.autoFilter = {
        from: `A${headerRow.number}`,
        to: `N${Math.max(sheet.rowCount, 1)}`
    };

    sheet.views = [
        {
            state: "frozen",
            ySplit: headerRow.number
        }
    ];

    [
        "B5",
        "D5",
        "H5",
        "B6"
    ].forEach(cellAddress => {

        const cell =
            sheet.getCell(cellAddress);

        if (typeof cell.value === "number") {

            cell.numFmt =
                "#,##0.00 €";

        }

    });

    styleExcelWorksheet(sheet);

    totalsRow.getCell(5).alignment = {
        vertical: "middle",
        shrinkToFit: false
    };

    setExcelColumnWidths(
        sheet,
        [
            16,
            44,
            26,
            14,
            10,
            16,
            15,
            12,
            18,
            16,
            16,
            18,
            12,
            excelIconColumnWidth
        ]
    );

}

function buildExcelPositionsSheet(
    workbook,
    positions,
    imageCache
) {

    const sheet =
        workbook.addWorksheet(
            "Positionen"
        );

    sheet.columns = [
        {
            header: "Pos.",
            key: "position",
            width: 7
        },
        {
            header: "Gebäude",
            key: "building",
            width: 22
        },
        {
            header: "Verteilung",
            key: "panel",
            width: 22
        },
        {
            header: "Feld",
            key: "field",
            width: 18
        },
        {
            header: "Messstelle",
            key: "meter",
            width: 22
        },
        {
            header: "Positionsname",
            key: "positionName",
            width: 24
        },
        {
            header: "Artikelnummer",
            key: "articleNumber",
            width: 14
        },
        {
            header: "Hersteller-Typ",
            key: "manufacturerType",
            width: 34
        },
        {
            header: "Hersteller",
            key: "manufacturerName",
            width: 20
        },
        {
            header: "Menge",
            key: "quantity",
            width: 10
        },
        {
            header: "Einheit",
            key: "unit",
            width: 10
        },
        {
            header: "Listenpreis",
            key: "listUnitPrice",
            width: 14
        },
        {
            header: "Rabattgruppe",
            key: "discountGroup",
            width: 12
        },
        {
            header: "Rabatt %",
            key: "discountPercent",
            width: 10
        },
        {
            header: "Preis rabattiert",
            key: "discountedUnitPrice",
            width: 16
        },
        {
            header: "Gesamt Liste",
            key: "listTotal",
            width: 14
        },
        {
            header: "Rabattbetrag",
            key: "discountTotal",
            width: 14
        },
        {
            header: "Gesamt rabattiert",
            key: "discountedTotal",
            width: 16
        },
        {
            header: "Icon",
            key: "icon",
            width: excelIconColumnWidth
        },
        {
            header: "Beschreibung",
            key: "description",
            width: 55
        },
        {
            header: "ProjektNodeId",
            key: "nodeId",
            width: 14
        },
        {
            header: "PositionId",
            key: "id",
            width: 12
        }
    ];

    styleExcelHeaderRow(
        sheet.getRow(1)
    );

    positions.forEach((position, index) => {

        const row =
            sheet.addRow({
                position:
                    index + 1,
                ...position,
                discountPercent:
                    position.discountPercent / 100,
                icon:
                    ""
            });

        row.height =
            position.icon
                ? 38
                : 18;

        [
            "listUnitPrice",
            "discountedUnitPrice",
            "listTotal",
            "discountTotal",
            "discountedTotal"
        ].forEach(key => {

            row.getCell(key).numFmt =
                "#,##0.00 €";

        });

        row.getCell("discountPercent").numFmt =
            "0.00%";

        addExcelIcon(
            workbook,
            sheet,
            imageCache,
            position.icon,
            19,
            row.number,
            {
                maxWidth: 34,
                maxHeight: 34
            }
        );

    });

    sheet.autoFilter = {
        from: "A1",
        to: `V${Math.max(sheet.rowCount, 1)}`
    };

    sheet.views = [
        {
            state: "frozen",
            ySplit: 1
        }
    ];

    styleExcelWorksheet(sheet);

    setExcelColumnWidths(
        sheet,
        [
            7,
            22,
            22,
            18,
            22,
            24,
            14,
            34,
            20,
            10,
            10,
            14,
            12,
            10,
            16,
            14,
            14,
            16,
            excelIconColumnWidth,
            55,
            14,
            12
        ]
    );

}

function buildExcelStructureSheet(
    workbook,
    orderedNodes
) {

    const sheet =
        workbook.addWorksheet(
            "Struktur"
        );

    sheet.columns = [
        {
            header: "NodeId",
            key: "id",
            width: 10
        },
        {
            header: "ParentId",
            key: "parentId",
            width: 10
        },
        {
            header: "Typ",
            key: "type",
            width: 14
        },
        {
            header: "Typ Label",
            key: "typeLabel",
            width: 16
        },
        {
            header: "Name",
            key: "name",
            width: 28
        },
        {
            header: "Ebene",
            key: "depth",
            width: 8
        },
        {
            header: "Pfad",
            key: "path",
            width: 70
        },
        {
            header: "Sortierung",
            key: "sortOrder",
            width: 10
        }
    ];

    styleExcelHeaderRow(
        sheet.getRow(1)
    );

    orderedNodes.forEach(node => {

        sheet.addRow({
            id:
                node.id,
            parentId:
                node.parentId ?? "",
            type:
                node.type,
            typeLabel:
                projectNodeTypeLabels[node.type] ?? node.type,
            name:
                node.name ?? "",
            depth:
                node.depth,
            path:
                node.pathText,
            sortOrder:
                node.sortOrder ?? ""
        });

    });

    sheet.autoFilter = {
        from: "A1",
        to: `H${Math.max(sheet.rowCount, 1)}`
    };

    sheet.views = [
        {
            state: "frozen",
            ySplit: 1
        }
    ];

    styleExcelWorksheet(sheet);

}

function buildExcelImportSheet(
    workbook,
    {
        project,
        nodes,
        positions
    }
) {

    const sheet =
        workbook.addWorksheet(
            "Importdaten"
        );

    sheet.columns = [
        {
            header: "Feld",
            key: "field",
            width: 22
        },
        {
            header: "Wert",
            key: "value",
            width: 120
        }
    ];

    styleExcelHeaderRow(
        sheet.getRow(1)
    );

    const payload = {
        exportVersion,
        project: {
            id:
                project.id,
            customerId:
                project.customerId,
            name:
                project.name ?? "",
            description:
                project.description ?? "",
            projectDiscount:
                project.projectDiscount ?? 0
        },
        nodes:
            nodes.map(node => ({
                id:
                    node.id,
                parentId:
                    node.parentId,
                type:
                    node.type,
                name:
                    node.name ?? "",
                sortOrder:
                    node.sortOrder ?? 0
            })),
        positions:
            positions.map(position => ({
                id:
                    position.id,
                nodeId:
                    position.nodeId,
                articleNumber:
                    position.articleNumber,
                quantity:
                    position.quantity,
                positionName:
                    position.positionName,
                sortOrder:
                    position.sortOrder ?? 0
            }))
    };

    [
        [
            "exportVersion",
            exportVersion
        ],
        [
            "projectId",
            project.id
        ],
        [
            "projectName",
            project.name ?? ""
        ],
        [
            "payloadJson",
            JSON.stringify(payload)
        ]
    ].forEach(([field, value]) =>
        sheet.addRow({
            field,
            value
        })
    );

    styleExcelWorksheet(sheet);

}

function getCommercialSummaries(
    positions
) {

    const summaryByArticleNumber =
        new Map();

    positions.forEach(position => {

        const key =
            String(position.articleNumber);

        if (!summaryByArticleNumber.has(key)) {

            summaryByArticleNumber.set(
                key,
                {
                    articleNumber:
                        position.articleNumber,
                    manufacturerType:
                        position.manufacturerType,
                    manufacturerName:
                        position.manufacturerName,
                    quantity:
                        0,
                    unit:
                        position.unit,
                    listUnitPrice:
                        "",
                    discountGroups:
                        "",
                    averageDiscount:
                        0,
                    discountedUnitPrice:
                        0,
                    listTotal:
                        0,
                    discountTotal:
                        0,
                    discountedTotal:
                        0,
                    occurrences:
                        0,
                    firstNodeOrder:
                        Number.POSITIVE_INFINITY,
                    firstPositionOrder:
                        Number.POSITIVE_INFINITY,
                    icon:
                        position.icon,
                    discountGroupSet:
                        new Set(),
                    listUnitPriceSet:
                        new Set()
                }
            );

        }

        const summary =
            summaryByArticleNumber.get(key);

        summary.quantity +=
            position.quantity;
        summary.listTotal +=
            position.listTotal;
        summary.discountTotal +=
            position.discountTotal;
        summary.discountedTotal +=
            position.discountedTotal;
        summary.occurrences +=
            1;
        summary.firstNodeOrder =
            Math.min(
                summary.firstNodeOrder,
                Number.isFinite(position.nodeOrder)
                    ? position.nodeOrder
                    : Number.POSITIVE_INFINITY
            );
        summary.firstPositionOrder =
            Math.min(
                summary.firstPositionOrder,
                Number.isFinite(position.positionOrder)
                    ? position.positionOrder
                    : Number.POSITIVE_INFINITY
            );

        if (position.discountGroup) {

            summary.discountGroupSet.add(
                position.discountGroup
            );

        }

        summary.listUnitPriceSet.add(
            position.listUnitPrice
        );

    });

    return Array.from(
        summaryByArticleNumber.values()
    )
        .sort((first, second) =>
            compareCommercialSummaries(
                first,
                second
            )
        )
        .map(summary => {

            summary.averageDiscount =
                summary.listTotal > 0
                    ? summary.discountTotal / summary.listTotal
                    : 0;

            summary.discountedUnitPrice =
                summary.quantity > 0
                    ? roundCurrency(summary.discountedTotal / summary.quantity)
                    : 0;

            summary.listUnitPrice =
                formatDistinctNumbers(
                    summary.listUnitPriceSet
                );

            summary.discountGroups =
                Array.from(
                    summary.discountGroupSet
                ).join(", ");

            delete summary.discountGroupSet;
            delete summary.listUnitPriceSet;

            return summary;

        });

}

function groupPositionsByNodeId(
    positions
) {

    const positionsByNodeId =
        new Map();

    positions.forEach(position => {

        const key =
            String(position.nodeId);

        if (!positionsByNodeId.has(key)) {

            positionsByNodeId.set(
                key,
                []
            );

        }

        positionsByNodeId
            .get(key)
            .push(position);

    });

    return positionsByNodeId;

}

function compareCommercialSummaries(
    first,
    second
) {

    const firstPositionOrder =
        Number.isFinite(first.firstPositionOrder)
            ? first.firstPositionOrder
            : Number.POSITIVE_INFINITY;

    const secondPositionOrder =
        Number.isFinite(second.firstPositionOrder)
            ? second.firstPositionOrder
            : Number.POSITIVE_INFINITY;

    if (firstPositionOrder !== secondPositionOrder) {

        return firstPositionOrder - secondPositionOrder;

    }

    const firstNodeOrder =
        Number.isFinite(first.firstNodeOrder)
            ? first.firstNodeOrder
            : Number.POSITIVE_INFINITY;

    const secondNodeOrder =
        Number.isFinite(second.firstNodeOrder)
            ? second.firstNodeOrder
            : Number.POSITIVE_INFINITY;

    if (firstNodeOrder !== secondNodeOrder) {

        return firstNodeOrder - secondNodeOrder;

    }

    const firstDiscountGroupIndex =
        getCommercialDiscountGroupSortIndex(
            first.discountGroupSet
            ||
            first.discountGroups
        );

    const secondDiscountGroupIndex =
        getCommercialDiscountGroupSortIndex(
            second.discountGroupSet
            ||
            second.discountGroups
        );

    if (
        firstDiscountGroupIndex
        !==
        secondDiscountGroupIndex
    ) {

        return firstDiscountGroupIndex - secondDiscountGroupIndex;

    }

    return String(first.articleNumber).localeCompare(
        String(second.articleNumber),
        "de",
        {
            numeric: true
        }
    );

}

function getCommercialDiscountGroupSortIndex(
    discountGroups
) {

    const normalizedDiscountGroups =
        Array.from(
            discountGroups instanceof Set
                ? discountGroups
                : String(discountGroups ?? "")
                    .split(",")
        )
            .map(normalizeDiscountGroup)
            .filter(Boolean);

    const matchingIndexes =
        normalizedDiscountGroups
            .map(discountGroup =>
                commercialDiscountGroupOrder.indexOf(
                    discountGroup
                )
            )
            .filter(index =>
                index !== -1
            );

    if (matchingIndexes.length === 0) {

        return commercialDiscountGroupOrder.length;

    }

    return Math.min(
        ...matchingIndexes
    );

}

function normalizeDiscountGroup(
    value
) {

    const match =
        String(value ?? "")
            .toUpperCase()
            .replace(/\s+/g, "")
            .match(/^PG\d+$/);

    return match?.[0] ?? "";

}

function addExcelIcon(
    workbook,
    sheet,
    imageCache,
    iconName,
    columnNumber,
    rowNumber,
    {
        maxWidth = 34,
        maxHeight = 34
    } = {}
) {

    if (!iconName) {

        return;

    }

    const iconPath =
        path.resolve(
            "public",
            "icons",
            iconName
        );

    if (!fs.existsSync(iconPath)) {

        return;

    }

    const iconCell =
        sheet.getRow(rowNumber)
            .getCell(columnNumber);

    iconCell.value =
        null;

    iconCell.alignment = {
        vertical: "middle",
        horizontal: "center"
    };

    if (!imageCache.has(iconName)) {

        imageCache.set(
            iconName,
            {
                size:
                    getImageDisplaySize(
                        iconPath,
                        maxWidth,
                        maxHeight
                    )
            }
        );

    }

    const extension =
        getExcelImageExtension(
            iconName
        );

    if (!extension) {

        return;

    }

    const cachedImage =
        imageCache.get(iconName);

    const imageId =
        workbook.addImage({
            filename: iconPath,
            extension
        });

    const columnWidthPixels =
        getExcelColumnWidthPixels(
            sheet.getColumn(columnNumber).width
        );

    const rowHeightPixels =
        getExcelRowHeightPixels(
            sheet.getRow(rowNumber).height
        );

    const columnOffset =
        clampExcelImageOffset(
            (
                Math.max(
                    0,
                    (columnWidthPixels - cachedImage.size.width) / 2
                )
                /
                columnWidthPixels
            )
            +
            excelIconAnchorCorrection.column
        );

    const rowOffset =
        clampExcelImageOffset(
            (
                Math.max(
                    0,
                    (rowHeightPixels - cachedImage.size.height) / 2
                )
                /
                rowHeightPixels
            )
            +
            excelIconAnchorCorrection.row
        );

    sheet.addImage(
        imageId,
        {
            tl: {
                col:
                    columnNumber - 1 + columnOffset,
                row:
                    rowNumber - 1 + rowOffset
            },
            ext: {
                width:
                    cachedImage.size.width,
                height:
                    cachedImage.size.height
            }
        }
    );

}

function clampExcelImageOffset(
    offset
) {

    return Math.min(
        0.9,
        Math.max(
            0,
            offset
        )
    );

}

function getExcelColumnWidthPixels(
    width
) {

    return Math.max(
        1,
        Math.round(((Number(width) || 8) * 7) + 5)
    );

}

function getExcelRowHeightPixels(
    height
) {

    return Math.max(
        1,
        Math.round((Number(height) || 15) * 96 / 72)
    );

}

function getExcelImageExtension(
    iconName
) {

    const extension =
        path.extname(iconName)
            .replace(".", "")
            .toLowerCase();

    if (
        extension === "jpg"
        ||
        extension === "jpeg"
        ||
        extension === "jsp"
    ) {

        return "jpeg";

    }

    if (
        extension === "png"
        ||
        extension === "gif"
    ) {

        return extension;

    }

    return "";

}

function getImageDisplaySize(
    imagePath,
    maxWidth,
    maxHeight
) {

    const dimensions =
        getImageDimensions(
            imagePath
        );

    if (!dimensions) {

        return {
            width:
                maxWidth,
            height:
                maxHeight
        };

    }

    const scale =
        Math.min(
            maxWidth / dimensions.width,
            maxHeight / dimensions.height,
            1
        );

    return {
        width:
            Math.max(
                1,
                Math.round(dimensions.width * scale)
            ),
        height:
            Math.max(
                1,
                Math.round(dimensions.height * scale)
            )
    };

}

function getImageDimensions(
    imagePath
) {

    const buffer =
        fs.readFileSync(
            imagePath
        );

    if (isPngBuffer(buffer)) {

        return {
            width:
                buffer.readUInt32BE(16),
            height:
                buffer.readUInt32BE(20)
        };

    }

    if (isJpegBuffer(buffer)) {

        return getJpegDimensions(
            buffer
        );

    }

    return null;

}

function isPngBuffer(
    buffer
) {

    return buffer.length >= 24
        &&
        buffer.toString("ascii", 1, 4) === "PNG";

}

function isJpegBuffer(
    buffer
) {

    return buffer.length >= 4
        &&
        buffer[0] === 0xff
        &&
        buffer[1] === 0xd8;

}

function getJpegDimensions(
    buffer
) {

    let offset =
        2;

    while (offset < buffer.length) {

        if (buffer[offset] !== 0xff) {

            return null;

        }

        const marker =
            buffer[offset + 1];

        const length =
            buffer.readUInt16BE(
                offset + 2
            );

        if (
            marker >= 0xc0
            &&
            marker <= 0xc3
        ) {

            return {
                width:
                    buffer.readUInt16BE(offset + 7),
                height:
                    buffer.readUInt16BE(offset + 5)
            };

        }

        offset +=
            2
            +
            length;

    }

        return null;

}

function styleExcelHeaderRow(
    row
) {

    row.font = {
        bold: true,
        color: {
            argb: "FFFFFFFF"
        }
    };

    row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FF1F3552"
        }
    };

    row.alignment = {
        vertical: "middle",
        wrapText: true
    };

    row.height =
        24;

}

function styleExcelKeyValueSheet(
    sheet
) {

    sheet.eachRow(row => {

        row.getCell(1).font = {
            bold: true
        };

    });

    styleExcelWorksheet(sheet);

}

function styleExcelWorksheet(
    sheet
) {

    sheet.eachRow(row => {

        row.eachCell(cell => {

            const isHeaderCell =
                cell.fill?.fgColor?.argb
                ===
                "FF1F3552";

            cell.alignment = {
                vertical: "middle",
                wrapText:
                    isHeaderCell,
                shrinkToFit:
                    !isHeaderCell
            };

            cell.border = {
                top: {
                    style: "thin",
                    color: {
                        argb: "FFE5EAF0"
                    }
                },
                left: {
                    style: "thin",
                    color: {
                        argb: "FFE5EAF0"
                    }
                },
                bottom: {
                    style: "thin",
                    color: {
                        argb: "FFE5EAF0"
                    }
                },
                right: {
                    style: "thin",
                    color: {
                        argb: "FFE5EAF0"
                    }
                }
            };

        });

    });

}

function setExcelColumnWidths(
    sheet,
    widths
) {

    widths.forEach((width, index) => {

        sheet.getColumn(index + 1).width =
            width;

    });

}

function buildProjectSheet(
    {
        project,
        totals,
        positions,
        orderedNodes
    }
) {

    const rows = [
        [
            "ProjectBuilder Export"
        ],
        [],
        [
            "Projekt",
            project.name ?? ""
        ],
        [
            "Kunde",
            project.customerName ?? ""
        ],
        [
            "Kundennummer",
            project.customerNumber ?? ""
        ],
        [
            "Ort",
            project.customerCity ?? ""
        ],
        [
            "Beschreibung",
            project.description ?? ""
        ],
        [],
        [
            "Positionen",
            positions.length
        ],
        [
            "Strukturelemente",
            orderedNodes.length
        ],
        [],
        [
            "Listenpreis gesamt",
            roundCurrency(totals.listPrice)
        ],
        [
            "Rabatt gesamt",
            roundCurrency(totals.discount)
        ],
        ...renderProjectDiscountRows(totals),
        [
            "Rabattierter Preis gesamt",
            roundCurrency(totals.discountedPrice)
        ],
        [],
        [
            "Export-Version",
            exportVersion
        ],
        [
            "Exportiert am",
            new Date()
        ]
    ];

    const sheet =
        XLSX.utils.aoa_to_sheet(
            rows
        );

    const headerRowIndex =
        rows.findIndex(row =>
            row[0] === "Struktur / Position"
        )
        +
        1;

    sheet["!merges"] = [
        {
            s: {
                r: 0,
                c: 0
            },
            e: {
                r: 0,
                c: 3
            }
        }
    ];

    sheet["!cols"] = [
        {
            wch: 32
        },
        {
            wch: 42
        },
        {
            wch: 16
        },
        {
            wch: 16
        }
    ];

    setNumberFormats(
        sheet,
        [
            "B12",
            "B13",
            "B14"
        ],
        "#,##0.00 €"
    );

    setNumberFormats(
        sheet,
        [
            "B17"
        ],
        "dd.mm.yyyy hh:mm"
    );

    return sheet;

}

function buildPositionsSheet(
    positions
) {

    const headers = [
        "Pos.",
        "Gebäude",
        "Verteilung",
        "Feld",
        "Messstelle",
        "Positionsname",
        "Artikelnummer",
        "Hersteller-Typ",
        "Hersteller",
        "Menge",
        "Einheit",
        "Listenpreis",
        "Rabattgruppe",
        "Rabatt %",
        "Preis rabattiert",
        "Gesamt Liste",
        "Rabattbetrag",
        "Gesamt rabattiert",
        "Icon",
        "Beschreibung",
        "ProjektNodeId",
        "PositionId"
    ];

    const rows = [
        headers,
        ...positions.map((position, index) => [
            index + 1,
            position.building,
            position.panel,
            position.field,
            position.meter,
            position.positionName,
            position.articleNumber,
            position.manufacturerType,
            position.manufacturerName,
            position.quantity,
            position.unit,
            position.listUnitPrice,
            position.discountGroup,
            position.discountPercent / 100,
            position.discountedUnitPrice,
            position.listTotal,
            position.discountTotal,
            position.discountedTotal,
            position.icon,
            position.description,
            position.nodeId,
            position.id
        ])
    ];

    const sheet =
        XLSX.utils.aoa_to_sheet(
            rows
        );

    sheet["!cols"] = [
        {
            wch: 7
        },
        {
            wch: 22
        },
        {
            wch: 22
        },
        {
            wch: 18
        },
        {
            wch: 22
        },
        {
            wch: 24
        },
        {
            wch: 26
        },
        {
            wch: 28
        },
        {
            wch: 20
        },
        {
            wch: 10
        },
        {
            wch: 10
        },
        {
            wch: 14
        },
        {
            wch: 12
        },
        {
            wch: 10
        },
        {
            wch: 16
        },
        {
            wch: 14
        },
        {
            wch: 14
        },
        {
            wch: 16
        },
        {
            wch: 18
        },
        {
            wch: 55
        },
        {
            wch: 14
        },
        {
            wch: 12
        }
    ];

    sheet["!autofilter"] = {
        ref:
            `A1:V${Math.max(positions.length + 1, 1)}`
    };

    sheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1
    };

    for (
        let rowIndex = 2;
        rowIndex <= positions.length + 1;
        rowIndex++
    ) {

        [
            "L",
            "O",
            "P",
            "Q",
            "R"
        ].forEach(column =>
            setNumberFormat(
                sheet,
                `${column}${rowIndex}`,
                "#,##0.00 €"
            )
        );

        setNumberFormat(
            sheet,
            `N${rowIndex}`,
            "0.00%"
        );

    }

    addIconLinks(
        sheet,
        "S",
        2,
        positions.length + 1
    );

    return sheet;

}

function buildPrintableStructureSheet(
    {
        project,
        totals,
        orderedNodes,
        positions
    },
    options = {}
) {

    const includePrices =
        options.includePrices !== false;

    const includeDiscounts =
        includePrices
        && options.includeDiscounts !== false;

    const priceMode =
        options.priceMode === "discounted"
            ? "discounted"
            : "list";

    const projectDiscountFactor =
        1
        -
        (
            normalizeDiscountPercent(
                project.projectDiscount
            )
            /
            100
        );

    const headers = [
        "Struktur / Position",
        "Menge",
        "Artikelnummer",
        "Hersteller-Typ",
        ...(
            includePrices
                ? [
                    "Einzelpreis",
                    includeDiscounts
                        ? "Rabatt %"
                        : "Gesamtpreis",
                    ...(
                        includeDiscounts
                            ? [
                                "Gesamt rabattiert"
                            ]
                            : []
                    )
                ]
                : []
        ),
        "Icon"
    ];

    const columnCount =
        headers.length;

    const positionsByNodeId =
        new Map();

    positions.forEach(position => {

        const key =
            String(position.nodeId);

        if (!positionsByNodeId.has(key)) {

            positionsByNodeId.set(
                key,
                []
            );

        }

        positionsByNodeId
            .get(key)
            .push(position);

    });

    const rows = [
        [
            options.sheetTitle ?? "Projektstruktur"
        ],
        [
            "Projekt",
            project.name ?? "",
            "",
            "Kunde",
            project.customerName ?? ""
        ],
        [
            "Kundennummer",
            project.customerNumber ?? "",
            "",
            "Ort",
            project.customerCity ?? ""
        ],
        [],
        ...(
            includePrices
                ? [
                    includeDiscounts
                        ? [
                            "Listenpreis gesamt",
                            roundCurrency(totals.listPrice),
                            "Rabatt gesamt",
                            roundCurrency(totals.discount),
                            "Rabattierter Preis gesamt",
                            roundCurrency(totals.discountedPrice)
                        ]
                        : [
                            "Gesamtpreis",
                            roundCurrency(
                                priceMode === "discounted"
                                    ? totals.discountedPrice
                                    : totals.listPrice
                            )
                        ]
                ]
                : []
        ),
        ...(
            includeDiscounts
            && hasProjectDiscount(totals)
                ? [
                    [
                        "Projektrabatt",
                        roundCurrency(totals.projectDiscount),
                        "",
                        "",
                        "",
                        ""
                    ]
                ]
                : []
        ),
        [],
        headers
    ];

    orderedNodes.forEach(node => {

        rows.push([
            `${"  ".repeat(node.depth)}${projectNodeTypeLabels[node.type] ?? node.type}: ${node.name ?? ""}`,
            ...Array(columnCount - 1).fill("")
        ]);

        (
            positionsByNodeId.get(
                String(node.id)
            )
            ||
            []
        ).forEach(position => {

            const label =
                position.positionName
                    ? `${position.positionName} - ${position.manufacturerType}`
                    : position.manufacturerType;

            rows.push([
                `${"  ".repeat(node.depth + 1)}${label}`,
                position.quantity,
                position.articleNumber,
                position.manufacturerType,
                ...(
                    includePrices
                        ? [
                            priceMode === "discounted"
                                ? roundCurrency(
                                    position.discountedUnitPrice
                                    *
                                    projectDiscountFactor
                                )
                                : position.listUnitPrice,
                            includeDiscounts
                                ? position.discountPercent / 100
                                : roundCurrency(
                                    (
                                        priceMode === "discounted"
                                            ? position.discountedTotal
                                            : position.listTotal
                                    )
                                    *
                                    (
                                        priceMode === "discounted"
                                            ? projectDiscountFactor
                                            : 1
                                    )
                                ),
                            ...(
                                includeDiscounts
                                    ? [
                                        position.discountedTotal
                                    ]
                                    : []
                            )
                        ]
                        : []
                ),
                position.icon
            ]);

        });

    });

    const sheet =
        XLSX.utils.aoa_to_sheet(
            rows
        );

    sheet["!merges"] = [
        {
            s: {
                r: 0,
                c: 0
            },
            e: {
                r: 0,
                c: columnCount - 1
            }
        }
    ];

    sheet["!cols"] = [
        {
            wch: 46
        },
        {
            wch: 10
        },
        {
            wch: 14
        },
        {
            wch: 30
        },
        ...(
            includePrices
                ? [
                    {
                        wch: 14
                    },
                    {
                        wch: includeDiscounts ? 10 : 16
                    },
                    ...(
                        includeDiscounts
                            ? [
                                {
                                    wch: 18
                                }
                            ]
                            : []
                    )
                ]
                : []
        ),
        {
            wch: 18
        }
    ];

    sheet["!margins"] = {
        left: 0.4,
        right: 0.4,
        top: 0.6,
        bottom: 0.6,
        header: 0.2,
        footer: 0.2
    };

    sheet["!autofilter"] = {
        ref:
            `A${headerRowIndex}:${getExcelColumnName(columnCount)}${Math.max(rows.length, headerRowIndex)}`
    };

    if (includePrices) {

        setNumberFormat(
            sheet,
            "B5",
            "#,##0.00 €"
        );

        if (includeDiscounts) {

            setNumberFormats(
                sheet,
                [
                    "D5",
                    "F5"
                ],
                "#,##0.00 €"
            );

        }

    }

    for (
        let rowIndex = headerRowIndex + 1;
        rowIndex <= rows.length;
        rowIndex++
    ) {

        if (includePrices) {

            setNumberFormat(
                sheet,
                `E${rowIndex}`,
                "#,##0.00 €"
            );

            if (includeDiscounts) {

                setNumberFormat(
                    sheet,
                    `F${rowIndex}`,
                    "0.00%"
                );

                setNumberFormat(
                    sheet,
                    `G${rowIndex}`,
                    "#,##0.00 €"
                );

            } else {

                setNumberFormat(
                    sheet,
                    `F${rowIndex}`,
                    "#,##0.00 €"
                );

            }

        }

    }

    addIconLinks(
        sheet,
        getExcelColumnName(columnCount),
        headerRowIndex + 1,
        rows.length
    );

    return sheet;

}

function buildCommercialSummarySheet(
    exportData
) {

    const {
        project,
        totals,
        positions
    } = exportData;

    const summaryByArticleNumber =
        new Map();

    positions.forEach(position => {

        const key =
            String(position.articleNumber);

        if (!summaryByArticleNumber.has(key)) {

            summaryByArticleNumber.set(
                key,
                {
                    articleNumber:
                        position.articleNumber,
                    manufacturerType:
                        position.manufacturerType,
                    manufacturerName:
                        position.manufacturerName,
                    unit:
                        position.unit,
                    icon:
                        position.icon,
                    quantity:
                        0,
                    listTotal:
                        0,
                    discountTotal:
                        0,
                    discountedTotal:
                        0,
                    occurrences:
                        0,
                    firstNodeOrder:
                        Number.POSITIVE_INFINITY,
                    firstPositionOrder:
                        Number.POSITIVE_INFINITY,
                    discountGroups:
                        new Set(),
                    listUnitPrices:
                        new Set()
                }
            );

        }

        const summary =
            summaryByArticleNumber.get(key);

        summary.quantity +=
            position.quantity;

        summary.listTotal +=
            position.listTotal;

        summary.discountTotal +=
            position.discountTotal;

        summary.discountedTotal +=
            position.discountedTotal;

        summary.occurrences +=
            1;
        summary.firstNodeOrder =
            Math.min(
                summary.firstNodeOrder,
                Number.isFinite(position.nodeOrder)
                    ? position.nodeOrder
                    : Number.POSITIVE_INFINITY
            );
        summary.firstPositionOrder =
            Math.min(
                summary.firstPositionOrder,
                Number.isFinite(position.positionOrder)
                    ? position.positionOrder
                    : Number.POSITIVE_INFINITY
            );

        if (position.discountGroup) {

            summary.discountGroups.add(
                position.discountGroup
            );

        }

        summary.listUnitPrices.add(
            position.listUnitPrice
        );

    });

    const summaries =
        Array.from(
            summaryByArticleNumber.values()
        )
            .sort((first, second) =>
                compareCommercialSummaries(
                    first,
                    second
                )
            );

    const rows = [
        [
            "Kaufmännische Übersicht"
        ],
        [
            "Projekt",
            project.name ?? "",
            "",
            "Kunde",
            project.customerName ?? ""
        ],
        [
            "Kundennummer",
            project.customerNumber ?? "",
            "",
            "Ort",
            project.customerCity ?? ""
        ],
        [],
        [
            "Listenpreis gesamt",
            roundCurrency(totals.listPrice),
            "Rabatt gesamt",
            roundCurrency(totals.discount),
            "Rabattierter Preis gesamt",
            "",
            "",
            roundCurrency(totals.discountedPrice)
        ],
        ...(
            hasProjectDiscount(totals)
                ? [
                    [
                        "Projektrabatt",
                        roundCurrency(totals.projectDiscount),
                        "",
                        "",
                        "",
                        ""
                    ]
                ]
                : []
        ),
        [],
        [
            "Artikelnummer",
            "Hersteller-Typ",
            "Hersteller",
            "Menge gesamt",
            "Einheit",
            "Listenpreis/Stk.",
            "Rabattgruppe(n)",
            "Ø Rabatt %",
            "Preis rabattiert/Stk.",
            "Gesamt Liste",
            "Rabattbetrag",
            "Gesamt rabattiert",
            "Vorkommen",
            "Icon"
        ],
        ...summaries.map(summary => {

            const averageDiscount =
                summary.listTotal > 0
                    ? summary.discountTotal / summary.listTotal
                    : 0;

            const discountedUnitPrice =
                summary.quantity > 0
                    ? summary.discountedTotal / summary.quantity
                    : 0;

            return [
                summary.articleNumber,
                summary.manufacturerType,
                summary.manufacturerName,
                summary.quantity,
                summary.unit,
                formatDistinctNumbers(
                    summary.listUnitPrices
                ),
                Array.from(
                    summary.discountGroups
                ).join(", "),
                averageDiscount,
                roundCurrency(discountedUnitPrice),
                roundCurrency(summary.listTotal),
                roundCurrency(summary.discountTotal),
                roundCurrency(summary.discountedTotal),
                summary.occurrences,
                summary.icon
            ];

        })
    ];

    const sheet =
        XLSX.utils.aoa_to_sheet(
            rows
        );

    const headerRowNumber =
        hasProjectDiscount(totals)
            ? 8
            : 7;

    sheet["!merges"] = [
        {
            s: {
                r: 0,
                c: 0
            },
            e: {
                r: 0,
                c: 13
            }
        },
        {
            s: {
                r: 4,
                c: 4
            },
            e: {
                r: 4,
                c: 6
            }
        }
    ];

    sheet["!cols"] = [
        {
            wch: 16
        },
        {
            wch: 34
        },
        {
            wch: 26
        },
        {
            wch: 13
        },
        {
            wch: 10
        },
        {
            wch: 18
        },
        {
            wch: 16
        },
        {
            wch: 12
        },
        {
            wch: 20
        },
        {
            wch: 16
        },
        {
            wch: 16
        },
        {
            wch: 18
        },
        {
            wch: 12
        },
        {
            wch: 18
        }
    ];

    sheet["!autofilter"] = {
        ref:
            `A${headerRowNumber}:N${Math.max(rows.length, 1)}`
    };

    sheet["!freeze"] = {
        xSplit: 0,
        ySplit: headerRowNumber
    };

    [
        "B5",
        "D5",
        "H5",
        "B6"
    ].forEach(cellAddress => {

        if (typeof sheet[cellAddress]?.v === "number") {

            setNumberFormat(
                sheet,
                cellAddress,
                "#,##0.00 €"
            );

        }

    });

    for (
        let rowIndex = headerRowNumber + 1;
        rowIndex <= rows.length;
        rowIndex++
    ) {

        setNumberFormat(
            sheet,
            `H${rowIndex}`,
            "0.00%"
        );

        [
            "I",
            "J",
            "K",
            "L"
        ].forEach(column =>
            setNumberFormat(
                sheet,
                `${column}${rowIndex}`,
                "#,##0.00 €"
            )
        );

    }

    addIconLinks(
        sheet,
        "N",
        headerRowNumber + 1,
        rows.length
    );

    return sheet;

}

function buildStructureSheet(
    orderedNodes
) {

    const rows = [
        [
            "NodeId",
            "ParentId",
            "Typ",
            "Typ Label",
            "Name",
            "Ebene",
            "Pfad",
            "Sortierung"
        ],
        ...orderedNodes.map(node => [
            node.id,
            node.parentId ?? "",
            node.type,
            projectNodeTypeLabels[node.type] ?? node.type,
            node.name ?? "",
            node.depth,
            node.pathText,
            node.sortOrder ?? ""
        ])
    ];

    const sheet =
        XLSX.utils.aoa_to_sheet(
            rows
        );

    sheet["!cols"] = [
        {
            wch: 10
        },
        {
            wch: 10
        },
        {
            wch: 14
        },
        {
            wch: 16
        },
        {
            wch: 28
        },
        {
            wch: 8
        },
        {
            wch: 70
        },
        {
            wch: 10
        }
    ];

    sheet["!autofilter"] = {
        ref:
            `A1:H${Math.max(orderedNodes.length + 1, 1)}`
    };

    sheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1
    };

    return sheet;

}

function buildImportSheet(
    {
        project,
        nodes,
        positions
    }
) {

    const payload = {
        exportVersion,
        project: {
            id:
                project.id,
            customerId:
                project.customerId,
            name:
                project.name ?? "",
            description:
                project.description ?? ""
        },
        nodes:
            nodes.map(node => ({
                id:
                    node.id,
                parentId:
                    node.parentId,
                type:
                    node.type,
                name:
                    node.name ?? "",
                sortOrder:
                    node.sortOrder ?? 0
            })),
        positions:
            positions.map(position => ({
                id:
                    position.id,
                nodeId:
                    position.nodeId,
                articleNumber:
                    position.articleNumber,
                quantity:
                    position.quantity,
                positionName:
                    position.positionName,
                sortOrder:
                    position.sortOrder ?? 0
            }))
    };

    const rows = [
        [
            "Feld",
            "Wert"
        ],
        [
            "exportVersion",
            exportVersion
        ],
        [
            "projectId",
            project.id
        ],
        [
            "projectName",
            project.name ?? ""
        ],
        [
            "payloadJson",
            JSON.stringify(payload)
        ]
    ];

    const sheet =
        XLSX.utils.aoa_to_sheet(
            rows
        );

    sheet["!cols"] = [
        {
            wch: 22
        },
        {
            wch: 120
        }
    ];

    return sheet;

}

function compareSortOrder(
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

    return firstSortOrder - secondSortOrder;

}

function getListPrice(
    article = {}
) {

    const price =
        Number(article.listPrice);

    return Number.isFinite(price)
        ? price
        : 0;

}

function getDiscountPercent(
    discountGroup,
    customer = {}
) {

    const normalizedDiscountGroup =
        String(discountGroup ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");

    const discountKey =
        normalizedDiscountGroup.match(/^pg\d+$/)
            ? normalizedDiscountGroup
            : `pg${normalizedDiscountGroup.match(/\d+/)?.[0] ?? ""}`;

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

function hasProjectDiscount(
    totals
) {

    return roundCurrency(
        totals?.projectDiscount ?? 0
    ) > 0;

}

function getExcelColumnName(
    columnNumber
) {

    let columnName = "";
    let remainingNumber =
        columnNumber;

    while (remainingNumber > 0) {

        const remainder =
            (remainingNumber - 1) % 26;

        columnName =
            String.fromCharCode(65 + remainder)
            +
            columnName;

        remainingNumber =
            Math.floor(
                (remainingNumber - 1) / 26
            );

    }

    return columnName;

}

function renderProjectDiscountRows(
    totals
) {

    if (!hasProjectDiscount(totals)) {

        return [];

    }

    return [
        [
            "Projektrabatt",
            roundCurrency(totals.projectDiscount)
        ]
    ];

}

function getExportIconName(
    article = {}
) {

    if (
        isDlArticle(
            article
        )
    ) {

        return "dl.png";

    }

    if (
        isCtArticle(
            article
        )
    ) {

        return "ct-.png";

    }

    if (
        isGridVisArticle(
            article
        )
    ) {

        return "gridvis.png";

    }

    if (
        isRio3Article(
            article
        )
    ) {

        return "rio3.png";

    }

    if (
        isRd96Article(
            article
        )
    ) {

        return "rd96.png";

    }

    const primaryText =
        normalizeExportSearchText(
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

    const primaryRule =
        exportArticleIconRules.find(rule =>
            rule.keywords.some(keyword =>
                primaryText.includes(
                    normalizeExportSearchText(
                        keyword
                    )
                )
            )
        );

    if (primaryRule) {

        return primaryRule.icon;

    }

    return "";

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

    return normalizeExportSearchText(
        article.manufacturerType
    ).includes("gridvis");

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

function normalizeExportSearchText(
    value
) {

    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}

function roundCurrency(
    value
) {

    return Math.round(
        (Number(value) || 0)
        *
        100
    )
    /
    100;

}

function formatDistinctNumbers(
    values
) {

    const numbers =
        Array.from(values)
        .map(value =>
            roundCurrency(value)
        )
        .sort((first, second) =>
            first - second
        );

    if (numbers.length === 1) {

        return numbers[0];

    }

    return numbers
        .map(value =>
            value.toLocaleString(
                "de-DE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )
        )
        .join(" / ");

}

function setNumberFormats(
    sheet,
    cells,
    format
) {

    cells.forEach(cell =>
        setNumberFormat(
            sheet,
            cell,
            format
        )
    );

}

function setNumberFormat(
    sheet,
    cell,
    format
) {

    if (sheet[cell]) {

        sheet[cell].z =
            format;

    }

}

function addIconLinks(
    sheet,
    column,
    startRow,
    endRow
) {

    for (
        let rowIndex = startRow;
        rowIndex <= endRow;
        rowIndex++
    ) {

        const cell =
            sheet[`${column}${rowIndex}`];

        if (
            !cell
            ||
            !cell.v
        ) {

            continue;

        }

        cell.l = {
            Target:
                `http://127.0.0.1:3000/icons/${cell.v}`,
            Tooltip:
                "Icon öffnen"
        };

    }

}

function sanitizeFilename(
    value
) {

    return String(value)
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120)
        ||
        "Projekt";

}

export default router;
