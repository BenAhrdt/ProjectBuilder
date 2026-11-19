import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDataDirectory } from "../database/config.js";

const ARTICLE_IMAGES_DIRECTORY_NAME = "article-images";
const ARTICLE_IMAGE_MAP_FILE_NAME = "article-image-map.json";
const ARTICLE_IMAGE_ALIAS_FILE_NAME = "article-image-aliases.json";
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ARTICLE_IMAGE_EXTENSION_TYPES = new Map([
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".webp", "image/webp"]
]);

let cachedArticleImageMap = null;
let cachedArticleImageMapModifiedAt = null;

function normalizeArticleImageFileName(value) {
    const rawValue = String(value ?? "").trim();
    if (!rawValue) return "";

    const normalizedName = path.basename(rawValue.replaceAll("\\", "/"));
    const extension = path.extname(normalizedName).toLowerCase();
    if (
        normalizedName !== rawValue
        || normalizedName === "."
        || normalizedName === ".."
        || !ARTICLE_IMAGE_EXTENSION_TYPES.has(extension)
    ) {
        return "";
    }

    return normalizedName;
}

function getArticleImagesDirectory() {
    const directory = path.join(
        getDataDirectory(),
        ARTICLE_IMAGES_DIRECTORY_NAME
    );
    fs.mkdirSync(directory, { recursive: true });
    return directory;
}

function getArticleImageMapPath() {
    return path.join(getDataDirectory(), ARTICLE_IMAGE_MAP_FILE_NAME);
}

function getBundledArticleImagesDirectory() {
    return path.resolve(MODULE_DIRECTORY, "../public/article-images");
}

function getBundledArticleImageMapPath() {
    return path.resolve(MODULE_DIRECTORY, "../public/article-image-map.json");
}

function getBundledArticleImageAliasPath() {
    return path.resolve(MODULE_DIRECTORY, "../public/article-image-aliases.json");
}

function readArticleImageMapFile(mapPath) {
    try {
        const parsed = JSON.parse(fs.readFileSync(mapPath, "utf8"));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function getArticleImageMap() {
    const localMapPath = getArticleImageMapPath();
    let localModifiedAt = null;
    try {
        localModifiedAt = fs.statSync(localMapPath).mtimeMs;
    } catch {
        localModifiedAt = null;
    }

    if (
        cachedArticleImageMap
        && cachedArticleImageMapModifiedAt === localModifiedAt
    ) {
        return cachedArticleImageMap;
    }

    const bundledMap = fs.existsSync(getBundledArticleImageMapPath())
        ? readArticleImageMapFile(getBundledArticleImageMapPath())
        : {};
    const localMap = localModifiedAt === null
        ? {}
        : readArticleImageMapFile(localMapPath);
    cachedArticleImageMap = {
        ...bundledMap,
        ...localMap
    };
    cachedArticleImageMapModifiedAt = localModifiedAt;
    return cachedArticleImageMap;
}

function resolveBundledArticleImageAlias(fileName) {
    const normalizedName = normalizeArticleImageFileName(fileName);
    if (!normalizedName) return "";

    const aliasPath = getBundledArticleImageAliasPath();
    if (!fs.existsSync(aliasPath)) return normalizedName;

    const aliases = readArticleImageMapFile(aliasPath);
    return normalizeArticleImageFileName(aliases[normalizedName])
        || normalizedName;
}

function updateArticleImageMap(mappings = []) {
    const validMappings = mappings.filter(mapping =>
        mapping
        && String(mapping.articleNumber ?? "").trim()
        && normalizeArticleImageFileName(mapping.productImageFileName)
    );
    if (validMappings.length === 0) return 0;

    const nextMap = {
        ...getArticleImageMap()
    };
    let changed = 0;
    for (const mapping of validMappings) {
        const articleNumber = String(mapping.articleNumber).trim();
        const fileName = resolveBundledArticleImageAlias(
            mapping.productImageFileName
        );
        if (nextMap[articleNumber] === fileName) continue;
        nextMap[articleNumber] = fileName;
        changed++;
    }

    if (changed === 0) return 0;
    fs.writeFileSync(
        getArticleImageMapPath(),
        `${JSON.stringify(nextMap, null, 2)}\n`,
        "utf8"
    );
    cachedArticleImageMap = nextMap;
    try {
        cachedArticleImageMapModifiedAt = fs.statSync(getArticleImageMapPath()).mtimeMs;
    } catch {
        cachedArticleImageMapModifiedAt = null;
    }
    return changed;
}

function getArticleImageFileName(articleNumber, fileName = "") {
    const normalizedFileName = normalizeArticleImageFileName(fileName);
    if (normalizedFileName) {
        return resolveBundledArticleImageAlias(normalizedFileName);
    }

    const mappedFileName = getArticleImageMap()[String(articleNumber ?? "").trim()];
    return resolveBundledArticleImageAlias(mappedFileName);
}

function getArticleImagePath(fileName) {
    const normalizedName = normalizeArticleImageFileName(fileName);
    if (!normalizedName) {
        throw new Error("Ungültiger Produktbild-Dateiname.");
    }

    const directory = getArticleImagesDirectory();
    const filePath = path.resolve(directory, normalizedName);
    if (path.dirname(filePath) !== path.resolve(directory)) {
        throw new Error("Ungültiger Produktbild-Pfad.");
    }

    return filePath;
}

function getArticleImageSourcePath(articleNumber, fileName = "") {
    const normalizedName = getArticleImageFileName(articleNumber, fileName);
    if (!normalizedName) return "";

    try {
        const localPath = getArticleImagePath(normalizedName);
        if (fs.existsSync(localPath)) return localPath;
    } catch {
        return "";
    }

    const bundledPath = path.resolve(
        getBundledArticleImagesDirectory(),
        normalizedName
    );
    if (
        path.dirname(bundledPath) === path.resolve(getBundledArticleImagesDirectory())
        && fs.existsSync(bundledPath)
    ) {
        return bundledPath;
    }

    return "";
}

function getArticleImageContentType(fileName) {
    return ARTICLE_IMAGE_EXTENSION_TYPES.get(
        path.extname(normalizeArticleImageFileName(fileName)).toLowerCase()
    ) ?? "application/octet-stream";
}

function getArticleImageUrl(articleNumber, fileName) {
    if (!getArticleImageSourcePath(articleNumber, fileName)) return "";

    return `/api/articles/${encodeURIComponent(String(articleNumber ?? ""))}/image`;
}

export {
    getArticleImageContentType,
    getArticleImageFileName,
    getArticleImagePath,
    getArticleImageMapPath,
    getArticleImagesDirectory,
    getArticleImageSourcePath,
    getArticleImageUrl,
    normalizeArticleImageFileName,
    updateArticleImageMap
};
