import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getDataDirectory } from "../database/config.js";

export const PROJECT_FILE_MAX_SIZE = 100 * 1024 * 1024;

const projectFilesDirectory = path.join(
    getDataDirectory(),
    "project-files"
);

fs.mkdirSync(projectFilesDirectory, { recursive: true });

export function getProjectFilesDirectory() {
    return projectFilesDirectory;
}

export function createProjectFileStorageName() {
    return crypto.randomUUID();
}

export function getProjectFilePath(storedName) {
    const normalizedName = path.basename(String(storedName || ""));
    if (!normalizedName || normalizedName !== String(storedName)) {
        throw new Error("Ungültiger Projektdatensatz.");
    }

    const filePath = path.resolve(projectFilesDirectory, normalizedName);
    if (path.dirname(filePath) !== path.resolve(projectFilesDirectory)) {
        throw new Error("Ungültiger Projektdatensatz.");
    }

    return filePath;
}

export function removeProjectFile(storedName) {
    const filePath = getProjectFilePath(storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
