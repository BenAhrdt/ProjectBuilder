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

const projectNodeColumns = new Set(
    projectNodes.prepare(`PRAGMA table_info(projectNodes)`).all()
        .map(column => column.name)
);

[
    ["physicalQuantity", "TEXT DEFAULT 'kWh'"],
    ["deviceDesignation", "TEXT DEFAULT ''"],
    ["dataCollectionLocation", "TEXT DEFAULT ''"],
    ["fundingObject", "TEXT DEFAULT ''"],
    ["responsibility", "TEXT DEFAULT ''"],
    ["collectionFrequency", "TEXT DEFAULT ''"],
    ["thirdPartyQuantity", "TEXT DEFAULT ''"]
].forEach(([name, definition]) => {

    if (!projectNodeColumns.has(name)) {

        projectNodes.exec(`
            ALTER TABLE projectNodes
            ADD COLUMN ${name} ${definition}
        `);

    }

});

export {
    projectNodes
};
