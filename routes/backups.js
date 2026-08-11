import express from "express";
import multer from "multer";
import {
    createBackup,
    serializeBackup,
    inspectBackup,
    restoreBackup,
    getAutomaticBackupSettings,
    updateAutomaticBackupSettings,
    runAutomaticBackup
} from "../utils/backup.js";

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
});

router.get("/settings", (req, res) => {
    res.json(getAutomaticBackupSettings());
});

router.put("/settings", (req, res) => {
    try {
        res.json({
            success: true,
            settings: updateAutomaticBackupSettings(req.body)
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post("/manual", (req, res) => {
    try {
        const backup = createBackup(req.body?.selection);
        const timestamp = backup.createdAt.replaceAll(":", "-").replaceAll(".", "-");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="ProjectBuilder-Backup-${timestamp}.pbbackup"`
        );
        res.send(serializeBackup(backup));
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post("/automatic/run", (req, res) => {
    try {
        res.json({ success: true, backup: runAutomaticBackup() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/inspect", upload.single("file"), (req, res) => {
    try {
        if (!req.file) throw new Error("Keine Backupdatei ausgewählt.");
        res.json({ success: true, backup: inspectBackup(req.file.buffer) });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post("/restore", upload.single("file"), (req, res) => {
    try {
        if (!req.file) throw new Error("Keine Backupdatei ausgewählt.");
        const selection = JSON.parse(req.body.selection || "{}");
        const restored = restoreBackup(req.file.buffer, selection);
        res.json({ success: true, restored });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;
