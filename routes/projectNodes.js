import express from "express";

import * as database
from "../database/index.js";

const router =
    express.Router();

router.get(
    "/:projectId",
    (req, res) => {

        const nodes =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE projectId = ?

                ORDER BY sortOrder

            `).all(
                req.params.projectId
            );

        res.json(
            nodes
        );

    }
);

router.post(
    "/",
    (req, res) => {

        database.projectNodes.prepare(`

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

        `).run({

            projectId:
                req.body.projectId,

            parentId:
                req.body.parentId,

            type:
                req.body.type,

            name:
                req.body.name,

            sortOrder:
                req.body.sortOrder ?? 0

        });

        res.json({

            success: true

        });

    }
);

export default router;