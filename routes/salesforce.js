import express from "express";
import * as database from "../database/index.js";
import * as salesforce from "../services/salesforce.js";
import {
    buildSalesforceLineItems,
    buildSalesforcePositions
} from "../utils/salesforcePositions.js";
import { inferGridVisItems } from "../utils/gridVisItems.js";

const router = express.Router();

function getSetting(key, fallback = "") {
    return database.settings.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? fallback;
}

function saveSetting(key, value) {
    database.settings.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
}

function getConfiguredPricebookIdentifier() {
    return getSetting("salesforcePricebookId", process.env.SALESFORCE_PRICEBOOK_NAME ?? "Janitza Electronics (1100)");
}

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
    const stringifyError = value => {
        if (typeof value === "string") return value;
        if (value?.message) return stringifyError(value.message);
        try { return JSON.stringify(value); }
        catch { return String(value); }
    };
    let message = stringifyError(error) || "Salesforce-Abfrage fehlgeschlagen.";
    if (message.includes("customers.customerNumber")) {
        message = "Diese Kundennummer ist bereits einem anderen lokalen Kunden zugeordnet.";
    } else if (message.includes("customers.salesforceId")) {
        message = "Dieser Salesforce-Kunde ist bereits mit einem anderen lokalen Kunden verknüpft.";
    }
    res.status(502).json({ success: false, error: message });
}

async function getProjectAccount(projectId) {
    const project = database.projects.prepare(`
        SELECT projects.*, customers.name AS customerName,
            customers.customerNumber, customers.salesforceId AS customerSalesforceId,
            customers.pg1, customers.pg2, customers.pg3, customers.pg4, customers.pg5,
            customers.pg6, customers.pg7, customers.pg8, customers.pg9, customers.pg10
        FROM projects
        LEFT JOIN customers ON customers.id = projects.customerId
        WHERE projects.id = ?
    `).get(projectId);
    if (!project) return { error: { status: 404, message: "Projekt nicht gefunden." } };
    if (!project.customerId) return { error: { status: 400, message: "Dem Projekt ist kein Kunde zugeordnet." } };

    let account = await salesforce.getAccountById(project.customerSalesforceId);
    if (!account) account = await salesforce.findAccountByCustomerNumber(project.customerNumber);
    if (!account) {
        return { error: {
            status: 409,
            code: "CUSTOMER_NOT_FOUND",
            message: `Der Kunde ${project.customerNumber || project.customerName || ""} wurde in Salesforce nicht gefunden.`
        } };
    }
    if (account.Id !== project.customerSalesforceId) {
        database.customers.prepare(`
            UPDATE customers SET salesforceId = ?, salesforceSyncedAt = ? WHERE id = ?
        `).run(account.Id, new Date().toISOString(), project.customerId);
    }
    return { project, account };
}

router.get("/projects/:projectId/quote-options", async (req, res) => {
    try {
        const result = await getProjectAccount(req.params.projectId);
        if (result.error) {
            return res.status(result.error.status).json({
                success: false,
                code: result.error.code,
                error: result.error.message
            });
        }
        res.json({ success: true, ...(await salesforce.getQuoteSyncOptions(result.account.Id)) });
    } catch (error) {
        handleError(res, error);
    }
});

function normalizePercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(Math.max(number, 0), 100) : 0;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result.toISOString().slice(0, 10);
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

router.get("/pricebooks", async (_req, res) => {
    try {
        res.json({
            pricebooks: await salesforce.getActivePricebooks(),
            selectedPricebookId: getSetting("salesforcePricebookId"),
            selectedCurrency: getSetting("salesforcePricebookCurrency", "EUR")
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.post("/articles/import", async (req, res) => {
    try {
        const pricebookId = String(req.body.pricebookId ?? "");
        const currencyIsoCode = String(req.body.currencyIsoCode ?? "").toUpperCase();
        if (!/^[a-zA-Z0-9]{15,18}$/.test(pricebookId) || !/^[A-Z]{3}$/.test(currencyIsoCode)) {
            return res.status(400).json({ success: false, error: "Preisbuch oder Währung ist ungültig." });
        }

        const pricebook = await salesforce.getSalesPricebook(pricebookId);
        const entries = await salesforce.getPricebookProducts(pricebook.Id, currencyIsoCode);
        const existingNumbers = new Set(
            database.articles.prepare("SELECT articleNumber FROM articles").all()
                .map(article => String(article.articleNumber))
        );
        const importedAt = new Date().toISOString();
        const upsert = database.articles.prepare(`
            INSERT INTO articles (
                articleNumber, ean, manufacturerType, manufacturerName,
                originCountry, originRegion, intrastatNumber, quantity, quantityUnit,
                listPrice, listPriceCurrency, discountGroup, description,
                salesforceProductId, salesforcePricebookId, salesforceActive,
                salesforceFamily, salesforceProductType, salesforceLastModifiedAt,
                salesforceImportedAt, salesforceAvailabilityCheckedAt,
                salesforceCurrencies, gridVisItems, gridVisItemsManual
            ) VALUES (
                @articleNumber, '', @manufacturerType, '',
                '', '', '', NULL, @quantityUnit,
                @listPrice, @listPriceCurrency, '', @description,
                @salesforceProductId, @salesforcePricebookId, 1,
                @salesforceFamily, @salesforceProductType, @salesforceLastModifiedAt,
                @salesforceImportedAt, @salesforceImportedAt,
                @salesforceCurrencies, @gridVisItems, 0
            )
            ON CONFLICT(articleNumber) DO UPDATE SET
                manufacturerType = CASE
                    WHEN TRIM(excluded.manufacturerType) <> '' THEN excluded.manufacturerType
                    ELSE articles.manufacturerType END,
                quantityUnit = CASE
                    WHEN COALESCE(TRIM(articles.quantityUnit), '') = '' THEN excluded.quantityUnit
                    ELSE articles.quantityUnit END,
                listPrice = excluded.listPrice,
                listPriceCurrency = excluded.listPriceCurrency,
                description = CASE
                    WHEN COALESCE(TRIM(articles.description), '') = '' THEN excluded.description
                    ELSE articles.description END,
                salesforceProductId = excluded.salesforceProductId,
                salesforcePricebookId = excluded.salesforcePricebookId,
                salesforceActive = excluded.salesforceActive,
                salesforceFamily = excluded.salesforceFamily,
                salesforceProductType = excluded.salesforceProductType,
                salesforceLastModifiedAt = excluded.salesforceLastModifiedAt,
                salesforceImportedAt = excluded.salesforceImportedAt,
                salesforceAvailabilityCheckedAt = excluded.salesforceAvailabilityCheckedAt,
                salesforceCurrencies = excluded.salesforceCurrencies,
                gridVisItems = CASE
                    WHEN COALESCE(articles.gridVisItemsManual, 0) = 1 THEN articles.gridVisItems
                    ELSE excluded.gridVisItems END
        `);
        const transaction = database.articles.transaction(records => {
            database.articles.prepare(`
                UPDATE articles SET salesforceActive = 0
                WHERE salesforceProductId IS NOT NULL
            `).run();
            for (const record of records) upsert.run(record);
        });
        transaction(entries.map(entry => ({
            articleNumber: String(entry.Product2.ProductCode),
            manufacturerType: entry.Product2.Name ?? "",
            quantityUnit: entry.Product2.QuantityUnitOfMeasure ?? "",
            listPrice: Number(entry.UnitPrice),
            listPriceCurrency: entry.CurrencyIsoCode,
            description: entry.Product2.Description ?? "",
            salesforceProductId: entry.Product2.Id,
            salesforcePricebookId: pricebook.Id,
            salesforceFamily: entry.Product2.Family ?? "",
            salesforceProductType: entry.Product2.ProductType__c ?? "",
            salesforceLastModifiedAt: entry.Product2.LastModifiedDate ?? entry.LastModifiedDate,
            salesforceImportedAt: importedAt,
            salesforceCurrencies: JSON.stringify([entry.CurrencyIsoCode]),
            gridVisItems: inferGridVisItems({
                manufacturerType: entry.Product2.Name,
                description: entry.Product2.Description
            })
        })));

        saveSetting("salesforcePricebookId", pricebook.Id);
        saveSetting("salesforcePricebookName", pricebook.Name);
        saveSetting("salesforcePricebookCurrency", currencyIsoCode);
        res.json({
            success: true,
            pricebookName: pricebook.Name,
            currencyIsoCode,
            imported: entries.filter(entry => !existingNumbers.has(String(entry.Product2.ProductCode))).length,
            updated: entries.filter(entry => existingNumbers.has(String(entry.Product2.ProductCode))).length,
            total: entries.length
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.post("/articles/availability", async (req, res) => {
    try {
        const articleNumbers = [...new Set(
            (Array.isArray(req.body.articleNumbers) ? req.body.articleNumbers : [])
                .map(value => String(value).trim())
                .filter(Boolean)
        )];
        if (articleNumbers.length > 5000) {
            return res.status(400).json({ success: false, error: "Es können höchstens 5.000 Artikel gleichzeitig geprüft werden." });
        }

        const pricebook = await salesforce.getSalesPricebook(getConfiguredPricebookIdentifier());
        const entries = await salesforce.getPricebookAvailability(pricebook.Id, articleNumbers);
        const currenciesByNumber = new Map();
        for (const entry of entries) {
            const number = String(entry.Product2.ProductCode);
            if (!currenciesByNumber.has(number)) currenciesByNumber.set(number, new Set());
            if (entry.CurrencyIsoCode) currenciesByNumber.get(number).add(entry.CurrencyIsoCode);
        }
        const available = articleNumbers.filter(number => currenciesByNumber.has(number));
        const checkedAt = new Date().toISOString();
        const saveAvailability = database.articles.prepare(`
            UPDATE articles SET
                salesforcePricebookId = @pricebookId,
                salesforceActive = @available,
                salesforceAvailabilityCheckedAt = @checkedAt,
                salesforceCurrencies = @currencies
            WHERE articleNumber = @articleNumber
        `);
        const saveAvailabilityTransaction = database.articles.transaction(numbers => {
            for (const articleNumber of numbers) {
                const currencies = [...(currenciesByNumber.get(articleNumber) ?? [])].sort();
                saveAvailability.run({
                    articleNumber,
                    pricebookId: pricebook.Id,
                    available: currenciesByNumber.has(articleNumber) ? 1 : 0,
                    checkedAt,
                    currencies: JSON.stringify(currencies)
                });
            }
        });
        saveAvailabilityTransaction(articleNumbers);

        res.json({
            success: true,
            pricebookName: pricebook.Name,
            checked: articleNumbers.length,
            available: available.map(articleNumber => ({
                articleNumber,
                currencies: [...currenciesByNumber.get(articleNumber)].sort()
            })),
            missing: articleNumbers.filter(number => !currenciesByNumber.has(number))
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.post("/projects/:projectId/opportunity-quote", async (req, res) => {
    try {
        const lookup = await getProjectAccount(req.params.projectId);
        if (lookup.error) return res.status(lookup.error.status).json({ success: false, code: lookup.error.code, error: lookup.error.message });
        const { project, account } = lookup;
        const accountId = account.Id;
        const currencyIsoCode = account.CurrencyIsoCode;
        if (!currencyIsoCode) {
            return res.status(409).json({ success: false, error: "Für den Salesforce-Kunden ist keine Währung hinterlegt." });
        }

        const nodes = database.projectNodes.prepare(`
            SELECT id, parentId, sortOrder FROM projectNodes
            WHERE projectId = ?
        `).all(project.id);
        const nodeArticles = database.projectNodeArticles.prepare(`
            SELECT projectNodeArticles.*, articles.discountGroup
            FROM projectNodeArticles
            INNER JOIN projectNodes ON projectNodes.id = projectNodeArticles.projectNodeId
            LEFT JOIN articles ON articles.articleNumber = projectNodeArticles.articleNumber
            WHERE projectNodes.projectId = ?
        `).all(project.id);
        const positions = buildSalesforcePositions(nodes, nodeArticles);
        if (positions.length === 0) {
            return res.status(400).json({ success: false, error: "Das Projekt enthält keine Artikelpositionen mit einer Menge größer als null." });
        }

        const [pricebook, storedOpportunity, previousQuote] = await Promise.all([
            salesforce.getSalesPricebook(getConfiguredPricebookIdentifier()),
            salesforce.getOpportunity(project.salesforceOpportunityId),
            salesforce.getQuote(project.salesforceQuoteId)
        ]);
        const storedOpportunityMatchesPricebook = storedOpportunity
            && storedOpportunity.Pricebook2Id === pricebook.Id;
        const opportunityPromise = storedOpportunityMatchesPricebook || project.salesforceOpportunityId
            ? Promise.resolve(storedOpportunityMatchesPricebook ? storedOpportunity : null)
            : salesforce.findRecentEmptyOpportunity(
                accountId,
                project.name || `ProjectBuilder ${project.id}`,
                pricebook.Id
            );
        const [entries, existingOpportunity] = await Promise.all([
            salesforce.getPricebookEntries(
                pricebook.Id,
                positions.map(position => position.articleNumber),
                currencyIsoCode
            ),
            opportunityPromise
        ]);
        const entriesByNumber = new Map(entries.map(entry => [String(entry.Product2.ProductCode), entry]));
        const missingArticleNumbers = positions
            .map(position => String(position.articleNumber))
            .filter(number => !entriesByNumber.has(number));
        if (missingArticleNumbers.length > 0) {
            return res.status(409).json({
                success: false,
                code: "ARTICLES_NOT_FOUND",
                missingArticleNumbers,
                error: `Diese Artikel fehlen im Salesforce-Preisbuch „${pricebook.Name}“ für ${currencyIsoCode}: ${missingArticleNumbers.join(", ")}`
            });
        }

        const pricedPositions = positions.map(position => {
            const entry = entriesByNumber.get(String(position.articleNumber));
            const discountKey = String(position.discountGroup ?? "").match(/\d+/)?.[0];
            const baseDiscount = normalizePercent(discountKey ? project[`pg${discountKey}`] : 0);
            return {
                PricebookEntryId: entry.Id,
                Product2Id: entry.Product2Id,
                Quantity: Number(position.quantity),
                listPrice: Number(entry.UnitPrice),
                baseDiscount,
                isOptional: position.isOptional,
                isAlternative: position.isAlternative
            };
        });
        const { opportunityLineItems, quoteLineItems } = buildSalesforceLineItems(pricedPositions);

        let opportunity = existingOpportunity;
        const opportunityFields = {
            Name: project.name || `ProjectBuilder ${project.id}`,
            AccountId: accountId,
            Pricebook2Id: pricebook.Id,
            CurrencyIsoCode: currencyIsoCode,
            StageName: req.body.stageName || opportunity?.StageName || "Needs Analysis",
            CloseDate: req.body.closeDate || opportunity?.CloseDate || addDays(new Date(), 30),
            Description: project.description || null
        };
        const opportunityCreated = !opportunity;
        if (opportunity) {
            await salesforce.updateOpportunity(opportunity.Id, opportunityFields);
        } else {
            const result = await salesforce.createOpportunity(opportunityFields);
            opportunity = { Id: result.id };
        }
        database.projects.prepare(`
            UPDATE projects SET salesforceOpportunityId = ? WHERE id = ?
        `).run(opportunity.Id, project.id);
        let reusableQuote = previousQuote;
        if (previousQuote && previousQuote.Status !== "Draft") {
            reusableQuote = await salesforce.findDraftQuote(opportunity.Id, pricebook.Id, previousQuote.Id);
        }
        const createNewQuote = !reusableQuote
            || reusableQuote.Pricebook2Id !== pricebook.Id
            || reusableQuote.OpportunityId !== opportunity.Id;
        let quote = reusableQuote;
        const quoteFields = {
            Name: project.name || `ProjectBuilder ${project.id}`,
            OpportunityId: opportunity.Id,
            Pricebook2Id: pricebook.Id,
            Description: project.description || null,
            Status: "Draft",
            DiscountAdd__c: normalizePercent(project.projectDiscount),
            ShowDiscount__c: normalizePercent(project.projectDiscount) > 0
        };
        const syncOptions = await salesforce.getQuoteSyncOptions(accountId);
        if (syncOptions.contactField) {
            const contact = syncOptions.contacts.find(item => item.id === req.body.contactId);
            if (!contact) return res.status(400).json({ success: false, error: "Bitte einen Kontakt des Salesforce-Kunden auswählen." });
            quoteFields[syncOptions.contactField] = contact.id;
        }
        if (syncOptions.deliveryField) {
            const deliveryTime = syncOptions.deliveryTimes.find(item => item.value === req.body.deliveryTime);
            if (!deliveryTime) return res.status(400).json({ success: false, error: "Bitte eine Lieferzeit auswählen." });
            quoteFields[syncOptions.deliveryField] = deliveryTime.value;
        }
        if (createNewQuote) {
            const result = await salesforce.createQuote(quoteFields);
            quote = await salesforce.getQuote(result.id)
                ?? { Id: result.id, Status: "Draft", QuoteNumber: null, IsSyncing: false };
            database.projects.prepare(`
                UPDATE projects SET salesforceQuoteId = ? WHERE id = ?
            `).run(quote.Id, project.id);
        } else {
            await salesforce.updateQuote(quote.Id, quoteFields);
        }

        // Detach the previous synchronized quote before replacing opportunity lines or
        // attaching a newly created/reused draft. Salesforce permits only one at a time.
        if (previousQuote?.IsSyncing && previousQuote.Id !== quote.Id) {
            await salesforce.synchronizeQuote(opportunity.Id, null);
        }

        // Synchronized quotes mirror their line items to the opportunity automatically.
        // Writing both objects would duplicate work and can cause row-lock conflicts.
        await Promise.all([
            quote.IsSyncing
                ? Promise.resolve()
                : salesforce.replaceLineItems("OpportunityLineItem", "OpportunityId", opportunity.Id, opportunityLineItems),
            salesforce.replaceLineItems("QuoteLineItem", "QuoteId", quote.Id, quoteLineItems)
        ]);

        // Linking the quote alone does not make it the opportunity's synchronized quote.
        // Salesforce requires this relationship before the quote can enter approval.
        await salesforce.synchronizeQuote(opportunity.Id, quote.Id);

        database.projects.prepare(`
            UPDATE projects SET salesforceOpportunityId = ?, salesforceQuoteId = ?, salesforceSyncedAt = ?
            WHERE id = ?
        `).run(opportunity.Id, quote.Id, new Date().toISOString(), project.id);

        res.json({
            success: true,
            opportunityId: opportunity.Id,
            opportunityCreated,
            quoteId: quote.Id,
            quoteCreated: createNewQuote,
            quoteSynced: true,
            previousQuoteStatus: previousQuote?.Status ?? null,
            positionCount: quoteLineItems.length,
            pricebookName: pricebook.Name
        });
    } catch (error) {
        handleError(res, error);
    }
});

export default router;
