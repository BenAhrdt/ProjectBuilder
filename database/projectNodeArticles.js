import Database from "better-sqlite3";
import { getDatabasePath } from "./config.js";

const database =
    new Database(
        getDatabasePath()
    );

database.exec(`

    CREATE TABLE IF NOT EXISTS projectNodeArticles (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        projectNodeId INTEGER NOT NULL,

        articleNumber TEXT NOT NULL,

        quantity REAL DEFAULT 1,

        positionName TEXT,

        sortOrder INTEGER

    )

`);

const columns =
    database
        .prepare(
            "PRAGMA table_info(projectNodeArticles)"
        )
        .all()
        .map(column => column.name);

if (!columns.includes("quantity")) {

    database.exec(`

        ALTER TABLE projectNodeArticles
        ADD COLUMN quantity REAL DEFAULT 1

    `);

}

if (!columns.includes("positionName")) {

    database.exec(`

        ALTER TABLE projectNodeArticles
        ADD COLUMN positionName TEXT

    `);

}

if (!columns.includes("sortOrder")) {

    database.exec(`

        ALTER TABLE projectNodeArticles
        ADD COLUMN sortOrder INTEGER

    `);

}

if (!columns.includes("isOptional")) {

    database.exec(`ALTER TABLE projectNodeArticles ADD COLUMN isOptional INTEGER DEFAULT 0`);

}

if (!columns.includes("isAlternative")) {

    database.exec(`ALTER TABLE projectNodeArticles ADD COLUMN isAlternative INTEGER DEFAULT 0`);

}

export {
    database as projectNodeArticles
};
