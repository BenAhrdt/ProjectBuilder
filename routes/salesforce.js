import express from "express";
import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import * as database from "../database/index.js";
import * as salesforce from "../services/salesforce.js";
import {
    buildSalesforceLineItems,
    buildSalesforcePositions
} from "../utils/salesforcePositions.js";
import { inferGridVisItems } from "../utils/gridVisItems.js";
import { selectReusableSalesforceQuote } from "../utils/salesforceQuoteSelection.js";
import {
    buildSalesforceQuoteHeaderFields,
    recommendSalesforceTaxCode
} from "../utils/salesforceQuoteFields.js";
import {
    buildGaebTenderXml,
    buildProjectExportData,
    buildProjectWorkbookBuffer,
    buildWordTenderBuffer,
    getExportArticleIconDataUri
} from "./projects.js";
import { buildProjectFilePayload } from "../utils/projectFile.js";
import { normalizeExternalError } from "../utils/externalError.js";
import { buildOverviewDocuments } from "../public/js/views/projectOverview.js";

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

const SALESFORCE_DOCUMENT_TYPES = new Set(["overview", "excel", "word", "gaeb"]);
const SALESFORCE_UPLOAD_TYPES = new Set([...SALESFORCE_DOCUMENT_TYPES, "project"]);

function parseSavedDocuments(value) {
    try {
        return JSON.parse(value == null ? '["overview"]' : value)
            .filter(item => SALESFORCE_DOCUMENT_TYPES.has(item));
    } catch {
        return [];
    }
}

function overviewLabels() {
    return {
        project: "Projekt", empty: "Leer", noStructure: "Keine Projektstruktur",
        overviewView: "Übersichtsplan", detailView: "Detailansicht", page: "Seite",
        summaryFields: "Felder", summaryMeters: "Messgruppen", summaryPositions: "Positionen",
        prices: "Preise", withoutPrices: "Ohne Preise", withPrices: "Mit Preisen",
        priceBasis: "Preisbasis", price: "Preis", listPrices: "Listenpreise",
        discountedPrices: "Rabattierte Preise",
        nodeTypes: { building: "Gebäude", generalPosition: "Allgemeine Position", panel: "Verteilung", field: "Feld", meter: "Messgruppe" }
    };
}

function buildOverviewPdf(documents, project) {
    const pages = [
        { title: "Gesamtübersicht", breadcrumb: project.name ?? "", diagram: documents.overviewDiagram },
        ...documents.detailPages
    ];
    const pdf = new PDFDocument({ autoFirstPage: false, compress: true });
    const chunks = [];
    pdf.on("data", chunk => chunks.push(chunk));
    const completed = new Promise((resolve, reject) => {
        pdf.on("end", () => resolve(Buffer.concat(chunks)));
        pdf.on("error", reject);
    });
    pages.forEach((page, index) => {
        pdf.addPage({ size: "A4", layout: "landscape", margin: 28 });
        pdf.font("Helvetica-Bold").fontSize(13).fillColor("#1f3552").text(page.title || "Detailseite", 28, 24);
        pdf.font("Helvetica").fontSize(8).fillColor("#526173").text(page.breadcrumb || "", 28, 42);
        pdf.text(`Seite ${index + 1} / ${pages.length}`, 730, 24, { width: 84, align: "right" });
        const availableWidth = 785;
        const availableHeight = 515;
        const scale = Math.min(
            availableWidth / Math.max(Number(page.diagram.width) || 1, 1),
            availableHeight / Math.max(Number(page.diagram.height) || 1, 1)
        );
        const width = (Number(page.diagram.width) || 1) * scale;
        const height = (Number(page.diagram.height) || 1) * scale;
        SVGtoPDF(pdf, page.diagram.svg, 28 + (availableWidth - width) / 2, 62 + (availableHeight - height) / 2, {
            width, height, preserveAspectRatio: "xMidYMid meet"
        });
    });
    pdf.end();
    return completed;
}

async function synchronizeProjectDocuments(opportunityId, project, nodes, nodeArticles, selected) {
    const exportData = buildProjectExportData(project, nodes, nodeArticles);
    const baseName = String(project.name || "Projekt").replace(/[\\/:*?"<>|]/g, "_").slice(0, 100);
    const generators = {
        overview: async () => {
            const documents = buildOverviewDocuments({
                project, customer: { name: project.customerName }, nodes, nodeArticles,
                articles: nodeArticles, labels: overviewLabels(), showPrices: true,
                priceMode: "discounted",
                getArticleIcon: getExportArticleIconDataUri,
                getArticleDiscountPercent: article => {
                    const group = String(article.discountGroup ?? "").match(/\d+/)?.[0];
                    return group ? normalizePercent(project[`pg${group}`]) : 0;
                }
            });
            return {
                title: "ProjectBuilder - Übersichtsplan",
                filename: `${baseName}-Übersichtsplan.pdf`,
                data: await buildOverviewPdf(documents, project)
            };
        },
        project: async () => ({
            title: "ProjectBuilder - Projektdatei",
            filename: `${baseName}.projectbuilder.json`,
            data: Buffer.from(JSON.stringify(buildProjectFilePayload(exportData), null, 2), "utf8")
        }),
        excel: async () => ({ title: "ProjectBuilder - Excel", filename: `${baseName}.xlsx`, data: await buildProjectWorkbookBuffer(exportData) }),
        word: async () => ({ title: "ProjectBuilder - LV Word", filename: `${baseName}-LV.docx`, data: await buildWordTenderBuffer(exportData, "none") }),
        gaeb: async () => ({ title: "ProjectBuilder - LV GAEB", filename: `${baseName}-LV.x82`, data: buildGaebTenderXml(exportData, "list", "82") })
    };
    const generatedFiles = await Promise.all([...new Set(selected)].map(async type => {
        try {
            const file = await generators[type]();
            return { type, file };
        } catch (error) {
            return { type, error: error?.message ?? String(error) };
        }
    }));
    const results = [];
    for (const generated of generatedFiles) {
        if (generated.error) {
            results.push({ type: generated.type, success: false, error: generated.error });
            continue;
        }
        try {
            await salesforce.uploadOpportunityFile(opportunityId, generated.file);
            results.push({ type: generated.type, success: true });
        } catch (error) {
            results.push({ type: generated.type, success: false, error: error?.message ?? String(error) });
        }
    }
    return {
        uploaded: results.filter(result => result.success).map(result => result.type),
        errors: results.filter(result => !result.success).map(({ type, error }) => ({ type, error }))
    };
}

function syncCustomer(customer, localId = null) {
    const now = new Date().toISOString();
    const discounts = Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => [`pg${index + 1}`, customer[`pg${index + 1}`] ?? null])
    );
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
                salesforceLastModifiedAt = @salesforceLastModifiedAt,
                pg1 = COALESCE(@pg1, pg1), pg2 = COALESCE(@pg2, pg2),
                pg3 = COALESCE(@pg3, pg3), pg4 = COALESCE(@pg4, pg4),
                pg5 = COALESCE(@pg5, pg5), pg6 = COALESCE(@pg6, pg6),
                pg7 = COALESCE(@pg7, pg7), pg8 = COALESCE(@pg8, pg8)
            WHERE id = @id
        `).run({ ...customer, ...discounts, salesforceSyncedAt: now, id: existing.id });
        return { id: existing.id, created: false };
    }

    const result = database.customers.prepare(`
        INSERT INTO customers (
            customerNumber, name, street, postalCode, city, salesforceId,
            salesforceSyncedAt, salesforceLastModifiedAt,
            pg1, pg2, pg3, pg4, pg5, pg6, pg7, pg8
        ) VALUES (
            @customerNumber, @name, @street, @postalCode, @city, @salesforceId,
            @salesforceSyncedAt, @salesforceLastModifiedAt,
            @pg1, @pg2, @pg3, @pg4, @pg5, @pg6, @pg7, @pg8
        )
    `).run({ ...customer, ...discounts, salesforceSyncedAt: now });
    return { id: Number(result.lastInsertRowid), created: true };
}

function handleError(res, error) {
    let message = normalizeExternalError(error);
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

function saveProjectSalesforceLink(projectId, customerSalesforceId, opportunityId, quoteId = null) {
    if (!projectId || !customerSalesforceId || !opportunityId) return;
    database.projects.prepare(`
        INSERT INTO projectSalesforceLinks (projectId, customerSalesforceId, opportunityId, quoteId, syncedAt)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(projectId, customerSalesforceId) DO UPDATE SET
            opportunityId = excluded.opportunityId,
            quoteId = excluded.quoteId,
            syncedAt = excluded.syncedAt
    `).run(projectId, customerSalesforceId, opportunityId, quoteId, new Date().toISOString());
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
        const [options, existingQuote, salesAreaRecords] = await Promise.all([
            salesforce.getQuoteSyncOptions(result.account.Id),
            salesforce.getQuote(result.project.salesforceQuoteId),
            salesforce.getSalesAreaData(result.account.Id)
        ]);
        const salesArea = salesAreaRecords.find(item => item.DistributionChannel__c === "10")
            ?? salesAreaRecords[0]
            ?? null;
        const recommendedTaxCode = recommendSalesforceTaxCode(result.account, salesArea ?? {});
        res.json({
            success: true,
            ...options,
            accountCountry: result.account.BillingCountry ?? "",
            accountCountryCode: result.account.BillingCountryCode ?? "",
            saved: {
                contactId: result.project.salesforceContactId ?? "",
                deliveryTime: result.project.salesforceDeliveryTime ?? "",
                articleMode: result.project.salesforceArticleMode ?? "commercial_total",
                syncScope: result.project.salesforceSyncScope ?? "opportunity_quote",
                taxCode: result.project.salesforceTaxCode ?? existingQuote?.Tax__c ?? recommendedTaxCode,
                documents: parseSavedDocuments(result.project.salesforceDocuments),
                uploadProjectFile: result.project.salesforceUploadProjectFile !== 0,
                showDiscount: result.project.salesforceShowDiscount !== 0,
                showAdditionalDiscount: result.project.salesforceShowAdditionalDiscount === 1,
                exportQuote: result.project.salesforceExportQuote == null
                    ? null
                    : result.project.salesforceExportQuote === 1
            }
        });
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

router.get("/customers/:customerId/link", async (req, res) => {
    try {
        const customer = database.customers.prepare(
            "SELECT salesforceId, salesforceSyncedAt FROM customers WHERE id = ?"
        ).get(req.params.customerId);
        const account = customer?.salesforceId && customer.salesforceSyncedAt
            ? await salesforce.getAccountById(customer.salesforceId)
            : null;
        const status = account ? await salesforce.getStatus() : null;
        res.json(account && status?.instanceUrl ? {
            id: account.Id,
            name: account.Name,
            url: `${status.instanceUrl}/lightning/r/${encodeURIComponent(account.Id)}/view`
        } : null);
    } catch (error) {
        handleError(res, error);
    }
});

router.get("/customers/:customerId/order-intake", async (req, res) => {
    try {
        const customer = database.customers.prepare(
            "SELECT salesforceId FROM customers WHERE id = ?"
        ).get(req.params.customerId);
        if (!customer?.salesforceId) {
            return res.json({ available: false, years: [] });
        }

        const account = await salesforce.getAccountById(customer.salesforceId);
        if (!account) return res.json({ available: false, years: [] });

        const years = await salesforce.getAnnualOrderIntake(account.Id);
        res.json({
            available: true,
            currency: account.CurrencyIsoCode || "EUR",
            years
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get("/projects/:projectId/links", async (req, res) => {
    try {
        const project = database.projects.prepare(`
            SELECT salesforceOpportunityId, salesforceQuoteId,
                salesforceSyncedAt, salesforceSyncScope
            FROM projects WHERE id = ?
        `).get(req.params.projectId);
        const [opportunity, quote] = await Promise.all([
            salesforce.getOpportunity(
                project?.salesforceSyncedAt ? project.salesforceOpportunityId : null
            ),
            salesforce.getQuote(
                project?.salesforceSyncedAt
                && project.salesforceSyncScope === "opportunity_quote"
                    ? project.salesforceQuoteId
                    : null
            )
        ]);
        const status = opportunity || quote ? await salesforce.getStatus() : null;
        const recordUrl = record => record && status?.instanceUrl
            ? `${status.instanceUrl}/lightning/r/${encodeURIComponent(record.Id)}/view`
            : null;
        res.json({
            opportunity: opportunity ? { id: opportunity.Id, name: opportunity.Name, url: recordUrl(opportunity) } : null,
            quote: quote ? {
                id: quote.Id,
                name: quote.Name || quote.QuoteNumber,
                quoteNumber: quote.QuoteNumber,
                url: recordUrl(quote)
            } : null
        });
    } catch (error) {
        handleError(res, error);
    }
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
        const pricingGroups = await salesforce.getProductPricingGroups(
            entries.map(entry => entry.Product2.Id), "1100", "10"
        );
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
                salesforceCurrencies, gridVisItems, gridVisItemsManual, discountGroupManual
            ) VALUES (
                @articleNumber, '', @manufacturerType, '',
                '', '', '', NULL, @quantityUnit,
                @listPrice, @listPriceCurrency, @discountGroup, @description,
                @salesforceProductId, @salesforcePricebookId, 1,
                @salesforceFamily, @salesforceProductType, @salesforceLastModifiedAt,
                @salesforceImportedAt, @salesforceImportedAt,
                @salesforceCurrencies, @gridVisItems, 0, 0
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
                discountGroup = CASE
                    WHEN COALESCE(articles.discountGroupManual, 0) = 1 THEN articles.discountGroup
                    WHEN TRIM(excluded.discountGroup) <> '' THEN excluded.discountGroup
                    ELSE articles.discountGroup END,
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
            discountGroup: (() => {
                const value = String(pricingGroups.get(String(entry.Product2.Id)) ?? "").trim();
                return /^0?[1-8]$/.test(value) ? `PG${Number(value)}` : "";
            })(),
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

        const articleModes = new Set(["commercial_total", "commercial_building", "commercial_panel", "commercial_field", "commercial_meter", "projected"]);
        const articleMode = articleModes.has(req.body.articleMode) ? req.body.articleMode : "commercial_total";
        const syncScope = req.body.syncScope === "opportunity" ? "opportunity" : "opportunity_quote";
        const uploads = [...new Set(Array.isArray(req.body.documents) ? req.body.documents : [])]
            .filter(item => SALESFORCE_UPLOAD_TYPES.has(item));
        const documents = uploads.filter(item => SALESFORCE_DOCUMENT_TYPES.has(item));
        const uploadProjectFile = uploads.includes("project");
        const [syncOptions, salesAreaRecords] = syncScope === "opportunity_quote"
            ? await Promise.all([
                salesforce.getQuoteSyncOptions(accountId),
                salesforce.getSalesAreaData(accountId)
            ])
            : [null, []];
        const salesArea = salesAreaRecords.find(item => item.DistributionChannel__c === "10")
            ?? salesAreaRecords[0]
            ?? null;
        const quoteSettings = new Set(
            Array.isArray(req.body.quoteSettings) ? req.body.quoteSettings : []
        );
        if (syncOptions?.contactField && !syncOptions.contacts.some(item => item.id === req.body.contactId)) {
            return res.status(400).json({ success: false, error: "Bitte einen Kontakt des Salesforce-Kunden auswählen." });
        }
        if (syncOptions?.deliveryField && !syncOptions.deliveryTimes.some(item => item.value === req.body.deliveryTime)) {
            return res.status(400).json({ success: false, error: "Bitte eine Lieferzeit auswählen." });
        }
        if (syncOptions?.taxField && !syncOptions.taxOptions.some(item => item.value === req.body.taxCode)) {
            return res.status(400).json({ success: false, error: "Bitte einen gültigen Salesforce-Steuerschlüssel auswählen." });
        }
        const nodes = database.projectNodes.prepare(`
            SELECT * FROM projectNodes
            WHERE projectId = ?
        `).all(project.id);
        const nodeArticles = database.projectNodeArticles.prepare(`
            SELECT projectNodeArticles.*, articles.ean, articles.manufacturerType,
                articles.manufacturerName, articles.quantityUnit, articles.listPrice,
                articles.listPriceCurrency, articles.discountGroup, articles.description
            FROM projectNodeArticles
            INNER JOIN projectNodes ON projectNodes.id = projectNodeArticles.projectNodeId
            LEFT JOIN articles ON articles.articleNumber = projectNodeArticles.articleNumber
            WHERE projectNodes.projectId = ?
        `).all(project.id);
        const positions = buildSalesforcePositions(nodes, nodeArticles, articleMode);
        if (positions.length === 0) {
            return res.status(400).json({ success: false, error: "Das Projekt enthält keine Artikelpositionen mit einer Menge größer als null." });
        }

        const savedLink = database.projects.prepare(`
            SELECT opportunityId, quoteId FROM projectSalesforceLinks
            WHERE projectId = ? AND customerSalesforceId = ?
        `).get(project.id, accountId);
        const candidateOpportunityId = savedLink?.opportunityId ?? project.salesforceOpportunityId;
        const candidateQuoteId = savedLink?.quoteId ?? project.salesforceQuoteId;
        const [pricebook, storedOpportunity, previousQuote] = await Promise.all([
            salesforce.getSalesPricebook(getConfiguredPricebookIdentifier()),
            salesforce.getOpportunity(candidateOpportunityId),
            salesforce.getQuote(candidateQuoteId)
        ]);
        if (storedOpportunity?.AccountId && storedOpportunity.AccountId !== accountId) {
            saveProjectSalesforceLink(project.id, storedOpportunity.AccountId, storedOpportunity.Id,
                previousQuote?.OpportunityId === storedOpportunity.Id ? previousQuote.Id : null);
        }
        const storedOpportunityMatchesPricebook = storedOpportunity
            && storedOpportunity.AccountId === accountId
            && storedOpportunity.Pricebook2Id === pricebook.Id;
        const opportunityPromise = storedOpportunityMatchesPricebook || candidateOpportunityId
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
            opportunity = { Id: result.id, Name: opportunityFields.Name };
        }
        database.projects.prepare(`
            UPDATE projects SET salesforceOpportunityId = ? WHERE id = ?
        `).run(opportunity.Id, project.id);
        if (syncScope === "opportunity") {
            if (opportunity.SyncedQuoteId) {
                await salesforce.synchronizeQuote(opportunity.Id, null);
            }
            await salesforce.replaceLineItems("OpportunityLineItem", "OpportunityId", opportunity.Id, opportunityLineItems);
            project.salesforceOpportunityId = opportunity.Id;
            project.salesforceQuoteId = null;
            const documentResult = await synchronizeProjectDocuments(opportunity.Id, project, nodes, nodeArticles,
                uploadProjectFile ? [...documents, "project"] : documents);
            database.projects.prepare(`
                UPDATE projects SET salesforceOpportunityId = ?, salesforceSyncedAt = ?,
                    salesforceContactId = ?, salesforceDeliveryTime = ?,
                    salesforceArticleMode = ?, salesforceSyncScope = ?, salesforceDocuments = ?,
                    salesforceTaxCode = ?, salesforceUploadProjectFile = ?
                WHERE id = ?
            `).run(opportunity.Id, new Date().toISOString(), req.body.contactId ?? null,
                req.body.deliveryTime ?? null, articleMode, syncScope, JSON.stringify(documents),
                req.body.taxCode ?? project.salesforceTaxCode ?? null,
                uploadProjectFile ? 1 : 0, project.id);
            saveProjectSalesforceLink(project.id, accountId, opportunity.Id, null);
            return res.json({
                success: true,
                opportunityId: opportunity.Id,
                opportunityName: opportunity.Name || opportunityFields.Name,
                opportunityCreated,
                quoteSynced: false,
                positionCount: opportunityLineItems.length,
                pricebookName: pricebook.Name,
                ...documentResult
            });
        }
        const synchronizedQuote = opportunity.SyncedQuoteId
            ? previousQuote?.Id === opportunity.SyncedQuoteId
                ? previousQuote
                : await salesforce.getQuote(opportunity.SyncedQuoteId)
            : null;
        const draftQuotes = synchronizedQuote
            ? []
            : await salesforce.getDraftQuotes(opportunity.Id, pricebook.Id);
        const reusableQuote = selectReusableSalesforceQuote({
            synchronizedQuote,
            draftQuotes,
            opportunityId: opportunity.Id,
            pricebookId: pricebook.Id
        });
        const createNewQuote = !reusableQuote
            || reusableQuote.Pricebook2Id !== pricebook.Id
            || reusableQuote.OpportunityId !== opportunity.Id;
        let quote = reusableQuote;
        let createdQuoteDetails = null;
        const quoteFields = {
            Name: project.name || `ProjectBuilder ${project.id}`,
            OpportunityId: opportunity.Id,
            Pricebook2Id: pricebook.Id,
            Description: project.description || null,
            Status: "Draft",
            DiscountAdd__c: normalizePercent(project.projectDiscount),
            ShowDiscount__c: quoteSettings.has("show_discount"),
            ShowAdditionalDiscountAnyway__c: quoteSettings.has("show_additional_discount"),
            ...buildSalesforceQuoteHeaderFields({
                account,
                salesArea: salesArea ?? {},
                writableSalesAreaFields: syncOptions.writableSalesAreaFields
            })
        };
        if (syncOptions.taxField) {
            quoteFields[syncOptions.taxField] = req.body.taxCode;
        }
        if (syncOptions.deliveryConditionField && syncOptions.deliveryConditionDefault) {
            quoteFields[syncOptions.deliveryConditionField] = syncOptions.deliveryConditionDefault;
        }
        if (syncOptions.exportQuoteField && syncOptions.exportQuoteWritable) {
            quoteFields[syncOptions.exportQuoteField] = quoteSettings.has("export_quote");
        }
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
            quote = { Id: result.id, Name: quoteFields.Name, Status: "Draft", QuoteNumber: null, IsSyncing: false };
            createdQuoteDetails = salesforce.getQuote(result.id).catch(() => null);
            database.projects.prepare(`
                UPDATE projects SET salesforceQuoteId = ? WHERE id = ?
            `).run(quote.Id, project.id);
        } else {
            await salesforce.updateQuote(quote.Id, quoteFields);
        }

        // Detach every synchronized quote before replacing positions. Otherwise Salesforce
        // mirrors quote lines back to the opportunity and can discard BasicDiscount__c.
        if (opportunity.SyncedQuoteId) {
            await salesforce.synchronizeQuote(opportunity.Id, null);
            opportunity.SyncedQuoteId = null;
            quote.IsSyncing = false;
        }

        // Update both sides while detached, then synchronize the finished quote below.
        await Promise.all([
            salesforce.replaceLineItems("OpportunityLineItem", "OpportunityId", opportunity.Id, opportunityLineItems),
            salesforce.replaceLineItems("QuoteLineItem", "QuoteId", quote.Id, quoteLineItems)
        ]);

        // Linking the quote alone does not make it the opportunity's synchronized quote.
        // Salesforce requires this relationship before the quote can enter approval.
        await salesforce.synchronizeQuote(opportunity.Id, quote.Id);
        await salesforce.finalizeSynchronizedLineDiscounts(
            opportunity.Id, quote.Id, opportunityLineItems, quoteLineItems
        );
        project.salesforceOpportunityId = opportunity.Id;
        project.salesforceQuoteId = quote.Id;
        const documentResult = await synchronizeProjectDocuments(
            opportunity.Id,
            project,
            nodes,
            nodeArticles,
            uploadProjectFile ? [...documents, "project"] : documents
        );
        if (createdQuoteDetails) {
            quote = await createdQuoteDetails ?? quote;
        }

        database.projects.prepare(`
            UPDATE projects SET salesforceOpportunityId = ?, salesforceQuoteId = ?, salesforceSyncedAt = ?,
                salesforceContactId = ?, salesforceDeliveryTime = ?, salesforceArticleMode = ?, salesforceSyncScope = ?,
                salesforceDocuments = ?, salesforceTaxCode = ?, salesforceShowDiscount = ?,
                salesforceShowAdditionalDiscount = ?, salesforceExportQuote = ?,
                salesforceUploadProjectFile = ?
            WHERE id = ?
        `).run(opportunity.Id, quote.Id, new Date().toISOString(), req.body.contactId ?? null,
            req.body.deliveryTime ?? null, articleMode, syncScope, JSON.stringify(documents),
            req.body.taxCode ?? project.salesforceTaxCode ?? null,
            quoteSettings.has("show_discount") ? 1 : 0,
            quoteSettings.has("show_additional_discount") ? 1 : 0,
            quoteSettings.has("export_quote") ? 1 : 0,
            uploadProjectFile ? 1 : 0, project.id);
        saveProjectSalesforceLink(project.id, accountId, opportunity.Id, quote.Id);

        res.json({
            success: true,
            opportunityId: opportunity.Id,
            opportunityName: opportunity.Name || opportunityFields.Name,
            opportunityCreated,
            quoteId: quote.Id,
            quoteNumber: quote.QuoteNumber,
            quoteName: quote.Name || quoteFields.Name,
            quoteCreated: createNewQuote,
            quoteSynced: true,
            previousQuoteStatus: previousQuote?.Status ?? null,
            positionCount: quoteLineItems.length,
            pricebookName: pricebook.Name,
            ...documentResult
        });
    } catch (error) {
        handleError(res, error);
    }
});

export default router;
