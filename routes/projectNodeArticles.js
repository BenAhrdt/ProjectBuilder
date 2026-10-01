import express from "express";

import * as database
from "../database/index.js";

const router =
    express.Router();

function parseSpecialDiscount(
    value,
    fallback = null
) {

    if (value === undefined) {

        return fallback;

    }

    if (value === null || String(value).trim() === "") {

        return null;

    }

    const discount =
        Number(
            String(value).trim().replace(",", ".")
        );

    return Number.isFinite(discount)
        && discount >= 0
        && discount <= 100
            ? discount
            : NaN;

}

function parseSpecialPrice(
    value,
    fallback = null
) {

    if (value === undefined) {

        return fallback;

    }

    if (value === null || String(value).trim() === "") {

        return null;

    }

    const price =
        Number(
            String(value).trim().replace(",", ".")
        );

    return Number.isFinite(price)
        && price >= 0
            ? price
            : NaN;

}

router.get(
    "/",
    (req, res) => {

        const projectId = String(req.query.projectId ?? "").trim();
        const articles = projectId
            ? database.projectNodeArticles.prepare(`

                SELECT projectNodeArticles.*

                FROM projectNodeArticles

                INNER JOIN projectNodes
                ON projectNodes.id = projectNodeArticles.projectNodeId

                WHERE projectNodes.projectId = ?

                ORDER BY
                    projectNodeArticles.projectNodeId ASC,
                    COALESCE(projectNodeArticles.sortOrder, projectNodeArticles.id) ASC,
                    projectNodeArticles.id ASC

            `).all(projectId)
            : database.projectNodeArticles.prepare(`

                SELECT *

                FROM projectNodeArticles

                ORDER BY
                    projectNodeId ASC,
                    COALESCE(sortOrder, id) ASC,
                    id ASC

            `).all();

        res.json(
            articles
        );

    }
);

router.post(
    "/",
    (req, res) => {

        const specialDiscount =
            parseSpecialDiscount(req.body.specialDiscount);
        const specialPrice =
            parseSpecialPrice(req.body.specialPrice);

        if (Number.isNaN(specialDiscount)) {

            res.status(400).json({
                error: "Ungültiger Sonderrabatt"
            });

            return;

        }

        if (Number.isNaN(specialPrice)) {

            res.status(400).json({
                error: "Ungültiger Festpreis"
            });

            return;

        }

        const nextSortOrder =
            database.projectNodeArticles.prepare(`

                SELECT COALESCE(MAX(sortOrder), -1) + 1 AS sortOrder

                FROM projectNodeArticles

                WHERE projectNodeId = ?

            `).get(
                req.body.projectNodeId
            ).sortOrder;

        const result =
            database.projectNodeArticles.prepare(`

            INSERT INTO projectNodeArticles (

                projectNodeId,
                articleNumber,
                quantity,
                positionName,
                sortOrder,
                isOptional,
                isAlternative,
                specialDiscount,
                specialPrice

            )

            VALUES (

                @projectNodeId,
                @articleNumber,
                @quantity,
                @positionName,
                @sortOrder,
                @isOptional,
                @isAlternative,
                @specialDiscount,
                @specialPrice

            )

        `).run({

            projectNodeId:
                req.body.projectNodeId,

            articleNumber:
                req.body.articleNumber,

            quantity:
                req.body.quantity ?? 1,

            positionName:
                req.body.positionName ?? null,

            sortOrder:
                req.body.sortOrder ?? nextSortOrder,

            isOptional: req.body.isOptional ? 1 : 0,
            isAlternative: req.body.isAlternative ? 1 : 0,
            specialDiscount,
            specialPrice

        });

        const article =
            database.projectNodeArticles.prepare(`

                SELECT *

                FROM projectNodeArticles

                WHERE id = ?

            `).get(
                result.lastInsertRowid
            );

        res.json(
            article
        );

    }
);

router.patch(
    "/reorder/:projectNodeId",
    (req, res) => {

        const updateSortOrder =
            database.projectNodeArticles.prepare(`

                UPDATE projectNodeArticles

                SET sortOrder = @sortOrder

                WHERE id = @id
                AND projectNodeId = @projectNodeId

            `);

        const transaction =
            database.projectNodeArticles.transaction(positions => {

                positions.forEach((position, index) => {

                    updateSortOrder.run({

                        id:
                            position.id,

                        projectNodeId:
                            req.params.projectNodeId,

                        sortOrder:
                            index

                    });

                });

            });

        transaction(
            Array.isArray(req.body.positions)
                ? req.body.positions
                : []
        );

        res.json({
            success: true
        });

    }
);

router.patch(
    "/:id",
    (req, res) => {

        const {
            id
        } = req.params;

        const current =
            database.projectNodeArticles.prepare(`

                SELECT *

                FROM projectNodeArticles

                WHERE id = ?

            `).get(
                id
            );

        if (!current) {

            res.status(404).json({
                error: "Position nicht gefunden"
            });

            return;

        }

        const quantity =
            req.body.quantity === undefined
                ? current.quantity
                : Number(req.body.quantity);

        const nextArticleNumber =
            req.body.articleNumber === undefined
                ? current.articleNumber
                : String(req.body.articleNumber ?? "").trim();

        if (!nextArticleNumber) {

            res.status(400).json({
                error: "Artikelnummer fehlt"
            });

            return;

        }

        if (nextArticleNumber !== current.articleNumber) {

            const replacementArticle =
                database.articles.prepare(`

                    SELECT articleNumber

                    FROM articles

                    WHERE articleNumber = ?

                `).get(nextArticleNumber);

            if (!replacementArticle) {

                res.status(404).json({
                    error: `Artikelnummer ${nextArticleNumber} wurde nicht gefunden.`
                });

                return;

            }

        }

        const nextSpecialDiscount =
            parseSpecialDiscount(
                req.body.specialDiscount,
                current.specialDiscount
            );
        const nextSpecialPrice =
            parseSpecialPrice(
                req.body.specialPrice,
                current.specialPrice
            );

        if (Number.isNaN(nextSpecialDiscount)) {

            res.status(400).json({
                error: "Ungültiger Sonderrabatt"
            });

            return;

        }

        if (Number.isNaN(nextSpecialPrice)) {

            res.status(400).json({
                error: "Ungültiger Festpreis"
            });

            return;

        }

        const nextProjectNodeId =
            req.body.projectNodeId === undefined
                ? current.projectNodeId
                : Number(req.body.projectNodeId);

        if (
            !Number.isFinite(nextProjectNodeId)
            ||
            nextProjectNodeId <= 0
        ) {

            res.status(400).json({
                error: "Ungültige Zielposition"
            });

            return;

        }

        const nextSortOrder =
            req.body.sortOrder === undefined
                ? (
                    nextProjectNodeId === current.projectNodeId
                        ? current.sortOrder
                        : database.projectNodeArticles.prepare(`

                            SELECT COALESCE(MAX(sortOrder), -1) + 1 AS sortOrder

                            FROM projectNodeArticles

                            WHERE projectNodeId = ?

                        `).get(
                            nextProjectNodeId
                        ).sortOrder
                )
                : Number(req.body.sortOrder);

        database.projectNodeArticles.prepare(`

            UPDATE projectNodeArticles

            SET
                projectNodeId = @projectNodeId,
                articleNumber = @articleNumber,
                quantity = @quantity,
                positionName = @positionName,
                sortOrder = @sortOrder,
                isOptional = @isOptional,
                isAlternative = @isAlternative,
                specialDiscount = @specialDiscount,
                specialPrice = @specialPrice

            WHERE id = @id

        `).run({

            id,

            projectNodeId:
                nextProjectNodeId,

            articleNumber:
                nextArticleNumber,

            quantity:
                Number.isFinite(quantity)
                &&
                quantity > 0
                    ? quantity
                    : current.quantity,

            positionName:
                req.body.positionName === undefined
                    ? current.positionName
                    : req.body.positionName || null,

            sortOrder:
                Number.isFinite(nextSortOrder)
                    ? nextSortOrder
                    : current.sortOrder,

            isOptional:
                req.body.isOptional === undefined
                    ? current.isOptional
                    : req.body.isOptional ? 1 : 0,

            isAlternative:
                req.body.isAlternative === undefined
                    ? current.isAlternative
                    : req.body.isAlternative ? 1 : 0,

            specialDiscount:
                nextSpecialDiscount,

            specialPrice:
                nextSpecialPrice

        });

        const updated =
            database.projectNodeArticles.prepare(`

                SELECT *

                FROM projectNodeArticles

                WHERE id = ?

            `).get(
                id
            );

        res.json(
            updated
        );

    }
);

router.delete(
    "/:id",
    (req, res) => {

        database.projectNodeArticles.prepare(`

            DELETE FROM projectNodeArticles

            WHERE id = ?

        `).run(
            req.params.id
        );

        res.json({

            success: true

        });

    }
);

router.delete(
    "/:projectNodeId/:articleNumber",
    (req, res) => {

        const {
            projectNodeId,
            articleNumber
        } = req.params;

        database.projectNodeArticles.prepare(`

            DELETE FROM projectNodeArticles

            WHERE projectNodeId = ?
            AND articleNumber = ?

        `).run(

            projectNodeId,
            articleNumber

        );

        res.json({
            success: true
        });

    }
);

export default router;
