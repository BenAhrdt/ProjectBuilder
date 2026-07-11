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

export {
    customers
};
