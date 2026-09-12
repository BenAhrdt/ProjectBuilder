import fs from "fs";
import os from "os";
import path from "path";
import open from "open";
import { AuthInfo, Connection, WebOAuthServer } from "@salesforce/core";

const API_VERSION = "v67.0";
let cachedTokenConnection = null;
let cachedCoreConnection = null;
let loginPromise = null;

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

async function tokenRequest(requestPath) {
    const connection = getTokenConnection();
    if (!connection) throw new Error("Keine Salesforce-Anmeldung vorhanden.");
    const response = await fetch(`${connection.instanceUrl}/services/data/${API_VERSION}${requestPath}`, {
        headers: { Authorization: `Bearer ${connection.accessToken}` }
    });
    const body = await response.json();
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
    "Id", "Name", "ExtID__c", "BillingStreet", "BillingPostalCode",
    "BillingCity", "BillingCountry", "LastModifiedDate"
].join(", ");

function mapCustomer(record) {
    return {
        salesforceId: record.Id,
        customerNumber: record.ExtID__c ?? null,
        name: record.Name ?? "",
        street: record.BillingStreet ?? "",
        postalCode: record.BillingPostalCode ?? "",
        city: record.BillingCity ?? "",
        country: record.BillingCountry ?? "",
        salesforceLastModifiedAt: record.LastModifiedDate ?? null
    };
}

export async function getStatus() {
    await query("SELECT Id FROM User LIMIT 1");
    return { connected: true };
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
    const result = await query(`SELECT ${CUSTOMER_FIELDS} FROM Account WHERE Id IN (${list})`);
    return result.records.map(mapCustomer);
}

export async function getCustomerById(id) {
    const customers = await getCustomersByIds([id]);
    return customers[0] ?? null;
}
