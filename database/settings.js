import {
    getDatabaseProxy,
    registerDatabaseInitializer
} from "./config.js";

const settings = getDatabaseProxy();

function initializeSettings(database) {
    database.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    `).run();
}

registerDatabaseInitializer(initializeSettings);
initializeSettings(settings);

export { settings };
