const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const { createClient } = require("@supabase/supabase-js")
const authMiddleware = require("./middleware/auth")

const app = express()

const PORT = process.env.PORT || 3000
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const JWT_SECRET = process.env.JWT_SECRET
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET) {
  throw new Error(
      "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET"
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
      credentials: false,
    })
)

app.use(express.json())

function createAccessToken(user) {
  return jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
  )
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

function toDataResponse(res, data) {
  return res.json({
    success: true,
    data,
  })
}

async function getCurrentUserById(userId) {
  if (!userId) {
    return null
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return user
}

async function getActiveMembership(userId) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`end_at.is.null,end_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getLikeQuota(userId) {
  const membership = await getActiveMembership(userId)

  if (membership) {
    return {
      isMember: true,
      dailyLimit: -1,
      remainingLikes: -1,
      unlocked: true,
    }
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("from_user_id", userId)
    .gte("created_at", todayStart.toISOString())

  if (error) {
    throw error
  }

  const dailyLimit = 20
  const used = count ?? 0

  return {
    isMember: false,
    dailyLimit,
    remainingLikes: Math.max(0, dailyLimit - used),
    unlocked: false,
  }
}

async function activateMembership(userId, days, plan = "monthly") {
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + days)

  const existingMembership = await getActiveMembership(userId)

  if (existingMembership) {
    const { data, error } = await supabase
      .from("memberships")
      .update({
        plan_type: plan,
        status: "active",
        start_at: now.toISOString(),
        end_at: endDate.toISOString(),
      })
      .eq("id", existingMembership.id)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return data
  }

  const { data, error } = await supabase
    .from("memberships")
    .insert({
      user_id: userId,
      plan_type: plan,
      status: "active",
      start_at: now.toISOString(),
      end_at: endDate.toISOString(),
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

async function hasLiked(fromUserId, toUserId) {
  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("from_user_id", fromUserId)
    .eq("to_user_id", toUserId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

async function getOrCreateConversation(currentUserId, targetUserId) {
  const user1Id = currentUserId < targetUserId ? currentUserId : targetUserId
  const user2Id = currentUserId < targetUserId ? targetUserId : currentUserId

  const { data: existingConversation, error: existingError } = await supabase
    .from("conversations")
    .select("*")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existingConversation) {
    return existingConversation
  }

  const { data: conversation, error: insertError } = await supabase
    .from("conversations")
    .insert({
      user1_id: user1Id,
      user2_id: user2Id,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (insertError) {
    throw insertError
  }

  return conversation
}

function buildMatchReasons(currentUser, candidate) {
  const reasons = []

  if (currentUser.pet_type && candidate.pet_type && currentUser.pet_type === candidate.pet_type) {
    reasons.push("Same pet type")
  }

  if (
    typeof currentUser.pet_age === "number" &&
    typeof candidate.pet_age === "number" &&
    Math.abs(currentUser.pet_age - candidate.pet_age) <= 2
  ) {
    reasons.push("Similar pet age")
  }

  if (reasons.length === 0) {
    reasons.push("New nearby profile")
  }

  return reasons
}

function buildMatchScore(currentUser, candidate) {
  let score = 70

  if (currentUser.pet_type && candidate.pet_type && currentUser.pet_type === candidate.pet_type) {
    score += 15
  }

  if (
    typeof currentUser.pet_age === "number" &&
    typeof candidate.pet_age === "number"
  ) {
    const ageDiff = Math.abs(currentUser.pet_age - candidate.pet_age)
    score += Math.max(0, 10 - ageDiff * 2)
  }

  if (candidate.is_ai) {
    score += 5
  }

  return Math.max(60, Math.min(98, Math.round(score)))
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WePet Render API is running",
  })
})

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
  })
})

app.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase()
    const password = String(req.body?.password || "")

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      })
    }

    const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle()

    if (error) throw error

    if (!user || !user.password_hash) {
      return sendUnauthorized(res)
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return sendUnauthorized(res)
    }

    const accessToken = createAccessToken(user)

    return res.json({
      success: true,
      token: accessToken,
      user: toSafeUser(user),
    })
  } catch (error) {
    console.error("Login error:", error)

    return res.status(500).json({
      success: false,
      error: "Login failed",
    })
  }
})

app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      })
    }

    const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

    if (error) throw error

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      })
    }

    return res.json({
      success: true,
      user: toSafeUser(user),
    })
  } catch (error) {
    console.error("Auth me error:", error)

    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    })
  }
})

app.post("/auth/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase()
    const password = String(req.body?.password || "")
    const username = String(req.body?.username || "").trim()
    const petName = String(req.body?.pet_name || "").trim()
    const petType = String(req.body?.pet_type || "").trim()
    const description = String(req.body?.description || "").trim()

    const petAge =
        req.body?.pet_age !== undefined &&
        req.body?.pet_age !== null &&
        req.body?.pet_age !== ""
            ? Number(req.body.pet_age)
            : null

    if (!email || !password || !username || !petName || !petType) {
      return res.status(400).json({
        success: false,
        error: "Email, password, username, pet_name and pet_type are required",
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

    const { data: existingUser, error: existingError } = await supabase
        .from("users")
        .select("id")
        .or(`email.eq.${email},username.eq.${username}`)
        .maybeSingle()

    if (existingError) throw existingError

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "Email or username already exists",
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

    if (insertError) throw insertError

    const accessToken = createAccessToken(createdUser)

    return res.json({
      success: true,
      token: accessToken,
      user: toSafeUser(createdUser),
    })
  } catch (error) {
    console.error("Register error:", error)

    return res.status(500).json({
      success: false,
      error: "Registration failed",
    })
  }
})

app.get("/match/recommend", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .neq("id", currentUser.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    const recommendations = (users || [])
      .map((candidate) => ({
        ...toSafeUser(candidate),
        matchScore: buildMatchScore(currentUser, candidate),
        matchReasons: buildMatchReasons(currentUser, candidate),
      }))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))

    return toDataResponse(res, {
      users: recommendations,
    })
  } catch (error) {
    console.error("Match recommend error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load recommended users",
    })
  }
})

app.post("/match/like", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const targetUserId = String(req.body?.targetUserId || "").trim()

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "targetUserId is required",
      })
    }

    if (String(currentUser.id) === targetUserId) {
      return res.status(400).json({
        success: false,
        error: "You cannot like yourself",
      })
    }

    const targetUser = await getCurrentUserById(targetUserId)

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "Target user not found",
      })
    }

    const quota = await getLikeQuota(String(currentUser.id))

    if (!quota.unlocked && quota.remainingLikes <= 0) {
      return res.status(403).json({
        success: false,
        error: "Daily like limit reached",
        code: "MEMBERSHIP_REQUIRED",
      })
    }

    const alreadyLiked = await hasLiked(String(currentUser.id), targetUserId)
    const conversation = await getOrCreateConversation(String(currentUser.id), targetUserId)

    if (alreadyLiked) {
      const latestQuota = await getLikeQuota(String(currentUser.id))

      return toDataResponse(res, {
        alreadyLiked: true,
        isMutualMatch: false,
        conversation,
        remainingLikes: latestQuota.remainingLikes,
      })
    }

    const { data: like, error } = await supabase
      .from("likes")
      .insert({
        from_user_id: currentUser.id,
        to_user_id: targetUserId,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single()

    if (error) {
      throw error
    }

    const isMutualMatch = await hasLiked(targetUserId, String(currentUser.id))
    const latestQuota = await getLikeQuota(String(currentUser.id))

    return toDataResponse(res, {
      alreadyLiked: false,
      isMutualMatch,
      like,
      conversation,
      remainingLikes: latestQuota.remainingLikes,
    })
  } catch (error) {
    console.error("Match like error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to like user",
    })
  }
})

app.get("/match/likes/today", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const quota = await getLikeQuota(String(currentUser.id))

    return toDataResponse(res, quota)
  } catch (error) {
    console.error("Like quota error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load like quota",
    })
  }
})

app.get("/profile/stats", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const [likesSentResult, likesReceivedResult, conversationsResult, membership] =
      await Promise.all([
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("from_user_id", currentUserId),
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("to_user_id", currentUserId),
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`),
        getActiveMembership(currentUserId),
      ])

    if (likesSentResult.error) throw likesSentResult.error
    if (likesReceivedResult.error) throw likesReceivedResult.error
    if (conversationsResult.error) throw conversationsResult.error

    return toDataResponse(res, {
      stats: {
        likesSent: likesSentResult.count ?? 0,
        likesReceived: likesReceivedResult.count ?? 0,
        conversations: conversationsResult.count ?? 0,
      },
      membership: membership
        ? {
            isActive: true,
            planName: membership.plan_type ?? null,
            expiresAt: membership.end_at ?? null,
            startedAt: membership.start_at ?? null,
          }
        : {
            isActive: false,
            planName: null,
            expiresAt: null,
            startedAt: null,
          },
    })
  } catch (error) {
    console.error("Profile stats error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load profile stats",
    })
  }
})

app.post("/membership/checkout", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const plan = req.body?.plan === "yearly" ? "yearly" : "monthly"
    const days = plan === "yearly" ? 365 : 30

    const membership = await activateMembership(String(currentUser.id), days, plan)
    const quota = await getLikeQuota(String(currentUser.id))

    return toDataResponse(res, {
      membership,
      quota,
    })
  } catch (error) {
    console.error("Membership checkout error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to activate membership",
    })
  }
})

app.listen(PORT, () => {
  console.log(`Render API listening on port ${PORT}`)
})
