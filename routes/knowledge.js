import express from "express";
import multer from "multer";
import XLSX from "xlsx";
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
            updatedAt
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
                updatedAt
            }));
            return;
        }

        const reserved = new Set([
            "artikelnummer", "artikel", "artikelmodell", "articlenumber", "article",
            "geraet", "geraetmodul", "geraetetyp", "device", "devicetype", "modell",
            "kategorie", "category", "bereich", "einheit", "unit", "quelle", "source", "link",
            "hinweis", "hinweise", "notiz", "notes", "bemerkung",
            "aktiv", "active", "status", "zuletztgeandert",
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
                updatedAt
            }));
        });
    });
    return { parsed, errors };
}

function replaceFaqEntries(rows) {
    database.faqEntries.prepare("DELETE FROM faqEntries").run();
    const insert = database.faqEntries.prepare(`
        INSERT INTO faqEntries (
            externalId, question, answer, category, articleReferences, deviceTypes,
            tags, source, active, sortOrder, updatedAt
        ) VALUES (
            @externalId, @question, @answer, @category, @articleReferences, @deviceTypes,
            @tags, @source, @active, @sortOrder, @updatedAt
        )
    `);
    rows.forEach(row => insert.run(row));
}

function replaceTechnicalData(rows) {
    database.technicalData.prepare("DELETE FROM technicalData").run();
    const insert = database.technicalData.prepare(`
        INSERT INTO technicalData (
            active, articleNumber, deviceType, category, parameter, value,
            unit, source, notes, updatedAt
        ) VALUES (
            @active, @articleNumber, @deviceType, @category, @parameter, @value,
            @unit, @source, @notes, @updatedAt
        )
    `);
    rows.forEach(row => insert.run(row));
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
    if (!faqSheet && !technicalSheet) {
        throw new Error("Die Excel-Datei benötigt ein Blatt FAQ oder Technische Daten.");
    }

    const faqResult = faqSheet ? parseFaqRows(rowsFromSheet(faqSheet), updatedAt) : { parsed: [], errors: [] };
    const technicalResult = technicalSheet ? parseTechnicalRows(rowsFromSheet(technicalSheet), updatedAt) : { parsed: [], errors: [] };
    const errors = [...faqResult.errors, ...technicalResult.errors];
    if (errors.length) {
        const error = new Error(errors.slice(0, 10).join("\n"));
        error.details = errors;
        throw error;
    }

    const replace = database.faqEntries.transaction(() => {
        if (faqSheet) replaceFaqEntries(faqResult.parsed);
        if (technicalSheet) replaceTechnicalData(technicalResult.parsed);
    });
    replace();

    return {
        faq: faqSheet ? faqResult.parsed.length : null,
        technical: technicalSheet ? technicalResult.parsed.length : null,
        replaced: {
            faq: Boolean(faqSheet),
            technical: Boolean(technicalSheet)
        }
    };
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
            ORDER BY sortOrder, id
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
