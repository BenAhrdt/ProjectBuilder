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
        pg10 REAL
    )

`).run();

const customerColumns = new Set(
    customers.prepare("PRAGMA table_info(customers)").all().map(column => column.name)
);

for (const [name, definition] of [
    ["street", "TEXT"],
    ["postalCode", "TEXT"],
    ["salesforceId", "TEXT"],
    ["salesforceSyncedAt", "TEXT"],
    ["salesforceLastModifiedAt", "TEXT"]
]) {
    if (!customerColumns.has(name)) {
        customers.exec(`ALTER TABLE customers ADD COLUMN ${name} ${definition}`);
    }
}

customers.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS customers_salesforce_id_unique
    ON customers (salesforceId)
    WHERE salesforceId IS NOT NULL
`);

export {
    customers
};
