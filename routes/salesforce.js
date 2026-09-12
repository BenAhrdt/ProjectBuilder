import express from "express";
import * as database from "../database/index.js";
import * as salesforce from "../services/salesforce.js";

const router = express.Router();

function syncCustomer(customer, localId = null) {
    const now = new Date().toISOString();
    const existing = localId
        ? database.customers.prepare("SELECT id FROM customers WHERE id = ?").get(localId)
        : database.customers.prepare(`
            SELECT id FROM customers
            WHERE salesforceId = @salesforceId
               OR (COALESCE(@customerNumber, '') <> '' AND customerNumber = @customerNumber)
            ORDER BY salesforceId = @salesforceId DESC
            LIMIT 1
        `).get(customer);

    if (existing) {
        database.customers.prepare(`
            UPDATE customers SET
                customerNumber = @customerNumber,
                name = @name,
                street = @street,
                postalCode = @postalCode,
                city = @city,
                salesforceId = @salesforceId,
                salesforceSyncedAt = @salesforceSyncedAt,
                salesforceLastModifiedAt = @salesforceLastModifiedAt
            WHERE id = @id
        `).run({ ...customer, salesforceSyncedAt: now, id: existing.id });
        return { id: existing.id, created: false };
    }

    const result = database.customers.prepare(`
        INSERT INTO customers (
            customerNumber, name, street, postalCode, city, salesforceId,
            salesforceSyncedAt, salesforceLastModifiedAt
        ) VALUES (
            @customerNumber, @name, @street, @postalCode, @city, @salesforceId,
            @salesforceSyncedAt, @salesforceLastModifiedAt
        )
    `).run({ ...customer, salesforceSyncedAt: now });
    return { id: Number(result.lastInsertRowid), created: true };
}

function handleError(res, error) {
    let message = error.message;
    if (message.includes("customers.customerNumber")) {
        message = "Diese Kundennummer ist bereits einem anderen lokalen Kunden zugeordnet.";
    } else if (message.includes("customers.salesforceId")) {
        message = "Dieser Salesforce-Kunde ist bereits mit einem anderen lokalen Kunden verknüpft.";
    }
    res.status(502).json({ success: false, error: message });
}

router.get("/status", async (_req, res) => {
    try { res.json(await salesforce.getStatus()); }
    catch (error) { handleError(res, error); }
});

router.post("/login", async (_req, res) => {
    try { res.json(await salesforce.loginWithBrowser()); }
    catch (error) { handleError(res, error); }
});

router.get("/customers", async (req, res) => {
    try {
        const customers = await salesforce.searchCustomers(req.query);
        const ids = customers.map(customer => customer.salesforceId);
        const existing = ids.length === 0 ? [] : database.customers.prepare(`
            SELECT id, salesforceId, customerNumber FROM customers
            WHERE salesforceId IN (${ids.map(() => "?").join(",")})
        `).all(...ids);
        const bySalesforceId = new Map(existing.map(customer => [customer.salesforceId, customer.id]));
        res.json(customers.map(customer => ({
            ...customer,
            localCustomerId: bySalesforceId.get(customer.salesforceId) ?? null
        })));
    } catch (error) { handleError(res, error); }
});

router.post("/customers/import", async (req, res) => {
    try {
        const customers = await salesforce.getCustomersByIds(req.body.salesforceIds ?? []);
        const transaction = database.customers.transaction(items => items.map(item => syncCustomer(item)));
        const results = transaction(customers);
        res.json({
            success: true,
            created: results.filter(result => result.created).length,
            updated: results.filter(result => !result.created).length
        });
    } catch (error) { handleError(res, error); }
});

router.put("/customers/:localId", async (req, res) => {
    try {
        const local = database.customers.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.localId);
        if (!local) return res.status(404).json({ success: false, error: "Kunde nicht gefunden" });
        const salesforceId = req.body.salesforceId ?? local.salesforceId;
        if (!salesforceId) return res.status(400).json({ success: false, error: "Kunde ist nicht mit Salesforce verknüpft" });
        const customer = await salesforce.getCustomerById(salesforceId);
        if (!customer) return res.status(404).json({ success: false, error: "Salesforce-Kunde nicht gefunden" });
        syncCustomer(customer, local.id);
        res.json({ success: true, customerId: local.id });
    } catch (error) { handleError(res, error); }
});

router.post("/customers/refresh", async (_req, res) => {
    try {
        const linked = database.customers.prepare(`
            SELECT id, salesforceId FROM customers WHERE salesforceId IS NOT NULL
        `).all();
        const remote = await salesforce.getCustomersByIds(linked.map(item => item.salesforceId));
        const localBySalesforceId = new Map(linked.map(item => [item.salesforceId, item.id]));
        const transaction = database.customers.transaction(items => {
            for (const item of items) syncCustomer(item, localBySalesforceId.get(item.salesforceId));
        });
        transaction(remote);
        res.json({ success: true, updated: remote.length });
    } catch (error) { handleError(res, error); }
});

export default router;
