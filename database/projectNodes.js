import {
    getDatabaseProxy,
    registerDatabaseInitializer
} from "./config.js";

const projectNodes = getDatabaseProxy();

function initializeProjectNodes(database) {

database.prepare(`

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
    database.prepare(`PRAGMA table_info(projectNodes)`).all()
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

        database.exec(`
            ALTER TABLE projectNodes
            ADD COLUMN ${name} ${definition}
        `);

    }

});
}

registerDatabaseInitializer(initializeProjectNodes);
initializeProjectNodes(projectNodes);

export {
    projectNodes
};
