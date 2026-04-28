const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const { createClient } = require("@supabase/supabase-js")
const OpenAI = require("openai")
const authMiddleware = require("./middleware/auth")

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

        const [{ data: lastMessage }, likedByMe, likedMe, { count: sentCount }] = await Promise.all([
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
        ])

        return {
          id: conversation.id,
          other_user_id: otherUser.id,
          other_username: otherUser.username ?? "",
          other_pet_name: otherUser.pet_name ?? "",
          other_avatar_url: otherUser.avatar_url ?? "",
          other_user_is_ai: otherUser.is_ai ? 1 : 0,
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

    const conversation = await getOrCreateConversation(String(currentUser.id), targetUserId)

    return toDataResponse(res, {
      conversationId: conversation.id,
      conversation,
      targetUser: toSafeUser(targetUser),
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
