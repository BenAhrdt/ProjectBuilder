import {
    getDatabaseProxy,
    registerDatabaseInitializer
} from "./config.js";

const faqEntries = getDatabaseProxy();
const technicalData = getDatabaseProxy();

function initializeKnowledge(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS faqEntries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            externalId TEXT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category TEXT,
            articleReferences TEXT,
            deviceTypes TEXT,
            tags TEXT,
            source TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            sortOrder INTEGER NOT NULL DEFAULT 0,
            updatedAt TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS faqEntriesSearchIndex
        ON faqEntries(category, active, sortOrder, id);

        CREATE TABLE IF NOT EXISTS technicalData (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            active INTEGER NOT NULL DEFAULT 1,
            articleNumber TEXT,
            deviceType TEXT,
            category TEXT,
            parameter TEXT NOT NULL,
            value TEXT NOT NULL,
            unit TEXT,
            source TEXT,
            notes TEXT,
            updatedAt TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS technicalDataSearchIndex
        ON technicalData(articleNumber, deviceType, category, parameter);
    `);

    const faqColumns = new Set(database.prepare("PRAGMA table_info(faqEntries)").all().map(column => column.name));
    if (!faqColumns.has("externalId")) database.exec("ALTER TABLE faqEntries ADD COLUMN externalId TEXT");
    const technicalColumns = new Set(database.prepare("PRAGMA table_info(technicalData)").all().map(column => column.name));
    if (!technicalColumns.has("active")) database.exec("ALTER TABLE technicalData ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
}

registerDatabaseInitializer(initializeKnowledge);
initializeKnowledge(faqEntries);

export {
    faqEntries,
    technicalData
};
