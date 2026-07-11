import Database from "better-sqlite3";
import { getDatabasePath } from "./config.js";

const projectNodes =
    new Database(
        getDatabasePath()
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
