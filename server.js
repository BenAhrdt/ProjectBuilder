import express from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import * as database from "./database/index.js";
import articlesRoutes from "./routes/articles.js";
import customersRouter from "./routes/customers.js";
import projectsRouter from "./routes/projects.js";
import projectNodesRouter from "./routes/projectNodes.js";
import projectNodeArticlesRouter from "./routes/projectNodeArticles.js";
import projectLabelsRouter from "./routes/projectLabels.js";
import projectArticleLabelsRouter from "./routes/projectArticleLabels.js";
import settingsRouter from "./routes/settings.js";
import backupsRouter from "./routes/backups.js";
import databaseRouter from "./routes/database.js";
import salesforceRouter from "./routes/salesforce.js";
import knowledgeRouter from "./routes/knowledge.js";
import { startAutomaticBackupScheduler } from "./utils/backup.js";
import { isLocalSessionAuthenticated, requireLocalSession } from "./utils/localAuth.js";
import { warmConnection as warmSalesforceConnection } from "./services/salesforce.js";
import { acquireDatabaseAccess } from "./database/config.js";

const app = express()

function isSalesforceStartupCheckEnabled() {
    try {
        return database.settings
            .prepare("SELECT value FROM settings WHERE key = ?")
            .get("app.checkSalesforceOnStartup")?.value !== "false";
    } catch {
        // A missing or unavailable setting must keep the historical default:
        // check Salesforce at startup.
        return true;
    }
}

// --------------------------------------------------
// __dirname für ES Modules
// --------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageVersion = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
).version

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(express.json({ limit: "5mb" }))

// --------------------------------------------------
// Frontend
// --------------------------------------------------

// Das zentrale Electron-/Windows-Icon ist auch für das Browser-Favicon
// erreichbar. Cache-Control verhindert, dass manuelle Icon-Änderungen im
// laufenden Entwicklungsserver verborgen bleiben.
app.get("/icon.png", (req, res) => {

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate")
    res.sendFile(path.join(__dirname, "icon.png"))

})

app.use(express.static(path.join(__dirname, "public")))

// --------------------------------------------------
// API
// --------------------------------------------------

// Datenbankprofile dürfen den exklusiven Wechsel-Endpunkt direkt bedienen.
// Alle anderen API-Anfragen erhalten einen kurzen Lese-/Schreibzugriffsschutz,
// damit ein Wechsel erst nach laufenden Autosaves oder Imports erfolgt.
app.get("/api/auth/session", (req, res) => {
    res.json({ authenticated: isLocalSessionAuthenticated(req) });
});

// Salesforce OAuth is the bootstrap for the local ProjectBuilder session.
// The login endpoint must remain reachable without an existing session;
// every other API endpoint requires the local session cookie.
app.use("/api", (req, res, next) => {
    const isPublicApiEndpoint = req.method === "GET"
        && ["/", "/version", "/changelog"].includes(req.path);
    const isSalesforceLoginEndpoint = req.method === "POST"
        && req.path === "/salesforce/login";
    if (isPublicApiEndpoint || isSalesforceLoginEndpoint) {
        next();
        return;
    }
    requireLocalSession(req, res, next);
});

app.use("/api/database", databaseRouter);

app.use("/api", async (req, res, next) => {
    let release;
    try {
        release = await acquireDatabaseAccess();
    } catch (error) {
        next(error);
        return;
    }

    let released = false;
    const releaseOnce = () => {
        if (released) return;
        released = true;
        release();
    };
    res.once("finish", releaseOnce);
    res.once("close", releaseOnce);

    try {
        next();
    } catch (error) {
        releaseOnce();
        next(error);
    }
});

app.get("/api", (req, res) => {

    res.json({
        status: "ProjectBuilder API läuft"
    })

})

app.get("/api/version", (req, res) => {
    res.json({ version: packageVersion })
})

app.get("/api/changelog", (req, res) => {
    const language = ["de", "en", "es"].includes(req.query.language)
        ? req.query.language
        : "de";
    const filename = language === "de" ? "CHANGELOG.md" : `CHANGELOG.${language}.md`;
    res.type("text/markdown").send(
        fs.readFileSync(path.join(__dirname, filename), "utf8")
    )
})

// --------------------------------------------------
// Artikel API
// --------------------------------------------------

app.use("/api/articles", articlesRoutes);


// --------------------------------------------------
// Customers API
// --------------------------------------------------

app.use(
    "/api/customers",
    customersRouter
);

// --------------------------------------------------
// Projekte API
// --------------------------------------------------

app.use(
    "/api/projects",
    projectsRouter
);

// --------------------------------------------------
// Nodes API
// --------------------------------------------------

app.use(
    "/api/projectNodes",
    projectNodesRouter
);

// --------------------------------------------------
// Project Nodes API
// --------------------------------------------------

app.use(
    "/api/projectNodeArticles",
    projectNodeArticlesRouter
);

app.use(
    "/api/projectNodeLabels",
    projectLabelsRouter
);
app.use(
    "/api/projectArticleLabels",
    projectArticleLabelsRouter
);

app.use("/api/settings", settingsRouter);
app.use("/api/backups", backupsRouter);
app.use("/api/salesforce", salesforceRouter);
app.use("/api/knowledge", knowledgeRouter);

// Unbekannte API-Endpunkte dürfen nicht in die SPA-Fallbackseite laufen.
// Andernfalls würde beispielsweise ein nicht geladener Export-Endpunkt als
// vermeintliche HTML-Datei heruntergeladen.
app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API-Endpunkt nicht gefunden"
    });
});

// --------------------------------------------------
// SPA Catch-All
// --------------------------------------------------

app.use((req, res) => {

    res.sendFile(path.join(__dirname, "public", "index.html"))

})

// --------------------------------------------------
// Start
// --------------------------------------------------

export function startServer({ port = 3000, host = "127.0.0.1" } = {}) {
    startAutomaticBackupScheduler();
    return new Promise((resolve, reject) => {
        const server = app.listen(port, host);
        const handleError = error => reject(error);

        server.once("error", handleError);
        server.once("listening", () => {
            const address = server.address();
            if (!address || typeof address !== "object") {
                reject(new Error("Der lokale ProjectBuilder-Server konnte keinen Port ermitteln."));
                return;
            }

            server.removeListener("error", handleError);
            server.projectBuilderPort = address.port;
            server.projectBuilderUrl = `http://127.0.0.1:${address.port}`;
            if (isSalesforceStartupCheckEnabled()) {
                warmSalesforceConnection().catch(() => {});
            }
            resolve(server);
        });
    });
}

const isDirectStart = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectStart) {
    const port = Number.parseInt(process.env.PORT ?? "3000", 10);
    const server = await startServer({ port });
    console.log(`Server läuft auf ${server.projectBuilderUrl}`);
}

export { app };
