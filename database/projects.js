import {
    getDatabaseProxy,
    registerDatabaseInitializer
} from "./config.js";

const projects = getDatabaseProxy();

function initializeProjects(database) {

database.prepare(`

    CREATE TABLE IF NOT EXISTS projects (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customerId INTEGER,

        name TEXT,

        description TEXT,

        projectDiscount REAL DEFAULT 0

    )

`).run();

const columns =
    database
        .prepare(
            "PRAGMA table_info(projects)"
        )
        .all()
        .map(column => column.name);

if (!columns.includes("projectDiscount")) {

        database.exec(`

        ALTER TABLE projects
        ADD COLUMN projectDiscount REAL DEFAULT 0

    `);

}

for (const [name, definition] of [
    ["salesforceOpportunityId", "TEXT"],
    ["salesforceQuoteId", "TEXT"],
    ["salesforceSyncedAt", "TEXT"],
    ["salesforceContactId", "TEXT"],
    ["salesforceDeliveryTime", "TEXT"],
    ["salesforceArticleMode", "TEXT DEFAULT 'commercial_total'"],
    ["salesforceSyncScope", "TEXT DEFAULT 'opportunity_quote'"],
    ["salesforceDocuments", "TEXT DEFAULT '[\"overview\"]'"],
    ["salesforceProjectFileIds", "TEXT DEFAULT '[]'"],
    ["salesforceTaxCode", "TEXT"],
    ["salesforceShowDiscount", "INTEGER DEFAULT 1"],
    ["salesforceShowAdditionalDiscount", "INTEGER DEFAULT 0"],
    ["salesforceShowAdditionalDiscountConfigured", "INTEGER DEFAULT 0"],
    ["salesforceExportQuote", "INTEGER"],
    ["salesforceUploadProjectFile", "INTEGER DEFAULT 1"],
    ["overviewColors", "TEXT DEFAULT '{}'"]
]) {
    if (!columns.includes(name)) {
        database.exec(`ALTER TABLE projects ADD COLUMN ${name} ${definition}`);
    }
}

if (!columns.includes("salesforceShowAdditionalDiscountConfigured")) {
    database.exec(`
        UPDATE projects
        SET salesforceShowAdditionalDiscountConfigured =
            CASE
                WHEN salesforceShowAdditionalDiscount = 1
                    OR salesforceSyncedAt IS NOT NULL
                THEN 1
                ELSE 0
            END
    `);
}

database.exec(`
    CREATE TABLE IF NOT EXISTS projectSalesforceLinks (
        projectId INTEGER NOT NULL,
        customerSalesforceId TEXT NOT NULL,
        opportunityId TEXT,
        quoteId TEXT,
        syncedAt TEXT,
        PRIMARY KEY (projectId, customerSalesforceId)
    )
`);

database.exec(`
    CREATE TABLE IF NOT EXISTS projectFiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectId INTEGER NOT NULL,
        name TEXT NOT NULL,
        storedName TEXT NOT NULL UNIQUE,
        mimeType TEXT NOT NULL DEFAULT 'application/octet-stream',
        size INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    )
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS projectFilesProjectIdIndex
    ON projectFiles(projectId)
`);
}

registerDatabaseInitializer(initializeProjects);
initializeProjects(projects);

export {
    projects
};
