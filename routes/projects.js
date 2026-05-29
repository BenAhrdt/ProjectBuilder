import express from "express";

import * as database
from "../database/index.js";

const router =
    express.Router();

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
                description

            )

            VALUES (

                @customerId,
                @name,
                @description

            )

        `).run({

            customerId:
                req.body.customerId,

            name:
                req.body.name,

            description:
                req.body.description

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

                description = @description

            WHERE id = @id

        `).run({

            id:
                req.params.id,

            customerId:
                req.body.customerId,

            name:
                req.body.name,

            description:
                req.body.description

        });

        res.json({

            success: true

        });

    }
);

export default router;