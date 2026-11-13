import crypto from "node:crypto";
import * as database from "../database/index.js";

const SESSION_COOKIE = "projectbuilder-session";
const SESSION_HASH_SETTING = "auth.localSessionHash";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getStoredSessionHash() {
    return database.settings
        .prepare("SELECT value FROM settings WHERE key = ?")
        .get(SESSION_HASH_SETTING)?.value ?? null;
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
    const storedHash = getStoredSessionHash();
    if (!token || !storedHash) return false;

    const tokenHash = Buffer.from(hashSessionToken(token), "utf8");
    const expectedHash = Buffer.from(storedHash, "utf8");
    return tokenHash.length === expectedHash.length
        && crypto.timingSafeEqual(tokenHash, expectedHash);
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
    database.settings.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(SESSION_HASH_SETTING, hashSessionToken(token));
    setSessionCookie(res, token);
}

export function clearLocalSession(res) {
    database.settings.prepare("DELETE FROM settings WHERE key = ?").run(SESSION_HASH_SETTING);
    setSessionCookie(res, null);
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
