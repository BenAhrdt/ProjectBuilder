import Database from "better-sqlite3";

const projectNodes =
    new Database(
        "./database/projectbuilder.db"
    );

projectNodes.prepare(`

    CREATE TABLE IF NOT EXISTS projectNodes (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        projectId INTEGER,

        parentId INTEGER,

        type TEXT,

        name TEXT,

        sortOrder INTEGER

    )

`).run();

export {
    projectNodes
};