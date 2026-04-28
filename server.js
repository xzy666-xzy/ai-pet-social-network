const express = require("express")
const cors = require("cors")
const { createHmac, timingSafeEqual } = require("node:crypto")

function requireFromWorkspace(moduleName) {
  try {
    return require(moduleName)
  } catch {
    return require(`./web/node_modules/${moduleName}`)
  }
}

const bcrypt = requireFromWorkspace("bcryptjs")
const { createClient } = requireFromWorkspace("@supabase/supabase-js")

const app = express()
const PORT = process.env.PORT || 3000
const SUPABASE_URL = process.env.SUPABASE_URL || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || ""
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ACCESS_TOKEN_SECRET) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ACCESS_TOKEN_SECRET"
  )
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
  })
)
app.use(express.json())

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8")
}

function signAccessToken(payload) {
  const header = { alg: "HS256", typ: "JWT" }
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + ACCESS_TOKEN_TTL_SECONDS
  const tokenPayload = { ...payload, iat, exp }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac("sha256", ACCESS_TOKEN_SECRET)
    .update(unsignedToken)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

  return `${unsignedToken}.${signature}`
}

function verifyAccessToken(token) {
  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid token")
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = createHmac("sha256", ACCESS_TOKEN_SECRET)
    .update(unsignedToken)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

  const actual = Buffer.from(encodedSignature)
  const expected = Buffer.from(expectedSignature)

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid signature")
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload))
  const now = Math.floor(Date.now() / 1000)

  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new Error("Token expired")
  }

  return payload
}

function getBearerToken(req) {
  const header = req.headers.authorization || ""
  if (!header.startsWith("Bearer ")) {
    return null
  }

  return header.slice("Bearer ".length).trim()
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

function sendUnauthorized(res) {
  return res.status(401).json({
    success: false,
    error: "Unauthorized",
  })
}

app.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase()
    const password = String(req.body?.password || "").trim()

    if (!email || !password) {
      return res.status(400).json({
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
      return sendUnauthorized(res)
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return sendUnauthorized(res)
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
    })

    return res.json({
      success: true,
      user: toSafeUser(user),
      access_token: accessToken,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    return res.status(500).json({
      success: false,
      error: message,
    })
  }
})

app.get("/auth/me", async (req, res) => {
  try {
    const accessToken = getBearerToken(req)
    if (!accessToken) {
      return sendUnauthorized(res)
    }

    const payload = verifyAccessToken(accessToken)
    const userId = String(payload.sub || "").trim()
    if (!userId) {
      return sendUnauthorized(res)
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
      return sendUnauthorized(res)
    }

    return res.json({
      success: true,
      user: toSafeUser(user),
    })
  } catch {
    return sendUnauthorized(res)
  }
})

app.post("/auth/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase()
    const password = String(req.body?.password || "").trim()
    const username = String(req.body?.username || "").trim()
    const petName = String(req.body?.pet_name || "").trim()
    const petType = String(req.body?.pet_type || "").trim()
    const petAge =
      req.body?.pet_age !== undefined && req.body?.pet_age !== null && req.body?.pet_age !== ""
        ? Number(req.body.pet_age)
        : null
    const description = String(req.body?.description || "").trim()

    if (!email || !password || !username || !petName || !petType) {
      return res.status(400).json({
        success: false,
        error: "email, password, username, pet_name and pet_type are required",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      })
    }

    if (petAge !== null && Number.isNaN(petAge)) {
      return res.status(400).json({
        success: false,
        error: "pet_age must be a number",
      })
    }

    const { data: existingEmailUser, error: emailError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (emailError) {
      throw emailError
    }

    if (existingEmailUser) {
      return res.status(409).json({
        success: false,
        error: "Email already exists",
      })
    }

    const { data: existingUsernameUser, error: usernameError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle()

    if (usernameError) {
      throw usernameError
    }

    if (existingUsernameUser) {
      return res.status(409).json({
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

    const accessToken = signAccessToken({
      sub: createdUser.id,
      email: createdUser.email,
    })

    return res.json({
      success: true,
      user: toSafeUser(createdUser),
      access_token: accessToken,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed"
    return res.status(500).json({
      success: false,
      error: message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`Render API listening on port ${PORT}`)
})
