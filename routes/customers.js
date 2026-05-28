import express from "express";

import * as database
from "../database/index.js";

const router =
    express.Router();

// --------------------------------------------------
// Ausgabe
// --------------------------------------------------

router.get(
    "/",
    (req, res) => {

        const search =
            req.query.search ?? "";

        const customers =
            database.customers.prepare(`

                SELECT

                    id,

                    customerNumber,

                    name,

                    city,

                    additionalInfo

                FROM customers

                WHERE

                    customerNumber LIKE @search

                    OR name LIKE @search

                    OR city LIKE @search

                    OR additionalInfo LIKE @search

                ORDER BY name

                `).all({

                    search:
                        `%${search}%`

                });

        res.json(
            customers
        );

    }
);


// Kundenansicht (Einzelner Kunde)
router.get(
    "/:id",
    (req, res) => {

        const customer =
            database.customers.prepare(`

                SELECT *
                FROM customers

                WHERE id = ?

            `).get(
                req.params.id
            );

        res.json(customer);

    }
);


// --------------------------------------------------
// Hinzufügen
// --------------------------------------------------

router.post(
    "/",
    (req, res) => {

        const insertCustomer =
            database.customers.prepare(`

                INSERT INTO customers (

                    customerNumber,

                    name,

                    city,

                    additionalInfo

                )

                VALUES (

                    @customerNumber,

                    @name,

                    @city,

                    @additionalInfo

                )

            `);

        insertCustomer.run({

            customerNumber:
                req.body.customerNumber,

            name:
                req.body.name,

            city:
                req.body.city,

            additionalInfo:
                req.body.additionalInfo

        });

        res.json({

            success: true

        });

    }
);


// --------------------------------------------------
// Speichern
// --------------------------------------------------

router.put(
    "/:id",
    (req, res) => {

        database.customers.prepare(`

            UPDATE customers

            SET

                customerNumber =
                    @customerNumber,

                city =
                    @city,

                additionalInfo =
                    @additionalInfo,

                pg1 = @pg1,
                pg2 = @pg2,
                pg3 = @pg3,
                pg4 = @pg4,
                pg5 = @pg5,
                pg6 = @pg6,
                pg7 = @pg7,
                pg8 = @pg8,
                pg9 = @pg9,
                pg10 = @pg10

            WHERE id = @id

        `).run({

            id:
                req.params.id,

            customerNumber:
                req.body.customerNumber,

            city:
                req.body.city,

            additionalInfo:
                req.body.additionalInfo,

            pg1:
                req.body.pg1,

            pg2:
                req.body.pg2,

            pg3:
                req.body.pg3,

            pg4:
                req.body.pg4,

            pg5:
                req.body.pg5,

            pg6:
                req.body.pg6,

            pg7:
                req.body.pg7,

            pg8:
                req.body.pg8,

            pg9:
                req.body.pg9,

            pg10:
                req.body.pg10

        });

        res.json({
            success: true
        });

    }
);

export default router;