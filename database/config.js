import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const databaseFileName = "projectbuilder.db";
const profileRegistryFileName = "database-profiles.json";
const defaultProfileId = "default";
const defaultProfileName = "Standarddatenbank";

let profileRegistry = null;
let activeDatabase = null;
let activeProfileId = defaultProfileId;
let databaseInitializers = [];
let activeOperations = 0;
let switchingDatabase = false;
let switchPromise = null;
const accessWaiters = [];
const idleWaiters = [];

export function getDataDirectory() {
    const dataDirectory = process.env.PROJECTBUILDER_DATA_DIR;

    if (!dataDirectory) return moduleDirectory;

    fs.mkdirSync(dataDirectory, { recursive: true });
    return dataDirectory;
}

function getProfileRegistryPath() {
    return path.join(getDataDirectory(), profileRegistryFileName);
}

function isValidProfileId(id) {
    return id === defaultProfileId || /^profile-[0-9a-f-]{36}$/i.test(id);
}

function normalizeProfileName(name) {
    const value = String(name ?? "").trim().replace(/\s+/g, " ");
    if (!value) throw new Error("Bitte einen Namen für das Datenbankprofil eingeben.");
    if (value.length > 80) throw new Error("Der Datenbankname darf höchstens 80 Zeichen lang sein.");
    return value;
}

function createDefaultRegistry() {
    return {
        version: 1,
        activeProfileId: defaultProfileId,
        profiles: [{ id: defaultProfileId, name: defaultProfileName }]
    };
}

function normalizeRegistry(input) {
    const fallback = createDefaultRegistry();
    const sourceProfiles = Array.isArray(input?.profiles) ? input.profiles : [];
    const profiles = sourceProfiles
        .filter(profile => isValidProfileId(profile?.id))
        .map(profile => ({
            id: profile.id,
            name: String(profile.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
                || (profile.id === defaultProfileId ? defaultProfileName : profile.id)
        }))
        .filter((profile, index, list) => list.findIndex(item => item.id === profile.id) === index);

    if (!profiles.some(profile => profile.id === defaultProfileId)) {
        profiles.unshift(fallback.profiles[0]);
    }

    const requestedActiveId = String(input?.activeProfileId ?? defaultProfileId);
    return {
        version: 1,
        activeProfileId: profiles.some(profile => profile.id === requestedActiveId)
            ? requestedActiveId
            : defaultProfileId,
        profiles
    };
}

function persistProfileRegistry(registry) {
    const registryPath = getProfileRegistryPath();
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8");
}

function ensureProfileRegistry() {
    if (profileRegistry) return profileRegistry;

    const registryPath = getProfileRegistryPath();
    let parsed = null;
    try {
        parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    } catch {
        parsed = null;
    }

    profileRegistry = normalizeRegistry(parsed);
    if (!parsed || JSON.stringify(parsed) !== JSON.stringify(profileRegistry)) {
        persistProfileRegistry(profileRegistry);
    }
    activeProfileId = profileRegistry.activeProfileId;
    return profileRegistry;
}

function getProfile(profileId = activeProfileId) {
    const registry = ensureProfileRegistry();
    return registry.profiles.find(profile => profile.id === profileId) ?? null;
}

function getProfileDatabasePath(profileId = activeProfileId) {
    const profile = getProfile(profileId);
    if (!profile) throw new Error("Datenbankprofil wurde nicht gefunden.");

    if (profile.id === defaultProfileId) {
        const targetPath = path.join(getDataDirectory(), databaseFileName);
        const bundledPath = path.join(moduleDirectory, databaseFileName);
        if (!fs.existsSync(targetPath) && fs.existsSync(bundledPath)) {
            fs.copyFileSync(bundledPath, targetPath);
        }
        return targetPath;
    }

    const profilesDirectory = path.join(getDataDirectory(), "databases");
    fs.mkdirSync(profilesDirectory, { recursive: true });
    return path.join(profilesDirectory, `${profile.id}.db`);
}

export function getProfileProjectFilesDirectory(profileId = activeProfileId) {
    ensureProfileRegistry();
    if (!getProfile(profileId)) throw new Error("Datenbankprofil wurde nicht gefunden.");

    return path.join(
        getDataDirectory(),
        "project-files",
        ...(profileId === defaultProfileId ? [] : [profileId])
    );
}

export function getDatabasePath() {
    ensureProfileRegistry();
    return getProfileDatabasePath(activeProfileId);
}

function openProfileDatabase(profileId) {
    return new Database(getProfileDatabasePath(profileId));
}

export function registerDatabaseInitializer(initializer) {
    if (typeof initializer !== "function" || databaseInitializers.includes(initializer)) return;
    databaseInitializers.push(initializer);
}

function initializeDatabaseSchema(database) {
    for (const initializer of databaseInitializers) initializer(database);
}

function copyProfileProjectFiles(sourceProfileId, targetProfileId) {
    const sourceDirectory = getProfileProjectFilesDirectory(sourceProfileId);
    const targetDirectory = getProfileProjectFilesDirectory(targetProfileId);
    if (!fs.existsSync(sourceDirectory)) return;

    fs.mkdirSync(targetDirectory, { recursive: true });
    if (sourceProfileId === defaultProfileId) {
        // The legacy default profile stores its files directly in project-files.
        // Other profiles use subdirectories there, which must not be copied into
        // a newly created profile.
        for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
            if (!entry.isFile()) continue;
            fs.copyFileSync(
                path.join(sourceDirectory, entry.name),
                path.join(targetDirectory, entry.name)
            );
        }
        return;
    }

    fs.cpSync(sourceDirectory, targetDirectory, {
        recursive: true,
        force: true
    });
}

function getActiveDatabase() {
    ensureProfileRegistry();
    if (!activeDatabase) {
        activeDatabase = openProfileDatabase(activeProfileId);
    }
    return activeDatabase;
}

export function getDatabase() {
    return getActiveDatabase();
}

const databaseProxy = new Proxy({}, {
    get(_target, property) {
        const database = getActiveDatabase();
        const value = database[property];
        return typeof value === "function" ? value.bind(database) : value;
    }
});

export function getDatabaseProxy() {
    return databaseProxy;
}

export function getActiveProfileId() {
    ensureProfileRegistry();
    return activeProfileId;
}

export function getDatabaseProfiles() {
    const registry = ensureProfileRegistry();
    return {
        activeProfileId,
        profiles: registry.profiles.map(profile => ({
            ...profile,
            active: profile.id === activeProfileId
        }))
    };
}

function releaseDatabaseAccess() {
    activeOperations = Math.max(0, activeOperations - 1);
    if (activeOperations === 0) {
        while (idleWaiters.length > 0) idleWaiters.shift()();
    }
}

export async function acquireDatabaseAccess() {
    if (switchingDatabase) {
        await new Promise(resolve => accessWaiters.push(resolve));
    }
    activeOperations += 1;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        releaseDatabaseAccess();
    };
}

function waitForDatabaseIdle() {
    if (activeOperations === 0) return Promise.resolve();
    return new Promise(resolve => idleWaiters.push(resolve));
}

function releaseWaitingAccess() {
    switchingDatabase = false;
    while (accessWaiters.length > 0) accessWaiters.shift()();
}

async function performDatabaseSwitch(profileId) {
    const registry = ensureProfileRegistry();
    const profile = registry.profiles.find(item => item.id === profileId);
    if (!profile) throw new Error("Datenbankprofil wurde nicht gefunden.");
    if (profile.id === activeProfileId && activeDatabase) return getDatabaseProfiles();

    switchingDatabase = true;
    try {
        await waitForDatabaseIdle();

        const nextDatabase = openProfileDatabase(profile.id);
        try {
            initializeDatabaseSchema(nextDatabase);
        } catch (error) {
            nextDatabase.close();
            throw error;
        }

        const previousDatabase = activeDatabase;
        const nextRegistry = {
            ...registry,
            activeProfileId: profile.id,
            profiles: registry.profiles.map(item => ({ ...item }))
        };
        try {
            persistProfileRegistry(nextRegistry);
        } catch (error) {
            nextDatabase.close();
            throw error;
        }
        profileRegistry = nextRegistry;
        activeProfileId = profile.id;
        activeDatabase = nextDatabase;
        previousDatabase?.close();
        return getDatabaseProfiles();
    } finally {
        releaseWaitingAccess();
    }
}

export function switchDatabaseProfile(profileId) {
    const requestedId = String(profileId ?? "");
    if (switchPromise) {
        return switchPromise.then(() => switchDatabaseProfile(requestedId));
    }

    switchPromise = performDatabaseSwitch(requestedId);
    const result = switchPromise.finally(() => {
        switchPromise = null;
    });
    switchPromise = result;
    return result;
}

async function performDuplicateActiveDatabaseProfile(name) {
    const registry = ensureProfileRegistry();
    const normalizedName = normalizeProfileName(name);
    if (registry.profiles.some(profile => profile.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
        throw new Error("Ein Datenbankprofil mit diesem Namen existiert bereits.");
    }

    const sourceProfileId = activeProfileId;
    const id = `profile-${crypto.randomUUID()}`;
    const profile = { id, name: normalizedName };
    const previousRegistry = registry;
    const nextRegistry = {
        ...registry,
        profiles: [...registry.profiles, profile]
    };
    let targetDatabasePath = null;
    let targetProjectFilesDirectory = null;
    let nextDatabase = null;

    switchingDatabase = true;
    try {
        await waitForDatabaseIdle();
        if (!activeDatabase) getActiveDatabase();

        profileRegistry = nextRegistry;
        persistProfileRegistry(nextRegistry);
        targetDatabasePath = getProfileDatabasePath(id);
        targetProjectFilesDirectory = getProfileProjectFilesDirectory(id);

        await activeDatabase.backup(targetDatabasePath);
        copyProfileProjectFiles(sourceProfileId, id);

        nextDatabase = new Database(targetDatabasePath);
        try {
            initializeDatabaseSchema(nextDatabase);
        } catch (error) {
            nextDatabase.close();
            nextDatabase = null;
            throw error;
        }

        const activatedRegistry = {
            ...nextRegistry,
            activeProfileId: id,
            profiles: nextRegistry.profiles.map(item => ({ ...item }))
        };
        persistProfileRegistry(activatedRegistry);
        activeDatabase.close();
        activeDatabase = nextDatabase;
        nextDatabase = null;
        activeProfileId = id;
        profileRegistry = activatedRegistry;
        return getDatabaseProfiles();
    } catch (error) {
        nextDatabase?.close();
        if (targetDatabasePath) fs.rmSync(targetDatabasePath, { force: true });
        if (targetProjectFilesDirectory) {
            fs.rmSync(targetProjectFilesDirectory, { recursive: true, force: true });
        }
        profileRegistry = previousRegistry;
        try {
            persistProfileRegistry(previousRegistry);
        } catch {
            // Preserve the original copy/switch error.
        }
        throw error;
    } finally {
        releaseWaitingAccess();
    }
}

export function duplicateActiveDatabaseProfile(name) {
    if (switchPromise) {
        return switchPromise.then(() => duplicateActiveDatabaseProfile(name));
    }

    switchPromise = performDuplicateActiveDatabaseProfile(name);
    const result = switchPromise.finally(() => {
        switchPromise = null;
    });
    switchPromise = result;
    return result;
}

export async function createDatabaseProfile(name) {
    const registry = ensureProfileRegistry();
    const normalizedName = normalizeProfileName(name);
    if (registry.profiles.some(profile => profile.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
        throw new Error("Ein Datenbankprofil mit diesem Namen existiert bereits.");
    }

    const id = `profile-${crypto.randomUUID()}`;
    const previousRegistry = profileRegistry;
    const nextRegistry = {
        ...registry,
        profiles: [...registry.profiles, { id, name: normalizedName }]
    };
    profileRegistry = nextRegistry;
    try {
        persistProfileRegistry(nextRegistry);
        return await switchDatabaseProfile(id);
    } catch (error) {
        profileRegistry = previousRegistry;
        try {
            persistProfileRegistry(previousRegistry);
        } catch {
            // Preserve the original profile-creation/switch error.
        }
        throw error;
    }
}

export function deleteDatabaseProfile(profileId) {
    const requestedId = String(profileId ?? "");
    const registry = ensureProfileRegistry();
    const profile = registry.profiles.find(item => item.id === requestedId);

    if (!profile) throw new Error("Datenbankprofil wurde nicht gefunden.");
    if (profile.id === defaultProfileId) {
        throw new Error("Die Standarddatenbank kann nicht gelöscht werden.");
    }
    if (profile.id === activeProfileId) {
        throw new Error("Die aktive Datenbank kann nicht gelöscht werden. Bitte zuerst wechseln.");
    }

    const nextRegistry = {
        ...registry,
        profiles: registry.profiles.filter(item => item.id !== profile.id)
    };
    const databasePath = getProfileDatabasePath(profile.id);
    const projectFilesDirectory = getProfileProjectFilesDirectory(profile.id);
    const backupsDirectory = path.join(getDataDirectory(), "backups", profile.id);

    persistProfileRegistry(nextRegistry);
    try {
        fs.rmSync(databasePath, { force: true });
        fs.rmSync(projectFilesDirectory, { recursive: true, force: true });
        fs.rmSync(backupsDirectory, { recursive: true, force: true });
        profileRegistry = nextRegistry;
        return getDatabaseProfiles();
    } catch (error) {
        profileRegistry = registry;
        try {
            persistProfileRegistry(registry);
        } catch {
            // Preserve the original deletion error.
        }
        throw error;
    }
}
