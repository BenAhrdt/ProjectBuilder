import Database from "better-sqlite3";
import { getDatabasePath } from "./config.js";

const settings = new Database(getDatabasePath());

settings.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
`).run();

export { settings };
