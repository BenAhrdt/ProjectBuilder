import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import * as database from "../database/index.js";
import * as excelValidation from "../utils/excelValidation.js";
import {
    resolvePricelistColumns,
    mapPricelistRow
} from "../utils/pricelistColumns.js";
import fs from "fs";
import {
    inferGridVisItems,
    normalizeGridVisItems
} from "../utils/gridVisItems.js";

const router = express.Router();

// --------------------------------------------------
// Upload
// --------------------------------------------------

const upload = multer({
    dest: "uploads/"
});

// --------------------------------------------------
// Import
// --------------------------------------------------

router.post(
    "/import",
    upload.single("file"),
    (req, res) => {

        // --------------------------------------------------
        // Excel lesen
        // --------------------------------------------------
        const workbook =
            XLSX.readFile(req.file.path);

        // erstes Tabellenblatt
        const sheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];

        // JSON erzeugen
        const data =
            XLSX.utils.sheet_to_json(sheet);
            fs.unlinkSync(req.file.path);

        const pricelistColumns =
            resolvePricelistColumns(
                Object.keys(data[0] ?? {})
            );

        if (!pricelistColumns.articleNumber) {
            return res.status(400).json({
                success: false,
                error: "Keine unterstützte Spalte für die Artikelnummer gefunden."
            });
        }

        const preserveExistingPricesFromZero =
            req.body.preserveExistingPricesFromZero === "true";

        const clearExistingArticlesBeforeImport =
            req.body.clearExistingArticlesBeforeImport === "true";

        const existingArticles =
            database.articles.prepare(`

                SELECT
                    articleNumber,
                    listPrice,
                    listPriceCurrency
                FROM articles

            `).all();

        const existingArticleNumbers =
            clearExistingArticlesBeforeImport
                ? new Set()
                : new Set(

                    existingArticles.map(
                        article =>
                            article.articleNumber
                    )

                );

        const existingArticlesByNumber =
            new Map(

                existingArticles.map(article => [
                    article.articleNumber,
                    article
                ])

            );

        const preparedArticles =
            data.map(row => {
                const article =
                    mapPricelistRow(
                        row,
                        pricelistColumns
                    );

                return {
                    ...article,
                    existsInDatabase:
                        existingArticleNumbers.has(
                            article.articleNumber
                        )
                };
            });

        const validation =
            excelValidation.validateArticles(
                preparedArticles
            );

        const insertArticle =
            database.articles.prepare(`

                INSERT INTO articles (

                    articleNumber,
                    ean,

                    manufacturerType,
                    manufacturerName,

                    originCountry,
                    originRegion,

                    intrastatNumber,

                    quantity,
                    quantityUnit,

                    listPrice,
                    listPriceCurrency,

                    discountGroup,

                    description,
                    gridVisItems,
                    gridVisItemsManual

                )

                VALUES (

                    @articleNumber,
                    @ean,

                    @manufacturerType,
                    @manufacturerName,

                    @originCountry,
                    @originRegion,

                    @intrastatNumber,

                    @quantity,
                    @quantityUnit,

                    @listPrice,
                    @listPriceCurrency,

                    @discountGroup,

                    @description,
                    @gridVisItems,
                    0

                )

                ON CONFLICT(articleNumber) DO UPDATE SET
                    ean = CASE WHEN TRIM(excluded.ean) <> '' THEN excluded.ean ELSE articles.ean END,
                    manufacturerType = CASE
                        WHEN articles.salesforceProductId IS NOT NULL THEN articles.manufacturerType
                        WHEN TRIM(excluded.manufacturerType) <> '' THEN excluded.manufacturerType
                        ELSE articles.manufacturerType END,
                    manufacturerName = CASE WHEN TRIM(excluded.manufacturerName) <> '' THEN excluded.manufacturerName ELSE articles.manufacturerName END,
                    originCountry = CASE WHEN TRIM(excluded.originCountry) <> '' THEN excluded.originCountry ELSE articles.originCountry END,
                    originRegion = CASE WHEN TRIM(excluded.originRegion) <> '' THEN excluded.originRegion ELSE articles.originRegion END,
                    intrastatNumber = CASE WHEN TRIM(excluded.intrastatNumber) <> '' THEN excluded.intrastatNumber ELSE articles.intrastatNumber END,
                    quantity = COALESCE(excluded.quantity, articles.quantity),
                    quantityUnit = CASE WHEN TRIM(excluded.quantityUnit) <> '' THEN excluded.quantityUnit ELSE articles.quantityUnit END,
                    listPrice = CASE
                        WHEN articles.salesforceProductId IS NOT NULL THEN articles.listPrice
                        ELSE COALESCE(excluded.listPrice, articles.listPrice) END,
                    listPriceCurrency = CASE
                        WHEN articles.salesforceProductId IS NOT NULL THEN articles.listPriceCurrency
                        WHEN TRIM(excluded.listPriceCurrency) <> '' THEN excluded.listPriceCurrency
                        ELSE articles.listPriceCurrency END,
                    discountGroup = CASE WHEN TRIM(excluded.discountGroup) <> '' THEN excluded.discountGroup ELSE articles.discountGroup END,
                    description = CASE WHEN TRIM(excluded.description) <> '' THEN excluded.description ELSE articles.description END,
                    gridVisItems = CASE
                        WHEN COALESCE(articles.gridVisItemsManual, 0) = 1 THEN articles.gridVisItems
                        ELSE excluded.gridVisItems END

            `);

        let deletedExistingArticles =
            0;

        if (clearExistingArticlesBeforeImport) {

            const deleteResult =
                database.articles.prepare(`

                    DELETE FROM articles

                `).run();

            deletedExistingArticles =
                deleteResult.changes;

        }

        for (
            const article
            of validation.imported
        ) {

            insertArticle.run({
                ...article,
                gridVisItems: inferGridVisItems(article)
            });

        }

        for (
            const article
            of validation.updated
        ) {

            if (
                preserveExistingPricesFromZero
                && shouldPreserveExistingPrice(
                    article,
                    existingArticlesByNumber.get(
                        article.articleNumber
                    )
                )
            ) {

                const existingArticle =
                    existingArticlesByNumber.get(
                        article.articleNumber
                    );

                article.listPrice =
                    existingArticle.listPrice;

                article.listPriceCurrency =
                    existingArticle.listPriceCurrency;

                article.pricePreserved =
                    true;

            }

            insertArticle.run({
                ...article,
                gridVisItems: inferGridVisItems(article)
            });

        }

        res.json({

            success: true,

            imported:
                validation.imported.length,

            updated:
                validation.updated.length,

            preservedPrices:
                validation.updated.filter(
                    article =>
                        article.pricePreserved
                ).length,

            deletedExistingArticles,

            skipped:
                validation.skipped

        });
    }
);

function shouldPreserveExistingPrice(
    importedArticle,
    existingArticle
) {

    if (!existingArticle) {

        return false;

    }

    if (!isZeroOrRequestPrice(importedArticle.listPrice)) {

        return false;

    }

    return hasConcretePrice(existingArticle.listPrice);

}

function isZeroOrRequestPrice(price) {

    if (
        price === null
        || price === undefined
        || price === ""
    ) {

        return true;

    }

    if (
        typeof price === "string"
        && price.trim().toLowerCase() === "auf anfrage"
    ) {

        return true;

    }

    return Number(price) === 0;

}

function hasConcretePrice(price) {

    if (
        price === null
        || price === undefined
        || price === ""
    ) {

        return false;

    }

    if (
        typeof price === "string"
        && price.trim().toLowerCase() === "auf anfrage"
    ) {

        return false;

    }

    const numericPrice =
        Number(price);

    return (
        !Number.isNaN(numericPrice)
        && numericPrice !== 0
    );

}

// --------------------------------------------------
// Ausgabe
// --------------------------------------------------

router.get("/", (req, res) => {

    const search =
        req.query.search ?? "";

    const articles =
        database.articles.prepare(`

            SELECT
                articleNumber,
                ean,
                manufacturerType,
                description,
                discountGroup,
                listPrice,
                listPriceCurrency,
                manufacturerName,
                originCountry,
                originRegion,
                intrastatNumber,
                quantityUnit,
                salesforceProductId,
                salesforcePricebookId,
                salesforceActive,
                salesforceFamily,
                salesforceProductType,
                salesforceAvailabilityCheckedAt,
                salesforceImportedAt,
                salesforceCurrencies,
                gridVisItems,
                gridVisItemsManual

            FROM articles

            WHERE

                articleNumber LIKE @search
                OR ean LIKE @search

                OR manufacturerType LIKE @search
                OR manufacturerName LIKE @search

                OR originCountry LIKE @search
                OR originRegion LIKE @search

                OR intrastatNumber LIKE @search

                OR quantity LIKE @search
                OR quantityUnit LIKE @search

                OR listPrice LIKE @search
                OR listPriceCurrency LIKE @search

                OR discountGroup LIKE @search

                OR description LIKE @search

        `).all({

            search:
                `%${search}%`

        });

    res.json(articles);

});

// --------------------------------------------------
// Manuellen Artikel hinzufügen
// --------------------------------------------------

router.post("/", (req, res) => {

    const articleNumber =
        String(
            req.body.articleNumber ?? ""
        ).trim();

    const manufacturerType =
        String(
            req.body.manufacturerType ?? ""
        ).trim();

    const description =
        String(
            req.body.description ?? ""
        ).trim();

    const discountGroup =
        String(
            req.body.discountGroup ?? ""
        ).trim();

    const rawPrice =
        req.body.listPrice;

    const listPrice =
        rawPrice === "" || rawPrice === null || rawPrice === undefined
            ? null
            : Number(rawPrice);

    const listPriceCurrency =
        String(
            req.body.listPriceCurrency ?? "EUR"
        ).trim() || "EUR";

    if (!articleNumber) {

        res.status(400).json({
            success: false,
            error: "Artikelnummer fehlt"
        });

        return;

    }

    if (!manufacturerType) {

        res.status(400).json({
            success: false,
            error: "Name fehlt"
        });

        return;

    }

    if (
        listPrice !== null
        && Number.isNaN(listPrice)
    ) {

        res.status(400).json({
            success: false,
            error: "Ungültiger Preis"
        });

        return;

    }

    try {

        database.articles.prepare(`

            INSERT INTO articles (

                articleNumber,
                ean,
                manufacturerType,
                manufacturerName,
                originCountry,
                originRegion,
                intrastatNumber,
                quantity,
                quantityUnit,
                listPrice,
                listPriceCurrency,
                discountGroup,
                description,
                gridVisItems,
                gridVisItemsManual

            )

            VALUES (

                @articleNumber,
                '',
                @manufacturerType,
                'Manuell',
                '',
                '',
                '',
                1,
                'Stk',
                @listPrice,
                @listPriceCurrency,
                @discountGroup,
                @description,
                @gridVisItems,
                0

            )

        `).run({
            articleNumber,
            manufacturerType,
            listPrice,
            listPriceCurrency,
            discountGroup,
            description,
            gridVisItems: inferGridVisItems({
                manufacturerType,
                description
            })
        });

        res.json({
            success: true,
            articleNumber
        });

    } catch (error) {

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {

            res.status(409).json({
                success: false,
                error: "Artikelnummer existiert bereits"
            });

            return;

        }

        throw error;

    }

});

// --------------------------------------------------
// Preis aktualisieren
// --------------------------------------------------

router.patch("/:articleNumber/price", (req, res) => {

    const articleNumber =
        req.params.articleNumber;

    const rawPrice =
        req.body.listPrice;

    const listPrice =
        rawPrice === "" || rawPrice === null
            ? null
            : Number(rawPrice);

    const listPriceCurrency =
        String(
            req.body.listPriceCurrency ?? "EUR"
        ).trim() || "EUR";

    if (
        listPrice !== null
        && Number.isNaN(listPrice)
    ) {

        res.status(400).json({
            ok: false,
            error: "Ungültiger Preis"
        });

        return;

    }

    const result =
        database.articles.prepare(`

            UPDATE articles
            SET
                listPrice = @listPrice,
                listPriceCurrency = @listPriceCurrency
            WHERE articleNumber = @articleNumber

        `).run({
            articleNumber,
            listPrice,
            listPriceCurrency
        });

    if (result.changes === 0) {

        res.status(404).json({
            ok: false,
            error: "Artikel nicht gefunden"
        });

        return;

    }

    res.json({
        ok: true,
        articleNumber,
        listPrice,
        listPriceCurrency
    });

});

router.patch("/:articleNumber/gridvis-items", (req, res) => {
    const articleNumber = req.params.articleNumber;
    const gridVisItems = normalizeGridVisItems(req.body.gridVisItems);

    if (Number.isNaN(gridVisItems)) {
        return res.status(400).json({
            ok: false,
            error: "Ungültige GridVis-Itemzahl"
        });
    }

    const result = database.articles.prepare(`
        UPDATE articles
        SET gridVisItems = @gridVisItems, gridVisItemsManual = 1
        WHERE articleNumber = @articleNumber
    `).run({ articleNumber, gridVisItems });

    if (result.changes === 0) {
        return res.status(404).json({ ok: false, error: "Artikel nicht gefunden" });
    }

    res.json({ ok: true, articleNumber, gridVisItems });
});

// --------------------------------------------------
// Artikel löschen
// --------------------------------------------------

router.delete("/", (req, res) => {

    const counts =
        database.projectNodeArticles.prepare(`

            SELECT
                COUNT(*) AS positionCount,
                COUNT(DISTINCT articleNumber) AS usedArticleCount

            FROM projectNodeArticles

            WHERE articleNumber IN (

                SELECT articleNumber
                FROM articles

            )

        `).get();

    const totalArticleCount = database.articles.prepare(
        "SELECT COUNT(*) AS count FROM articles"
    ).get().count;
    const unusedArticleCount = totalArticleCount - counts.usedArticleCount;

    if (counts.positionCount > 0 && req.query.unused !== "true") {

        res.status(409).json({
            success: false,
            code: "ARTICLES_IN_USE",
            positionCount: counts.positionCount,
            usedArticleCount: counts.usedArticleCount,
            unusedArticleCount,
            error: `Die Artikelliste kann nicht vollständig geleert werden, weil ${counts.usedArticleCount} Artikel in ${counts.positionCount} Projektposition(en) verwendet werden.`
        });

        return;

    }

    const result = req.query.unused === "true"
        ? database.articles.prepare(`
            DELETE FROM articles
            WHERE NOT EXISTS (
                SELECT 1 FROM projectNodeArticles
                WHERE projectNodeArticles.articleNumber = articles.articleNumber
            )
        `).run()
        : database.articles.prepare("DELETE FROM articles").run();

    res.json({
        success: true,
        deletedArticles: result.changes,
        protectedArticles: req.query.unused === "true" ? counts.usedArticleCount : 0
    });

});

router.delete("/:articleNumber", (req, res) => {

    const articleNumber =
        req.params.articleNumber;

    const usages =
        database.projectNodeArticles.prepare(`

            SELECT
                projectNodeArticles.id,
                projectNodeArticles.positionName,
                projectNodes.id AS nodeId,
                projectNodes.projectId,
                projectNodes.parentId,
                projectNodes.name AS nodeName,
                projects.name AS projectName

            FROM projectNodeArticles

            LEFT JOIN projectNodes
            ON projectNodes.id = projectNodeArticles.projectNodeId

            LEFT JOIN projects
            ON projects.id = projectNodes.projectId

            WHERE projectNodeArticles.articleNumber = ?

            ORDER BY
                projects.name,
                projectNodeArticles.id

        `).all(
            articleNumber
        );

    if (usages.length > 0) {

        const nodes =
            database.projectNodes.prepare(`

                SELECT
                    id,
                    projectId,
                    parentId,
                    name

                FROM projectNodes

            `).all();

        const nodesByProjectAndId =
            new Map(
                nodes.map(node => [
                    `${node.projectId}:${node.id}`,
                    node
                ])
            );

        const usageDetails =
            usages.map(usage => {

                const path =
                    [usage.nodeName || "Unbekannte Strukturposition"];

                const visited =
                    new Set([
                        String(usage.nodeId)
                    ]);

                let parentId =
                    usage.parentId;

                while (
                    parentId !== null
                    && parentId !== undefined
                    && !visited.has(String(parentId))
                ) {

                    visited.add(String(parentId));

                    const parent =
                        nodesByProjectAndId.get(
                            `${usage.projectId}:${parentId}`
                        );

                    if (!parent) {

                        break;

                    }

                    path.unshift(
                        parent.name
                        || "Unbenannte Strukturposition"
                    );

                    parentId =
                        parent.parentId;

                }

                return {
                    projectId: usage.projectId,
                    projectName:
                        usage.projectName
                        || "Unbekanntes Projekt",
                    nodeId: usage.nodeId,
                    path: path.join(" › "),
                    positionName:
                        usage.positionName
                        || ""
                };

            });

        res.status(409).json({
            success: false,
            error: `Artikel wird in ${usages.length} Projektposition(en) verwendet.`,
            usages: usageDetails
        });

        return;

    }

    const result =
        database.articles.prepare(`

            DELETE FROM articles

            WHERE articleNumber = ?

        `).run(
            articleNumber
        );

    if (result.changes === 0) {

        res.status(404).json({
            success: false,
            error: "Artikel nicht gefunden"
        });

        return;

    }

    res.json({
        success: true
    });

});

export default router;
