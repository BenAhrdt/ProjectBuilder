import express from "express";

import * as database
from "../database/index.js";
import { customerDiscountGroupKeys } from "../utils/discountGroups.js";
import { readCustomerDiscountHistory, logCustomerDiscountChange } from "../utils/customerDiscountHistory.js";

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

                    accountOwner,

                    street,

                    postalCode,

                    city,

                    additionalInfo

                FROM customers

                WHERE

                    customerNumber LIKE @search

                    OR name LIKE @search

                    OR accountOwner LIKE @search

                    OR street LIKE @search

                    OR postalCode LIKE @search

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
    "/:id/discount-history",
    (req, res) => {
        res.json(
            readCustomerDiscountHistory(req.params.id, req.query.limit)
        );
    }
);

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

                    street,

                    postalCode,

                    city,

                    additionalInfo

                )

                VALUES (

                    @customerNumber,

                    @name,

                    @street,

                    @postalCode,

                    @city,

                    @additionalInfo

                )

            `);

        insertCustomer.run({

            customerNumber:
                normalizeCustomerNumber(req.body.customerNumber),

            name:
                req.body.name,

            street:
                req.body.street,

            postalCode:
                req.body.postalCode,

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

        const body = req.body ?? {};
        const current = database.customers.prepare(`
            SELECT *
            FROM customers
            WHERE id = ?
        `).get(req.params.id) ?? {};
        if (!current.id) {
            res.status(404).json({
                success: false,
                error: "Kunde nicht gefunden"
            });
            return;
        }
        const before = current;
        const discountFields =
            customerDiscountGroupKeys.filter(field =>
                Object.prototype.hasOwnProperty.call(body, field)
            );
        const updateFields = [
            "customerNumber = @customerNumber",
            "name = @name",
            "street = @street",
            "postalCode = @postalCode",
            "city = @city",
            "additionalInfo = @additionalInfo",
            ...discountFields.map(field => `${field} = @${field}`)
        ];

        const values = {
            id: req.params.id,
            customerNumber: normalizeCustomerNumber(
                getBodyValue(body, "customerNumber", current.customerNumber)
            ),
            name: getBodyValue(body, "name", current.name),
            street: getBodyValue(body, "street", current.street),
            postalCode: getBodyValue(body, "postalCode", current.postalCode),
            city: getBodyValue(body, "city", current.city),
            additionalInfo: getBodyValue(body, "additionalInfo", current.additionalInfo),
            ...Object.fromEntries(
                discountFields.map(field => [field, normalizeCustomerDiscount(body[field])])
            )
        };

        try {
            database.customers.prepare(`

                UPDATE customers

                SET
                    ${updateFields.join(",\n                ")}

                WHERE id = @id

            `).run(values);
        } catch (error) {
            logCustomerDiscountChange({
                customerId: req.params.id,
                source: req.get("x-projectbuilder-source") || "customer-api",
                requestMethod: req.method,
                requestPath: req.originalUrl,
                before,
                requested: Object.fromEntries(
                    discountFields.map(field => [field, body[field]])
                ),
                after: before,
                status: "failed",
                errorMessage: error?.message ?? String(error)
            });
            if (String(error?.message ?? "").includes("customers.customerNumber")) {
                res.status(409).json({
                    success: false,
                    error: "Diese Kundennummer ist bereits einem anderen Kunden zugeordnet."
                });
                return;
            }
            throw error;
        }

        const after = database.customers.prepare(`
            SELECT ${customerDiscountGroupKeys.join(", ")}
            FROM customers
            WHERE id = ?
        `).get(req.params.id) ?? {};
        logCustomerDiscountChange({
            customerId: req.params.id,
            source: req.get("x-projectbuilder-source") || "customer-api",
            requestMethod: req.method,
            requestPath: req.originalUrl,
            before,
            requested: Object.fromEntries(
                discountFields.map(field => [field, body[field]])
            ),
            after
        });

        res.json({
            success: true
        });

    }
);

function normalizeCustomerDiscount(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return 0;
    }

    const discount = Number(String(value).trim().replace(",", "."));
    return Number.isFinite(discount)
        ? Math.min(Math.max(discount, 0), 100)
        : null;
}

function normalizeCustomerNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return null;
    }
    return String(value).trim();
}

function getBodyValue(body, key, fallback) {
    return Object.prototype.hasOwnProperty.call(body, key)
        ? body[key]
        : fallback;
}


// --------------------------------------------------
// Löschen
// --------------------------------------------------

router.delete(
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

        if (!customer) {

            res.status(404).json({
                success: false,
                error: "Kunde nicht gefunden"
            });

            return;

        }

        const deleteCustomer =
            database.customers.transaction(customerId => {

                database.projects.prepare(`

                    UPDATE projects

                    SET customerId = NULL

                    WHERE customerId = ?

                `).run(
                    customerId
                );

                database.customers.prepare(`

                    DELETE FROM customers

                    WHERE id = ?

                `).run(
                    customerId
                );

            });

        deleteCustomer(
            req.params.id
        );

        res.json({
            success: true
        });

    }
);

export default router;
