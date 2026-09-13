import Database from "better-sqlite3";
import { getDatabasePath } from "./config.js";
import { inferGridVisItems } from "../utils/gridVisItems.js";
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

const columns = articles.prepare("PRAGMA table_info(articles)").all().map(column => column.name);
for (const [name, definition] of [
    ["salesforceProductId", "TEXT"],
    ["salesforcePricebookId", "TEXT"],
    ["salesforceActive", "INTEGER"],
    ["salesforceFamily", "TEXT"],
    ["salesforceProductType", "TEXT"],
    ["salesforceLastModifiedAt", "TEXT"],
    ["salesforceImportedAt", "TEXT"],
    ["salesforceAvailabilityCheckedAt", "TEXT"],
    ["salesforceCurrencies", "TEXT"],
    ["gridVisItems", "REAL"],
    ["gridVisItemsManual", "INTEGER DEFAULT 0"]
]) {
    if (!columns.includes(name)) {
        articles.exec(`ALTER TABLE articles ADD COLUMN ${name} ${definition}`);
    }
}

const articlesWithAutomaticGridVisItems = articles.prepare(`
    SELECT articleNumber, manufacturerType, description
    FROM articles
    WHERE COALESCE(gridVisItemsManual, 0) = 0
`).all();
const saveInferredGridVisItems = articles.prepare(`
    UPDATE articles SET gridVisItems = @gridVisItems
    WHERE articleNumber = @articleNumber
`);
const initializeGridVisItems = articles.transaction(rows => {
    for (const row of rows) {
        const gridVisItems = inferGridVisItems(row);
        saveInferredGridVisItems.run({ articleNumber: row.articleNumber, gridVisItems });
    }
});
initializeGridVisItems(articlesWithAutomaticGridVisItems);

export {
    articles
};

