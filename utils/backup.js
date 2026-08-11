import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { getDatabasePath } from "../database/config.js";

const BACKUP_FORMAT = "projectbuilder-backup";
const BACKUP_VERSION = 1;
const AUTO_BACKUP_PREFIX = "ProjectBuilder-Auto-";
const AUTO_BACKUP_RETENTION = 10;
const VALID_FREQUENCIES = new Set(["daily", "weekly", "monthly"]);

const tableColumns = {
    articles: [
        "id", "articleNumber", "ean", "manufacturerType", "manufacturerName",
        "originCountry", "originRegion", "intrastatNumber", "quantity",
        "quantityUnit", "listPrice", "listPriceCurrency", "discountGroup", "description"
    ],
    customers: [
        "id", "customerNumber", "name", "city", "additionalInfo",
        "pg1", "pg2", "pg3", "pg4", "pg5", "pg6", "pg7", "pg8", "pg9", "pg10"
    ],
    projects: ["id", "customerId", "name", "description", "projectDiscount"],
    projectNodes: [
        "id", "projectId", "parentId", "type", "name", "sortOrder",
        "physicalQuantity", "deviceDesignation", "dataCollectionLocation",
        "fundingObject", "responsibility", "collectionFrequency", "thirdPartyQuantity"
    ],
    projectNodeArticles: [
        "id", "projectNodeId", "articleNumber", "quantity", "positionName",
        "sortOrder", "isOptional", "isAlternative"
    ]
};

const backupDatabase = new Database(getDatabasePath());
let scheduler = null;
let automaticBackupRunning = false;

function normalizeSelection(selection = {}) {
    return {
        articles: selection.articles === true,
        customers: selection.customers === true,
        projects: selection.projects === true
    };
}

function requireSelection(selection) {
    if (!Object.values(selection).some(Boolean)) {
        throw new Error("Mindestens ein Datenbereich muss ausgewählt werden.");
    }
}

function selectAll(table) {
    return backupDatabase.prepare(`SELECT * FROM ${table}`).all();
}

function createBackup(selectionInput = {}) {
    const selection = normalizeSelection(selectionInput);
    requireSelection(selection);

    const sections = {};

    if (selection.articles) {
        sections.articles = {
            count: backupDatabase.prepare("SELECT COUNT(*) AS count FROM articles").get().count,
            data: selectAll("articles")
        };
    }

    if (selection.customers) {
        sections.customers = {
            count: backupDatabase.prepare("SELECT COUNT(*) AS count FROM customers").get().count,
            data: selectAll("customers")
        };
    }

    if (selection.projects) {
        const projects = selectAll("projects");
        const nodes = selectAll("projectNodes");
        const positions = selectAll("projectNodeArticles");
        const customerIds = [...new Set(projects.map(project => project.customerId).filter(id => id != null))];
        const articleNumbers = [...new Set(positions.map(position => position.articleNumber).filter(Boolean))];

        const relatedCustomers = customerIds.length === 0
            ? []
            : backupDatabase.prepare(`
                SELECT * FROM customers
                WHERE id IN (${customerIds.map(() => "?").join(",")})
            `).all(...customerIds);

        const relatedArticles = articleNumbers.length === 0
            ? []
            : backupDatabase.prepare(`
                SELECT * FROM articles
                WHERE articleNumber IN (${articleNumbers.map(() => "?").join(",")})
            `).all(...articleNumbers);

        sections.projects = {
            count: projects.length,
            projects,
            nodes,
            positions,
            relatedCustomers,
            relatedArticles
        };
    }

    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        selection,
        sections
    };
}

function serializeBackup(backup) {
    return JSON.stringify(backup, null, 2);
}

function parseBackup(input) {
    let backup;

    try {
        backup = typeof input === "string"
            ? JSON.parse(input)
            : JSON.parse(Buffer.from(input).toString("utf8"));
    } catch {
        throw new Error("Die ausgewählte Datei ist keine gültige ProjectBuilder-Backupdatei.");
    }

    if (backup?.format !== BACKUP_FORMAT || backup?.version !== BACKUP_VERSION) {
        throw new Error("Backupformat oder Backupversion wird nicht unterstützt.");
    }

    if (!backup.sections || typeof backup.sections !== "object") {
        throw new Error("Die Backupdatei enthält keine wiederherstellbaren Daten.");
    }

    return backup;
}

function inspectBackup(input) {
    const backup = parseBackup(input);
    return {
        format: backup.format,
        version: backup.version,
        createdAt: backup.createdAt,
        available: {
            articles: Array.isArray(backup.sections.articles?.data),
            customers: Array.isArray(backup.sections.customers?.data),
            projects: Array.isArray(backup.sections.projects?.projects)
        },
        counts: {
            articles: backup.sections.articles?.data?.length ?? 0,
            customers: backup.sections.customers?.data?.length ?? 0,
            projects: backup.sections.projects?.projects?.length ?? 0
        }
    };
}

function insertRows(database, table, rows, { ignore = false } = {}) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const columns = tableColumns[table];
    if (!columns) throw new Error(`Unbekannte Backuptabelle: ${table}`);

    const verb = ignore ? "INSERT OR IGNORE" : "INSERT";
    const statement = database.prepare(`
        ${verb} INTO ${table} (${columns.join(", ")})
        VALUES (${columns.map(column => `@${column}`).join(", ")})
    `);

    for (const row of rows) {
        statement.run(Object.fromEntries(columns.map(column => [column, row[column] ?? null])));
    }
}

function insertRelatedCustomer(database, customer) {
    if (!customer) return null;

    if (customer.customerNumber) {
        const existing = database.prepare(
            "SELECT id FROM customers WHERE customerNumber = ?"
        ).get(customer.customerNumber);
        if (existing) return existing.id;
    }

    const columns = tableColumns.customers.filter(column => column !== "id");
    const result = database.prepare(`
        INSERT INTO customers (${columns.join(", ")})
        VALUES (${columns.map(column => `@${column}`).join(", ")})
    `).run(Object.fromEntries(columns.map(column => [column, customer[column] ?? null])));
    return Number(result.lastInsertRowid);
}

function insertRelatedArticle(database, article) {
    if (!article?.articleNumber) return;

    const existing = database.prepare(
        "SELECT id FROM articles WHERE articleNumber = ?"
    ).get(article.articleNumber);
    if (existing) return;

    const columns = tableColumns.articles.filter(column => column !== "id");
    database.prepare(`
        INSERT INTO articles (${columns.join(", ")})
        VALUES (${columns.map(column => `@${column}`).join(", ")})
    `).run(Object.fromEntries(columns.map(column => [column, article[column] ?? null])));
}

function restoreBackup(input, selectionInput = {}) {
    const backup = parseBackup(input);
    const selection = normalizeSelection(selectionInput);
    requireSelection(selection);

    for (const section of Object.keys(selection).filter(key => selection[key])) {
        if (!backup.sections[section]) {
            throw new Error(`Der Bereich „${section}“ ist in diesem Backup nicht enthalten.`);
        }
    }

    const restore = backupDatabase.transaction(() => {
        const result = { articles: 0, customers: 0, projects: 0 };

        if (selection.customers && !selection.projects) {
            const referencedCustomers = backupDatabase.prepare(`
                SELECT DISTINCT customers.*
                FROM customers
                INNER JOIN projects ON projects.customerId = customers.id
            `).all();
            const projectsWithCustomers = backupDatabase.prepare(`
                SELECT projects.id, customers.customerNumber
                FROM projects
                LEFT JOIN customers ON customers.id = projects.customerId
            `).all();

            backupDatabase.prepare("DELETE FROM customers").run();
            insertRows(backupDatabase, "customers", backup.sections.customers.data);

            for (const project of projectsWithCustomers) {
                if (!project.customerNumber) continue;
                let target = backupDatabase.prepare(
                    "SELECT id FROM customers WHERE customerNumber = ?"
                ).get(project.customerNumber);
                if (!target) {
                    const preserved = referencedCustomers.find(
                        customer => customer.customerNumber === project.customerNumber
                    );
                    target = { id: insertRelatedCustomer(backupDatabase, preserved) };
                }
                backupDatabase.prepare("UPDATE projects SET customerId = ? WHERE id = ?")
                    .run(target.id, project.id);
            }
            result.customers = backup.sections.customers.data.length;
        }

        if (selection.articles && !selection.projects) {
            const referencedArticles = backupDatabase.prepare(`
                SELECT DISTINCT articles.*
                FROM articles
                INNER JOIN projectNodeArticles
                    ON projectNodeArticles.articleNumber = articles.articleNumber
            `).all();
            backupDatabase.prepare("DELETE FROM articles").run();
            insertRows(backupDatabase, "articles", backup.sections.articles.data);
            referencedArticles.forEach(article =>
                insertRelatedArticle(backupDatabase, article)
            );
            result.articles = backup.sections.articles.data.length;
        }

        if (selection.projects) {
            backupDatabase.prepare("DELETE FROM projectNodeArticles").run();
            backupDatabase.prepare("DELETE FROM projectNodes").run();
            backupDatabase.prepare("DELETE FROM projects").run();

            if (selection.customers) {
                backupDatabase.prepare("DELETE FROM customers").run();
                insertRows(backupDatabase, "customers", backup.sections.customers.data);
                result.customers = backup.sections.customers.data.length;
            }

            if (selection.articles) {
                backupDatabase.prepare("DELETE FROM articles").run();
                insertRows(backupDatabase, "articles", backup.sections.articles.data);
                result.articles = backup.sections.articles.data.length;
            }

            const projectSection = backup.sections.projects;
            const relatedCustomersById = new Map(
                (projectSection.relatedCustomers ?? []).map(customer => [String(customer.id), customer])
            );
            const customerIdMap = new Map();

            for (const project of projectSection.projects) {
                if (project.customerId == null || customerIdMap.has(String(project.customerId))) continue;
                const relatedCustomer = relatedCustomersById.get(String(project.customerId));
                let targetId = null;
                if (relatedCustomer?.customerNumber) {
                    targetId = backupDatabase.prepare(
                        "SELECT id FROM customers WHERE customerNumber = ?"
                    ).get(relatedCustomer.customerNumber)?.id ?? null;
                }
                if (targetId == null && relatedCustomer) {
                    targetId = insertRelatedCustomer(backupDatabase, relatedCustomer);
                }
                customerIdMap.set(String(project.customerId), targetId);
            }

            (projectSection.relatedArticles ?? []).forEach(article =>
                insertRelatedArticle(backupDatabase, article)
            );

            const restoredProjects = projectSection.projects.map(project => ({
                ...project,
                customerId: project.customerId == null
                    ? null
                    : customerIdMap.get(String(project.customerId)) ?? null
            }));
            insertRows(backupDatabase, "projects", restoredProjects);
            insertRows(backupDatabase, "projectNodes", projectSection.nodes);
            insertRows(backupDatabase, "projectNodeArticles", projectSection.positions);
            result.projects = restoredProjects.length;
        }

        return result;
    });

    return restore();
}

function getSetting(key, fallback = "") {
    return backupDatabase.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? fallback;
}

function setSetting(key, value) {
    backupDatabase.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, String(value));
}

function getDefaultBackupDirectory() {
    return path.join(path.dirname(getDatabasePath()), "backups");
}

function getAutomaticBackupSettings() {
    return {
        enabled: getSetting("backup.auto.enabled", "false") === "true",
        frequency: getSetting("backup.auto.frequency", "weekly"),
        directory: getSetting("backup.auto.directory", getDefaultBackupDirectory()),
        selection: {
            articles: getSetting("backup.auto.articles", "true") === "true",
            customers: getSetting("backup.auto.customers", "true") === "true",
            projects: getSetting("backup.auto.projects", "true") === "true"
        },
        lastRunAt: getSetting("backup.auto.lastRunAt", "") || null,
        nextRunAt: getSetting("backup.auto.nextRunAt", "") || null,
        lastError: getSetting("backup.auto.lastError", "") || null,
        retention: AUTO_BACKUP_RETENTION
    };
}

function calculateNextRun(from, frequency) {
    const next = new Date(from);
    if (frequency === "daily") next.setDate(next.getDate() + 1);
    if (frequency === "weekly") next.setDate(next.getDate() + 7);
    if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
    return next;
}

function updateAutomaticBackupSettings(input = {}) {
    const previous = getAutomaticBackupSettings();
    const enabled = input.enabled === true;
    const frequency = VALID_FREQUENCIES.has(input.frequency) ? input.frequency : "weekly";
    const selection = normalizeSelection(input.selection);
    requireSelection(selection);
    const directory = path.resolve(String(input.directory || getDefaultBackupDirectory()));

    if (enabled) fs.mkdirSync(directory, { recursive: true });

    setSetting("backup.auto.enabled", enabled);
    setSetting("backup.auto.frequency", frequency);
    setSetting("backup.auto.directory", directory);
    setSetting("backup.auto.articles", selection.articles);
    setSetting("backup.auto.customers", selection.customers);
    setSetting("backup.auto.projects", selection.projects);
    setSetting("backup.auto.lastError", "");

    const shouldReschedule = !previous.nextRunAt
        || previous.frequency !== frequency
        || previous.enabled !== enabled
        || new Date(previous.nextRunAt).getTime() <= Date.now();
    if (enabled && shouldReschedule) {
        setSetting("backup.auto.nextRunAt", calculateNextRun(new Date(), frequency).toISOString());
    }
    if (!enabled) setSetting("backup.auto.nextRunAt", "");

    return getAutomaticBackupSettings();
}

function safeTimestamp(date = new Date()) {
    return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function pruneAutomaticBackups(directory) {
    const resolvedDirectory = path.resolve(directory);
    const files = fs.readdirSync(resolvedDirectory, { withFileTypes: true })
        .filter(entry => entry.isFile()
            && entry.name.startsWith(AUTO_BACKUP_PREFIX)
            && entry.name.endsWith(".pbbackup"))
        .map(entry => ({
            name: entry.name,
            path: path.join(resolvedDirectory, entry.name),
            modified: fs.statSync(path.join(resolvedDirectory, entry.name)).mtimeMs
        }))
        .sort((a, b) => b.modified - a.modified);

    for (const file of files.slice(AUTO_BACKUP_RETENTION)) {
        const resolvedFile = path.resolve(file.path);
        if (path.dirname(resolvedFile) !== resolvedDirectory) {
            throw new Error("Unerwarteter Pfad beim Bereinigen automatischer Backups.");
        }
        fs.unlinkSync(resolvedFile);
    }
}

function runAutomaticBackup() {
    const settings = getAutomaticBackupSettings();
    if (!settings.enabled || automaticBackupRunning) return null;
    automaticBackupRunning = true;

    try {
        fs.mkdirSync(settings.directory, { recursive: true });
        const backup = createBackup(settings.selection);
        const filename = `${AUTO_BACKUP_PREFIX}${safeTimestamp()}.pbbackup`;
        const filePath = path.join(settings.directory, filename);
        fs.writeFileSync(filePath, serializeBackup(backup), { encoding: "utf8", flag: "wx" });
        pruneAutomaticBackups(settings.directory);
        const completedAt = new Date();
        setSetting("backup.auto.lastRunAt", completedAt.toISOString());
        setSetting("backup.auto.nextRunAt", calculateNextRun(completedAt, settings.frequency).toISOString());
        setSetting("backup.auto.lastError", "");
        return { filePath, createdAt: backup.createdAt };
    } catch (error) {
        setSetting("backup.auto.lastError", error.message);
        throw error;
    } finally {
        automaticBackupRunning = false;
    }
}

function checkAutomaticBackup() {
    const settings = getAutomaticBackupSettings();
    if (!settings.enabled) return;
    const dueAt = settings.nextRunAt ? new Date(settings.nextRunAt).getTime() : 0;
    if (!dueAt || dueAt <= Date.now()) {
        try {
            runAutomaticBackup();
        } catch (error) {
            console.error("Automatisches Backup fehlgeschlagen:", error);
        }
    }
}

function startAutomaticBackupScheduler() {
    if (scheduler) return scheduler;
    const initialCheck = setTimeout(checkAutomaticBackup, 3000);
    initialCheck.unref?.();
    scheduler = setInterval(checkAutomaticBackup, 60_000);
    scheduler.unref?.();
    return scheduler;
}

export {
    createBackup,
    serializeBackup,
    parseBackup,
    inspectBackup,
    restoreBackup,
    getAutomaticBackupSettings,
    updateAutomaticBackupSettings,
    runAutomaticBackup,
    startAutomaticBackupScheduler,
    getDefaultBackupDirectory
};
