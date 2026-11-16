import crypto from "node:crypto";
import * as database from "../database/index.js";

const SESSION_COOKIE = "projectbuilder-session";
const SESSION_HASH_SETTING = "auth.localSessionHash";
const SESSION_HASHES_SETTING = "auth.localSessionHashes";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getStoredSessionHashes() {
    const rows = database.settings
        .prepare("SELECT key, value FROM settings WHERE key IN (?, ?)")
        .all(SESSION_HASH_SETTING, SESSION_HASHES_SETTING);
    const legacyHash = rows.find(row => row.key === SESSION_HASH_SETTING)?.value;
    const serializedHashes = rows.find(row => row.key === SESSION_HASHES_SETTING)?.value;
    let hashes = [];

    if (serializedHashes) {
        try {
            const parsed = JSON.parse(serializedHashes);
            if (Array.isArray(parsed)) hashes = parsed;
        } catch {
            // Ignore malformed session data and keep the legacy value below.
        }
    }

    if (legacyHash) hashes.push(legacyHash);
    return [...new Set(hashes.filter(hash => /^[a-f0-9]{64}$/i.test(hash)))];
}

function hashSessionToken(token) {
    return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function readSessionCookie(req) {
    const cookieHeader = req.headers.cookie;
    if (typeof cookieHeader !== "string") return null;

    const cookie = cookieHeader.split(";").map(item => item.trim())
        .find(item => item.startsWith(`${SESSION_COOKIE}=`));
    return cookie ? decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)) : null;
}

function hasValidLocalSession(req) {
    const token = readSessionCookie(req);
    const storedHashes = getStoredSessionHashes();
    if (!token || storedHashes.length === 0) return false;

    const tokenHash = Buffer.from(hashSessionToken(token), "utf8");
    return storedHashes.some(storedHash => {
        const expectedHash = Buffer.from(storedHash, "utf8");
        return tokenHash.length === expectedHash.length
            && crypto.timingSafeEqual(tokenHash, expectedHash);
    });
}

function hasAnyLocalSession() {
    return getStoredSessionHashes().length > 0;
}

function setSessionCookie(res, token) {
    const cookieValue = token ? encodeURIComponent(token) : "";
    const maxAge = token ? `Max-Age=${SESSION_MAX_AGE_SECONDS}` : "Max-Age=0";
    res.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE}=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; ${maxAge}`
    );
}

export function createLocalSession(res) {
    const token = crypto.randomBytes(32).toString("base64url");
    const hashes = [...getStoredSessionHashes(), hashSessionToken(token)];
    const transaction = database.settings.transaction(() => {
        database.settings.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(SESSION_HASHES_SETTING, JSON.stringify(hashes));
        database.settings.prepare("DELETE FROM settings WHERE key = ?").run(SESSION_HASH_SETTING);
    });
    transaction();
    setSessionCookie(res, token);
}

export function clearLocalSession(res) {
    database.settings
        .prepare("DELETE FROM settings WHERE key IN (?, ?)")
        .run(SESSION_HASH_SETTING, SESSION_HASHES_SETTING);
    setSessionCookie(res, null);
}

// A local ProjectBuilder server is shared by Electron and the system browser.
// If one client has already completed the Salesforce login, let another client
// establish its own cookie without requiring a second OAuth round trip.
export function establishSharedLocalSession(req, res) {
    try {
        if (hasValidLocalSession(req)) return true;
        if (!hasAnyLocalSession()) return false;
        createLocalSession(res);
        return true;
    } catch {
        return false;
    }
}

export function isLocalSessionAuthenticated(req) {
    try {
        return hasValidLocalSession(req);
    } catch {
        return false;
    }
}

export function requireLocalSession(req, res, next) {
    if (isLocalSessionAuthenticated(req)) {
        next();
        return;
    }

    res.status(401).json({
        success: false,
        code: "LOCAL_AUTH_REQUIRED",
        error: "Bitte zuerst am ProjectBuilder anmelden."
    });
}
