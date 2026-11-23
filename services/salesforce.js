import fs from "fs";
import os from "os";
import path from "path";
import open from "open";
import { isSalesforceAuthenticationError } from "../utils/externalError.js";
import { inferSalesArticleCategory } from "../utils/salesArticleCategory.js";
import {
    buildAnnualOrderIntake,
    groupOrderItemNetAmounts
} from "../utils/salesforceOrderIntake.js";
import { AuthInfo, AuthRemover, Connection, WebOAuthServer } from "@salesforce/core";

const API_VERSION = "v67.0";
let cachedTokenConnection = null;
let cachedCoreConnection = null;
let loginPromise = null;
let cachedQuoteDescription = null;
let cachedProduct2LifecycleFields = null;
let cachedSalesforceIdentity = null;

function salesforceErrorMessage(errors, fallback) {
    const list = Array.isArray(errors) ? errors : [errors];
    const messages = list
        .map(error => typeof error === "string" ? error : error?.message ?? error?.errorCode)
        .filter(Boolean);
    return messages.join(", ") || fallback;
}

export function isSalesforceRecordLockError(error) {
    const message = String(error?.message ?? error ?? "").toLowerCase();
    return message.includes("unable to obtain exclusive access")
        || message.includes("unable_to_lock_row")
        || message.includes("unable to lock row")
        || message.includes("exclusive access to this record");
}

async function withSalesforceRecordLockRetry(operation) {
    const delays = [750, 1500, 3000, 5000];
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            if (!isSalesforceRecordLockError(error) || attempt >= delays.length) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
    }
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
    return withSalesforceRecordLockRetry(async () => {
        if (getTokenConnection()) {
            return tokenRequest(`/sobjects/${objectName}`, { method: "POST", body: fields });
        }
        const connection = await getCoreConnection();
        if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
        const result = await connection.sobject(objectName).create(fields);
        if (!result.success) throw new Error(salesforceErrorMessage(result.errors, `${objectName} konnte nicht angelegt werden.`));
        return result;
    });
}

async function updateRecord(objectName, id, fields) {
    return withSalesforceRecordLockRetry(async () => {
        if (getTokenConnection()) {
            await tokenRequest(`/sobjects/${objectName}/${id}`, { method: "PATCH", body: fields });
            return;
        }
        const connection = await getCoreConnection();
        if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
        const result = await connection.sobject(objectName).update({ Id: id, ...fields });
        if (!result.success) throw new Error(salesforceErrorMessage(result.errors, `${objectName} konnte nicht aktualisiert werden.`));
    });
}

async function createRecords(objectName, records) {
    if (records.length === 0) return [];
    const results = [];
    for (let offset = 0; offset < records.length; offset += 200) {
        const chunk = records.slice(offset, offset + 200);
        let chunkResults;
        chunkResults = await withSalesforceRecordLockRetry(async () => {
            if (getTokenConnection()) {
                return tokenRequest("/composite/sobjects", {
                    method: "POST",
                    body: {
                        allOrNone: true,
                        records: chunk.map(fields => ({ attributes: { type: objectName }, ...fields }))
                    }
                });
            }
            const connection = await getCoreConnection();
            if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
            return connection.sobject(objectName).create(chunk, { allOrNone: true });
        });
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
        await withSalesforceRecordLockRetry(async () => {
            if (getTokenConnection()) {
                await tokenRequest(`/composite/sobjects?ids=${encodeURIComponent(chunk.join(","))}&allOrNone=true`, {
                    method: "DELETE"
                });
                return;
            }
            const connection = await getCoreConnection();
            if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
            const chunkResults = await connection.sobject(objectName).destroy(chunk);
            const list = Array.isArray(chunkResults) ? chunkResults : [chunkResults];
            const failed = list.find(result => !result.success);
            if (failed) throw new Error(salesforceErrorMessage(failed.errors, `${objectName} konnte nicht gelöscht werden.`));
        });
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
        cachedSalesforceIdentity = null;
        return { success: true };
    })();
    return loginPromise.finally(() => { loginPromise = null; });
}

export async function logout() {
    if (process.env.SALESFORCE_INSTANCE_URL && process.env.SALESFORCE_ACCESS_TOKEN) {
        throw new Error("Diese Salesforce-Anmeldung wird über Umgebungsvariablen bereitgestellt und kann nicht über die Anwendung abgemeldet werden.");
    }

    cachedCoreConnection = null;
    cachedTokenConnection = null;
    cachedQuoteDescription = null;
    cachedSalesforceIdentity = null;

    const remover = await AuthRemover.create({ skipCache: true });
    try {
        await remover.removeAuth(getAlias());
    } catch (error) {
        const name = String(error?.name ?? "");
        const message = String(error?.message ?? error ?? "");
        if (!/NamedOrgNotFoundError|TargetOrgNotSetError/i.test(name)
            && !/not found|no authorization/i.test(message)) {
            throw error;
        }
    }
    return { success: true };
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

export async function getCurrentUserDisplayName() {
    if (cachedSalesforceIdentity) return cachedSalesforceIdentity;

    const tokenConnection = getTokenConnection();
    if (tokenConnection) {
        try {
            const response = await fetch(`${tokenConnection.instanceUrl}/services/oauth2/userinfo`, {
                headers: { Authorization: `Bearer ${tokenConnection.accessToken}` }
            });
            if (response.ok) {
                const info = await response.json();
                cachedSalesforceIdentity = info.name
                    || info.preferred_username
                    || info.email
                    || info.user_id
                    || null;
                return cachedSalesforceIdentity;
            }
        } catch {
            // Fall through to the local Salesforce connection or the fallback
            // stored by the knowledge mutation route.
        }
    }

    const connection = await getCoreConnection();
    if (!connection) return null;
    const authInfo = typeof connection.getAuthInfo === "function" ? connection.getAuthInfo() : null;
    const username = authInfo?.getUsername?.() || connection.username || "";
    if (!username) return null;

    try {
        const result = await query(`SELECT Name, Username, Email FROM User WHERE Username = '${escapeSoql(username)}' LIMIT 1`);
        const user = result?.records?.[0];
        cachedSalesforceIdentity = user?.Name || user?.Username || user?.Email || username;
    } catch {
        cachedSalesforceIdentity = username;
    }
    return cachedSalesforceIdentity;
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
    // Dedicated Salesforce customer price-group fields are not available yet.
    // In particular, do not derive discounts from historical opportunities or quotes.
    // The empty map makes customer refreshes leave all existing local discounts intact.
    return new Map();
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

export async function getTopPurchasedItems(
    accountId,
    currentYear = new Date().getUTCFullYear(),
    manualCategories = new Map()
) {
    if (!accountId) {
        return {
            devices: { currentYear: [], tenYear: [] },
            allArticles: { currentYear: [], tenYear: [] },
            firstYear: currentYear - 9,
            lastYear: currentYear
        };
    }

    const firstYear = currentYear - 9;
    const records = await queryAll(`
        SELECT Product2Id, Product2.ProductCode, Product2.Name, Quantity, Order.EffectiveDate
        FROM OrderItem
        WHERE Order.AccountId = '${escapeSoql(accountId)}'
          AND Order.EffectiveDate >= ${firstYear}-01-01
          AND Order.EffectiveDate < ${currentYear + 1}-01-01
          AND Product2Id != null
    `);
    const currentYearTotals = { devices: new Map(), allArticles: new Map() };
    const tenYearTotals = { devices: new Map(), allArticles: new Map() };
    for (const record of records) {
        const year = Number(String(record.Order?.EffectiveDate ?? "").slice(0, 4));
        const quantity = Number(record.Quantity);
        if (!Number.isInteger(year) || !Number.isFinite(quantity) || quantity <= 0) continue;

        const productId = String(record.Product2Id ?? "");
        const productCode = String(record.Product2?.ProductCode ?? "").trim();
        const key = productCode || productId;
        const product = {
            articleNumber: productCode,
            name: String(record.Product2?.Name ?? "").trim() || productCode || productId,
            quantity: 0
        };
        const addQuantity = (totals, count) => {
            const total = totals.get(key) ?? { ...product };
            total.quantity += count;
            totals.set(key, total);
        };

        const category = manualCategories.get(productCode)
            || inferSalesArticleCategory({ name: product.name });
        const isDevice = category === "device";
        if (year === currentYear) {
            addQuantity(currentYearTotals.allArticles, quantity);
            if (isDevice) addQuantity(currentYearTotals.devices, quantity);
        }
        addQuantity(tenYearTotals.allArticles, quantity);
        if (isDevice) addQuantity(tenYearTotals.devices, quantity);
    }

    const topFive = totals => [...totals.values()]
        .sort((first, second) => second.quantity - first.quantity
            || first.name.localeCompare(second.name, "de", { sensitivity: "base" })
            || first.articleNumber.localeCompare(second.articleNumber, "de", { numeric: true }))
        .slice(0, 5);

    return {
        devices: {
            currentYear: topFive(currentYearTotals.devices),
            tenYear: topFive(tenYearTotals.devices)
        },
        allArticles: {
            currentYear: topFive(currentYearTotals.allArticles),
            tenYear: topFive(tenYearTotals.allArticles)
        },
        firstYear,
        lastYear: currentYear
    };
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

function normalizeFieldName(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function resolveProduct2Field(fields, apiNames, labels, fragments = []) {
    const normalizedApiNames = new Set(apiNames.map(normalizeFieldName));
    const normalizedLabels = new Set(labels.map(normalizeFieldName));
    const normalizedFragments = fragments.map(normalizeFieldName);
    const matchesFragment = value => normalizedFragments.some(fragment => value.includes(fragment));
    const apiMatch = fields.find(field => {
        const name = normalizeFieldName(field.name);
        return normalizedApiNames.has(name) || matchesFragment(name);
    });
    const labelMatch = fields.find(field => {
        const label = normalizeFieldName(field.label);
        return normalizedLabels.has(label) || matchesFragment(label);
    });
    const name = apiMatch?.name ?? labelMatch?.name ?? null;
    return /^[A-Za-z0-9_]+$/.test(name ?? "") ? name : null;
}

export async function getProduct2LifecycleFields() {
    if (cachedProduct2LifecycleFields) return cachedProduct2LifecycleFields;

    try {
        const description = await describe("Product2");
        const fields = Array.isArray(description?.fields) ? description.fields : [];
        cachedProduct2LifecycleFields = {
            salesStatus: resolveProduct2Field(
                fields,
                ["SalesStatus__c", "Sales_Status__c", "SalesStatus"],
                ["Sales Status"],
                ["salesstatus"]
            ),
            discontinuationDate: resolveProduct2Field(
                fields,
                [
                    "DiscontinuationDate__c",
                    "Discontinuation_Date__c",
                    "Abkundigungsdatum__c",
                    "Abkuendigungsdatum__c",
                    "Discontinuation__c",
                    "EndOfSaleDate__c",
                    "EndOfLifeDate__c"
                ],
                ["Abkündigungsdatum", "Discontinuation Date", "End of Sale Date", "End of Life Date"],
                ["discontinuationdate", "abkuendigungsdatum", "abkundigungsdatum", "endofsale", "endoflife"]
            ),
            plantMaterialStatus: resolveProduct2Field(
                fields,
                ["PlantMaterialStatus__c", "Plant_Material_Status__c", "PlantMaterialStatus"],
                ["Plant Material Status", "PlantMaterialStatus"]
            ),
            plantMaterialStatusValidFrom: resolveProduct2Field(
                fields,
                ["PlantMaterialStatusValidFrom__c", "Plant_Material_Status_Valid_From__c", "PlantMaterialStatusValidFrom"],
                ["PlantMaterialStatusValidFrom", "Plant Material Status Valid From"]
            ),
            distributionChannelStatus: resolveProduct2Field(
                fields,
                ["DistributionChannelStatus__c", "Distribution_Channel_Status__c", "DistributionChannelStatus"],
                ["Distribution Channel Status", "DistributionChannelStatus"]
            ),
            distributionChannelStatusValidFrom: resolveProduct2Field(
                fields,
                ["DistributionChannelStatusValidFrom__c", "Distribution_Channel_Status_Valid_From__c", "DistributionChannelStatusValidFrom"],
                ["Distribution Channel Status Valid From", "DistributionChannelStatusValidFrom"]
            )
        };
        cachedProduct2LifecycleFields.picklistLabels = {};
        for (const key of ["salesStatus", "plantMaterialStatus", "distributionChannelStatus"]) {
            const field = fields.find(item => item.name === cachedProduct2LifecycleFields[key]);
            const values = Array.isArray(field?.picklistValues) ? field.picklistValues : [];
            if (values.length) {
                cachedProduct2LifecycleFields.picklistLabels[key] = Object.fromEntries(
                    values
                        .filter(value => value?.value !== undefined)
                        .map(value => [String(value.value), String(value.label ?? value.value)])
                );
            }
        }
    } catch {
        cachedProduct2LifecycleFields = { salesStatus: null, discontinuationDate: null };
    }

    return cachedProduct2LifecycleFields;
}

export async function getPricebookProducts(
    pricebookId,
    currencyIsoCode,
    lifecycleFields = null
) {
    lifecycleFields = lifecycleFields ?? await getProduct2LifecycleFields();
    const lifecycleSelect = [
        lifecycleFields?.salesStatus,
        lifecycleFields?.discontinuationDate,
        lifecycleFields?.plantMaterialStatus,
        lifecycleFields?.plantMaterialStatusValidFrom,
        lifecycleFields?.distributionChannelStatus,
        lifecycleFields?.distributionChannelStatusValidFrom,
        "SalesStatus__c",
        "PlantMaterialStatus__c",
        "PlantMaterialStatusValidFrom__c",
        "DistributionChannelStatus__c",
        "DistributionChannelStatusValidFrom__c"
    ]
        .filter(Boolean)
        .filter((field, index, fields) => fields.indexOf(field) === index)
        .map(field => `Product2.${field}`)
        .join(",\n            ");

    const entries = await queryAll(`
        SELECT Id, UnitPrice, CurrencyIsoCode, LastModifiedDate,
            Product2.Id, Product2.ProductCode, Product2.Name, Product2.Description,
            Product2.Family, Product2.QuantityUnitOfMeasure, Product2.ProductType__c,
            Product2.IsActive, Product2.LastModifiedDate${lifecycleSelect ? `,\n            ${lifecycleSelect}` : ""}
        FROM PricebookEntry
        WHERE Pricebook2Id = '${escapeSoql(pricebookId)}'
          AND CurrencyIsoCode = '${escapeSoql(currencyIsoCode)}'
          AND IsActive = true
          AND Product2.IsActive = true
        ORDER BY Product2.ProductCode
    `);

    if (!entries.length || lifecycleFields.salesStatus) {
        return entries;
    }

    try {
        const productIds = [...new Set(entries.map(entry => String(entry.Product2?.Id ?? "")).filter(Boolean))];
        const customRecords = [];
        for (let offset = 0; offset < productIds.length; offset += 100) {
            const values = productIds.slice(offset, offset + 100)
                .map(value => `'${escapeSoql(value)}'`)
                .join(", ");
            customRecords.push(...await queryAll(`
                SELECT Id, FIELDS(CUSTOM)
                FROM Product2
                WHERE Id IN (${values})
            `));
        }

        const distributionRecords = [];
        for (let offset = 0; offset < productIds.length; offset += 100) {
            const values = productIds.slice(offset, offset + 100)
                .map(value => `'${escapeSoql(value)}'`)
                .join(", ");
            distributionRecords.push(...await queryAll(`
                SELECT FIELDS(CUSTOM)
                FROM DistributionChain__c
                WHERE Product__c IN (${values})
                  AND SalesOrganisation__c = '1100'
                  AND DistributionChannel__c = '10'
            `));
        }

        const customFields = [...new Set(
            customRecords.flatMap(record => Object.keys(record))
        )]
            .map(name => ({ name, label: name }));
        const distributionFields = [...new Set(
            distributionRecords.flatMap(record => Object.keys(record))
        )]
            .map(name => ({ name, label: name }));
        const discoveredFields = {
            salesStatus: resolveProduct2Field(
                customFields,
                ["SalesStatus__c", "Sales_Status__c", "SalesStatus"],
                ["Sales Status"],
                ["salesstatus"]
            ),
            discontinuationDate: resolveProduct2Field(
                customFields,
                [
                    "DiscontinuationDate__c",
                    "Discontinuation_Date__c",
                    "Abkundigungsdatum__c",
                    "Abkuendigungsdatum__c",
                    "Discontinuation__c",
                    "EndOfSaleDate__c",
                    "EndOfLifeDate__c"
                ],
                ["Abkündigungsdatum", "Discontinuation Date", "End of Sale Date", "End of Life Date"],
                ["discontinuationdate", "abkuendigungsdatum", "abkundigungsdatum", "endofsale", "endoflife"]
            ),
            plantMaterialStatus: resolveProduct2Field(
                customFields,
                ["PlantMaterialStatus__c", "Plant_Material_Status__c", "PlantMaterialStatus"],
                ["Plant Material Status", "PlantMaterialStatus"]
            ),
            plantMaterialStatusValidFrom: resolveProduct2Field(
                customFields,
                ["PlantMaterialStatusValidFrom__c", "Plant_Material_Status_Valid_From__c", "PlantMaterialStatusValidFrom"],
                ["PlantMaterialStatusValidFrom", "Plant Material Status Valid From"]
            ),
            distributionChannelStatus: resolveProduct2Field(
                customFields,
                ["DistributionChannelStatus__c", "Distribution_Channel_Status__c", "DistributionChannelStatus"],
                ["Distribution Channel Status", "DistributionChannelStatus"]
            ),
            distributionChannelStatusValidFrom: resolveProduct2Field(
                customFields,
                ["DistributionChannelStatusValidFrom__c", "Distribution_Channel_Status_Valid_From__c", "DistributionChannelStatusValidFrom"],
                ["Distribution Channel Status Valid From", "DistributionChannelStatusValidFrom"]
            )
        };
        const discoveredDistributionFields = {
            distributionChannelStatus: resolveProduct2Field(
                distributionFields,
                ["DistributionChannelStatus__c", "Distribution_Channel_Status__c", "DistributionChannelStatus"],
                ["Distribution Channel Status", "DistributionChannelStatus"]
            ),
            distributionChannelStatusValidFrom: resolveProduct2Field(
                distributionFields,
                ["DistributionChannelStatusValidFrom__c", "Distribution_Channel_Status_Valid_From__c", "DistributionChannelStatusValidFrom"],
                ["Distribution Channel Status Valid From", "DistributionChannelStatusValidFrom"]
            )
        };
        lifecycleFields = {
            ...lifecycleFields,
            salesStatus: lifecycleFields.salesStatus ?? discoveredFields.salesStatus,
            discontinuationDate: lifecycleFields.discontinuationDate ?? discoveredFields.discontinuationDate,
            plantMaterialStatus: lifecycleFields.plantMaterialStatus ?? discoveredFields.plantMaterialStatus,
            plantMaterialStatusValidFrom: lifecycleFields.plantMaterialStatusValidFrom
                ?? discoveredFields.plantMaterialStatusValidFrom,
            distributionChannelStatus: lifecycleFields.distributionChannelStatus
                ?? discoveredFields.distributionChannelStatus
                ?? discoveredDistributionFields.distributionChannelStatus,
            distributionChannelStatusValidFrom: lifecycleFields.distributionChannelStatusValidFrom
                ?? discoveredFields.distributionChannelStatusValidFrom
                ?? discoveredDistributionFields.distributionChannelStatusValidFrom
        };
        cachedProduct2LifecycleFields = lifecycleFields;

        const recordsById = new Map(customRecords.map(record => [String(record.Id), record]));
        const distributionByProductId = new Map(
            distributionRecords.map(record => [String(record.Product__c), record])
        );
        return entries.map(entry => {
            const customFieldsForProduct = recordsById.get(String(entry.Product2?.Id ?? ""));
            const distributionFieldsForProduct = distributionByProductId.get(String(entry.Product2?.Id ?? ""));
            if (!customFieldsForProduct && !distributionFieldsForProduct) return entry;
            return {
                ...entry,
                Product2: {
                    ...entry.Product2,
                    ...customFieldsForProduct,
                    ...distributionFieldsForProduct
                }
            };
        });
    } catch {
        return entries;
    }
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

const KNOWLEDGE_ACCOUNT_NAME = process.env.SALESFORCE_KNOWLEDGE_ACCOUNT_NAME ?? "Janitza Technik Account";
const KNOWLEDGE_OPPORTUNITY_NAME = process.env.SALESFORCE_KNOWLEDGE_OPPORTUNITY_NAME ?? "FAQ und Technik";
const KNOWLEDGE_FILE_TITLE = process.env.SALESFORCE_KNOWLEDGE_FILE_TITLE ?? "FAQ-und-Technische-Daten";

export async function downloadKnowledgeWorkbook() {
    const opportunities = await query(`
        SELECT Id, Name, AccountId, Account.Name, LastModifiedDate
        FROM Opportunity
        WHERE Name = '${escapeSoql(KNOWLEDGE_OPPORTUNITY_NAME)}'
          AND Account.Name = '${escapeSoql(KNOWLEDGE_ACCOUNT_NAME)}'
        ORDER BY LastModifiedDate DESC
        LIMIT 2
    `);
    const opportunity = opportunities.records[0];
    if (!opportunity) return null;

    const titleVariants = [KNOWLEDGE_FILE_TITLE, `${KNOWLEDGE_FILE_TITLE}.xlsx`]
        .map(escapeSoql)
        .map(title => `'${title}'`)
        .join(", ");
    const links = await query(`
        SELECT ContentDocumentId, ContentDocument.Title,
            ContentDocument.LatestPublishedVersion.LastModifiedDate
        FROM ContentDocumentLink
        WHERE LinkedEntityId = '${escapeSoql(opportunity.Id)}'
          AND ContentDocument.Title IN (${titleVariants})
        ORDER BY ContentDocument.CreatedDate DESC
        LIMIT 1
    `);
    const link = links.records[0];
    if (!link?.ContentDocumentId) {
        return {
            opportunityId: opportunity.Id,
            opportunityName: opportunity.Name,
            accountName: opportunity.Account?.Name ?? KNOWLEDGE_ACCOUNT_NAME,
            available: false
        };
    }

    const versions = await query(`
        SELECT Id, Title, FileExtension, VersionData, LastModifiedDate
        FROM ContentVersion
        WHERE ContentDocumentId = '${escapeSoql(link.ContentDocumentId)}'
          AND IsLatest = true
        LIMIT 1
    `);
    const version = versions.records[0];
    if (!version?.VersionData) {
        throw new Error("Die Salesforce-Datei für FAQ und Technik ist nicht verfügbar.");
    }
    return {
        data: await downloadSalesforceData(version.VersionData),
        modifiedAt: version.LastModifiedDate
            ?? link.ContentDocument?.LatestPublishedVersion?.LastModifiedDate
            ?? null,
        opportunityId: opportunity.Id,
        opportunityName: opportunity.Name,
        accountName: opportunity.Account?.Name ?? KNOWLEDGE_ACCOUNT_NAME,
        title: version.Title ?? link.ContentDocument?.Title ?? KNOWLEDGE_FILE_TITLE,
        available: true
    };
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
    for (const [index, record] of opportunityLines.records.entries()) {
        await updateRecord("OpportunityLineItem", record.Id, {
            BasicDiscount__c: opportunityItems[index].BasicDiscount__c
        });
    }
    for (const [index, record] of quoteLines.records.entries()) {
        await updateRecord("QuoteLineItem", record.Id, {
            SortOrder: quoteItems[index].SortOrder,
            Position__c: quoteItems[index].Position__c,
            Alternative__c: quoteItems[index].Alternative__c,
            Option__c: quoteItems[index].Option__c,
            Manuell_Updated__c: false
        });
    }
}
