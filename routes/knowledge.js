import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import { randomUUID } from "node:crypto";
import * as database from "../database/index.js";
import * as salesforce from "../services/salesforce.js";
import {
    isSalesforceAuthenticationError,
    normalizeExternalError
} from "../utils/externalError.js";

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});

const SALESFORCE_LAST_MODIFIED_SETTING = "knowledge.salesforceLastModifiedAt";
const ARCHIVE_SHEET_NAME = "Archiv";
const FAQ_HEADERS = [
    "FAQ-ID", "Frage", "Antwort", "Kategorie", "Artikelnummer", "Gerät",
    "Suchbegriffe", "Quelle", "Aktiv", "Sortierung", "Erstellt am", "Zuletzt geändert",
    "Änderungsart", "Geändert von"
];
const TECHNICAL_HEADERS = [
    "Artikelnummer", "Gerät", "Kategorie", "Merkmal", "Wert", "Einheit",
    "Quelle", "Hinweis", "Aktiv", "Erstellt am", "Zuletzt geändert", "Änderungsart",
    "Geändert von"
];
const ARCHIVE_HEADERS = [
    "Typ", "Archiviert am", "FAQ-ID", "Frage", "Antwort", "Kategorie",
    "Artikelnummer", "Gerät", "Suchbegriffe", "Quelle", "Aktiv", "Sortierung",
    "Merkmal", "Wert", "Einheit", "Hinweis", "Erstellt am", "Zuletzt geändert",
    "Änderungsart", "Geändert von"
];

function normalizeKey(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function text(value) {
    return String(value ?? "").trim();
}

function splitArticleReferences(value) {
    return text(value)
        .split(/[;,]/)
        .map(item => item.trim())
        .filter(Boolean);
}

function rowValues(row) {
    return new Map(Object.entries(row).map(([key, value]) => [normalizeKey(key), text(value)]));
}

function valueFrom(row, aliases) {
    const values = rowValues(row);
    for (const alias of aliases) {
        const value = values.get(normalizeKey(alias));
        if (value !== undefined && value !== "") return value;
    }
    return "";
}

function parseActive(value) {
    const normalized = normalizeKey(value);
    return ["0", "nein", "no", "false", "inaktiv", "inactive"].includes(normalized) ? 0 : 1;
}

function timestampFrom(row, aliases, fallback) {
    return valueFrom(row, aliases) || fallback;
}

function changeTypeFrom(row, fallback) {
    return valueFrom(row, [
        "Änderungsart", "Aenderungsart", "Änderung", "Aenderung", "ChangeType", "Change"
    ]) || fallback;
}

function changedByFrom(row) {
    return valueFrom(row, [
        "Geändert von", "Geaendert von", "Bearbeitet von", "ChangedBy", "LastModifiedBy", "User"
    ]);
}

function inferChangeType(createdAt, updatedAt, fallback = "Bearbeitet") {
    return createdAt && updatedAt && createdAt === updatedAt ? "Neu" : fallback;
}

function normalizeActive(value) {
    if (typeof value === "boolean") return value ? 1 : 0;
    return parseActive(value);
}

function numericValue(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function sheetByAliases(workbook, aliases) {
    const requested = new Set(aliases.map(normalizeKey));
    const sheetName = workbook.SheetNames.find(name => requested.has(normalizeKey(name)));
    return sheetName ? workbook.Sheets[sheetName] : null;
}

function rowsFromSheet(sheet) {
    return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

function parseFaqRows(rows, updatedAt) {
    const parsed = [];
    const errors = [];
    rows.forEach((row, index) => {
        const values = rowValues(row);
        if (![...values.values()].some(Boolean)) return;
        const question = valueFrom(row, ["Frage", "Question", "Titel", "Title"]);
        const answer = valueFrom(row, ["Antwort", "Answer", "Lösung", "Loesung", "Solution", "Text"]);
        const category = valueFrom(row, ["Kategorie", "Category", "Bereich"]);
        const articleReferences = valueFrom(row, ["Artikelnummer", "Artikelnummern", "Artikel", "Article", "ArticleNumber"]);
        const deviceTypes = valueFrom(row, ["Gerät", "Geraet", "Gerät / Modul", "Geraet / Modul", "Gerätetyp", "Geraetetyp", "Device", "DeviceType"]);
        const tags = valueFrom(row, ["Suchbegriffe", "Suchbegriff", "Schlagwörter", "Schlagwoerter", "Tags", "Keywords", "Stichworte"]);
        const source = valueFrom(row, ["Quelle", "Quelle / Link", "Source", "Link"]);
        const hasContent = [question, answer, category, articleReferences, deviceTypes, tags, source].some(Boolean);
        if (!hasContent) return;
        if (!question || !answer) {
            errors.push(`FAQ Zeile ${index + 2}: Frage und Antwort sind erforderlich.`);
            return;
        }
        const rowUpdatedAt = timestampFrom(row,
            ["Zuletzt geaendert", "Zuletzt geändert", "UpdatedAt", "Updated", "LastModified"],
            updatedAt);
        const createdAt = timestampFrom(row,
            ["Erstellt am", "Erstellt", "CreatedAt", "Created", "CreationDate"],
            rowUpdatedAt);
        parsed.push({
            externalId: valueFrom(row, ["FAQ-ID", "FAQ ID", "ID", "ExternalId"]),
            question,
            answer,
            category,
            articleReferences,
            deviceTypes,
            tags,
            source,
            active: parseActive(valueFrom(row, ["Aktiv", "Active", "Status"])),
            sortOrder: Number(valueFrom(row, ["Sortierung", "SortOrder", "Reihenfolge"])) || parsed.length,
            createdAt,
            updatedAt: rowUpdatedAt,
            changeType: changeTypeFrom(row, inferChangeType(createdAt, rowUpdatedAt)),
            changedBy: changedByFrom(row)
        });
    });
    return { parsed, errors };
}

function parseTechnicalRows(rows, updatedAt) {
    const parsed = [];
    const errors = [];
    rows.forEach((row, index) => {
        const values = rowValues(row);
        if (![...values.values()].some(Boolean)) return;
        const articleNumber = valueFrom(row, ["Artikelnummer", "Artikel", "Artikel / Modell", "ArticleNumber", "Article"]);
        const deviceType = valueFrom(row, ["Gerät", "Geraet", "Gerät / Modul", "Geraet / Modul", "Gerätetyp", "Geraetetyp", "Device", "DeviceType", "Modell"]);
        const parameter = valueFrom(row, ["Merkmal", "Parameter", "Eigenschaft", "Specification", "Feature"]);
        const value = valueFrom(row, ["Wert", "Value", "Ausprägung", "Auspraegung"]);
        const category = valueFrom(row, ["Kategorie", "Category", "Bereich"]);
        const unit = valueFrom(row, ["Einheit", "Unit"]);
        const source = valueFrom(row, ["Quelle", "Quelle / Link", "Source", "Link"]);
        const notes = valueFrom(row, ["Hinweis", "Hinweise", "Notiz", "Notes", "Bemerkung"]);
        const active = parseActive(valueFrom(row, ["Aktiv", "Active", "Status"]));
        const rowUpdatedAt = timestampFrom(row,
            ["Zuletzt geaendert", "Zuletzt geändert", "UpdatedAt", "Updated", "LastModified"],
            updatedAt);
        const createdAt = timestampFrom(row,
            ["Erstellt am", "Erstellt", "CreatedAt", "Created", "CreationDate"],
            rowUpdatedAt);
        const changeType = changeTypeFrom(row, inferChangeType(createdAt, rowUpdatedAt));
        const changedBy = changedByFrom(row);
        const hasContent = [articleNumber, deviceType, category, parameter, value, unit, source, notes].some(Boolean);
        if (!hasContent) return;
        if (!articleNumber && !deviceType) {
            errors.push(`Technische Daten Zeile ${index + 2}: Artikelnummer oder Gerät ist erforderlich.`);
            return;
        }

        if (parameter && value) {
            const articleNumbers = splitArticleReferences(articleNumber);
            (articleNumbers.length ? articleNumbers : [""]).forEach(articleReference => parsed.push({
                active,
                articleNumber: articleReference,
                deviceType,
                category,
                parameter,
                value,
                unit,
                source,
                notes,
                createdAt,
                updatedAt: rowUpdatedAt,
                changeType,
                changedBy
            }));
            return;
        }

        const reserved = new Set([
            "artikelnummer", "artikel", "artikelmodell", "articlenumber", "article",
            "geraet", "geraetmodul", "geraetetyp", "device", "devicetype", "modell",
            "kategorie", "category", "bereich", "einheit", "unit", "quelle", "source", "link",
            "hinweis", "hinweise", "notiz", "notes", "bemerkung",
            "aktiv", "active", "status", "zuletztgeandert", "zuletztgeaendert", "zuletztgeandertam",
            "erstellt", "erstelltam", "createdat", "created", "creationdate",
            "anderungsart", "anderung", "changetype", "change", "geandertvon", "bearbeitetvon", "changedby", "lastmodifiedby", "user",
            "merkmal", "parameter", "eigenschaft", "specification", "feature", "wert", "value", "auspraegung"
        ]);
        const propertyColumns = Object.entries(row)
            .map(([header, cellValue]) => [normalizeKey(header), header, text(cellValue)])
            .filter(([key, , cellValue]) => !reserved.has(key) && cellValue);
        if (!propertyColumns.length) {
            errors.push(`Technische Daten Zeile ${index + 2}: Merkmal und Wert sind erforderlich.`);
            return;
        }
        const articleNumbers = splitArticleReferences(articleNumber);
        (articleNumbers.length ? articleNumbers : [""]).forEach(articleReference => {
            propertyColumns.forEach(([, header, cellValue]) => parsed.push({
                active,
                articleNumber: articleReference,
                deviceType,
                category,
                parameter: header,
                value: cellValue,
                unit,
                source,
                notes,
                createdAt,
                updatedAt: rowUpdatedAt,
                changeType,
                changedBy
            }));
        });
    });
    return { parsed, errors };
}

function parseArchiveRows(rows, updatedAt) {
    const parsed = [];
    rows.forEach(row => {
        const values = rowValues(row);
        if (![...values.values()].some(Boolean)) return;

        const typeValue = normalizeKey(valueFrom(row, ["Typ", "Type", "Bereich"]));
        const parameter = valueFrom(row, ["Merkmal", "Parameter", "Eigenschaft", "Specification", "Feature"]);
        const value = valueFrom(row, ["Wert", "Value", "AusprÃ¤gung", "Auspraegung"]);
        const isTechnical = typeValue.includes("techn")
            || typeValue.includes("technical")
            || Boolean(parameter || value);
        const rowUpdatedAt = timestampFrom(row,
            ["Zuletzt geaendert", "Zuletzt geändert", "UpdatedAt", "Updated", "LastModified"],
            updatedAt);
        const createdAt = timestampFrom(row,
            ["Erstellt am", "Erstellt", "CreatedAt", "Created", "CreationDate"],
            rowUpdatedAt);
        const archivedAt = timestampFrom(row,
            ["Archiviert am", "Archiviert", "ArchivedAt", "ArchiveDate"],
            updatedAt);
        const changeType = changeTypeFrom(row, "Archiviert");
        const changedBy = changedByFrom(row);

        const record = isTechnical
            ? {
                active: parseActive(valueFrom(row, ["Aktiv", "Active", "Status"])),
                articleNumber: valueFrom(row, ["Artikelnummer", "Artikel", "Artikel / Modell", "ArticleNumber", "Article"]),
                deviceType: valueFrom(row, ["Geraet", "GerÃ¤t", "GerÃ¤t / Modul", "Geraet / Modul", "GerÃ¤tetyp", "Geraetetyp", "Device", "DeviceType", "Modell"]),
                category: valueFrom(row, ["Kategorie", "Category", "Bereich"]),
                parameter,
                value,
                unit: valueFrom(row, ["Einheit", "Unit"]),
                source: valueFrom(row, ["Quelle", "Quelle / Link", "Source", "Link"]),
                notes: valueFrom(row, ["Hinweis", "Hinweise", "Notiz", "Notes", "Bemerkung"]),
                createdAt,
                updatedAt: rowUpdatedAt
            }
            : {
                externalId: valueFrom(row, ["FAQ-ID", "FAQ ID", "ID", "ExternalId"]),
                question: valueFrom(row, ["Frage", "Question", "Titel", "Title"]),
                answer: valueFrom(row, ["Antwort", "Answer", "LÃ¶sung", "Loesung", "Solution", "Text"]),
                category: valueFrom(row, ["Kategorie", "Category", "Bereich"]),
                articleReferences: valueFrom(row, ["Artikelnummer", "Artikelnummern", "Artikel", "Article", "ArticleNumber"]),
                deviceTypes: valueFrom(row, ["Geraet", "GerÃ¤t", "GerÃ¤t / Modul", "Geraet / Modul", "GerÃ¤tetyp", "Geraetetyp", "Device", "DeviceType"]),
                tags: valueFrom(row, ["Suchbegriffe", "Suchbegriff", "SchlagwÃ¶rter", "Schlagwoerter", "Tags", "Keywords", "Stichworte"]),
                source: valueFrom(row, ["Quelle", "Quelle / Link", "Source", "Link"]),
                active: parseActive(valueFrom(row, ["Aktiv", "Active", "Status"])),
                sortOrder: numericValue(valueFrom(row, ["Sortierung", "SortOrder", "Reihenfolge"])),
                createdAt,
                updatedAt: rowUpdatedAt
            };

        if (isTechnical && (!record.parameter || !record.value)) return;
        if (!isTechnical && (!record.question || !record.answer)) return;
        parsed.push({
            entryType: isTechnical ? "technical" : "faq",
            recordJson: JSON.stringify(record),
            archivedAt,
            createdAt,
            updatedAt: rowUpdatedAt,
            changeType,
            changedBy
        });
    });
    return parsed;
}

function replaceFaqEntries(rows) {
    database.faqEntries.prepare("DELETE FROM faqEntries").run();
    const insert = database.faqEntries.prepare(`
        INSERT INTO faqEntries (
            externalId, question, answer, category, articleReferences, deviceTypes,
            tags, source, active, sortOrder, createdAt, updatedAt, changeType, changedBy
        ) VALUES (
            @externalId, @question, @answer, @category, @articleReferences, @deviceTypes,
            @tags, @source, @active, @sortOrder, @createdAt, @updatedAt, @changeType, @changedBy
        )
    `);
    rows.forEach(row => insert.run({
        ...row,
        externalId: row.externalId || `faq-${randomUUID()}`,
        createdAt: row.createdAt || row.updatedAt,
        changeType: row.changeType || inferChangeType(row.createdAt || row.updatedAt, row.updatedAt),
        changedBy: row.changedBy || ""
    }));
}

function replaceTechnicalData(rows) {
    database.technicalData.prepare("DELETE FROM technicalData").run();
    const insert = database.technicalData.prepare(`
        INSERT INTO technicalData (
            active, articleNumber, deviceType, category, parameter, value,
            unit, source, notes, createdAt, updatedAt, changeType, changedBy
        ) VALUES (
            @active, @articleNumber, @deviceType, @category, @parameter, @value,
            @unit, @source, @notes, @createdAt, @updatedAt, @changeType, @changedBy
        )
    `);
    rows.forEach(row => insert.run({
        ...row,
        createdAt: row.createdAt || row.updatedAt,
        changeType: row.changeType || inferChangeType(row.createdAt || row.updatedAt, row.updatedAt),
        changedBy: row.changedBy || ""
    }));
}

function replaceArchive(rows) {
    database.knowledgeArchive.prepare("DELETE FROM knowledgeArchive").run();
    const insert = database.knowledgeArchive.prepare(`
        INSERT INTO knowledgeArchive (
            entryType, recordJson, archivedAt, createdAt, updatedAt, changeType, changedBy
        ) VALUES (
            @entryType, @recordJson, @archivedAt, @createdAt, @updatedAt, @changeType, @changedBy
        )
    `);
    rows.forEach(row => insert.run({
        ...row,
        changeType: row.changeType || "Archiviert",
        changedBy: row.changedBy || ""
    }));
}

function getSalesforceLastModifiedAt() {
    return database.settings.prepare(
        "SELECT value FROM settings WHERE key = ?"
    ).get(SALESFORCE_LAST_MODIFIED_SETTING)?.value ?? null;
}

function saveSalesforceLastModifiedAt(value) {
    if (!value) return;
    database.settings.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(SALESFORCE_LAST_MODIFIED_SETTING, value);
}

function isRemoteVersionNewer(remoteModifiedAt, localModifiedAt) {
    if (!localModifiedAt) return true;
    const remoteTime = Date.parse(remoteModifiedAt ?? "");
    const localTime = Date.parse(localModifiedAt ?? "");
    if (Number.isFinite(remoteTime) && Number.isFinite(localTime)) {
        return remoteTime > localTime;
    }
    return String(remoteModifiedAt ?? "") !== String(localModifiedAt ?? "");
}

function importWorkbookBuffer(buffer, updatedAt = new Date().toISOString()) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const faqSheet = sheetByAliases(workbook, ["FAQ", "FAQs", "Fragen"]);
    const technicalSheet = sheetByAliases(workbook, ["Technische Daten", "Technik", "Technical Data", "TechnicalData"]);
    const archiveSheet = sheetByAliases(workbook, [ARCHIVE_SHEET_NAME, "Archive", "Archivdaten"]);
    if (!faqSheet && !technicalSheet && !archiveSheet) {
        throw new Error("Die Excel-Datei benötigt ein Blatt FAQ oder Technische Daten.");
    }

    const faqResult = faqSheet ? parseFaqRows(rowsFromSheet(faqSheet), updatedAt) : { parsed: [], errors: [] };
    const technicalResult = technicalSheet ? parseTechnicalRows(rowsFromSheet(technicalSheet), updatedAt) : { parsed: [], errors: [] };
    const archiveResult = archiveSheet ? { parsed: parseArchiveRows(rowsFromSheet(archiveSheet), updatedAt), errors: [] } : { parsed: [], errors: [] };
    const errors = [...faqResult.errors, ...technicalResult.errors];
    if (errors.length) {
        const error = new Error(errors.slice(0, 10).join("\n"));
        error.details = errors;
        throw error;
    }

    const replace = database.faqEntries.transaction(() => {
        if (faqSheet) replaceFaqEntries(faqResult.parsed);
        if (technicalSheet) replaceTechnicalData(technicalResult.parsed);
        if (archiveSheet) replaceArchive(archiveResult.parsed);
    });
    replace();

    return {
        faq: faqSheet ? faqResult.parsed.length : null,
        technical: technicalSheet ? technicalResult.parsed.length : null,
        archive: archiveSheet ? archiveResult.parsed.length : null,
        replaced: {
            faq: Boolean(faqSheet),
            technical: Boolean(technicalSheet),
            archive: Boolean(archiveSheet)
        }
    };
}

function parseKnowledgeWorkbookBuffer(buffer, updatedAt = new Date().toISOString()) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const faqSheet = sheetByAliases(workbook, ["FAQ", "FAQs", "Fragen"]);
    const technicalSheet = sheetByAliases(workbook, ["Technische Daten", "Technik", "Technical Data", "TechnicalData"]);
    const archiveSheet = sheetByAliases(workbook, [ARCHIVE_SHEET_NAME, "Archive", "Archivdaten"]);
    return {
        faq: faqSheet ? parseFaqRows(rowsFromSheet(faqSheet), updatedAt).parsed : [],
        technical: technicalSheet ? parseTechnicalRows(rowsFromSheet(technicalSheet), updatedAt).parsed : [],
        archive: archiveSheet ? parseArchiveRows(rowsFromSheet(archiveSheet), updatedAt).parsed : []
    };
}

async function preflightKnowledgeMutation(req, operation = "") {
    const forced = req.body?.force === true;

    let remote;
    try {
        remote = await salesforce.downloadKnowledgeWorkbook();
    } catch (error) {
        // A missing connection must not prevent the local draft from being
        // saved. The normal synchronization step will report that state.
        return { remote: undefined, preflightError: error };
    }

    if (!remote?.available || !remote.data) return { remote, forced };

    const expectedModifiedAt = text(req.body?.baselineRemoteModifiedAt) || getSalesforceLastModifiedAt();
    const remoteIsNewer = Boolean(expectedModifiedAt && remote.modifiedAt
        && isRemoteVersionNewer(remote.modifiedAt, expectedModifiedAt));
    const canMergeByEntry = ["faq", "technical"].includes(operation);
    if (canMergeByEntry || remoteIsNewer) {
        const remoteEntries = parseKnowledgeWorkbookBuffer(remote.data, remote.modifiedAt);
        // A force request is the explicit result of the conflict dialog. The
        // selected local/remote values must be written now instead of opening
        // the same conflict dialog again.
        if (!forced) {
            const conflict = detectKnowledgeMutationConflict(operation, req.body || {}, remoteEntries);
            if (conflict) {
                return {
                    remote,
                    expectedModifiedAt,
                    forced,
                    conflict: true,
                    remoteEntries,
                    conflictFields: conflict.fields
                };
            }
        }
        if (canMergeByEntry) {
            return { remote, expectedModifiedAt, forced, autoMerge: true, remoteEntries };
        }
    }

    return { remote, expectedModifiedAt, forced };
}

function respondWithKnowledgeConflict(res, preflight, operation, request) {
    return res.status(409).json({
        success: false,
        conflict: true,
        operation,
        baselineModifiedAt: preflight.expectedModifiedAt || null,
        remoteModifiedAt: preflight.remote?.modifiedAt || null,
        conflictFields: preflight.conflictFields || [],
        remoteEntries: preflight.remoteEntries || { faq: [], technical: [], archive: [] },
        request
    });
}

const FAQ_MUTABLE_FIELDS = [
    "question", "answer", "category", "articleReferences",
    "deviceTypes", "tags", "source", "active", "sortOrder"
];
const TECHNICAL_MUTABLE_FIELDS = [
    "deviceType", "category", "parameter", "value", "unit", "source", "notes"
];

function comparableKnowledgeValue(field, value) {
    if (field === "active") return normalizeActive(value);
    return text(value);
}

function knowledgeValuesEqual(field, left, right) {
    return comparableKnowledgeValue(field, left) === comparableKnowledgeValue(field, right);
}

function knowledgeEntryChangedFields(current, baseline, fields) {
    if (!current || !baseline) return fields;
    return fields.filter(field => !knowledgeValuesEqual(field, current[field], baseline[field]));
}

function findRemoteFaqEntry(entries, request, baseline = null) {
    return entries.find(entry => request?.externalId && entry.externalId === request.externalId)
        || entries.find(entry => baseline?.externalId && entry.externalId === baseline.externalId)
        || entries.find(entry => request?.question && entry.question === request.question)
        || null;
}

function technicalKnowledgeKey(entry) {
    return [entry?.category, entry?.parameter, entry?.unit]
        .map(value => text(value).toLocaleLowerCase())
        .join("\u001f");
}

function buildTechnicalKnowledgeMap(entries) {
    return new Map(entries
        .filter(entry => text(entry?.parameter) || text(entry?.value))
        .map(entry => [technicalKnowledgeKey(entry), entry]));
}

function knowledgeTechnicalGroup(entries, request) {
    const requestedEntries = Array.isArray(request?.entries) ? request.entries : [];
    const baselineEntries = Array.isArray(request?.baselineEntries) ? request.baselineEntries : [];
    const articleNumber = text(requestedEntries[0]?.articleNumber) || text(baselineEntries[0]?.articleNumber);
    const deviceTypes = new Set([
        ...requestedEntries.map(entry => text(entry?.deviceType)),
        ...baselineEntries.map(entry => text(entry?.deviceType))
    ].filter(Boolean));
    return entries.filter(entry => articleNumber
        ? text(entry.articleNumber) === articleNumber
        : deviceTypes.has(text(entry.deviceType)));
}

function detectFaqMutationConflict(request, remoteFaqEntries) {
    const baseline = request?.baselineEntry;
    const remote = findRemoteFaqEntry(remoteFaqEntries, request, baseline);
    if (!baseline) {
        return remote ? { fields: FAQ_MUTABLE_FIELDS, remote } : null;
    }
    if (!remote) return { fields: ["entry"], remote: null };

    const localChangedFields = knowledgeEntryChangedFields(request, baseline, FAQ_MUTABLE_FIELDS);
    const remoteChangedFields = knowledgeEntryChangedFields(remote, baseline, FAQ_MUTABLE_FIELDS);
    const fields = remoteChangedFields.filter(field => {
        const localChanged = localChangedFields.includes(field);
        return !localChanged || !knowledgeValuesEqual(field, request[field], remote[field]);
    });
    return fields.length ? { fields, remote } : null;
}

function detectTechnicalMutationConflict(request, remoteTechnicalEntries) {
    const baselineEntries = Array.isArray(request?.baselineEntries)
        ? request.baselineEntries.filter(entry => text(entry?.parameter) || text(entry?.value))
        : [];
    const localEntries = Array.isArray(request?.entries)
        ? request.entries.filter(entry => text(entry?.parameter) || text(entry?.value))
        : [];
    const remoteEntries = knowledgeTechnicalGroup(remoteTechnicalEntries, request);
    if (!baselineEntries.length && !localEntries.length) {
        return remoteEntries.length ? { fields: ["group"], remoteEntries } : null;
    }

    const baselineByKey = buildTechnicalKnowledgeMap(baselineEntries);
    const localByKey = buildTechnicalKnowledgeMap(localEntries);
    const remoteByKey = buildTechnicalKnowledgeMap(remoteEntries);
    const keys = new Set([...baselineByKey.keys(), ...localByKey.keys(), ...remoteByKey.keys()]);
    const conflicts = [];

    keys.forEach(key => {
        const baseline = baselineByKey.get(key) || null;
        const local = localByKey.get(key) || null;
        const remote = remoteByKey.get(key) || null;
        if (!baseline) {
            if (remote && (!local || TECHNICAL_MUTABLE_FIELDS.some(field =>
                !knowledgeValuesEqual(field, local[field], remote[field])))) {
                conflicts.push(key);
            }
            return;
        }

        TECHNICAL_MUTABLE_FIELDS.forEach(field => {
            const localChanged = !local || !knowledgeValuesEqual(field, local[field], baseline[field]);
            const remoteChanged = !remote || !knowledgeValuesEqual(field, remote[field], baseline[field]);
            const localValue = local?.[field] ?? "";
            const remoteValue = remote?.[field] ?? "";
            if (remoteChanged && (!localChanged || !knowledgeValuesEqual(field, localValue, remoteValue))) {
                conflicts.push(`${key}:${field}`);
            }
        });
    });

    return conflicts.length ? { fields: conflicts, remoteEntries } : null;
}

function detectKnowledgeMutationConflict(operation, request, remoteEntries) {
    if (operation === "faq") return detectFaqMutationConflict(request, remoteEntries.faq || []);
    if (operation === "technical") return detectTechnicalMutationConflict(request, remoteEntries.technical || []);
    return { fields: ["entry"] };
}

function sheetFromRows(headers, rows) {
    return XLSX.utils.aoa_to_sheet([headers, ...rows]);
}

function safeArchiveRecord(row) {
    try {
        const record = JSON.parse(row.recordJson);
        return record && typeof record === "object" ? record : {};
    } catch {
        return {};
    }
}

function createKnowledgeWorkbookBufferFromEntries({ faq = [], technical = [], archive = [] } = {}) {
    const faqRows = faq.map(entry => [
        entry.externalId || `faq-${entry.id || randomUUID()}`,
        entry.question,
        entry.answer,
        entry.category,
        entry.articleReferences,
        entry.deviceTypes,
        entry.tags,
        entry.source,
        Number(entry.active) ? "1" : "0",
        entry.sortOrder,
        entry.createdAt || entry.updatedAt,
        entry.updatedAt,
        entry.changeType || inferChangeType(entry.createdAt || entry.updatedAt, entry.updatedAt),
        entry.changedBy || ""
    ]).sort((left, right) => {
        const rightDate = Date.parse(right[11] || right[10] || "") || 0;
        const leftDate = Date.parse(left[11] || left[10] || "") || 0;
        return rightDate - leftDate;
    });
    const technicalRows = technical.map(entry => [
        entry.articleNumber,
        entry.deviceType,
        entry.category,
        entry.parameter,
        entry.value,
        entry.unit,
        entry.source,
        entry.notes,
        Number(entry.active) ? "1" : "0",
        entry.createdAt || entry.updatedAt,
        entry.updatedAt,
        entry.changeType || inferChangeType(entry.createdAt || entry.updatedAt, entry.updatedAt),
        entry.changedBy || ""
    ]);
    const archiveRows = archive.map(row => {
        const record = safeArchiveRecord(row);
        const isFaq = row.entryType === "faq";
        return [
            isFaq ? "FAQ" : "Technische Daten",
            row.archivedAt,
            isFaq ? record.externalId : "",
            isFaq ? record.question : "",
            isFaq ? record.answer : "",
            record.category,
            record.articleReferences || record.articleNumber,
            record.deviceTypes || record.deviceType,
            record.tags,
            record.source,
            Number(record.active) ? "1" : "0",
            isFaq ? record.sortOrder : "",
            isFaq ? "" : record.parameter,
            isFaq ? "" : record.value,
            isFaq ? "" : record.unit,
            isFaq ? "" : record.notes,
            row.createdAt || record.createdAt,
            row.updatedAt || record.updatedAt,
            row.changeType || "Archiviert",
            row.changedBy || ""
        ];
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheetFromRows(FAQ_HEADERS, faqRows), "FAQ");
    XLSX.utils.book_append_sheet(workbook, sheetFromRows(TECHNICAL_HEADERS, technicalRows), "Technische Daten");
    XLSX.utils.book_append_sheet(workbook, sheetFromRows(ARCHIVE_HEADERS, archiveRows), ARCHIVE_SHEET_NAME);
    return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}

function createKnowledgeWorkbookBuffer() {
    return createKnowledgeWorkbookBufferFromEntries({
        faq: database.faqEntries.prepare(`
            SELECT * FROM faqEntries
            ORDER BY datetime(COALESCE(updatedAt, createdAt)) DESC, id DESC
        `).all(),
        technical: database.technicalData.prepare(`
            SELECT * FROM technicalData
            ORDER BY articleNumber, deviceType, category, id
        `).all(),
        archive: database.knowledgeArchive.prepare(`
            SELECT * FROM knowledgeArchive
            ORDER BY datetime(archivedAt) DESC, id DESC
        `).all()
    });
}

function mergeKnowledgeArchiveEntries(remoteArchive = [], localArchive = []) {
    const merged = [...remoteArchive];
    const seen = new Set(remoteArchive.map(entry => [entry.entryType, entry.recordJson, entry.archivedAt].join("\u001f")));
    localArchive.forEach(entry => {
        const key = [entry.entryType, entry.recordJson, entry.archivedAt].join("\u001f");
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(entry);
    });
    return merged;
}

function mergeKnowledgeFaqEntry(remote, local, baseline = null, conflictChoices = {}) {
    if (!remote || !baseline) return local;
    const merged = { ...remote };
    FAQ_MUTABLE_FIELDS.forEach(field => {
        if (conflictChoices[field] === "local"
            || !knowledgeValuesEqual(field, local[field], baseline[field])) {
            merged[field] = local[field];
        }
    });
    merged.externalId = remote.externalId || local.externalId;
    merged.createdAt = remote.createdAt || local.createdAt;
    merged.updatedAt = local.updatedAt || remote.updatedAt;
    merged.changeType = local.changeType || remote.changeType || "Bearbeitet";
    merged.changedBy = local.changedBy || remote.changedBy || "";
    return merged;
}

function mergeKnowledgeTechnicalGroup(remoteGroup, localGroup, baselineEntries, options = {}) {
    const remoteByKey = buildTechnicalKnowledgeMap(remoteGroup);
    const localByKey = buildTechnicalKnowledgeMap(localGroup);
    const baselineByKey = buildTechnicalKnowledgeMap(baselineEntries);
    const mergedByKey = new Map(remoteByKey);
    const forceLocalKeys = new Set(options.forceLocalKeys || []);
    const forceLocalDeletes = new Set(options.forceLocalDeletes || []);

    baselineByKey.forEach((baseline, key) => {
        const local = localByKey.get(key) || null;
        const remote = remoteByKey.get(key) || null;
        if (!local) {
            if (forceLocalDeletes.has(key)) {
                mergedByKey.delete(key);
                return;
            }
            if (remote && TECHNICAL_MUTABLE_FIELDS.every(field =>
                knowledgeValuesEqual(field, remote[field], baseline[field]))) {
                mergedByKey.delete(key);
            }
            return;
        }
        const localChanged = TECHNICAL_MUTABLE_FIELDS.some(field =>
            !knowledgeValuesEqual(field, local[field], baseline[field]));
        if (!localChanged && !forceLocalKeys.has(key)) return;
        mergedByKey.set(key, remote ? {
            ...remote,
            createdAt: remote.createdAt || local.createdAt,
            updatedAt: local.updatedAt || remote.updatedAt,
            changeType: local.changeType || remote.changeType || "Bearbeitet",
            changedBy: local.changedBy || remote.changedBy || "",
            ...TECHNICAL_MUTABLE_FIELDS.reduce((result, field) => {
                if (!knowledgeValuesEqual(field, local[field], baseline[field])) result[field] = local[field];
                return result;
            }, {})
        } : local);
    });

    localByKey.forEach((local, key) => {
        if (baselineByKey.has(key)) return;
        if (forceLocalKeys.has(key) || !mergedByKey.has(key)) mergedByKey.set(key, local);
    });
    return [...mergedByKey.values()];
}

function mergeKnowledgeWorkbookBuffers(remoteBuffer, localBuffer, operation, request) {
    const remoteEntries = parseKnowledgeWorkbookBuffer(remoteBuffer);
    const localEntries = parseKnowledgeWorkbookBuffer(localBuffer);

    if (operation === "faq") {
        const localTarget = localEntries.faq.find(entry => request?.externalId && entry.externalId === request.externalId)
            || localEntries.faq.find(entry => request?.question && entry.question === request.question);
        if (!localTarget) return localBuffer;
        const baseline = request?.baselineEntry || null;
        const remoteIndex = remoteEntries.faq.findIndex(entry =>
            (localTarget.externalId && entry.externalId === localTarget.externalId)
            || (request?.question && entry.question === request.question)
        );
        const faq = [...remoteEntries.faq];
        if (remoteIndex >= 0) faq[remoteIndex] = mergeKnowledgeFaqEntry(
            faq[remoteIndex],
            localTarget,
            baseline,
            request?.conflictChoices || {}
        );
        else faq.push(localTarget);
        return createKnowledgeWorkbookBufferFromEntries({
            faq,
            technical: remoteEntries.technical,
            archive: mergeKnowledgeArchiveEntries(remoteEntries.archive, localEntries.archive)
        });
    }

    if (operation === "technical") {
        const requestedEntries = Array.isArray(request?.entries) ? request.entries : [];
        const baselineEntries = Array.isArray(request?.baselineEntries) ? request.baselineEntries : [];
        const groupArticleNumber = text(requestedEntries[0]?.articleNumber) || text(baselineEntries[0]?.articleNumber);
        const groupDeviceTypes = new Set([
            ...requestedEntries.map(entry => text(entry?.deviceType)),
            ...baselineEntries.map(entry => text(entry?.deviceType))
        ].filter(Boolean));
        const sameGroup = entry => groupArticleNumber
            ? text(entry.articleNumber) === groupArticleNumber
            : groupDeviceTypes.has(text(entry.deviceType));
        const technical = [
            ...remoteEntries.technical.filter(entry => !sameGroup(entry)),
            ...mergeKnowledgeTechnicalGroup(
                remoteEntries.technical.filter(sameGroup),
                localEntries.technical.filter(sameGroup),
                baselineEntries,
                {
                    forceLocalKeys: request?.forceLocalKeys,
                    forceLocalDeletes: request?.forceLocalDeletes
                }
            )
        ];
        return createKnowledgeWorkbookBufferFromEntries({
            faq: remoteEntries.faq,
            technical,
            archive: mergeKnowledgeArchiveEntries(remoteEntries.archive, localEntries.archive)
        });
    }

    return localBuffer;
}

async function synchronizeKnowledgeWorkbook({ remote: suppliedRemote = undefined, ignoreConflict = false, autoMerge = false, mutation = null } = {}) {
    const localBuffer = createKnowledgeWorkbookBuffer();
    try {
        const remote = suppliedRemote === undefined
            ? await salesforce.downloadKnowledgeWorkbook()
            : suppliedRemote;
        if (!remote || !remote.available) {
            return {
                synced: false,
                pending: true,
                connected: true,
                available: false,
                syncError: "Die Salesforce-Datei ist derzeit nicht verfügbar."
            };
        }

        const localModifiedAt = getSalesforceLastModifiedAt();
        if (!ignoreConflict && !autoMerge && localModifiedAt && remote.modifiedAt && isRemoteVersionNewer(remote.modifiedAt, localModifiedAt)) {
            return {
                synced: false,
                pending: true,
                conflict: true,
                connected: true,
                available: true,
                remoteModifiedAt: remote.modifiedAt,
                localModifiedAt,
                remoteEntries: parseKnowledgeWorkbookBuffer(remote.data, remote.modifiedAt),
                syncError: "Die Salesforce-Datei wurde inzwischen geändert. Die lokale Änderung wurde sicher gespeichert, aber noch nicht veröffentlicht."
            };
        }

        const buffer = (ignoreConflict || autoMerge) && mutation?.operation && remote.data
            ? mergeKnowledgeWorkbookBuffers(remote.data, localBuffer, mutation.operation, mutation.request)
            : localBuffer;
        await salesforce.uploadOpportunityFile(remote.opportunityId, {
            title: remote.title || process.env.SALESFORCE_KNOWLEDGE_FILE_TITLE || "FAQ-und-Technische-Daten",
            filename: `${remote.title || process.env.SALESFORCE_KNOWLEDGE_FILE_TITLE || "FAQ-und-Technische-Daten"}.xlsx`,
            data: buffer
        });
        const verified = await salesforce.downloadKnowledgeWorkbook();
        if (buffer && verified?.data) {
            importWorkbookBuffer(buffer, verified.modifiedAt ?? new Date().toISOString());
        }
        saveSalesforceLastModifiedAt(verified?.modifiedAt || new Date().toISOString());
        return {
            synced: true,
            pending: false,
            connected: true,
            available: true,
            remoteModifiedAt: verified?.modifiedAt || null
        };
    } catch (error) {
        if (isSalesforceAuthenticationError(error)) {
            return {
                synced: false,
                pending: true,
                connected: false,
                available: false,
                syncError: "Keine aktive Salesforce-Verbindung. Die Änderung wurde lokal gespeichert."
            };
        }
        return {
            synced: false,
            pending: true,
            connected: false,
            available: false,
            syncError: normalizeExternalError(error, "Die Änderung wurde lokal gespeichert, konnte aber nicht nach Salesforce übertragen werden.")
        };
    }
}

function archiveRecord(entryType, record, archivedAt = new Date().toISOString(), changedBy = "") {
    database.knowledgeArchive.prepare(`
        INSERT INTO knowledgeArchive (
            entryType, recordJson, archivedAt, createdAt, updatedAt, changeType, changedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        entryType,
        JSON.stringify(record),
        archivedAt,
        record.createdAt || record.updatedAt || archivedAt,
        record.updatedAt || archivedAt,
        "Archiviert",
        changedBy
    );
}

async function getKnowledgeActor() {
    try {
        return text(await salesforce.getCurrentUserDisplayName()) || "Salesforce-Benutzer";
    } catch {
        return "Salesforce-Benutzer";
    }
}

function requireText(value, fieldLabel) {
    const result = text(value);
    if (!result) throw new Error(`${fieldLabel} ist erforderlich.`);
    return result;
}

function getFaqPayload(body, existing = null, changedBy = "Salesforce-Benutzer") {
    const now = new Date().toISOString();
    return {
        externalId: text(body.externalId) || existing?.externalId || `faq-${randomUUID()}`,
        question: requireText(body.question, "Die Frage"),
        answer: requireText(body.answer, "Die Antwort"),
        category: text(body.category),
        articleReferences: text(body.articleReferences),
        deviceTypes: text(body.deviceTypes),
        tags: text(body.tags),
        source: text(body.source),
        active: normalizeActive(body.active ?? existing?.active ?? 1),
        sortOrder: numericValue(body.sortOrder, existing?.sortOrder ?? 0),
        createdAt: existing?.createdAt || text(body.createdAt) || now,
        updatedAt: now,
        changeType: existing ? "Bearbeitet" : "Neu",
        changedBy
    };
}

function getTechnicalPayload(body, existing = null, changedBy = "Salesforce-Benutzer") {
    const articleNumber = text(body.articleNumber);
    const deviceType = text(body.deviceType);
    if (!articleNumber && !deviceType) throw new Error("Artikelnummer oder Gerät ist erforderlich.");
    return {
        active: normalizeActive(body.active ?? existing?.active ?? 1),
        articleNumber,
        deviceType,
        category: text(body.category),
        parameter: requireText(body.parameter, "Das Merkmal"),
        value: requireText(body.value, "Der Wert"),
        unit: text(body.unit),
        source: text(body.source),
        notes: text(body.notes),
        createdAt: existing?.createdAt || text(body.createdAt) || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        changeType: existing ? "Bearbeitet" : "Neu",
        changedBy
    };
}

async function respondAfterLocalSave(res, result, { remote = undefined, force = false, autoMerge = false, mutation = null } = {}) {
    const sync = await synchronizeKnowledgeWorkbook({ remote, ignoreConflict: force, autoMerge, mutation });
    res.status(sync.conflict ? 409 : 200).json({
        success: true,
        saved: true,
        ...result,
        ...sync
    });
}

function getSearchValue(req) {
    return text(req.query.search).toLocaleLowerCase();
}

router.get("/", (req, res) => {
    const type = text(req.query.type).toLocaleLowerCase();
    const search = getSearchValue(req);
    const category = text(req.query.category);
    const article = text(req.query.article);

    if (type === "faq") {
        const rows = database.faqEntries.prepare(`
            SELECT * FROM faqEntries
            WHERE active = 1
              AND (@category = '' OR category = @category)
              AND (@article = '' OR articleReferences LIKE @article OR deviceTypes LIKE @article)
            ORDER BY datetime(COALESCE(updatedAt, createdAt)) DESC, id DESC
        `).all({ category, article: `%${article}%` });
        return res.json(rows.filter(row => !search || [
            row.question, row.answer, row.category, row.articleReferences,
            row.deviceTypes, row.tags, row.source
        ].some(value => text(value).toLocaleLowerCase().includes(search))));
    }

    if (type === "technical") {
        const rows = database.technicalData.prepare(`
            SELECT * FROM technicalData
            WHERE active = 1
              AND (@category = '' OR category = @category)
              AND (@article = '' OR articleNumber = @article OR deviceType = @article)
            ORDER BY articleNumber, deviceType, category, id
        `).all({ category, article });
        return res.json(rows.filter(row => !search || [
            row.articleNumber, row.deviceType, row.category, row.parameter,
            row.value, row.unit, row.source, row.notes
        ].some(value => text(value).toLocaleLowerCase().includes(search))));
    }

    res.status(400).json({ error: "type muss faq oder technical sein." });
});

router.get("/archive", (req, res) => {
    const rows = database.knowledgeArchive.prepare(`
        SELECT * FROM knowledgeArchive
        ORDER BY datetime(archivedAt) DESC, id DESC
    `).all().map(row => ({
        ...row,
        record: safeArchiveRecord(row)
    }));
    res.json(rows);
});

router.post("/archive/:id/restore", async (req, res) => {
    try {
        const preflight = await preflightKnowledgeMutation(req, "restore");
        if (preflight.conflict) {
            return respondWithKnowledgeConflict(res, preflight, "restore", req.body || {});
        }
        const archiveId = numericValue(req.params.id, 0);
        const archived = database.knowledgeArchive.prepare(
            "SELECT * FROM knowledgeArchive WHERE id = ?"
        ).get(archiveId);
        if (!archived) {
            return res.status(404).json({ success: false, error: "Archiv-Eintrag wurde nicht gefunden." });
        }

        const record = safeArchiveRecord(archived);
        const now = new Date().toISOString();
        const changedBy = await getKnowledgeActor();
        const transaction = database.knowledgeArchive.transaction(() => {
            if (archived.entryType === "faq") {
                requireText(record.question, "Die Frage");
                requireText(record.answer, "Die Antwort");
                database.faqEntries.prepare(`
                    INSERT INTO faqEntries (
                        externalId, question, answer, category, articleReferences, deviceTypes,
                        tags, source, active, sortOrder, createdAt, updatedAt, changeType, changedBy
                    ) VALUES (
                        @externalId, @question, @answer, @category, @articleReferences, @deviceTypes,
                        @tags, @source, 1, @sortOrder, @createdAt, @updatedAt, @changeType, @changedBy
                    )
                `).run({
                    externalId: record.externalId || `faq-${randomUUID()}`,
                    question: record.question,
                    answer: record.answer,
                    category: record.category || "",
                    articleReferences: record.articleReferences || "",
                    deviceTypes: record.deviceTypes || "",
                    tags: record.tags || "",
                    source: record.source || "",
                    sortOrder: numericValue(record.sortOrder, 0),
                    createdAt: record.createdAt || archived.createdAt || now,
                    updatedAt: now,
                    changeType: "Bearbeitet",
                    changedBy
                });
            } else {
                requireText(record.parameter, "Das Merkmal");
                requireText(record.value, "Der Wert");
                if (!text(record.articleNumber) && !text(record.deviceType)) {
                    throw new Error("Artikelnummer oder Gerät ist erforderlich.");
                }
                database.technicalData.prepare(`
                    INSERT INTO technicalData (
                        active, articleNumber, deviceType, category, parameter, value,
                        unit, source, notes, createdAt, updatedAt, changeType, changedBy
                    ) VALUES (
                        1, @articleNumber, @deviceType, @category, @parameter, @value,
                        @unit, @source, @notes, @createdAt, @updatedAt, @changeType, @changedBy
                    )
                `).run({
                    articleNumber: record.articleNumber || "",
                    deviceType: record.deviceType || "",
                    category: record.category || "",
                    parameter: record.parameter,
                    value: record.value,
                    unit: record.unit || "",
                    source: record.source || "",
                    notes: record.notes || "",
                    createdAt: record.createdAt || archived.createdAt || now,
                    updatedAt: now,
                    changeType: "Bearbeitet",
                    changedBy
                });
            }
            database.knowledgeArchive.prepare("DELETE FROM knowledgeArchive WHERE id = ?").run(archiveId);
        });
        transaction();
        await respondAfterLocalSave(res, { restoredArchiveId: archiveId, entryType: archived.entryType }, {
            remote: preflight.remote,
            force: preflight.forced
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || "Archiv-Eintrag konnte nicht wiederhergestellt werden." });
    }
});

router.post("/faq", async (req, res) => {
    try {
        const body = req.body || {};
        const payload = getFaqPayload(body, null, await getKnowledgeActor());
        const preflight = await preflightKnowledgeMutation(req, "faq");
        if (preflight.conflict) {
            return respondWithKnowledgeConflict(res, preflight, "faq", payload);
        }
        const insert = database.faqEntries.prepare(`
            INSERT INTO faqEntries (
                externalId, question, answer, category, articleReferences, deviceTypes,
                tags, source, active, sortOrder, createdAt, updatedAt
            ) VALUES (
                @externalId, @question, @answer, @category, @articleReferences, @deviceTypes,
                @tags, @source, @active, @sortOrder, @createdAt, @updatedAt
            )
        `);
        const result = insert.run(payload);
        await respondAfterLocalSave(res, { entryId: Number(result.lastInsertRowid) }, {
            remote: preflight.remote,
            force: preflight.forced,
            autoMerge: preflight.autoMerge,
            mutation: {
                operation: "faq",
                request: { ...payload, conflictChoices: body.conflictChoices || {} }
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || "FAQ konnte nicht gespeichert werden." });
    }
});

router.put("/faq/:id", async (req, res) => {
    try {
        let id = numericValue(req.params.id, 0);
        let existing = database.faqEntries.prepare("SELECT * FROM faqEntries WHERE id = ?").get(id);
        if (!existing && text(req.body?.externalId)) {
            existing = database.faqEntries.prepare("SELECT * FROM faqEntries WHERE externalId = ?").get(text(req.body.externalId));
            if (existing) id = Number(existing.id);
        }
        if (!existing) return res.status(404).json({ success: false, error: "FAQ-Eintrag wurde nicht gefunden." });
        const body = req.body || {};
        const payload = getFaqPayload(body, existing, await getKnowledgeActor());
        const preflight = await preflightKnowledgeMutation(req, "faq");
        if (preflight.conflict) {
            return respondWithKnowledgeConflict(res, preflight, "faq", { ...payload, id });
        }
        database.faqEntries.prepare(`
            UPDATE faqEntries SET
                externalId = @externalId,
                question = @question,
                answer = @answer,
                category = @category,
                articleReferences = @articleReferences,
                deviceTypes = @deviceTypes,
                tags = @tags,
                source = @source,
                active = @active,
                sortOrder = @sortOrder,
                createdAt = @createdAt,
                updatedAt = @updatedAt,
                changeType = @changeType,
                changedBy = @changedBy
            WHERE id = @id
        `).run({ ...payload, id });
        await respondAfterLocalSave(res, { entryId: id }, {
            remote: preflight.remote,
            force: preflight.forced,
            autoMerge: preflight.autoMerge,
            mutation: {
                operation: "faq",
                request: {
                    ...payload,
                    id,
                    conflictChoices: body.conflictChoices || {},
                    // The conflict check uses the browser's opening state to
                    // identify only fields changed by this browser. Keep the
                    // same baseline for the actual workbook merge as well.
                    baselineEntry: body.baselineEntry || null
                }
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || "FAQ konnte nicht gespeichert werden." });
    }
});

router.post("/technical/group", async (req, res) => {
    try {
        const rawEntries = Array.isArray(req.body?.entries) ? req.body.entries : [];
        const rawRemovedIds = Array.isArray(req.body?.removedIds)
            ? req.body.removedIds.map(id => numericValue(id, 0)).filter(Boolean)
            : [];
        const baselineEntries = Array.isArray(req.body?.baselineEntries) ? req.body.baselineEntries : [];
        const technicalRows = database.technicalData.prepare("SELECT * FROM technicalData").all();
        const technicalRowById = new Map(technicalRows.map(row => [Number(row.id), row]));
        const technicalSignature = entry => [entry?.articleNumber, entry?.deviceType, entry?.category, entry?.parameter, entry?.unit]
            .map(value => text(value).toLocaleLowerCase())
            .join("\u001f");
        const technicalRowBySignature = new Map(technicalRows.map(row => [
            technicalSignature(row),
            row
        ]));
        const baselineById = new Map(baselineEntries
            .filter(entry => numericValue(entry?.id, 0))
            .map(entry => [String(numericValue(entry.id, 0)), entry]));
        const resolveTechnicalId = id => {
            const normalizedId = numericValue(id, 0);
            const baseline = baselineById.get(String(normalizedId));
            const currentRow = technicalRowById.get(normalizedId);
            if (!normalizedId || (currentRow && (!baseline || technicalSignature(currentRow) === technicalSignature(baseline)))) {
                return normalizedId;
            }
            if (!baseline) return normalizedId;
            return Number(technicalRowBySignature.get(technicalSignature(baseline))?.id || normalizedId);
        };
        const entries = rawEntries.map(entry => ({
            ...entry,
            id: resolveTechnicalId(entry.id)
        }));
        const removedIds = rawRemovedIds.map(resolveTechnicalId).filter(Boolean);
        if (!entries.length && !removedIds.length) {
            throw new Error("Mindestens ein technisches Merkmal ist erforderlich.");
        }

        const preflight = await preflightKnowledgeMutation(req, "technical");
        if (preflight.conflict) {
            return respondWithKnowledgeConflict(res, preflight, "technical", {
                entries,
                removedIds
            });
        }

        const existingIds = [...new Set(entries.map(entry => numericValue(entry.id, 0)).filter(Boolean))];
        const allIds = [...new Set([...existingIds, ...removedIds])];
        const existingRows = allIds.length
            ? database.technicalData.prepare(`
                SELECT * FROM technicalData WHERE id IN (${allIds.map(() => "?").join(",")})
            `).all(...allIds)
            : [];
        const existingById = new Map(existingRows.map(row => [Number(row.id), row]));
        const now = new Date().toISOString();
        const changedBy = await getKnowledgeActor();
        const transaction = database.technicalData.transaction(() => {
            const savedIds = [];
            const update = database.technicalData.prepare(`
                UPDATE technicalData SET
                    active = @active,
                    articleNumber = @articleNumber,
                    deviceType = @deviceType,
                    category = @category,
                    parameter = @parameter,
                    value = @value,
                    unit = @unit,
                    source = @source,
                    notes = @notes,
                    createdAt = @createdAt,
                    updatedAt = @updatedAt,
                    changeType = @changeType,
                    changedBy = @changedBy
                WHERE id = @id
            `);
            const insert = database.technicalData.prepare(`
                INSERT INTO technicalData (
                    active, articleNumber, deviceType, category, parameter, value,
                    unit, source, notes, createdAt, updatedAt, changeType, changedBy
                ) VALUES (
                    @active, @articleNumber, @deviceType, @category, @parameter, @value,
                    @unit, @source, @notes, @createdAt, @updatedAt, @changeType, @changedBy
                )
            `);

            entries.forEach(entry => {
                const id = numericValue(entry.id, 0);
                const payload = getTechnicalPayload({ ...entry, updatedAt: now }, existingById.get(id), changedBy);
                payload.updatedAt = now;
                if (id && existingById.has(id)) {
                    update.run({ ...payload, id });
                    savedIds.push(id);
                } else {
                    savedIds.push(Number(insert.run(payload).lastInsertRowid));
                }
            });

            const archivedIds = new Set();
            removedIds.forEach(id => {
                if (archivedIds.has(id) || !existingById.has(id)) return;
                const row = existingById.get(id);
                archiveRecord("technical", row, now, changedBy);
                database.technicalData.prepare("DELETE FROM technicalData WHERE id = ?").run(id);
                archivedIds.add(id);
            });
            return savedIds;
        });
        const savedIds = transaction();
        await respondAfterLocalSave(res, { entryIds: savedIds }, {
            remote: preflight.remote,
            force: preflight.forced,
            autoMerge: preflight.autoMerge,
            mutation: { operation: "technical", request: req.body || {} }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || "Technische Daten konnten nicht gespeichert werden." });
    }
});

router.post("/archive", async (req, res) => {
    try {
        const entryType = text(req.body?.entryType).toLocaleLowerCase();
        const id = numericValue(req.body?.id, 0);
        if (!["faq", "technical"].includes(entryType) || !id) {
            throw new Error("Ungültiger Archiv-Eintrag.");
        }
        const preflight = await preflightKnowledgeMutation(req, "archive");
        if (preflight.conflict) {
            return respondWithKnowledgeConflict(res, preflight, "archive", req.body || {});
        }
        const table = entryType === "faq" ? database.faqEntries : database.technicalData;
        const row = table.prepare("SELECT * FROM " + (entryType === "faq" ? "faqEntries" : "technicalData") + " WHERE id = ?").get(id);
        if (!row) return res.status(404).json({ success: false, error: "Eintrag wurde nicht gefunden." });
        const changedBy = await getKnowledgeActor();
        const transaction = table.transaction(() => {
            archiveRecord(entryType, row, new Date().toISOString(), changedBy);
            table.prepare("DELETE FROM " + (entryType === "faq" ? "faqEntries" : "technicalData") + " WHERE id = ?").run(id);
        });
        transaction();
        await respondAfterLocalSave(res, { archivedId: id, entryType }, {
            remote: preflight.remote,
            force: preflight.forced
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || "Eintrag konnte nicht archiviert werden." });
    }
});

router.post("/salesforce-sync", async (req, res) => {
    const force = req.body?.force === true;
    try {
        const remote = await salesforce.downloadKnowledgeWorkbook();
        if (!remote) {
            return res.json({
                success: true,
                connected: true,
                available: false,
                updated: false
            });
        }
        if (!remote.available) {
            return res.json({
                success: true,
                connected: true,
                available: false,
                updated: false,
                opportunityId: remote.opportunityId,
                opportunityName: remote.opportunityName,
                accountName: remote.accountName
            });
        }

        const localModifiedAt = getSalesforceLastModifiedAt();
        const shouldImport = force || isRemoteVersionNewer(remote.modifiedAt, localModifiedAt);
        if (!shouldImport) {
            return res.json({
                success: true,
                connected: true,
                available: true,
                updated: false,
                upToDate: true,
                remoteModifiedAt: remote.modifiedAt,
                localModifiedAt,
                opportunityId: remote.opportunityId,
                opportunityName: remote.opportunityName,
                accountName: remote.accountName,
                title: remote.title
            });
        }

        const imported = importWorkbookBuffer(remote.data, remote.modifiedAt ?? new Date().toISOString());
        saveSalesforceLastModifiedAt(remote.modifiedAt ?? new Date().toISOString());
        return res.json({
            success: true,
            connected: true,
            available: true,
            updated: true,
            upToDate: true,
            remoteModifiedAt: remote.modifiedAt,
            localModifiedAt: remote.modifiedAt,
            opportunityId: remote.opportunityId,
            opportunityName: remote.opportunityName,
            accountName: remote.accountName,
            title: remote.title,
            ...imported
        });
    } catch (error) {
        if (isSalesforceAuthenticationError(error)) {
            return res.json({
                success: true,
                connected: false,
                available: false,
                updated: false
            });
        }
        res.status(502).json({
            success: false,
            error: normalizeExternalError(error, "Die FAQ-/Technik-Datei konnte aus Salesforce nicht aktualisiert werden.")
        });
    }
});

router.post("/import", upload.single("file"), (req, res) => {
    try {
        if (!req.file) throw new Error("Keine Excel-Datei ausgewählt.");
        const imported = importWorkbookBuffer(req.file.buffer);
        res.json({
            success: true,
            ...imported
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message || "Der Excel-Import ist fehlgeschlagen.",
            errors: error.details ?? undefined
        });
    }
});

export default router;
