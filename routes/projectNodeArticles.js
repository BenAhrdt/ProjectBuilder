import express from "express";

import * as database
from "../database/index.js";

const router =
    express.Router();

router.get(
    "/",
    (req, res) => {

        const articles =
            database.projectNodeArticles.prepare(`

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
                isAlternative

            )

            VALUES (

                @projectNodeId,
                @articleNumber,
                @quantity,
                @positionName,
                @sortOrder,
                @isOptional,
                @isAlternative

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
            isAlternative: req.body.isAlternative ? 1 : 0

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
                quantity = @quantity,
                positionName = @positionName,
                sortOrder = @sortOrder,
                isOptional = @isOptional,
                isAlternative = @isAlternative

            WHERE id = @id

        `).run({

            id,

            projectNodeId:
                nextProjectNodeId,

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
                    : req.body.isAlternative ? 1 : 0

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
