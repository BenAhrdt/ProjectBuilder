import Database from "better-sqlite3";
import { getDatabasePath } from "./config.js";

const customers =
    new Database(
        getDatabasePath()
    );

// --------------------------------------------------
// Tabellen
// --------------------------------------------------

customers.prepare(`

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
        pg14 REAL
    )

`).run();

const customerColumns = new Set(
    customers.prepare("PRAGMA table_info(customers)").all().map(column => column.name)
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
        customers.exec(`ALTER TABLE customers ADD COLUMN ${name} ${definition}`);
    }
}

if (!customerColumns.has("pg14")) {
    customers.exec("ALTER TABLE customers ADD COLUMN pg14 REAL");
}

customers.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS customers_salesforce_id_unique
    ON customers (salesforceId)
    WHERE salesforceId IS NOT NULL
`);

customers.exec(`
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
    customers.prepare("PRAGMA table_info(customerDiscountHistory)").all()
        .map(column => column.name)
);

if (!customerDiscountHistoryColumns.has("status")) {
    customers.exec(
        "ALTER TABLE customerDiscountHistory ADD COLUMN status TEXT NOT NULL DEFAULT 'success'"
    );
}

if (!customerDiscountHistoryColumns.has("errorMessage")) {
    customers.exec(
        "ALTER TABLE customerDiscountHistory ADD COLUMN errorMessage TEXT"
    );
}

customers.exec(`
    CREATE INDEX IF NOT EXISTS customer_discount_history_customer_id
    ON customerDiscountHistory (customerId, id DESC)
`);

export {
    customers
};
