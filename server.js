import express from "express"

const app = express()

app.use(express.json())

app.get("/api", (req, res) => {

    res.json({
        status: "ProjectBuilder API läuft"
    })

})

const PORT = 3000

app.listen(PORT, () => {

    console.log(`Server läuft auf Port ${PORT}`)

})