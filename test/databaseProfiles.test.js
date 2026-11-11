import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

test("database profiles keep their SQLite data isolated", async testContext => {
    const dataDirectory = fs.mkdtempSync(
        path.join(os.tmpdir(), "projectbuilder-database-profile-")
    );
    process.env.PROJECTBUILDER_DATA_DIR = dataDirectory;

    let database;
    let config;
    try {
        database = await import("../database/index.js");
        config = await import("../database/config.js");
    } catch (error) {
        if (error?.code === "ERR_DLOPEN_FAILED" && /NODE_MODULE_VERSION/.test(error.message)) {
            testContext.skip("better-sqlite3 muss für die aktuell verwendete Node-Version neu gebaut werden.");
            return;
        }
        throw error;
    }
    const key = `test.database.profile.${crypto.randomUUID()}`;

    database.settings.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?)"
    ).run(key, "default");

    const created = await config.createDatabaseProfile("Isolierter Test");
    assert.equal(created.profiles.length, 2);
    assert.notEqual(created.activeProfileId, "default");
    assert.equal(
        database.settings.prepare("SELECT value FROM settings WHERE key = ?").get(key),
        undefined
    );

    database.settings.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?)"
    ).run(key, "profile");

    await config.switchDatabaseProfile("default");
    assert.equal(
        database.settings.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value,
        "default"
    );

    const copied = await config.duplicateActiveDatabaseProfile("Kopie der Standarddatenbank");
    assert.equal(
        copied.profiles.find(profile => profile.id === copied.activeProfileId)?.active,
        true
    );
    assert.equal(
        database.settings.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value,
        "default"
    );
    database.settings.prepare("UPDATE settings SET value = ? WHERE key = ?").run("copy", key);
    await config.switchDatabaseProfile("default");
    assert.equal(
        database.settings.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value,
        "default"
    );
});
