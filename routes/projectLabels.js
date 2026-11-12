import express from "express";

import * as database
from "../database/index.js";

const router = express.Router();
const defaultLabelColor = "#2f6fb4";

function normalizeText(value, fallback = "") {

    return String(value ?? "")
        .trim()
        .slice(0, 80)
        || fallback;

}

function normalizeColor(value) {

    const color = String(value ?? "").trim();

    return /^#[0-9a-f]{6}$/i.test(color)
        ? color.toLowerCase()
        : defaultLabelColor;

}

function normalizeSide(value) {

    return value === "right"
        ? "right"
        : "left";

}

function normalizeLabel(label = {}, index = 0) {

    return {
        text: normalizeText(label.text),
        color: normalizeColor(label.color),
        side: normalizeSide(label.side),
        sortOrder: Number.isFinite(Number(label.sortOrder))
            ? Math.max(0, Number(label.sortOrder))
            : index
    };

}

function normalizeLabels(body = {}) {

    const source = Array.isArray(body.labels)
        ? body.labels
        : [body];

    return source
        .map(normalizeLabel)
        .filter(label => label.text);

}

function getTemplate(id) {

    const template = database.projectLabelTemplates.prepare(
        "SELECT * FROM projectLabelTemplates WHERE id = ?"
    ).get(id);

    if (!template) {
        return null;
    }

    const labels = database.projectLabelTemplateItems.prepare(`
        SELECT text, color, side, sortOrder
        FROM projectLabelTemplateItems
        WHERE projectLabelTemplateId = ?
        ORDER BY sortOrder ASC, id ASC
    `).all(template.id);

    return {
        ...template,
        labels: labels.length > 0
            ? labels
            : normalizeLabels(template)
    };

}

function getTemplates() {

    return database.projectLabelTemplates.prepare(`
        SELECT *
        FROM projectLabelTemplates
        ORDER BY sortOrder ASC, name COLLATE NOCASE ASC, id ASC
    `).all().map(template => getTemplate(template.id));

}

function writeTemplateItems(templateId, labels) {

    database.projectLabelTemplateItems.prepare(
        "DELETE FROM projectLabelTemplateItems WHERE projectLabelTemplateId = ?"
    ).run(templateId);

    const insert = database.projectLabelTemplateItems.prepare(`
        INSERT INTO projectLabelTemplateItems
            (projectLabelTemplateId, text, color, side, sortOrder)
        VALUES (@projectLabelTemplateId, @text, @color, @side, @sortOrder)
    `);

    labels.forEach((label, index) => insert.run({
        projectLabelTemplateId: templateId,
        ...label,
        sortOrder: index
    }));

}

function getNode(nodeId) {

    return database.projectNodes.prepare(`
        SELECT id, projectId, type
        FROM projectNodes
        WHERE id = ?
    `).get(nodeId);

}

function getNodeLabelSettings(nodeId) {

    return database.projectNodeLabelSettings.prepare(`
        SELECT projectNodeId, inheritToChildren, inheritFromParent
        FROM projectNodeLabelSettings
        WHERE projectNodeId = ?
    `).get(nodeId) ?? {
        projectNodeId: Number(nodeId),
        inheritToChildren: 1,
        inheritFromParent: 1
    };

}

router.get("/templates", (_req, res) => {

    res.json(getTemplates());

});

router.post("/templates", (req, res) => {

    const name = normalizeText(req.body?.name, "Vorlage");
    const labels = normalizeLabels(req.body ?? {});

    if (labels.length === 0) {
        res.status(400).json({ error: "Die Vorlage muss mindestens ein Label enthalten." });
        return;
    }

    try {
        const createTemplate = database.projectLabelTemplates.transaction(() => {
            const firstLabel = labels[0];
            const result = database.projectLabelTemplates.prepare(`
                INSERT INTO projectLabelTemplates (name, text, color, side, sortOrder)
                VALUES (@name, @text, @color, @side, @sortOrder)
            `).run({
                name,
                ...firstLabel,
                sortOrder: 0
            });
            writeTemplateItems(result.lastInsertRowid, labels);
            return result.lastInsertRowid;
        });

        res.status(201).json(getTemplate(createTemplate()));
    } catch (error) {
        res.status(409).json({
            error: error?.code === "SQLITE_CONSTRAINT_UNIQUE"
                ? "Eine Vorlage mit diesem Namen existiert bereits."
                : "Die Labelvorlage konnte nicht gespeichert werden."
        });
    }

});

router.put("/templates/:id", (req, res) => {

    const template = getTemplate(req.params.id);
    if (!template) {
        res.status(404).json({ error: "Labelvorlage nicht gefunden." });
        return;
    }

    const name = normalizeText(req.body?.name, template.name);
    const labels = normalizeLabels(req.body ?? {});

    if (labels.length === 0) {
        res.status(400).json({ error: "Die Vorlage muss mindestens ein Label enthalten." });
        return;
    }

    try {
        const updateTemplate = database.projectLabelTemplates.transaction(() => {
            const firstLabel = labels[0];
            database.projectLabelTemplates.prepare(`
                UPDATE projectLabelTemplates
                SET name = @name,
                    text = @text,
                    color = @color,
                    side = @side,
                    sortOrder = 0
                WHERE id = @id
            `).run({
                id: template.id,
                name,
                ...firstLabel
            });
            writeTemplateItems(template.id, labels);
        });
        updateTemplate();
        res.json(getTemplate(template.id));
    } catch (error) {
        res.status(409).json({
            error: error?.code === "SQLITE_CONSTRAINT_UNIQUE"
                ? "Eine Vorlage mit diesem Namen existiert bereits."
                : "Die Labelvorlage konnte nicht ersetzt werden."
        });
    }

});

router.delete("/templates/:id", (req, res) => {

    database.projectLabelTemplateItems.prepare(
        "DELETE FROM projectLabelTemplateItems WHERE projectLabelTemplateId = ?"
    ).run(req.params.id);

    const result = database.projectLabelTemplates.prepare(
        "DELETE FROM projectLabelTemplates WHERE id = ?"
    ).run(req.params.id);

    if (result.changes === 0) {
        res.status(404).json({ error: "Labelvorlage nicht gefunden." });
        return;
    }

    res.json({ success: true });

});

router.get("/", (req, res) => {

    const projectId = String(req.query.projectId ?? "").trim();

    if (!projectId) {
        res.status(400).json({ error: "Eine Projekt-ID ist erforderlich." });
        return;
    }

    const labels = database.projectNodeLabels.prepare(`
            SELECT projectNodeLabels.*
            FROM projectNodeLabels
            INNER JOIN projectNodes
                ON projectNodes.id = projectNodeLabels.projectNodeId
            WHERE projectNodes.projectId = ?
            ORDER BY projectNodeLabels.projectNodeId ASC,
                projectNodeLabels.side ASC,
                projectNodeLabels.sortOrder ASC,
                projectNodeLabels.id ASC
        `).all(projectId);
    const settings = database.projectNodeLabelSettings.prepare(`
        SELECT projectNodeLabelSettings.*
        FROM projectNodeLabelSettings
        INNER JOIN projectNodes
            ON projectNodes.id = projectNodeLabelSettings.projectNodeId
        WHERE projectNodes.projectId = ?
    `).all(projectId);
    const hiddenLabelIds = database.projectNodeLabelHidden.prepare(`
        SELECT projectNodeLabelHidden.*
        FROM projectNodeLabelHidden
        INNER JOIN projectNodes
            ON projectNodes.id = projectNodeLabelHidden.projectNodeId
        WHERE projectNodes.projectId = ?
    `).all(projectId);

    res.json({ labels, settings, hiddenLabelIds });

});

router.put("/node/:nodeId", (req, res) => {

    const node = getNode(req.params.nodeId);

    if (!node) {
        res.status(404).json({ error: "Strukturebene nicht gefunden." });
        return;
    }

    const labels = Array.isArray(req.body?.labels)
        ? req.body.labels
            .map(normalizeLabel)
            .filter(label => label.text)
        : [];

    const hiddenLabelIds = Array.isArray(req.body?.hiddenLabelIds)
        ? [...new Set(req.body.hiddenLabelIds.map(value => Number(value)).filter(Number.isInteger))]
        : null;
    const saveLabels = database.projectNodeLabels.transaction(() => {

        database.projectNodeLabels.prepare(
            "DELETE FROM projectNodeLabels WHERE projectNodeId = ?"
        ).run(node.id);

        const insert = database.projectNodeLabels.prepare(`
            INSERT INTO projectNodeLabels (projectNodeId, text, color, side, sortOrder)
            VALUES (@projectNodeId, @text, @color, @side, @sortOrder)
        `);

        labels.forEach(label =>
            insert.run({
                projectNodeId: node.id,
                ...label
            })
        );

        if (req.body?.inheritToChildren !== undefined || req.body?.inheritFromParent !== undefined) {
            const current = getNodeLabelSettings(node.id);
            database.projectNodeLabelSettings.prepare(`
                INSERT INTO projectNodeLabelSettings
                    (projectNodeId, inheritToChildren, inheritFromParent)
                VALUES (@projectNodeId, @inheritToChildren, @inheritFromParent)
                ON CONFLICT(projectNodeId) DO UPDATE SET
                    inheritToChildren = excluded.inheritToChildren,
                    inheritFromParent = excluded.inheritFromParent
            `).run({
                projectNodeId: node.id,
                inheritToChildren: req.body.inheritToChildren === undefined
                    ? current.inheritToChildren
                    : req.body.inheritToChildren === false ? 0 : 1,
                inheritFromParent: req.body.inheritFromParent === undefined
                    ? current.inheritFromParent
                    : req.body.inheritFromParent === false ? 0 : 1
            });
        }

        if (hiddenLabelIds !== null) {
            database.projectNodeLabelHidden.prepare(
                "DELETE FROM projectNodeLabelHidden WHERE projectNodeId = ?"
            ).run(node.id);

            const validSourceLabels = hiddenLabelIds.length === 0
                ? []
                : database.projectNodeLabels.prepare(`
                    SELECT projectNodeLabels.id
                    FROM projectNodeLabels
                    INNER JOIN projectNodes
                        ON projectNodes.id = projectNodeLabels.projectNodeId
                    WHERE projectNodes.projectId = ?
                        AND projectNodeLabels.id IN (${hiddenLabelIds.map(() => "?").join(",")})
                `).all(node.projectId, ...hiddenLabelIds);
            const insertHidden = database.projectNodeLabelHidden.prepare(`
                INSERT OR IGNORE INTO projectNodeLabelHidden
                    (projectNodeId, sourceProjectNodeLabelId)
                VALUES (?, ?)
            `);
            validSourceLabels.forEach(label => insertHidden.run(node.id, label.id));
        }

    });

    saveLabels();

    res.json({
        success: true,
        labels: database.projectNodeLabels.prepare(`
            SELECT * FROM projectNodeLabels
            WHERE projectNodeId = ?
            ORDER BY side ASC, sortOrder ASC, id ASC
        `).all(node.id)
        ,
        settings: getNodeLabelSettings(node.id),
        hiddenLabelIds: database.projectNodeLabelHidden.prepare(`
            SELECT sourceProjectNodeLabelId
            FROM projectNodeLabelHidden
            WHERE projectNodeId = ?
        `).all(node.id).map(item => item.sourceProjectNodeLabelId)
    });

});

export default router;

