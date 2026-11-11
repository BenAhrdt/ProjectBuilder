import express from "express";
import {
    createDatabaseProfile,
    deleteDatabaseProfile,
    duplicateActiveDatabaseProfile,
    getDatabaseProfiles,
    switchDatabaseProfile
} from "../database/config.js";

const router = express.Router();

router.get("/profiles", (_req, res) => {
    res.json(getDatabaseProfiles());
});

router.post("/profiles", async (req, res) => {
    try {
        res.json({
            success: true,
            ...await createDatabaseProfile(req.body?.name)
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put("/active", async (req, res) => {
    try {
        res.json({
            success: true,
            ...await switchDatabaseProfile(req.body?.profileId)
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post("/profiles/copy", async (req, res) => {
    try {
        res.json({
            success: true,
            ...await duplicateActiveDatabaseProfile(req.body?.name)
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete("/profiles/:profileId", (req, res) => {
    try {
        res.json({
            success: true,
            ...deleteDatabaseProfile(req.params.profileId)
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;
