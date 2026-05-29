import Database from "better-sqlite3";

const projects =
    new Database(
        "./database/projectbuilder.db"
    );

projects.prepare(`

    CREATE TABLE IF NOT EXISTS projects (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customerId INTEGER,

        name TEXT,

        description TEXT

    )

`).run();

export {
    projects
};