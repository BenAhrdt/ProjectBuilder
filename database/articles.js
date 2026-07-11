import Database from "better-sqlite3";
import { getDatabasePath } from "./config.js";
const articles = new Database(getDatabasePath());

// --------------------------------------------------
// Tabellen
// --------------------------------------------------

articles.prepare(`
    CREATE TABLE IF NOT EXISTS articles (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        articleNumber TEXT UNIQUE,
        ean TEXT,

        manufacturerType TEXT,
        manufacturerName TEXT,

        originCountry TEXT,
        originRegion TEXT,

        intrastatNumber TEXT,

        quantity INTEGER,
        quantityUnit TEXT,

        listPrice REAL,
        listPriceCurrency TEXT,

        discountGroup TEXT,

        description TEXT

    )
`).run();

export {
    articles
};

