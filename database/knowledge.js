import {
    getDatabaseProxy,
    registerDatabaseInitializer
} from "./config.js";

const faqEntries = getDatabaseProxy();
const technicalData = getDatabaseProxy();
const knowledgeArchive = getDatabaseProxy();

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
            createdAt TEXT,
            updatedAt TEXT NOT NULL,
            changeType TEXT NOT NULL DEFAULT 'Bearbeitet',
            changedBy TEXT
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
            createdAt TEXT,
            updatedAt TEXT NOT NULL,
            changeType TEXT NOT NULL DEFAULT 'Bearbeitet',
            changedBy TEXT
        );

        CREATE INDEX IF NOT EXISTS technicalDataSearchIndex
        ON technicalData(articleNumber, deviceType, category, parameter);

        CREATE TABLE IF NOT EXISTS knowledgeArchive (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entryType TEXT NOT NULL,
            recordJson TEXT NOT NULL,
            archivedAt TEXT NOT NULL,
            createdAt TEXT,
            updatedAt TEXT,
            changeType TEXT NOT NULL DEFAULT 'Archiviert',
            changedBy TEXT
        );

        CREATE INDEX IF NOT EXISTS knowledgeArchiveTypeIndex
        ON knowledgeArchive(entryType, archivedAt);
    `);

    const faqColumns = new Set(database.prepare("PRAGMA table_info(faqEntries)").all().map(column => column.name));
    if (!faqColumns.has("externalId")) database.exec("ALTER TABLE faqEntries ADD COLUMN externalId TEXT");
    if (!faqColumns.has("createdAt")) database.exec("ALTER TABLE faqEntries ADD COLUMN createdAt TEXT");
    if (!faqColumns.has("changeType")) database.exec("ALTER TABLE faqEntries ADD COLUMN changeType TEXT NOT NULL DEFAULT 'Bearbeitet'");
    if (!faqColumns.has("changedBy")) database.exec("ALTER TABLE faqEntries ADD COLUMN changedBy TEXT");
    database.prepare("UPDATE faqEntries SET createdAt = COALESCE(NULLIF(createdAt, ''), updatedAt) WHERE createdAt IS NULL OR createdAt = ''").run();
    const technicalColumns = new Set(database.prepare("PRAGMA table_info(technicalData)").all().map(column => column.name));
    if (!technicalColumns.has("active")) database.exec("ALTER TABLE technicalData ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
    if (!technicalColumns.has("createdAt")) database.exec("ALTER TABLE technicalData ADD COLUMN createdAt TEXT");
    if (!technicalColumns.has("changeType")) database.exec("ALTER TABLE technicalData ADD COLUMN changeType TEXT NOT NULL DEFAULT 'Bearbeitet'");
    if (!technicalColumns.has("changedBy")) database.exec("ALTER TABLE technicalData ADD COLUMN changedBy TEXT");
    database.prepare("UPDATE technicalData SET createdAt = COALESCE(NULLIF(createdAt, ''), updatedAt) WHERE createdAt IS NULL OR createdAt = ''").run();

    const archiveColumns = new Set(database.prepare("PRAGMA table_info(knowledgeArchive)").all().map(column => column.name));
    if (!archiveColumns.has("changeType")) database.exec("ALTER TABLE knowledgeArchive ADD COLUMN changeType TEXT NOT NULL DEFAULT 'Archiviert'");
    if (!archiveColumns.has("changedBy")) database.exec("ALTER TABLE knowledgeArchive ADD COLUMN changedBy TEXT");
}

registerDatabaseInitializer(initializeKnowledge);
initializeKnowledge(faqEntries);

export {
    faqEntries,
    technicalData,
    knowledgeArchive
};
