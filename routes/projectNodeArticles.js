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

            `).all();

        res.json(
            articles
        );

    }
);

router.post(
    "/",
    (req, res) => {

        database.projectNodeArticles.prepare(`

            INSERT INTO projectNodeArticles (

                projectNodeId,
                articleNumber,
                quantity

            )

            VALUES (

                @projectNodeId,
                @articleNumber,
                @quantity

            )

        `).run({

            projectNodeId:
                req.body.projectNodeId,

            articleNumber:
                req.body.articleNumber,

            quantity:
                1

        });

        res.json({

            success: true

        });

    }
);

export default router;