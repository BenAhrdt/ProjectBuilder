import Database from "better-sqlite3";
import { getDatabasePath } from "./config.js";

const projects =
    new Database(
        getDatabasePath()
    );

projects.prepare(`

    CREATE TABLE IF NOT EXISTS projects (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customerId INTEGER,

        name TEXT,

        description TEXT,

        projectDiscount REAL DEFAULT 0

    )

`).run();

const columns =
    projects
        .prepare(
            "PRAGMA table_info(projects)"
        )
        .all()
        .map(column => column.name);

if (!columns.includes("projectDiscount")) {

    projects.exec(`

        ALTER TABLE projects
        ADD COLUMN projectDiscount REAL DEFAULT 0

    `);

}

for (const [name, definition] of [
    ["salesforceOpportunityId", "TEXT"],
    ["salesforceQuoteId", "TEXT"],
    ["salesforceSyncedAt", "TEXT"],
    ["salesforceContactId", "TEXT"],
    ["salesforceDeliveryTime", "TEXT"],
    ["salesforceArticleMode", "TEXT DEFAULT 'commercial_total'"],
    ["salesforceSyncScope", "TEXT DEFAULT 'opportunity_quote'"],
    ["salesforceDocuments", "TEXT DEFAULT '[\"overview\"]'"]
]) {
    if (!columns.includes(name)) {
        projects.exec(`ALTER TABLE projects ADD COLUMN ${name} ${definition}`);
    }
}

export {
    projects
};
