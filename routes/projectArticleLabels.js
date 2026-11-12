import express from "express";

import * as database
from "../database/index.js";

const router = express.Router();
const defaultLabelColor = "#2f6fb4";

function normalizeText(value) {
    return String(value ?? "").trim().slice(0, 80);
}

function normalizeColor(value) {
    const color = String(value ?? "").trim();
    return /^#[0-9a-f]{6}$/i.test(color)
        ? color.toLowerCase()
        : defaultLabelColor;
}

function normalizeSide(value) {
    return value === "right" ? "right" : "left";
}

function getArticle(articleId) {
    return database.projectNodeArticles.prepare(`
        SELECT projectNodeArticles.id, projectNodeArticles.projectNodeId,
            projectNodes.projectId
        FROM projectNodeArticles
        INNER JOIN projectNodes ON projectNodes.id = projectNodeArticles.projectNodeId
        WHERE projectNodeArticles.id = ?
    `).get(articleId);
}

function getArticleLabelSettings(articleId) {
    return database.projectArticleLabelSettings.prepare(`
        SELECT projectNodeArticleId, inheritFromParent
        FROM projectArticleLabelSettings
        WHERE projectNodeArticleId = ?
    `).get(articleId) ?? {
        projectNodeArticleId: Number(articleId),
        inheritFromParent: 1
    };
}

router.get("/", (req, res) => {
    const projectId = String(req.query.projectId ?? "").trim();
    if (!projectId) {
        res.status(400).json({ error: "Eine Projekt-ID ist erforderlich." });
        return;
    }

    const labels = database.projectArticleLabels.prepare(`
        SELECT projectArticleLabels.*
        FROM projectArticleLabels
        INNER JOIN projectNodeArticles
            ON projectNodeArticles.id = projectArticleLabels.projectNodeArticleId
        INNER JOIN projectNodes
            ON projectNodes.id = projectNodeArticles.projectNodeId
        WHERE projectNodes.projectId = ?
        ORDER BY projectArticleLabels.projectNodeArticleId,
            projectArticleLabels.side, projectArticleLabels.sortOrder,
            projectArticleLabels.id
    `).all(projectId);
    const settings = database.projectArticleLabelSettings.prepare(`
        SELECT projectArticleLabelSettings.*
        FROM projectArticleLabelSettings
        INNER JOIN projectNodeArticles
            ON projectNodeArticles.id = projectArticleLabelSettings.projectNodeArticleId
        INNER JOIN projectNodes
            ON projectNodes.id = projectNodeArticles.projectNodeId
        WHERE projectNodes.projectId = ?
    `).all(projectId);
    const hiddenLabelIds = database.projectArticleLabelHidden.prepare(`
        SELECT projectArticleLabelHidden.*
        FROM projectArticleLabelHidden
        INNER JOIN projectNodeArticles
            ON projectNodeArticles.id = projectArticleLabelHidden.projectNodeArticleId
        INNER JOIN projectNodes
            ON projectNodes.id = projectNodeArticles.projectNodeId
        WHERE projectNodes.projectId = ?
    `).all(projectId);

    res.json({ labels, settings, hiddenLabelIds });
});

router.put("/article/:articleId", (req, res) => {
    const article = getArticle(req.params.articleId);
    if (!article) {
        res.status(404).json({ error: "Artikelposition nicht gefunden." });
        return;
    }

    const labels = Array.isArray(req.body?.labels)
        ? req.body.labels.map((label, index) => ({
            text: normalizeText(label?.text),
            color: normalizeColor(label?.color),
            side: normalizeSide(label?.side),
            sortOrder: Number.isFinite(Number(label?.sortOrder))
                ? Math.max(0, Number(label.sortOrder))
                : index
        })).filter(label => label.text)
        : [];
    const hiddenLabelIds = Array.isArray(req.body?.hiddenLabelIds)
        ? [...new Set(req.body.hiddenLabelIds.map(value => Number(value)).filter(Number.isInteger))]
        : null;

    const saveLabels = database.projectArticleLabels.transaction(() => {
        database.projectArticleLabels.prepare(
            "DELETE FROM projectArticleLabels WHERE projectNodeArticleId = ?"
        ).run(article.id);

        const insert = database.projectArticleLabels.prepare(`
            INSERT INTO projectArticleLabels
                (projectNodeArticleId, text, color, side, sortOrder)
            VALUES (@projectNodeArticleId, @text, @color, @side, @sortOrder)
        `);
        labels.forEach(label => insert.run({
            projectNodeArticleId: article.id,
            ...label
        }));

        if (req.body?.inheritFromParent !== undefined) {
            database.projectArticleLabelSettings.prepare(`
                INSERT INTO projectArticleLabelSettings
                    (projectNodeArticleId, inheritFromParent)
                VALUES (?, ?)
                ON CONFLICT(projectNodeArticleId) DO UPDATE SET
                    inheritFromParent = excluded.inheritFromParent
            `).run(article.id, req.body.inheritFromParent === false ? 0 : 1);
        }

        if (hiddenLabelIds !== null) {
            database.projectArticleLabelHidden.prepare(
                "DELETE FROM projectArticleLabelHidden WHERE projectNodeArticleId = ?"
            ).run(article.id);
            const validSourceLabels = hiddenLabelIds.length === 0
                ? []
                : database.projectNodeLabels.prepare(`
                    SELECT projectNodeLabels.id
                    FROM projectNodeLabels
                    INNER JOIN projectNodes
                        ON projectNodes.id = projectNodeLabels.projectNodeId
                    WHERE projectNodes.projectId = ?
                        AND projectNodeLabels.id IN (${hiddenLabelIds.map(() => "?").join(",")})
                `).all(article.projectId, ...hiddenLabelIds);
            const insertHidden = database.projectArticleLabelHidden.prepare(`
                INSERT OR IGNORE INTO projectArticleLabelHidden
                    (projectNodeArticleId, sourceProjectNodeLabelId)
                VALUES (?, ?)
            `);
            validSourceLabels.forEach(label => insertHidden.run(article.id, label.id));
        }
    });
    saveLabels();

    res.json({
        success: true,
        labels: database.projectArticleLabels.prepare(`
            SELECT * FROM projectArticleLabels
            WHERE projectNodeArticleId = ?
            ORDER BY side, sortOrder, id
        `).all(article.id),
        settings: getArticleLabelSettings(article.id),
        hiddenLabelIds: database.projectArticleLabelHidden.prepare(`
            SELECT sourceProjectNodeLabelId
            FROM projectArticleLabelHidden
            WHERE projectNodeArticleId = ?
        `).all(article.id).map(item => item.sourceProjectNodeLabelId)
    });
});

export default router;
