import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import * as database from "../database/index.js";
import * as excelValidation from "../utils/excelValidation.js";

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

        const existingArticles =
                    database.articles.prepare(`

                        SELECT articleNumber
                        FROM articles

                    `).all();

        const existingArticleNumbers =
            new Set(

                existingArticles.map(
                    article =>
                        article.articleNumber
                )

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

            insertArticle.run(article);

        }

        res.json({

            success: true,

            imported:
                validation.imported.length,

            updated:
                validation.updated.length,

            skipped:
                validation.skipped

        });
    }
);

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
                listPriceCurrency

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

export default router;