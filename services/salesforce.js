import fs from "fs";
import os from "os";
import path from "path";
import open from "open";
import { mapCustomerPricingGroupDiscounts } from "../utils/salesforceCustomerDiscounts.js";
import { isSalesforceAuthenticationError } from "../utils/externalError.js";
import {
    buildAnnualOrderIntake,
    groupOrderItemNetAmounts
} from "../utils/salesforceOrderIntake.js";
import { AuthInfo, Connection, WebOAuthServer } from "@salesforce/core";

const API_VERSION = "v67.0";
let cachedTokenConnection = null;
let cachedCoreConnection = null;
let loginPromise = null;
let cachedQuoteDescription = null;

function salesforceErrorMessage(errors, fallback) {
    const list = Array.isArray(errors) ? errors : [errors];
    const messages = list
        .map(error => typeof error === "string" ? error : error?.message ?? error?.errorCode)
        .filter(Boolean);
    return messages.join(", ") || fallback;
}

function getAlias() {
    const alias = process.env.SALESFORCE_CLI_ALIAS ?? "janitza-readonly";
    if (!/^[a-zA-Z0-9_.@-]+$/.test(alias)) throw new Error("Ungültiger Salesforce-Alias");
    return alias;
}

function getUsernameForAlias(alias) {
    try {
        const aliases = JSON.parse(
            fs.readFileSync(path.join(os.homedir(), ".sfdx", "alias.json"), "utf8")
        );
        const username = aliases?.orgs?.[alias];
        return typeof username === "string" && username ? username : null;
    } catch {
        return null;
    }
}

async function getCoreConnection() {
    if (cachedCoreConnection) return cachedCoreConnection;
    const username = getUsernameForAlias(getAlias());
    if (!username) return null;

    cachedCoreConnection = (async () => {
        const authInfo = await AuthInfo.create({ username });
        return Connection.create({ authInfo });
    })();

    try {
        return await cachedCoreConnection;
    } catch (error) {
        cachedCoreConnection = null;
        throw error;
    }
}

function getTokenConnection() {
    if (cachedTokenConnection) return cachedTokenConnection;
    if (!process.env.SALESFORCE_INSTANCE_URL || !process.env.SALESFORCE_ACCESS_TOKEN) return null;
    cachedTokenConnection = {
        instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
        accessToken: process.env.SALESFORCE_ACCESS_TOKEN
    };
    return cachedTokenConnection;
}

async function tokenRequest(requestPath, options = {}) {
    const connection = getTokenConnection();
    if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
    const response = await fetch(`${connection.instanceUrl}/services/data/${API_VERSION}${requestPath}`, {
        method: options.method ?? "GET",
        headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            ...(options.body ? { "Content-Type": "application/json" } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
        if (response.status === 401) cachedTokenConnection = null;
        throw new Error(body?.[0]?.message ?? body?.message ?? "Salesforce-Abfrage fehlgeschlagen");
    }
    return body;
}

async function query(soql) {
    if (process.env.SALESFORCE_INSTANCE_URL && process.env.SALESFORCE_ACCESS_TOKEN) {
        return tokenRequest(`/query?q=${encodeURIComponent(soql)}`);
    }
    const connection = await getCoreConnection();
    if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
    return connection.query(soql);
}

async function downloadSalesforceData(requestPath) {
    const connection = getTokenConnection() ?? await getCoreConnection();
    if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
    const url = /^https?:/i.test(requestPath) ? requestPath : `${connection.instanceUrl}${requestPath}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${connection.accessToken}` } });
    if (!response.ok) throw new Error(`Salesforce-Datei konnte nicht geladen werden (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
}

async function describe(objectName) {
    if (getTokenConnection()) {
        return tokenRequest(`/sobjects/${encodeURIComponent(objectName)}/describe`);
    }
    const connection = await getCoreConnection();
    if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
    return connection.sobject(objectName).describe();
}

export async function getSalesAreaData(accountId, salesOrganisation = "1100") {
    if (!accountId) return [];
    const result = await query(`
        SELECT Id, Account__c, SalesOrganisation__c, DistributionChannel__c,
            CustomerGroup__c, PriceList__c, PaymentTerms__c, Incoterms__c,
            IncotermsLocation1__c, ShippingCondition__c, OutputTax__c
        FROM SalesAreaData__c
        WHERE Account__c = '${escapeSoql(accountId)}'
          AND SalesOrganisation__c = '${escapeSoql(salesOrganisation)}'
        ORDER BY DistributionChannel__c
    `);
    return result.records;
}

async function queryAll(soql) {
    let result = await query(soql);
    const records = [...result.records];
    while (!result.done && result.nextRecordsUrl) {
        if (getTokenConnection()) {
            result = await tokenRequest(result.nextRecordsUrl.replace(`/services/data/${API_VERSION}`, ""));
        } else {
            const connection = await getCoreConnection();
            result = await connection.queryMore(result.nextRecordsUrl);
        }
        records.push(...result.records);
    }
    return records;
}

async function createRecord(objectName, fields) {
    if (getTokenConnection()) {
        return tokenRequest(`/sobjects/${objectName}`, { method: "POST", body: fields });
    }
    const connection = await getCoreConnection();
    if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
    const result = await connection.sobject(objectName).create(fields);
    if (!result.success) throw new Error(salesforceErrorMessage(result.errors, `${objectName} konnte nicht angelegt werden.`));
    return result;
}

async function updateRecord(objectName, id, fields) {
    if (getTokenConnection()) {
        await tokenRequest(`/sobjects/${objectName}/${id}`, { method: "PATCH", body: fields });
        return;
    }
    const connection = await getCoreConnection();
    if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
    const result = await connection.sobject(objectName).update({ Id: id, ...fields });
    if (!result.success) throw new Error(salesforceErrorMessage(result.errors, `${objectName} konnte nicht aktualisiert werden.`));
}

async function createRecords(objectName, records) {
    if (records.length === 0) return [];
    const results = [];
    for (let offset = 0; offset < records.length; offset += 200) {
        const chunk = records.slice(offset, offset + 200);
        let chunkResults;
        if (getTokenConnection()) {
            chunkResults = await tokenRequest("/composite/sobjects", {
                method: "POST",
                body: {
                    allOrNone: true,
                    records: chunk.map(fields => ({ attributes: { type: objectName }, ...fields }))
                }
            });
        } else {
            const connection = await getCoreConnection();
            if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
            chunkResults = await connection.sobject(objectName).create(chunk, { allOrNone: true });
        }
        const list = Array.isArray(chunkResults) ? chunkResults : [chunkResults];
        const failed = list.find(result => !result.success);
        if (failed) throw new Error(salesforceErrorMessage(failed.errors, `${objectName} konnte nicht angelegt werden.`));
        results.push(...list);
    }
    return results;
}

async function deleteRecords(objectName, ids) {
    for (let offset = 0; offset < ids.length; offset += 200) {
        const chunk = ids.slice(offset, offset + 200);
        if (getTokenConnection()) {
            await tokenRequest(`/composite/sobjects?ids=${encodeURIComponent(chunk.join(","))}&allOrNone=true`, {
                method: "DELETE"
            });
        } else {
            const connection = await getCoreConnection();
            if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
            const chunkResults = await connection.sobject(objectName).destroy(chunk);
            const list = Array.isArray(chunkResults) ? chunkResults : [chunkResults];
            const failed = list.find(result => !result.success);
            if (failed) throw new Error(salesforceErrorMessage(failed.errors, `${objectName} konnte nicht gelöscht werden.`));
        }
    }
}

export function loginWithBrowser() {
    if (loginPromise) return loginPromise;
    loginPromise = (async () => {
        const alias = getAlias();
        const loginUrl = process.env.SALESFORCE_LOGIN_URL ?? "https://janitza.my.salesforce.com";
        const oauthServer = await WebOAuthServer.create({ oauthConfig: { loginUrl } });
        await oauthServer.start();
        await open(oauthServer.getAuthorizationUrl(), { wait: false });
        const authInfo = await oauthServer.authorizeAndSave();
        await authInfo.handleAliasAndDefaultSettings({ alias });
        cachedCoreConnection = Promise.resolve(await Connection.create({ authInfo }));
        cachedTokenConnection = null;
        return { success: true };
    })();
    return loginPromise.finally(() => { loginPromise = null; });
}

function escapeSoql(value) {
    return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

const CUSTOMER_FIELDS = [
    "Id", "Name", "Owner.Name", "ExtID__c", "BillingStreet", "BillingPostalCode",
    "BillingCity", "BillingCountry", "LastModifiedDate"
].join(", ");

function mapCustomer(record) {
    return {
        salesforceId: record.Id,
        customerNumber: record.ExtID__c ?? null,
        name: record.Name ?? "",
        accountOwner: record.Owner?.Name ?? "",
        street: record.BillingStreet ?? "",
        postalCode: record.BillingPostalCode ?? "",
        city: record.BillingCity ?? "",
        country: record.BillingCountry ?? "",
        salesforceLastModifiedAt: record.LastModifiedDate ?? null
    };
}

export async function getStatus() {
    await query("SELECT Id FROM User LIMIT 1");
    const connection = getTokenConnection() ?? await getCoreConnection();
    return { connected: true, instanceUrl: connection?.instanceUrl ?? null };
}

export async function warmConnection() {
    if (getTokenConnection()) return true;
    return Boolean(await getCoreConnection());
}

export async function searchCustomers(filters) {
    const clauses = [];
    const mappings = {
        name: "Name",
        customerNumber: "ExtID__c",
        postalCode: "BillingPostalCode",
        city: "BillingCity"
    };
    for (const [key, field] of Object.entries(mappings)) {
        const value = String(filters[key] ?? "").trim();
        if (value) clauses.push(`${field} LIKE '%${escapeSoql(value)}%'`);
    }
    if (clauses.length === 0) throw new Error("Mindestens ein Suchfilter ist erforderlich.");
    const result = await query(
        `SELECT ${CUSTOMER_FIELDS} FROM Account WHERE ${clauses.join(" AND ")} ORDER BY Name LIMIT 50`
    );
    return result.records.map(mapCustomer);
}

export async function getCustomersByIds(ids) {
    const validIds = [...new Set(ids)].filter(id => /^[a-zA-Z0-9]{15,18}$/.test(id));
    if (validIds.length === 0) return [];
    const list = validIds.map(id => `'${escapeSoql(id)}'`).join(", ");
    const [result, pricingGroupDiscounts] = await Promise.all([
        query(`SELECT ${CUSTOMER_FIELDS} FROM Account WHERE Id IN (${list})`),
        getCustomerPricingGroupDiscounts(validIds).catch(error => {
            if (isSalesforceAuthenticationError(error)) throw error;
            console.warn("Salesforce-Kundenrabatte konnten nicht geladen werden:", error?.message ?? error);
            return new Map();
        })
    ]);
    return result.records.map(record => ({
        ...mapCustomer(record),
        ...(pricingGroupDiscounts.get(String(record.Id)) ?? {})
    }));
}

export async function getCustomerPricingGroupDiscounts(accountIds) {
    const validIds = [...new Set(accountIds)].filter(id => /^[a-zA-Z0-9]{15,18}$/.test(id));
    if (validIds.length === 0) return new Map();
    const list = validIds.map(id => `'${escapeSoql(id)}'`).join(", ");
    const lineItems = await queryAll(`
        SELECT Opportunity.AccountId, Product2Id, BasicDiscount__c,
            ListPrice, UnitPrice, LastModifiedDate
        FROM OpportunityLineItem
        WHERE Opportunity.AccountId IN (${list})
        ORDER BY LastModifiedDate DESC
    `);
    const productIds = [...new Set(lineItems.map(item => String(item.Product2Id ?? "")).filter(Boolean))];
    if (productIds.length === 0) return new Map();
    const pricingGroupsByProduct = new Map();
    for (let offset = 0; offset < productIds.length; offset += 100) {
        const products = productIds.slice(offset, offset + 100)
            .map(id => `'${escapeSoql(id)}'`).join(", ");
        const records = await queryAll(`
            SELECT Product__c, ProductPricingGroup__c
            FROM DistributionChain__c
            WHERE Product__c IN (${products})
              AND SalesOrganisation__c = '1100'
              AND DistributionChannel__c = '10'
        `);
        for (const record of records) {
            pricingGroupsByProduct.set(String(record.Product__c), record.ProductPricingGroup__c);
        }
    }
    return mapCustomerPricingGroupDiscounts(lineItems, pricingGroupsByProduct);
}

export async function getCustomerById(id) {
    const customers = await getCustomersByIds([id]);
    return customers[0] ?? null;
}

const SALES_PRICEBOOK_NAME = process.env.SALESFORCE_PRICEBOOK_NAME ?? "Janitza Electronics (1100)";

export async function findAccountByCustomerNumber(customerNumber) {
    const value = String(customerNumber ?? "").trim();
    if (!value) return null;
    const result = await query(`
        SELECT Id, Name, ExtID__c, CurrencyIsoCode, Language__c,
            BillingStreet, BillingCity, BillingStateCode, BillingPostalCode, BillingCountry, BillingCountryCode,
            ShippingStreet, ShippingCity, ShippingStateCode, ShippingPostalCode, ShippingCountry, ShippingCountryCode
        FROM Account
        WHERE ExtID__c = '${escapeSoql(value)}'
        LIMIT 2
    `);
    if (result.records.length > 1) throw new Error(`Die Kundennummer ${value} ist in Salesforce nicht eindeutig.`);
    return result.records[0] ?? null;
}

export async function getAccountById(id) {
    if (!id) return null;
    const result = await query(`
        SELECT Id, Name, ExtID__c, CurrencyIsoCode, Language__c,
            BillingStreet, BillingCity, BillingStateCode, BillingPostalCode, BillingCountry, BillingCountryCode,
            ShippingStreet, ShippingCity, ShippingStateCode, ShippingPostalCode, ShippingCountry, ShippingCountryCode
        FROM Account
        WHERE Id = '${escapeSoql(id)}'
        LIMIT 1
    `);
    return result.records[0] ?? null;
}

export async function getAnnualOrderIntake(accountId, currentYear = new Date().getUTCFullYear()) {
    if (!accountId) return [];
    const displayedYearCount = 10;
    const firstYear = currentYear - displayedYearCount;
    const orders = await queryAll(`
        SELECT Id, OrderNumber, EffectiveDate, OrderAmount__c
        FROM Order
        WHERE AccountId = '${escapeSoql(accountId)}'
            AND EffectiveDate >= ${firstYear}-01-01
            AND EffectiveDate < ${currentYear + 1}-01-01
    `);
    const headersByYear = new Map();
    const ordersMissingAmount = new Set();
    for (const order of orders) {
        const year = Number(String(order.EffectiveDate ?? "").slice(0, 4));
        if (!Number.isInteger(year)) continue;
        const header = headersByYear.get(year) ?? {
            year, orderCount: 0, orderAmountCount: 0, orderAmount: 0
        };
        header.orderCount += 1;
        if (order.OrderAmount__c !== null && order.OrderAmount__c !== undefined) {
            header.orderAmountCount += 1;
            header.orderAmount += Number(order.OrderAmount__c) || 0;
        } else {
            ordersMissingAmount.add(String(order.Id));
        }
        headersByYear.set(year, header);
    }
    const fallbackRecords = ordersMissingAmount.size > 0 ? groupOrderItemNetAmounts(await queryAll(`
        SELECT OrderId, Order.EffectiveDate, TotalNet__c
        FROM OrderItem
        WHERE Order.AccountId = '${escapeSoql(accountId)}'
            AND Order.EffectiveDate >= ${firstYear}-01-01
            AND Order.EffectiveDate < ${currentYear + 1}-01-01
    `)).filter(record => ordersMissingAmount.has(String(record.OrderId))) : [];
    const fallbackByOrderId = new Map(fallbackRecords.map(record => [String(record.OrderId), record]));
    for (const order of orders) {
        const orderId = String(order.Id);
        if (!ordersMissingAmount.has(orderId) || fallbackByOrderId.has(orderId)) continue;
        const year = Number(String(order.EffectiveDate ?? "").slice(0, 4));
        const emptyOrder = {
            year, OrderId: orderId, itemCount: 0, netAmountCount: 0, netAmount: 0
        };
        fallbackRecords.push(emptyOrder);
        fallbackByOrderId.set(orderId, emptyOrder);
    }
    const missingOrdersByYear = new Map();
    for (const order of orders) {
        if (!ordersMissingAmount.has(String(order.Id))) continue;
        const fallback = fallbackByOrderId.get(String(order.Id));
        const amountComplete = fallback
            && Number(fallback.itemCount) === Number(fallback.netAmountCount);
        if (amountComplete) continue;
        const year = Number(String(order.EffectiveDate ?? "").slice(0, 4));
        const missing = missingOrdersByYear.get(year) ?? [];
        missing.push(order.OrderNumber || order.Id);
        missingOrdersByYear.set(year, missing);
    }
    return buildAnnualOrderIntake(
        [...headersByYear.values()],
        fallbackRecords,
        currentYear,
        displayedYearCount
    ).map(year => ({ ...year, missingOrders: missingOrdersByYear.get(year.year) ?? [] }));
}

export async function getQuoteSyncOptions(accountId) {
    const [quoteDescription, contactsResult] = await Promise.all([
        cachedQuoteDescription ??= describe("Quote").catch(error => {
            cachedQuoteDescription = null;
            throw error;
        }),
        query(`
            SELECT Id, Name, Email
            FROM Contact
            WHERE AccountId = '${escapeSoql(accountId)}'
            ORDER BY Name
        `)
    ]);
    const fields = quoteDescription.fields ?? [];
    const contactField = fields.find(field => field.name === "ContactId" && field.createable && field.updateable);
    const configuredDeliveryField = process.env.SALESFORCE_QUOTE_DELIVERY_FIELD;
    const selectableDeliveryFields = fields.filter(field =>
        field.createable && field.updateable && field.type === "picklist"
    );
    const deliveryField = selectableDeliveryFields.find(field => configuredDeliveryField && field.name === configuredDeliveryField)
        ?? selectableDeliveryFields.find(field =>
            /liefer(?:zeit|termin)|delivery|lead.?time|shipping.?time/i
                .test(`${field.label ?? ""} ${field.name ?? ""}`)
        )
        ?? selectableDeliveryFields.find(field =>
            (field.picklistValues ?? []).filter(value => value.active).some(value =>
                /\b(?:tag|tage|woche|wochen|monat|monate|day|days|week|weeks|month|months)\b/i
                    .test(`${value.label ?? ""} ${value.value ?? ""}`)
            )
        );
    const booleanFields = fields.filter(field => field.type === "boolean");
    const configuredExportQuoteField = process.env.SALESFORCE_QUOTE_EXPORT_FIELD;
    const exportQuoteField = booleanFields.find(field =>
        configuredExportQuoteField && field.name === configuredExportQuoteField
    ) ?? booleanFields.find(field =>
        /(?:export.*(?:angebot|quote)|(?:angebot|quote).*export)/i
            .test(`${field.label ?? ""} ${field.name ?? ""}`)
    );
    const taxField = fields.find(field =>
        field.name === "Tax__c" && field.createable && field.updateable && field.type === "picklist"
    );
    const deliveryConditionField = fields.find(field =>
        field.name === "DeliveryEstimateCondition__c"
        && field.createable
        && field.updateable
        && field.type === "picklist"
    );
    const deliveryConditionDefault = (deliveryConditionField?.picklistValues ?? [])
        .filter(value => value.active)
        .find(value => /after receipt of order/i.test(`${value.value ?? ""} ${value.label ?? ""}`));
    const salesAreaQuoteFieldNames = new Set([
        "DistributionChannel__c", "CustomerGroup__c", "PriceList__c", "PaymentTerm__c",
        "Incoterms__c", "IncotermsLocation1__c", "ShippingCondition__c"
    ]);

    return {
        contactField: contactField?.name ?? null,
        contacts: contactsResult.records.map(contact => ({
            id: contact.Id,
            name: contact.Name,
            email: contact.Email ?? ""
        })),
        deliveryField: deliveryField?.name ?? null,
        deliveryTimes: (deliveryField?.picklistValues ?? [])
            .filter(value => value.active)
            .map(value => ({ value: value.value, label: value.label })),
        exportQuoteField: exportQuoteField?.name ?? null,
        exportQuoteWritable: Boolean(exportQuoteField?.createable && exportQuoteField?.updateable),
        taxField: taxField?.name ?? null,
        taxOptions: (taxField?.picklistValues ?? [])
            .filter(value => value.active)
            .map(value => ({ value: value.value, label: value.label })),
        deliveryConditionField: deliveryConditionField?.name ?? null,
        deliveryConditionDefault: deliveryConditionDefault?.value ?? null,
        writableSalesAreaFields: fields
            .filter(field => salesAreaQuoteFieldNames.has(field.name) && field.createable && field.updateable)
            .map(field => field.name)
    };
}

export async function getSalesPricebook(identifier = SALES_PRICEBOOK_NAME) {
    const byId = /^[a-zA-Z0-9]{15,18}$/.test(String(identifier));
    const result = await query(`
        SELECT Id, Name
        FROM Pricebook2
        WHERE ${byId ? "Id" : "Name"} = '${escapeSoql(identifier)}' AND IsActive = true
        LIMIT 2
    `);
    if (result.records.length !== 1) {
        throw new Error(`Das aktive Salesforce-Preisbuch „${identifier}“ wurde nicht eindeutig gefunden.`);
    }
    return result.records[0];
}

export async function getActivePricebooks() {
    const [books, currencyGroups] = await Promise.all([
        query("SELECT Id, Name, IsStandard FROM Pricebook2 WHERE IsActive = true ORDER BY Name"),
        query(`
            SELECT Pricebook2Id, CurrencyIsoCode, COUNT(Id) amount
            FROM PricebookEntry
            WHERE IsActive = true AND Product2.IsActive = true AND Pricebook2.IsActive = true
            GROUP BY Pricebook2Id, CurrencyIsoCode
        `)
    ]);
    const currencies = new Map();
    for (const group of currencyGroups.records) {
        if (!currencies.has(group.Pricebook2Id)) currencies.set(group.Pricebook2Id, []);
        currencies.get(group.Pricebook2Id).push({
            currency: group.CurrencyIsoCode,
            articleCount: group.amount
        });
    }
    return books.records.map(book => ({
        id: book.Id,
        name: book.Name,
        isStandard: book.IsStandard,
        currencies: (currencies.get(book.Id) ?? []).sort((a, b) => a.currency.localeCompare(b.currency))
    }));
}

export async function getPricebookProducts(pricebookId, currencyIsoCode) {
    return queryAll(`
        SELECT Id, UnitPrice, CurrencyIsoCode, LastModifiedDate,
            Product2.Id, Product2.ProductCode, Product2.Name, Product2.Description,
            Product2.Family, Product2.QuantityUnitOfMeasure, Product2.ProductType__c,
            Product2.IsActive, Product2.LastModifiedDate
        FROM PricebookEntry
        WHERE Pricebook2Id = '${escapeSoql(pricebookId)}'
          AND CurrencyIsoCode = '${escapeSoql(currencyIsoCode)}'
          AND IsActive = true
          AND Product2.IsActive = true
        ORDER BY Product2.ProductCode
    `);
}

export async function getProductPricingGroups(productIds, salesOrganisation = "1100", distributionChannel = "10") {
    const ids = [...new Set(productIds.map(value => String(value).trim()).filter(Boolean))];
    const records = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
        const values = ids.slice(offset, offset + 100)
            .map(value => `'${escapeSoql(value)}'`)
            .join(", ");
        const result = await query(`
            SELECT Product__c, ProductPricingGroup__c
            FROM DistributionChain__c
            WHERE Product__c IN (${values})
              AND SalesOrganisation__c = '${escapeSoql(salesOrganisation)}'
              AND DistributionChannel__c = '${escapeSoql(distributionChannel)}'
        `);
        records.push(...result.records);
    }
    return new Map(records.map(record => [String(record.Product__c), record.ProductPricingGroup__c ?? ""]));
}

export async function getPricebookEntries(pricebookId, articleNumbers, currencyIsoCode) {
    const numbers = [...new Set(articleNumbers.map(value => String(value).trim()).filter(Boolean))];
    const records = [];
    for (let offset = 0; offset < numbers.length; offset += 100) {
        const values = numbers.slice(offset, offset + 100).map(value => `'${escapeSoql(value)}'`).join(", ");
        const result = await query(`
            SELECT Id, Product2Id, Product2.ProductCode, UnitPrice
            FROM PricebookEntry
            WHERE Pricebook2Id = '${escapeSoql(pricebookId)}'
              AND IsActive = true
              AND Product2.IsActive = true
              AND CurrencyIsoCode = '${escapeSoql(currencyIsoCode)}'
              AND Product2.ProductCode IN (${values})
        `);
        records.push(...result.records);
    }
    return records;
}

export async function getPricebookAvailability(pricebookId, articleNumbers) {
    const numbers = [...new Set(articleNumbers.map(value => String(value).trim()).filter(Boolean))];
    const chunks = [];
    for (let offset = 0; offset < numbers.length; offset += 100) {
        const values = numbers.slice(offset, offset + 100)
            .map(value => `'${escapeSoql(value)}'`)
            .join(", ");
        chunks.push(query(`
            SELECT Product2Id, Product2.ProductCode, CurrencyIsoCode
            FROM PricebookEntry
            WHERE Pricebook2Id = '${escapeSoql(pricebookId)}'
              AND IsActive = true
              AND Product2.IsActive = true
              AND Product2.ProductCode IN (${values})
        `));
    }
    const results = await Promise.all(chunks);
    return results.flatMap(result => result.records);
}

export async function getOpportunity(id) {
    if (!id) return null;
    const result = await query(`
        SELECT Id, Name, AccountId, Pricebook2Id, StageName, CloseDate, CurrencyIsoCode, SyncedQuoteId
        FROM Opportunity
        WHERE Id = '${escapeSoql(id)}'
        LIMIT 1
    `);
    return result.records[0] ?? null;
}

export async function findRecentEmptyOpportunity(accountId, name, pricebookId) {
    const earliest = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = await query(`
        SELECT Id, Pricebook2Id, StageName, CloseDate, CreatedDate,
            (SELECT Id FROM OpportunityLineItems LIMIT 1)
        FROM Opportunity
        WHERE AccountId = '${escapeSoql(accountId)}'
          AND Name = '${escapeSoql(name)}'
          AND Pricebook2Id = '${escapeSoql(pricebookId)}'
          AND CreatedDate >= ${earliest}
        ORDER BY CreatedDate DESC
        LIMIT 2
    `);
    return result.records.find(record => !record.OpportunityLineItems?.records?.length) ?? null;
}

export async function createOpportunity(fields) {
    return createRecord("Opportunity", fields);
}

export async function updateOpportunity(id, fields) {
    return updateRecord("Opportunity", id, fields);
}

export async function uploadOpportunityFile(opportunityId, { title, filename, data }) {
    const existing = await query(`
        SELECT ContentDocumentId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = '${escapeSoql(opportunityId)}'
          AND ContentDocument.Title = '${escapeSoql(title)}'
        ORDER BY ContentDocument.CreatedDate DESC
        LIMIT 1
    `);
    const fields = {
        Title: title,
        PathOnClient: filename,
        VersionData: Buffer.from(data).toString("base64")
    };
    const contentDocumentId = existing.records[0]?.ContentDocumentId;
    if (contentDocumentId) fields.ContentDocumentId = contentDocumentId;
    else fields.FirstPublishLocationId = opportunityId;
    const result = await createRecord("ContentVersion", fields);
    return { id: result.id, versioned: Boolean(contentDocumentId) };
}

export async function searchProjectFileOpportunities(search) {
    const value = String(search ?? "").trim();
    if (value.length < 2) throw new Error("Bitte mindestens zwei Suchzeichen eingeben.");
    const escaped = escapeSoql(value);
    const result = await query(`
        SELECT Id, Name, StageName, LastModifiedDate, Account.Id, Account.Name, Account.ExtID__c
        FROM Opportunity
        WHERE Name LIKE '%${escaped}%'
           OR Account.Name LIKE '%${escaped}%'
           OR Account.ExtID__c LIKE '%${escaped}%'
        ORDER BY LastModifiedDate DESC LIMIT 50
    `);
    if (result.records.length === 0) return [];
    const ids = result.records.map(item => `'${escapeSoql(item.Id)}'`).join(", ");
    const links = await query(`
        SELECT LinkedEntityId, ContentDocumentId, ContentDocument.Title,
            ContentDocument.LatestPublishedVersion.LastModifiedDate
        FROM ContentDocumentLink
        WHERE LinkedEntityId IN (${ids})
          AND ContentDocument.Title = 'ProjectBuilder - Projektdatei'
    `);
    const fileByOpportunity = new Map(links.records.map(link => [String(link.LinkedEntityId), link]));
    return result.records.map(opportunity => ({
        id: opportunity.Id,
        name: opportunity.Name,
        stageName: opportunity.StageName,
        lastModifiedAt: opportunity.LastModifiedDate,
        accountId: opportunity.Account?.Id ?? null,
        accountName: opportunity.Account?.Name ?? "",
        customerNumber: opportunity.Account?.ExtID__c ?? "",
        hasProjectFile: fileByOpportunity.has(String(opportunity.Id)),
        projectFileModifiedAt: fileByOpportunity.get(String(opportunity.Id))
            ?.ContentDocument?.LatestPublishedVersion?.LastModifiedDate ?? null
    }));
}

export async function downloadOpportunityProjectFile(opportunityId) {
    if (!/^[a-zA-Z0-9]{15,18}$/.test(String(opportunityId ?? ""))) {
        throw new Error("Ungültige Opportunity-ID.");
    }
    const links = await query(`
        SELECT ContentDocumentId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = '${escapeSoql(opportunityId)}'
          AND ContentDocument.Title = 'ProjectBuilder - Projektdatei'
        ORDER BY ContentDocument.CreatedDate DESC LIMIT 1
    `);
    const contentDocumentId = links.records[0]?.ContentDocumentId;
    if (!contentDocumentId) throw new Error("Für diese Opportunity wurde keine ProjectBuilder-Projektdatei gefunden.");
    const versions = await query(`
        SELECT Id, Title, FileExtension, VersionData, LastModifiedDate
        FROM ContentVersion
        WHERE ContentDocumentId = '${escapeSoql(contentDocumentId)}' AND IsLatest = true
        LIMIT 1
    `);
    const version = versions.records[0];
    if (!version?.VersionData) throw new Error("Die ProjectBuilder-Projektdatei ist nicht verfügbar.");
    return { data: await downloadSalesforceData(version.VersionData), modifiedAt: version.LastModifiedDate };
}

export async function synchronizeQuote(opportunityId, quoteId) {
    return updateRecord("Opportunity", opportunityId, { SyncedQuoteId: quoteId });
}

export async function getQuote(id) {
    if (!id) return null;
    const result = await query(`
        SELECT Id, Name, Status, QuoteNumber, IsSyncing, Pricebook2Id, OpportunityId, Tax__c
        FROM Quote
        WHERE Id = '${escapeSoql(id)}'
        LIMIT 1
    `);
    return result.records[0] ?? null;
}

export async function getDraftQuotes(opportunityId, pricebookId) {
    if (!opportunityId || !pricebookId) return [];
    const result = await query(`
        SELECT Id, Name, Status, QuoteNumber, IsSyncing, Pricebook2Id, OpportunityId,
            CreatedDate
        FROM Quote
        WHERE OpportunityId = '${escapeSoql(opportunityId)}'
          AND Pricebook2Id = '${escapeSoql(pricebookId)}'
          AND Status = 'Draft'
        ORDER BY CreatedDate DESC
    `);
    return result.records;
}

export async function createQuote(fields) {
    return createRecord("Quote", fields);
}

export async function updateQuote(id, fields) {
    return updateRecord("Quote", id, fields);
}

export async function replaceLineItems(objectName, parentField, parentId, items) {
    if (!new Set(["OpportunityLineItem", "QuoteLineItem"]).has(objectName)) {
        throw new Error("Ungültiger Salesforce-Positionstyp.");
    }
    const existing = await query(`SELECT Id FROM ${objectName} WHERE ${parentField} = '${escapeSoql(parentId)}'`);
    await deleteRecords(objectName, existing.records.map(record => record.Id));
    await createRecords(objectName, items.map(item => ({ [parentField]: parentId, ...item })));
}

export async function finalizeSynchronizedLineDiscounts(opportunityId, quoteId, opportunityItems, quoteItems) {
    const opportunityLines = await query(`
        SELECT Id FROM OpportunityLineItem
        WHERE OpportunityId = '${escapeSoql(opportunityId)}'
        ORDER BY SortOrder, CreatedDate
    `);
    const quoteLines = await query(`
        SELECT Id FROM QuoteLineItem
        WHERE QuoteId = '${escapeSoql(quoteId)}'
        ORDER BY SortOrder, CreatedDate
    `);
    if (opportunityLines.records.length !== opportunityItems.length
        || quoteLines.records.length !== quoteItems.length) {
        throw new Error("Die synchronisierten Salesforce-Angebotspositionen sind unvollständig.");
    }
    await Promise.all(opportunityLines.records.map((record, index) =>
        updateRecord("OpportunityLineItem", record.Id, {
            BasicDiscount__c: opportunityItems[index].BasicDiscount__c
        })
    ));
    await Promise.all(quoteLines.records.map((record, index) => updateRecord("QuoteLineItem", record.Id, {
        SortOrder: quoteItems[index].SortOrder,
        Position__c: quoteItems[index].Position__c,
        Alternative__c: quoteItems[index].Alternative__c,
        Option__c: quoteItems[index].Option__c,
        Manuell_Updated__c: false
    })));
}
