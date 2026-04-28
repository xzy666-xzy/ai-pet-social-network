const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET

function sendUnauthorized(res) {
  return res.status(401).json({
    success: false,
    error: "Unauthorized",
  })
}

function authMiddleware(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: "JWT_SECRET is not configured",
    })
  }

  const authHeader = req.headers.authorization || ""

  if (!authHeader.startsWith("Bearer ")) {
    return sendUnauthorized(res)
  }

  const token = authHeader.slice("Bearer ".length).trim()

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = {
      userId: payload.userId || payload.sub,
      tokenPayload: payload,
    }
    next()
  } catch {
    return sendUnauthorized(res)
  }
}

module.exports = authMiddleware
