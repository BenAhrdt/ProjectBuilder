import {
    getDatabaseProxy,
    registerDatabaseInitializer
} from "./config.js";

const customers = getDatabaseProxy();

function initializeCustomers(database) {

// --------------------------------------------------
// Tabellen
// --------------------------------------------------

database.prepare(`

    CREATE TABLE IF NOT EXISTS customers (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customerNumber TEXT UNIQUE,

        name TEXT,

        accountOwner TEXT,

        street TEXT,

        postalCode TEXT,

        city TEXT,

        additionalInfo TEXT,

        pg1 REAL,
        pg2 REAL,
        pg3 REAL,
        pg4 REAL,
        pg5 REAL,
        pg6 REAL,
        pg7 REAL,
        pg8 REAL,
        pg9 REAL,
        pg10 REAL,
        pg13 REAL DEFAULT 0,
        pg14 REAL,
        pg15 REAL DEFAULT 0,
        pg16 REAL DEFAULT 0,
        pg17 REAL DEFAULT 0
    )

`).run();

const customerColumns = new Set(
    database.prepare("PRAGMA table_info(customers)").all().map(column => column.name)
);

for (const [name, definition] of [
    ["street", "TEXT"],
    ["postalCode", "TEXT"],
    ["accountOwner", "TEXT"],
    ["salesforceId", "TEXT"],
    ["salesforceSyncedAt", "TEXT"],
    ["salesforceLastModifiedAt", "TEXT"]
]) {
    if (!customerColumns.has(name)) {
        database.exec(`ALTER TABLE customers ADD COLUMN ${name} ${definition}`);
    }
}

for (const name of ["pg13", "pg15", "pg16", "pg17"]) {
    if (!customerColumns.has(name)) {
        database.exec(`ALTER TABLE customers ADD COLUMN ${name} REAL DEFAULT 0`);
    }
}

database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS customers_salesforce_id_unique
    ON customers (salesforceId)
    WHERE salesforceId IS NOT NULL
`);

database.exec(`
    CREATE TABLE IF NOT EXISTS customerDiscountHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER,
        changedAt TEXT NOT NULL,
        source TEXT NOT NULL,
        requestMethod TEXT,
        requestPath TEXT,
        beforeJson TEXT NOT NULL,
        requestedJson TEXT NOT NULL,
        afterJson TEXT NOT NULL,
        changedGroupsJson TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'success',
        errorMessage TEXT
    )
`);

const customerDiscountHistoryColumns = new Set(
    database.prepare("PRAGMA table_info(customerDiscountHistory)").all()
        .map(column => column.name)
);

if (!customerDiscountHistoryColumns.has("status")) {
    database.exec(
        "ALTER TABLE customerDiscountHistory ADD COLUMN status TEXT NOT NULL DEFAULT 'success'"
    );
}

if (!customerDiscountHistoryColumns.has("errorMessage")) {
    database.exec(
        "ALTER TABLE customerDiscountHistory ADD COLUMN errorMessage TEXT"
    );
}

database.exec(`
    CREATE INDEX IF NOT EXISTS customer_discount_history_customer_id
    ON customerDiscountHistory (customerId, id DESC)
`);
}

registerDatabaseInitializer(initializeCustomers);
initializeCustomers(customers);

export {
    customers
};
