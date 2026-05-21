import express from "express"
import path from "path"
import { fileURLToPath } from "url"

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
// SPA Catch-All
// --------------------------------------------------

app.use((req, res) => {

    res.sendFile(path.join(__dirname, "public", "index.html"))

})

// --------------------------------------------------
// Start
// --------------------------------------------------

const PORT = 3000

app.listen(PORT, () => {

    console.log(`Server läuft auf Port ${PORT}`)

})