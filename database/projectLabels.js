import {
    getDatabaseProxy,
    registerDatabaseInitializer
} from "./config.js";

const projectNodeLabels = getDatabaseProxy();
const projectNodeLabelSettings = getDatabaseProxy();
const projectNodeLabelHidden = getDatabaseProxy();
const projectArticleLabels = getDatabaseProxy();
const projectArticleLabelSettings = getDatabaseProxy();
const projectArticleLabelHidden = getDatabaseProxy();
const projectLabelTemplates = getDatabaseProxy();
const projectLabelTemplateItems = getDatabaseProxy();

function initializeProjectLabels(database) {

    database.exec(`
        CREATE TABLE IF NOT EXISTS projectNodeLabels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectNodeId INTEGER NOT NULL,
            text TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#2f6fb4',
            side TEXT NOT NULL DEFAULT 'left',
            sortOrder INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS projectNodeLabelsNodeIndex
        ON projectNodeLabels(projectNodeId, side, sortOrder, id);

        CREATE TABLE IF NOT EXISTS projectNodeLabelSettings (
            projectNodeId INTEGER PRIMARY KEY,
            inheritToChildren INTEGER NOT NULL DEFAULT 1,
            inheritFromParent INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS projectNodeLabelHidden (
            projectNodeId INTEGER NOT NULL,
            sourceProjectNodeLabelId INTEGER NOT NULL,
            PRIMARY KEY(projectNodeId, sourceProjectNodeLabelId)
        );

        CREATE INDEX IF NOT EXISTS projectNodeLabelHiddenNodeIndex
        ON projectNodeLabelHidden(projectNodeId);

        CREATE TABLE IF NOT EXISTS projectArticleLabels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectNodeArticleId INTEGER NOT NULL,
            text TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#2f6fb4',
            side TEXT NOT NULL DEFAULT 'left',
            sortOrder INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS projectArticleLabelsArticleIndex
        ON projectArticleLabels(projectNodeArticleId, side, sortOrder, id);

        CREATE TABLE IF NOT EXISTS projectArticleLabelSettings (
            projectNodeArticleId INTEGER PRIMARY KEY,
            inheritFromParent INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS projectArticleLabelHidden (
            projectNodeArticleId INTEGER NOT NULL,
            sourceProjectNodeLabelId INTEGER NOT NULL,
            PRIMARY KEY(projectNodeArticleId, sourceProjectNodeLabelId)
        );

        CREATE INDEX IF NOT EXISTS projectArticleLabelHiddenArticleIndex
        ON projectArticleLabelHidden(projectNodeArticleId);

        CREATE TABLE IF NOT EXISTS projectLabelTemplates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            text TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#2f6fb4',
            side TEXT NOT NULL DEFAULT 'left',
            sortOrder INTEGER NOT NULL DEFAULT 0,
            UNIQUE(name)
        );

        CREATE TABLE IF NOT EXISTS projectLabelTemplateItems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectLabelTemplateId INTEGER NOT NULL,
            text TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#2f6fb4',
            side TEXT NOT NULL DEFAULT 'left',
            sortOrder INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS projectLabelTemplateItemsTemplateIndex
        ON projectLabelTemplateItems(projectLabelTemplateId, sortOrder, id);

        INSERT INTO projectLabelTemplateItems
            (projectLabelTemplateId, text, color, side, sortOrder)
        SELECT projectLabelTemplates.id,
            projectLabelTemplates.text,
            projectLabelTemplates.color,
            projectLabelTemplates.side,
            projectLabelTemplates.sortOrder
        FROM projectLabelTemplates
        WHERE TRIM(projectLabelTemplates.text) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM projectLabelTemplateItems
                WHERE projectLabelTemplateItems.projectLabelTemplateId = projectLabelTemplates.id
            );
    `);

}

registerDatabaseInitializer(initializeProjectLabels);
initializeProjectLabels(projectNodeLabels);

export {
    projectNodeLabels,
    projectNodeLabelSettings,
    projectNodeLabelHidden,
    projectArticleLabels,
    projectArticleLabelSettings,
    projectArticleLabelHidden,
    projectLabelTemplates,
    projectLabelTemplateItems
};

