import Database from "better-sqlite3";

const database =
    new Database(
        "./database/projectbuilder.db"
    );

database.exec(`

    CREATE TABLE IF NOT EXISTS projectNodeArticles (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        projectNodeId INTEGER NOT NULL,

        articleNumber TEXT NOT NULL,

        quantity REAL DEFAULT 1

    )

`);

export {
    database as projectNodeArticles
};