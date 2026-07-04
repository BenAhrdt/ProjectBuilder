import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import * as database from "../database/index.js";
import * as excelValidation from "../utils/excelValidation.js";
import fs from "fs";

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
            data.map(article => ({

                articleNumber:
                    typeof article.Artikelnummer === "number"
                        ? String(article.Artikelnummer)
                            .replace(/\.0$/, "")
                        : String(article.Artikelnummer ?? "")
                            .trim(),

                ean:
                    article.EAN ?? "",

                manufacturerType:
                    article.Herstellertyp ?? "",

                manufacturerName:
                    article.Herstellername ?? "",

                originCountry:
                    article.Ursprungsland ?? "",

                originRegion:
                    article.Ursprungsregion ?? "",

                intrastatNumber:
                    article.Intrastatnummer ?? "",

                quantity:
                    article.Anzahl_Inhaltseinheiten ?? null,

                quantityUnit:
                    article.Inhaltseinheit ?? "",

                listPrice:
                    article.Preis_Listenpreis_Preis ?? null,

                listPriceCurrency:
                    article["Preis_Listenpreis_Währung"] ?? "",

                discountGroup:
                    article.Rabattgruppe ?? "",

                description:
                    article[
                        "Text_Ausschreibungstext_Langtext (Text)"
                    ] ?? "",

                existsInDatabase:
                    existingArticleNumbers.has(

                        typeof article.Artikelnummer === "number"
                            ? String(article.Artikelnummer)
                                .replace(/\.0$/, "")
                            : String(
                                article.Artikelnummer ?? ""
                            ).trim()

                    )

            }));

        const validation =
            excelValidation.validateArticles(
                preparedArticles
            );

        const insertArticle =
            database.articles.prepare(`

                INSERT OR REPLACE INTO articles (

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

                    description

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

                    @description

                )

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

            insertArticle.run(article);

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

            insertArticle.run(article);

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
                manufacturerType,
                description,
                discountGroup,
                listPrice,
                listPriceCurrency,
                manufacturerName

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
                description

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
                @description

            )

        `).run({
            articleNumber,
            manufacturerType,
            listPrice,
            listPriceCurrency,
            discountGroup,
            description
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

// --------------------------------------------------
// Artikel löschen
// --------------------------------------------------

router.delete("/:articleNumber", (req, res) => {

    const articleNumber =
        req.params.articleNumber;

    const usage =
        database.projectNodeArticles.prepare(`

            SELECT COUNT(*) AS count

            FROM projectNodeArticles

            WHERE articleNumber = ?

        `).get(
            articleNumber
        );

    if (usage.count > 0) {

        res.status(409).json({
            success: false,
            error: `Artikel wird in ${usage.count} Projektposition(en) verwendet.`
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
