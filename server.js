import express from "express"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import * as database from "./database/index.js";
import articlesRoutes from "./routes/articles.js";
import customersRouter from "./routes/customers.js";
import projectsRouter from "./routes/projects.js";
import projectNodesRouter from "./routes/projectNodes.js";
import projectNodeArticlesRouter from "./routes/projectNodeArticles.js";
import settingsRouter from "./routes/settings.js";

const app = express()

// --------------------------------------------------
// __dirname für ES Modules
// --------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(express.json({ limit: "5mb" }))

// --------------------------------------------------
// Frontend
// --------------------------------------------------

app.use(express.static(path.join(__dirname, "public")))

// --------------------------------------------------
// API
// --------------------------------------------------

app.get("/api", (req, res) => {

    res.json({
        status: "ProjectBuilder API läuft"
    })

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

app.use("/api/settings", settingsRouter);

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
    return new Promise((resolve, reject) => {
        const server = app.listen(port, host, () => resolve(server));
        server.once("error", reject);
    });
}

const isDirectStart = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectStart) {
    const port = Number.parseInt(process.env.PORT ?? "3000", 10);
    const server = await startServer({ port });
    console.log(`Server läuft auf http://127.0.0.1:${server.address().port}`);
}

export { app };
