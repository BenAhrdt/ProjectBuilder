import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const databaseFileName = "projectbuilder.db";

export function getDatabasePath() {
    const dataDirectory = process.env.PROJECTBUILDER_DATA_DIR;

    if (!dataDirectory) return path.join(moduleDirectory, databaseFileName);

    fs.mkdirSync(dataDirectory, { recursive: true });
    const targetPath = path.join(dataDirectory, databaseFileName);
    const bundledPath = path.join(moduleDirectory, databaseFileName);

    if (!fs.existsSync(targetPath) && fs.existsSync(bundledPath)) {
        fs.copyFileSync(bundledPath, targetPath);
    }

    return targetPath;
}
