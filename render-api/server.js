import { createServer } from "node:http"
import { createHmac, timingSafeEqual } from "node:crypto"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"

const PORT = Number(process.env.PORT || 3001)
const SUPABASE_URL = process.env.SUPABASE_URL || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || ""
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7)
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ACCESS_TOKEN_SECRET) {
  console.error(
    "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ACCESS_TOKEN_SECRET"
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN)
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
}

function sendJson(res, statusCode, body) {
  setCorsHeaders(res)
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" })
  res.end(JSON.stringify(body))
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8")
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" }
  const issuedAt = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload))
  const unsigned = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac("sha256", ACCESS_TOKEN_SECRET).update(unsigned).digest("base64")
  const encodedSignature = signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")

  return `${unsigned}.${encodedSignature}`
}

function verifyToken(token) {
  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid token")
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const unsigned = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = createHmac("sha256", ACCESS_TOKEN_SECRET)
    .update(unsigned)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

  const actual = Buffer.from(encodedSignature)
  const expected = Buffer.from(expectedSignature)

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid token signature")
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload))
  const now = Math.floor(Date.now() / 1000)

  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new Error("Token expired")
  }

  return payload
}

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email ?? null,
    username: user.username ?? null,
    pet_name: user.pet_name ?? null,
    pet_type: user.pet_type ?? null,
    pet_age: user.pet_age ?? null,
    description: user.description ?? null,
    avatar_url: user.avatar_url ?? null,
    created_at: user.created_at ?? null,
    updated_at: user.updated_at ?? null,
    is_ai: user.is_ai ?? false,
  }
}

async function parseJsonBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  const raw = Buffer.concat(chunks).toString("utf8")
  return raw ? JSON.parse(raw) : {}
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || ""
  if (!authorization.startsWith("Bearer ")) {
    return null
  }

  return authorization.slice("Bearer ".length).trim()
}

async function handleRegister(req, res) {
  try {
    const body = await parseJsonBody(req)

    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "").trim()
    const username = String(body.username || "").trim()
    const petName = String(body.pet_name || "").trim()
    const petType = String(body.pet_type || "").trim()
    const petAge =
      body.pet_age !== undefined && body.pet_age !== null && body.pet_age !== ""
        ? Number(body.pet_age)
        : null
    const description = String(body.description || "").trim()

    if (!email || !password || !username || !petName || !petType) {
      return sendJson(res, 400, {
        success: false,
        error: "email, password, username, pet_name and pet_type are required",
      })
    }

    if (password.length < 6) {
      return sendJson(res, 400, {
        success: false,
        error: "Password must be at least 6 characters",
      })
    }

    if (petAge !== null && Number.isNaN(petAge)) {
      return sendJson(res, 400, {
        success: false,
        error: "pet_age must be a number",
      })
    }

    const { data: emailUser, error: emailError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (emailError) {
      throw emailError
    }

    if (emailUser) {
      return sendJson(res, 409, {
        success: false,
        error: "Email already exists",
      })
    }

    const { data: usernameUser, error: usernameError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle()

    if (usernameError) {
      throw usernameError
    }

    if (usernameUser) {
      return sendJson(res, 409, {
        success: false,
        error: "Username already exists",
      })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const { data: createdUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        username,
        pet_name: petName,
        pet_type: petType,
        pet_age: petAge,
        description,
      })
      .select("*")
      .single()

    if (insertError) {
      throw insertError
    }

    const safeUser = toSafeUser(createdUser)
    const accessToken = signToken({ sub: createdUser.id, email: createdUser.email })

    return sendJson(res, 200, {
      success: true,
      data: {
        user: safeUser,
        accessToken,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed"
    return sendJson(res, 500, { success: false, error: message })
  }
}

async function handleLogin(req, res) {
  try {
    const body = await parseJsonBody(req)
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "").trim()

    if (!email || !password) {
      return sendJson(res, 400, {
        success: false,
        error: "email and password are required",
      })
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!user || !user.password_hash) {
      return sendJson(res, 401, {
        success: false,
        error: "Invalid email or password",
      })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return sendJson(res, 401, {
        success: false,
        error: "Invalid email or password",
      })
    }

    const safeUser = toSafeUser(user)
    const accessToken = signToken({ sub: user.id, email: user.email })

    return sendJson(res, 200, {
      success: true,
      data: {
        user: safeUser,
        accessToken,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    return sendJson(res, 500, { success: false, error: message })
  }
}

async function handleMe(req, res) {
  try {
    const accessToken = getBearerToken(req)

    if (!accessToken) {
      return sendJson(res, 401, {
        success: false,
        error: "Missing access token",
      })
    }

    const payload = verifyToken(accessToken)
    const userId = String(payload.sub || "").trim()

    if (!userId) {
      return sendJson(res, 401, {
        success: false,
        error: "Invalid access token",
      })
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!user) {
      return sendJson(res, 401, {
        success: false,
        error: "User not found",
      })
    }

    return sendJson(res, 200, {
      success: true,
      data: {
        user: toSafeUser(user),
        accessToken,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized"
    return sendJson(res, 401, { success: false, error: message })
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`)

  if (req.method === "OPTIONS") {
    setCorsHeaders(res)
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === "POST" && url.pathname === "/auth/register") {
    await handleRegister(req, res)
    return
  }

  if (req.method === "POST" && url.pathname === "/auth/login") {
    await handleLogin(req, res)
    return
  }

  if (req.method === "GET" && url.pathname === "/auth/me") {
    await handleMe(req, res)
    return
  }

  sendJson(res, 404, {
    success: false,
    error: "Not found",
  })
})

server.listen(PORT, () => {
  console.log(`Render API listening on port ${PORT}`)
})
