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

export {
    projects
};
