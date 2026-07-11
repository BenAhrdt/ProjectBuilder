import express from "express";
import * as database from "../database/index.js";

const router = express.Router();

router.get("/", (req, res) => {
    const settings = database.settings
        .prepare("SELECT key, value FROM settings")
        .all();

    res.json(Object.fromEntries(
        settings.map(setting => [setting.key, setting.value])
    ));
});

router.put("/:key", (req, res) => {
    if (typeof req.body.value !== "string") {
        return res.status(400).json({
            success: false,
            error: "value muss eine Zeichenkette sein"
        });
    }

    database.settings.prepare(`
        INSERT INTO settings (key, value)
        VALUES (@key, @value)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run({
        key: req.params.key,
        value: req.body.value
    });

    res.json({ success: true });
});

export default router;
