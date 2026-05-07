const fs = require("fs")
const path = require("path")
const { randomUUID } = require("crypto")
const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const { createClient } = require("@supabase/supabase-js")
const OpenAI = require("openai")
const authMiddleware = require("./middleware/auth")

const envPath = path.join(__dirname, ".env")
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

const app = express()

const PORT = process.env.PORT || 3000
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const JWT_SECRET = process.env.JWT_SECRET
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"
const DEFAULT_DAILY_LIKE_LIMIT = 3
const MEMBER_DAILY_LIKE_LIMIT = 999
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.2"

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
const supabaseAdmin = supabase

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
    cover_url: user.cover_url ?? null,
    city: user.city ?? null,
    city_lat: user.city_lat ?? null,
    city_lng: user.city_lng ?? null,
    last_seen: user.last_seen ?? null,
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

function toFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function calculateDistanceKm(fromLat, fromLng, toLat, toLng) {
  const lat1 = toFiniteNumber(fromLat)
  const lng1 = toFiniteNumber(fromLng)
  const lat2 = toFiniteNumber(toLat)
  const lng2 = toFiniteNumber(toLng)

  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(earthRadiusKm * c * 10) / 10
}

const STATIC_EVENT_PEOPLE = {
  "1": 12,
  "2": 8,
  "3": 6,
}

const eventParticipationState = new Map()

function getEventParticipationState(eventId, currentPeople = 0, maxPeople = null) {
  if (!eventParticipationState.has(eventId)) {
    eventParticipationState.set(eventId, {
      currentPeople,
      maxPeople,
      participants: new Set(),
    })
  }

  return eventParticipationState.get(eventId)
}

function isMissingEventsTableError(error) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("Could not find the table 'public.events'")
  )
}

async function listEventsWithOrganizers() {
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("time", { ascending: true })

  if (error) {
    throw error
  }

  const organizerIds = [...new Set((events || []).map((event) => event.organizer_id).filter(Boolean))]
  const organizersById = new Map()

  if (organizerIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, pet_name, username, email, city, city_lat, city_lng")
      .in("id", organizerIds)

    if (usersError) {
      throw usersError
    }

    ;(users || []).forEach((user) => {
      organizersById.set(user.id, user)
    })
  }

  return (events || []).map((event) => {
    const organizer = organizersById.get(event.organizer_id)

    return {
      ...event,
      organizer_name: organizer?.pet_name || organizer?.username || organizer?.email || null,
      city: event.city ?? organizer?.city ?? null,
      city_lat: event.city_lat ?? organizer?.city_lat ?? null,
      city_lng: event.city_lng ?? organizer?.city_lng ?? null,
    }
  })
}

async function getEventWithOrganizer(eventId) {
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!event) {
    return null
  }

  let organizerName = null

  if (event.organizer_id) {
    const { data: organizer, error: organizerError } = await supabase
      .from("users")
      .select("pet_name, username, email")
      .eq("id", event.organizer_id)
      .maybeSingle()

    if (organizerError) {
      throw organizerError
    }

    organizerName = organizer?.pet_name || organizer?.username || organizer?.email || null
  }

  return {
    ...event,
    organizer_name: organizerName,
  }
}

function getOpenAIClient() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing")
  }

  return new OpenAI({ apiKey: OPENAI_API_KEY })
}

const GENERAL_SYSTEM_PROMPT = `
You are WePet AI Assistant, a friendly pet social app assistant.
Reply in the same language as the user.
Keep responses concise and mobile-friendly.
`

const DOCTOR_CHAT_SYSTEM_PROMPT = `
You are WePet AI Pet Doctor assistant.
Reply in the same language as the user.
Provide only preliminary pet health guidance.
If the user describes severe symptoms like seizures, trouble breathing, heavy bleeding, or inability to stand, clearly advise immediate in-person veterinary care.
Keep answers concise and easy to read in chat.
`

function buildConversationInput(systemPrompt, history, message) {
  const historyText =
    Array.isArray(history) && history.length > 0
      ? history
          .slice(-12)
          .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n")
      : ""

  return `${systemPrompt}

Conversation:
${historyText}

User: ${message}`
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
      dailyLimit: MEMBER_DAILY_LIKE_LIMIT,
      remainingLikes: MEMBER_DAILY_LIKE_LIMIT,
      limit: MEMBER_DAILY_LIKE_LIMIT,
      remaining: MEMBER_DAILY_LIKE_LIMIT,
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

  const dailyLimit = DEFAULT_DAILY_LIKE_LIMIT
  const used = count ?? 0
  const remaining = Math.max(0, dailyLimit - used)

  return {
    isMember: false,
    dailyLimit,
    remainingLikes: remaining,
    limit: dailyLimit,
    remaining,
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

async function getConversationById(conversationId) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getConversationMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

async function createMessage(conversationId, senderId, content) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

async function getConversationAccess(conversationId, currentUserId) {
  const conversation = await getConversationById(conversationId)

  if (!conversation) {
    return null
  }

  const otherUserId =
    conversation.user1_id === currentUserId
      ? conversation.user2_id
      : conversation.user2_id === currentUserId
        ? conversation.user1_id
        : null

  if (!otherUserId) {
    return null
  }

  const likedByMe = await hasLiked(currentUserId, otherUserId)
  const likedMe = await hasLiked(otherUserId, currentUserId)
  const isMatch = likedByMe && likedMe

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("sender_id", currentUserId)

  if (error) {
    throw error
  }

  const sentCount = count || 0
  const singleMessageUsedByMe = sentCount >= 1
  const canSendUnlimited = isMatch
  const canSendOneIntroMessage = likedByMe && !isMatch && !singleMessageUsedByMe
  const canSendMessage = canSendUnlimited || canSendOneIntroMessage

  return {
    conversation_id: conversationId,
    current_user_id: currentUserId,
    other_user_id: otherUserId,
    liked_by_me: likedByMe,
    liked_me: likedMe,
    is_match: isMatch,
    single_message_used_by_me: singleMessageUsedByMe,
    can_send_unlimited: canSendUnlimited,
    can_send_one_intro_message: canSendOneIntroMessage,
    can_send_message: canSendMessage,
  }
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

    const now = new Date().toISOString()
    const { data: user, error } = await supabase
        .from("users")
        .update({
          last_seen: now,
        })
        .eq("id", userId)
        .select("*")
        .single()

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
    const avatar_url = String(req.body?.avatar_url || "").trim()
    const city = String(req.body?.city || "").trim()

    const petAge =
        req.body?.pet_age !== undefined &&
        req.body?.pet_age !== null &&
        req.body?.pet_age !== ""
            ? Number(req.body.pet_age)
            : null
    const cityLat =
        req.body?.city_lat !== undefined &&
        req.body?.city_lat !== null &&
        req.body?.city_lat !== ""
            ? Number(req.body.city_lat)
            : null
    const cityLng =
        req.body?.city_lng !== undefined &&
        req.body?.city_lng !== null &&
        req.body?.city_lng !== ""
            ? Number(req.body.city_lng)
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

    if ((cityLat !== null && Number.isNaN(cityLat)) || (cityLng !== null && Number.isNaN(cityLng))) {
      return res.status(400).json({
        success: false,
        error: "city_lat and city_lng must be numbers",
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
          avatar_url: avatar_url || null,
          city: city || null,
          city_lat: cityLat,
          city_lng: cityLng,
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

    const { data: likedRows, error: likedError } = await supabase
      .from("likes")
      .select("to_user_id")
      .eq("from_user_id", currentUser.id)

    if (likedError) {
      throw likedError
    }

    const likedUserIds = new Set((likedRows || []).map((item) => String(item.to_user_id)))

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .neq("id", currentUser.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    const candidateIds = (users || []).map((candidate) => String(candidate.id))
    const now = new Date().toISOString()
    let activeMembershipUserIds = new Set()

    if (candidateIds.length > 0) {
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select("user_id")
        .in("user_id", candidateIds)
        .eq("status", "active")
        .or(`end_at.is.null,end_at.gt.${now}`)

      if (membershipError) {
        throw membershipError
      }

      activeMembershipUserIds = new Set((memberships || []).map((item) => String(item.user_id)))
    }

    const recommendations = (users || [])
      .filter((candidate) => !likedUserIds.has(String(candidate.id)))
      .map((candidate) => {
        const distanceKm = calculateDistanceKm(
          currentUser.city_lat,
          currentUser.city_lng,
          candidate.city_lat,
          candidate.city_lng
        )

        return {
          ...toSafeUser(candidate),
          membership_active: activeMembershipUserIds.has(String(candidate.id)),
          matchScore: buildMatchScore(currentUser, candidate),
          matchReasons: buildMatchReasons(currentUser, candidate),
          distance_km: distanceKm,
        }
      })
      .sort((a, b) => {
        const scoreDiff = (b.matchScore ?? 0) - (a.matchScore ?? 0)

        if (Math.abs(scoreDiff) > 5) {
          return scoreDiff
        }

        const aDistance = a.distance_km ?? Number.POSITIVE_INFINITY
        const bDistance = b.distance_km ?? Number.POSITIVE_INFINITY

        if (aDistance !== bDistance) {
          return aDistance - bDistance
        }

        return scoreDiff
      })

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
        error: "LIMIT_REACHED",
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
        dailyLikeLimit: latestQuota.dailyLimit,
        quota: latestQuota,
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
      dailyLikeLimit: latestQuota.dailyLimit,
      quota: latestQuota,
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

app.put("/profile", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const updates = {
      updated_at: new Date().toISOString(),
    }

    if (req.body?.username !== undefined) {
      updates.username = String(req.body.username).trim() || null
    }

    if (req.body?.pet_name !== undefined) {
      updates.pet_name = String(req.body.pet_name).trim() || null
    }

    if (req.body?.pet_type !== undefined) {
      updates.pet_type = String(req.body.pet_type).trim() || null
    }

    if (req.body?.pet_age !== undefined) {
      updates.pet_age =
        req.body.pet_age !== null && String(req.body.pet_age).trim() !== ""
          ? Number(req.body.pet_age)
          : null

      if (updates.pet_age !== null && Number.isNaN(updates.pet_age)) {
        return res.status(400).json({
          success: false,
          error: "pet_age must be a number",
        })
      }
    }

    if (req.body?.description !== undefined) {
      updates.description = String(req.body.description).trim() || null
    }

    if (req.body?.avatar_url !== undefined) {
      updates.avatar_url = String(req.body.avatar_url).trim() || null
    }

    if (req.body?.cover_url !== undefined) {
      updates.cover_url = String(req.body.cover_url).trim() || null
    }

    if (req.body?.city !== undefined) {
      updates.city = String(req.body.city).trim() || null
    }

    if (req.body?.city_lat !== undefined) {
      updates.city_lat =
        req.body.city_lat !== null && String(req.body.city_lat).trim() !== ""
          ? Number(req.body.city_lat)
          : null

      if (updates.city_lat !== null && Number.isNaN(updates.city_lat)) {
        return res.status(400).json({
          success: false,
          error: "city_lat must be a number",
        })
      }
    }

    if (req.body?.city_lng !== undefined) {
      updates.city_lng =
        req.body.city_lng !== null && String(req.body.city_lng).trim() !== ""
          ? Number(req.body.city_lng)
          : null

      if (updates.city_lng !== null && Number.isNaN(updates.city_lng)) {
        return res.status(400).json({
          success: false,
          error: "city_lng must be a number",
        })
      }
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", currentUserId)
      .select("*")
      .maybeSingle()

    if (error) throw error

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    return toDataResponse(res, toSafeUser(updatedUser))
  } catch (error) {
    console.error("Profile update error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
    })
  }
})

app.get("/events", async (req, res) => {
  try {
    const events = await listEventsWithOrganizers()

    return toDataResponse(res, events)
  } catch (error) {
    console.error("List events error:", error)

    if (isMissingEventsTableError(error)) {
      return toDataResponse(res, [])
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list events",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.get("/events/:id", async (req, res) => {
  try {
    const event = await getEventWithOrganizer(String(req.params.id || "").trim())

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      })
    }

    return toDataResponse(res, event)
  } catch (error) {
    console.error("Get event error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get event",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.put("/events/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const eventId = String(req.params.id || "").trim()

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "Event id is required",
      })
    }

    const existingEvent = await getEventWithOrganizer(eventId)

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      })
    }

    if (String(existingEvent.organizer_id) !== String(currentUser.id)) {
      return res.status(403).json({
        success: false,
        error: "Only the event organizer can update this event",
      })
    }

    const updates = {}

    if (req.body?.title !== undefined) {
      const title = String(req.body.title || "").trim()

      if (!title) {
        return res.status(400).json({
          success: false,
          error: "title is required",
        })
      }

      updates.title = title
    }

    if (req.body?.image_url !== undefined) {
      const imageUrl = String(req.body.image_url || "").trim()
      updates.image_url = imageUrl || null
    }

    if (req.body?.time !== undefined) {
      const time = String(req.body.time || "").trim()

      if (!time) {
        return res.status(400).json({
          success: false,
          error: "time is required",
        })
      }

      updates.time = time
    }

    if (req.body?.max_people !== undefined) {
      const maxPeople = Number(req.body.max_people)
      updates.max_people = Number.isFinite(maxPeople) ? maxPeople : null
    }

    if (req.body?.description !== undefined) {
      const description = String(req.body.description || "").trim()
      updates.description = description || null
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No event fields to update",
      })
    }

    const { error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", eventId)

    if (error) {
      console.error("Update event Supabase error:", error)

      return res.status(500).json({
        success: false,
        error: error.message || "Failed to update event",
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
    }

    const updatedEvent = await getEventWithOrganizer(eventId)

    return toDataResponse(res, updatedEvent)
  } catch (error) {
    console.error("Update event error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update event",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.post("/events", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const title = String(req.body?.title || "").trim()
    const imageUrl = String(req.body?.image_url || "").trim()
    const time = String(req.body?.time || "").trim()
    const maxPeople = Number(req.body?.max_people)
    const description = String(req.body?.description || "").trim()
    const organizerId = String(req.body?.organizer_id || "").trim()
    const lat = Number(req.body?.lat)
    const lng = Number(req.body?.lng)

    if (!title || !time || !organizerId || organizerId !== String(currentUser.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid event data",
      })
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        id: randomUUID(),
        title,
        image_url: imageUrl || null,
        time,
        max_people: Number.isFinite(maxPeople) ? maxPeople : null,
        current_people: 0,
        description: description || null,
        organizer_id: organizerId,
        city: currentUser.city || null,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Create event Supabase error:", error)

      return res.status(500).json({
        success: false,
        error: error.message || "Failed to create event",
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
    }

    return toDataResponse(res, event)
  } catch (error) {
    console.error("Create event error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create event",
    })
  }
})

app.post("/events/join", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const eventId = String(req.body?.event_id || req.body?.eventId || "").trim()

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "event_id is required",
      })
    }

    const userId = String(currentUser.id)
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError) {
      if (!isMissingEventsTableError(eventError)) {
        throw eventError
      }
    }

    if (!event && STATIC_EVENT_PEOPLE[eventId] === undefined) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      })
    }

    const currentPeople = event ? Number(event.current_people || 0) : STATIC_EVENT_PEOPLE[eventId]
    const maxPeople = event?.max_people == null ? null : Number(event.max_people)
    const state = getEventParticipationState(eventId, currentPeople, maxPeople)

    if (state.participants.has(userId)) {
      return toDataResponse(res, {
        ...(event || { id: eventId }),
        current_people: state.currentPeople,
        joined: true,
      })
    }

    if (Number.isFinite(state.maxPeople) && state.currentPeople >= state.maxPeople) {
      return res.status(400).json({
        success: false,
        error: "Event is full",
      })
    }

    const nextPeople = state.currentPeople + 1

    if (!event) {
      state.participants.add(userId)
      state.currentPeople = nextPeople

      return toDataResponse(res, {
        id: eventId,
        current_people: state.currentPeople,
        joined: true,
      })
    }

    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        current_people: nextPeople,
      })
      .eq("id", eventId)
      .select("*")
      .single()

    if (updateError) {
      throw updateError
    }

    state.participants.add(userId)
    state.currentPeople = Number(updatedEvent.current_people || nextPeople)

    return toDataResponse(res, {
      ...updatedEvent,
      joined: true,
    })
  } catch (error) {
    console.error("Join event error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to join event",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.post("/events/leave", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const eventId = String(req.body?.event_id || req.body?.eventId || "").trim()

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "event_id is required",
      })
    }

    const userId = String(currentUser.id)
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError) {
      if (!isMissingEventsTableError(eventError)) {
        throw eventError
      }
    }

    if (!event && STATIC_EVENT_PEOPLE[eventId] === undefined) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      })
    }

    const currentPeople = event ? Number(event.current_people || 0) : STATIC_EVENT_PEOPLE[eventId]
    const maxPeople = event?.max_people == null ? null : Number(event.max_people)
    const state = getEventParticipationState(eventId, currentPeople, maxPeople)
    const nextPeople = state.participants.has(userId)
      ? Math.max(0, state.currentPeople - 1)
      : Math.max(0, state.currentPeople)

    if (!event) {
      state.participants.delete(userId)
      state.currentPeople = nextPeople

      return toDataResponse(res, {
        id: eventId,
        current_people: state.currentPeople,
        joined: false,
      })
    }

    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        current_people: nextPeople,
      })
      .eq("id", eventId)
      .select("*")
      .single()

    if (updateError) {
      throw updateError
    }

    state.participants.delete(userId)
    state.currentPeople = Number(updatedEvent.current_people || nextPeople)

    return toDataResponse(res, {
      ...updatedEvent,
      joined: false,
    })
  } catch (error) {
    console.error("Leave event error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to leave event",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.post("/membership/checkout", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const requestedPlan = req.body?.plan
    const plan = requestedPlan === "annual" || requestedPlan === "yearly" ? "annual" : "monthly"
    const days = plan === "annual" ? 365 : 30

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

app.get("/chat/conversations", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    const enriched = await Promise.all(
      (conversations || []).map(async (conversation) => {
        const otherUserId =
          conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id
        const otherUser = await getCurrentUserById(otherUserId)

        if (!otherUser) {
          return null
        }

        const [
          { data: lastMessage },
          likedByMe,
          likedMe,
          { count: sentCount },
          otherMembership,
        ] = await Promise.all([
          supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          hasLiked(String(currentUserId), String(otherUserId)),
          hasLiked(String(otherUserId), String(currentUserId)),
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversation.id)
            .eq("sender_id", currentUserId),
          getActiveMembership(String(otherUserId)),
        ])

        return {
          id: conversation.id,
          other_user_id: otherUser.id,
          other_username: otherUser.username ?? "",
          other_pet_name: otherUser.pet_name ?? "",
          other_avatar_url: otherUser.avatar_url ?? "",
          other_user_is_ai: otherUser.is_ai ? 1 : 0,
          other_last_seen: otherUser.last_seen ?? null,
          other_membership_active: Boolean(otherMembership),
          last_message: lastMessage?.content ?? null,
          last_message_time: lastMessage?.created_at ?? null,
          liked_by_me: likedByMe ? 1 : 0,
          liked_me: likedMe ? 1 : 0,
          is_match: likedByMe && likedMe ? 1 : 0,
          single_message_used_by_me: (sentCount || 0) >= 1 ? 1 : 0,
        }
      })
    )

    return toDataResponse(res, {
      conversations: enriched.filter(Boolean),
    })
  } catch (error) {
    console.error("Chat conversations error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load conversations",
    })
  }
})

app.post("/chat/conversations", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const targetUserId = String(req.body?.targetUserId || "").trim()

    if (!targetUserId || targetUserId === "undefined" || targetUserId === "null") {
      return res.status(400).json({
        success: false,
        error: "targetUserId is required",
      })
    }

    if (String(currentUser.id) === targetUserId) {
      return res.status(400).json({
        success: false,
        error: "You cannot create a conversation with yourself",
      })
    }

    const targetUser = await getCurrentUserById(targetUserId)

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "Target user not found",
      })
    }

    const [conversation, targetMembership] = await Promise.all([
      getOrCreateConversation(String(currentUser.id), targetUserId),
      getActiveMembership(targetUserId),
    ])

    return toDataResponse(res, {
      conversationId: conversation.id,
      conversation,
      targetUser: {
        ...toSafeUser(targetUser),
        membership_active: Boolean(targetMembership),
      },
    })
  } catch (error) {
    console.error("Chat create conversation error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to create conversation",
    })
  }
})

app.get("/chat/messages/:conversationId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId
    const conversationId = String(req.params?.conversationId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversationId is required",
      })
    }

    const conversation = await getConversationById(conversationId)

    if (
      !conversation ||
      (conversation.user1_id !== currentUserId && conversation.user2_id !== currentUserId)
    ) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      })
    }

    const messages = await getConversationMessages(conversationId)

    return toDataResponse(res, {
      messages,
    })
  } catch (error) {
    console.error("Chat messages error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load messages",
    })
  }
})

app.delete("/chat/messages/:messageId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId
    const messageId = String(req.params?.messageId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: "messageId is required",
      })
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .maybeSingle()

    if (messageError) {
      throw messageError
    }

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      })
    }

    const conversation = await getConversationById(message.conversation_id)

    if (
      !conversation ||
      (conversation.user1_id !== currentUserId && conversation.user2_id !== currentUserId)
    ) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      })
    }

    if (String(message.sender_id) !== String(currentUserId)) {
      return res.status(403).json({
        success: false,
        error: "You can only delete your own messages",
      })
    }

    const deletedAt = new Date().toISOString()
    const { data: updatedMessage, error: updateError } = await supabase
      .from("messages")
      .update({
        is_deleted: true,
        deleted_at: deletedAt,
      })
      .eq("id", messageId)
      .select("*")
      .single()

    if (updateError) {
      throw updateError
    }

    return toDataResponse(res, {
      message: updatedMessage,
    })
  } catch (error) {
    console.error("Chat delete message error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete message",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.post("/chat/messages", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const conversationId = String(req.body?.conversationId || "").trim()
    const content = String(req.body?.content || "").trim()

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversationId is required",
      })
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "content is required",
      })
    }

    const conversation = await getConversationById(conversationId)

    if (
      !conversation ||
      (conversation.user1_id !== currentUser.id && conversation.user2_id !== currentUser.id)
    ) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      })
    }

    const access = await getConversationAccess(conversationId, String(currentUser.id))

    if (!access) {
      return res.status(404).json({
        success: false,
        error: "Conversation access not found",
      })
    }

    if (!access.liked_by_me) {
      return res.status(403).json({
        success: false,
        error: "LIKE_REQUIRED",
        code: "LIKE_REQUIRED",
      })
    }

    if (!access.can_send_message) {
      if (access.single_message_used_by_me && !access.is_match) {
        return res.status(403).json({
          success: false,
          error: "INTRO_MESSAGE_LIMIT_REACHED",
          code: "INTRO_MESSAGE_LIMIT_REACHED",
        })
      }

      return res.status(403).json({
        success: false,
        error: "MESSAGE_NOT_ALLOWED",
        code: "MESSAGE_NOT_ALLOWED",
      })
    }

    const message = await createMessage(conversationId, String(currentUser.id), content)
    const latestAccess = await getConversationAccess(conversationId, String(currentUser.id))

    return toDataResponse(res, {
      message,
      access: {
        likedByMe: latestAccess?.liked_by_me ?? false,
        likedMe: latestAccess?.liked_me ?? false,
        isMatch: latestAccess?.is_match ?? false,
        canSendUnlimited: latestAccess?.can_send_unlimited ?? false,
        singleMessageUsedByMe: latestAccess?.single_message_used_by_me ?? false,
      },
    })
  } catch (error) {
    console.error("Chat send message error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to send message",
    })
  }
})

app.post("/ai/chat", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const {
      message,
      history = [],
      mode = "chat",
    } = req.body || {}

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      })
    }

    const client = getOpenAIClient()
    const systemPrompt =
      mode === "doctor_chat" ? DOCTOR_CHAT_SYSTEM_PROMPT : GENERAL_SYSTEM_PROMPT

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: buildConversationInput(systemPrompt, history, message),
    })

    return toDataResponse(res, {
      response: response.output_text?.trim() || "Sorry, I couldn't generate a response.",
      mode,
    })
  } catch (error) {
    console.error("AI chat error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate response",
    })
  }
})

app.post("/ai/diagnose", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const imageBase64 = String(req.body?.imageBase64 || "").trim()
    const mimeType = String(req.body?.mimeType || "image/jpeg").trim()
    const symptom = String(req.body?.symptom || "").trim()

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: "Image is required",
      })
    }

    const client = getOpenAIClient()
    const prompt = `
You are WePet AI Pet Doctor.
Analyze the image and the user's symptom description to provide a preliminary pet health observation.

Output format:
[Visual Observations]
[Possible Issues]
[Suggested Care]
[Should Visit a Vet Offline]

User symptom description:
${symptom || "None"}
`

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${imageBase64}`,
              detail: "auto",
            },
          ],
        },
      ],
    })

    return toDataResponse(res, {
      result: response.output_text?.trim() || "Unable to generate diagnosis.",
    })
  } catch (error) {
    console.error("AI diagnose error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "AI diagnosis failed",
    })
  }
})

app.listen(PORT, () => {
  console.log(`Render API listening on port ${PORT}`)
})
