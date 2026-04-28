const express = require("express")
const cors = require("cors")

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get("/auth/me", (_req, res) => {
  res.status(401).json({
    success: false,
    error: "Unauthorized",
  })
})

app.post("/auth/login", (_req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: 1,
        name: "test",
      },
      accessToken: "test-token",
    },
  })
})

app.post("/auth/register", (_req, res) => {
  res.json({
    success: true,
  })
})

app.listen(PORT, () => {
  console.log(`Render API listening on port ${PORT}`)
})
