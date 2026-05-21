import express from "express"
import cors from "cors"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {

    res.json({
        status: "ProjectBuilder API läuft"
    })

})

const PORT = 3000

app.listen(PORT, () => {

    console.log(`Server läuft auf Port ${PORT}`)

})