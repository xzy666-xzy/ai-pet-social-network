const fs = require("fs")
const path = require("path")
const { randomUUID } = require("crypto")
const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getMessaging } = require("firebase-admin/messaging")
const { createClient } = require("@supabase/supabase-js")
const OpenAI = require("openai")
const { Resend } = require("resend")
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
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = "WePet <verify@mail.wepet.asia>"
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

let firebaseMessaging = null

if (FIREBASE_PROJECT_ID && FIREBASE_PRIVATE_KEY && FIREBASE_CLIENT_EMAIL) {
  try {
    const firebaseApp =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert({
              projectId: FIREBASE_PROJECT_ID,
              privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
              clientEmail: FIREBASE_CLIENT_EMAIL,
            }),
          })

    firebaseMessaging = getMessaging(firebaseApp)
  } catch (error) {
    console.warn("Firebase Admin init skipped:", error?.message || error)
  }
} else {
  console.warn(
    "Firebase Admin init skipped: missing FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL"
  )
}

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
    pet_gender: user.pet_gender ?? null,
    pet_age: user.pet_age ?? null,
    description: user.description ?? null,
    avatar_url: user.avatar_url ?? null,
    cover_url: user.cover_url ?? null,
    city: user.city ?? null,
    city_lat: user.city_lat ?? null,
    city_lng: user.city_lng ?? null,
    current_lat: user.current_lat ?? null,
    current_lng: user.current_lng ?? null,
    location_updated_at: user.location_updated_at ?? null,
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function isValidLatitude(value) {
  return value !== null && value >= -90 && value <= 90
}

function isValidLongitude(value) {
  return value !== null && value >= -180 && value <= 180
}

function isValidCoordinatePair(lat, lng) {
  return isValidLatitude(lat) && isValidLongitude(lng)
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

function getPreferredUserLocation(user) {
  const currentLat = toFiniteNumber(user?.current_lat)
  const currentLng = toFiniteNumber(user?.current_lng)

  if (isValidCoordinatePair(currentLat, currentLng)) {
    return { lat: currentLat, lng: currentLng, source: "current" }
  }

  const cityLat = toFiniteNumber(user?.city_lat)
  const cityLng = toFiniteNumber(user?.city_lng)

  if (isValidCoordinatePair(cityLat, cityLng)) {
    return { lat: cityLat, lng: cityLng, source: "city" }
  }

  return { lat: null, lng: null, source: null }
}

const STATIC_EVENT_PEOPLE = {
  "1": 12,
  "2": 8,
  "3": 6,
}

const STATIC_EVENT_TITLES = {
  "1": "周末狗狗公园聚会",
  "2": "宠物咖啡馆社交日",
  "3": "晚间散步小组",
}

const STATIC_EVENT_UUID_MAP = {
  "1": "11111111-1111-1111-1111-111111111111",
  "2": "22222222-2222-2222-2222-222222222222",
  "3": "33333333-3333-3333-3333-333333333333",
}

function normalizeEventIdForDb(eventId) {
  const safeId = String(eventId || "").trim()
  // If it's already a valid UUID, return as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeId)) {
    return safeId
  }
  // If it's a static event id, map to fixed UUID
  if (STATIC_EVENT_UUID_MAP[safeId]) {
    return STATIC_EVENT_UUID_MAP[safeId]
  }
  // Fallback: return original (will likely fail at DB level, but preserves existing behavior)
  return safeId
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

async function resolveEventTitleByEventId(eventId) {
  const safeEventId = String(eventId || "").trim()
  const fallbackTitle = STATIC_EVENT_TITLES[safeEventId] || "活动群聊"

  if (!safeEventId) {
    return "活动群聊"
  }

  const dbEventId = normalizeEventIdForDb(safeEventId)

  try {
    const { data: event, error } = await supabase
      .from("events")
      .select("title")
      .eq("id", dbEventId)
      .maybeSingle()

    if (error) {
      console.warn(
        "Resolve event title failed, fallback to default:",
        error?.message || error
      )
      return fallbackTitle
    }

    const dbTitle = String(event?.title || "").trim()

    if (dbTitle) {
      return dbTitle
    }

    return fallbackTitle
  } catch (error) {
    console.warn(
      "Resolve event title exception, fallback to default:",
      error?.message || error
    )
    return fallbackTitle
  }
}

function normalizeOptionalText(value, maxLength = 500) {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim().slice(0, maxLength)
}

async function resolveGroupConversationAccess(conversationId, userId) {
  const access = await checkConversationAccess(conversationId, userId)

  if (!access || !access.isGroup) {
    return null
  }

  return access.conversation
}

async function getEventOrganizerId(eventId) {
  const safeEventId = String(eventId || "").trim()

  if (!safeEventId) {
    return null
  }

  try {
    const { data: event, error } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", normalizeEventIdForDb(safeEventId))
      .maybeSingle()

    if (error) {
      if (!isMissingEventsTableError(error)) {
        throw error
      }

      return null
    }

    return event?.organizer_id ? String(event.organizer_id) : null
  } catch (error) {
    console.warn("Resolve event organizer failed:", error?.message || error)
    return null
  }
}

async function buildEventGroupSettingsPayload(conversationId, currentUserId) {
  const conversation = await resolveGroupConversationAccess(conversationId, currentUserId)

  if (!conversation) {
    return null
  }

  const [eventTitle, eventOrganizerId, membersResult, settingsResult] = await Promise.all([
    resolveEventTitleByEventId(conversation.event_id),
    getEventOrganizerId(conversation.event_id),
    supabase
      .from("conversation_members")
      .select("id, user_id")
      .eq("conversation_id", conversationId),
    supabase
      .from("chat_settings")
      .select("conversation_id, is_pinned, is_muted")
      .eq("user_id", currentUserId)
      .eq("conversation_id", conversationId)
      .maybeSingle(),
  ])

  if (membersResult.error) {
    throw membersResult.error
  }

  if (settingsResult.error) {
    throw settingsResult.error
  }

  const members = membersResult.data || []
  const memberUserIds = [...new Set(members.map((member) => String(member.user_id || "").trim()).filter(Boolean))]
  let usersById = new Map()

  if (memberUserIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, email, avatar_url, pet_name")
      .in("id", memberUserIds)

    if (usersError) {
      throw usersError
    }

    usersById = new Map((users || []).map((user) => [String(user.id), user]))
  }

  const ownerId = String(eventOrganizerId || conversation.user1_id || "")
  const groupName = normalizeOptionalText(conversation.group_name, 120) || eventTitle || "活动群聊"
  const announcement = normalizeOptionalText(conversation.announcement, 1000)
  const settings = settingsResult.data || null

  return {
    conversation_id: conversationId,
    type: "event_group",
    event_id: conversation.event_id ?? null,
    group_name: groupName,
    event_title: eventTitle,
    announcement,
    announcement_updated_at: conversation.announcement_updated_at ?? null,
    announcement_updated_by: conversation.announcement_updated_by ?? null,
    owner_id: ownerId || null,
    is_owner: ownerId ? String(ownerId) === String(currentUserId) : false,
    member_count: members.length,
    my_nickname: "",
    is_pinned: settings?.is_pinned ?? false,
    is_muted: settings?.is_muted ?? false,
    members: members.map((member) => {
      const memberUser = usersById.get(String(member.user_id)) || {}
      const fallbackName = memberUser.pet_name || memberUser.username || memberUser.email || "Member"

      return {
        id: member.id,
        user_id: member.user_id,
        username: memberUser.username ?? null,
        pet_name: memberUser.pet_name ?? null,
        avatar_url: memberUser.avatar_url ?? null,
        display_name: fallbackName,
        is_owner: ownerId ? String(member.user_id) === String(ownerId) : false,
        joined_at: null,
      }
    }),
  }
}

async function listEventsWithOrganizers(userId) {
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

  // 查询当前用户已参加的所有 event_id
  let joinedEventIds = new Set()
  if (userId) {
    const { data: participations, error: partError } = await supabase
      .from("event_participants")
      .select("event_id")
      .eq("user_id", userId)

    if (!partError && participations) {
      participations.forEach((p) => joinedEventIds.add(p.event_id))
    }
  }

  return (events || []).map((event) => {
    const organizer = organizersById.get(event.organizer_id)

    return {
      ...event,
      organizer_name: organizer?.pet_name || organizer?.username || organizer?.email || null,
      city: event.city ?? organizer?.city ?? null,
      city_lat: event.city_lat ?? organizer?.city_lat ?? null,
      city_lng: event.city_lng ?? organizer?.city_lng ?? null,
      is_joined: joinedEventIds.has(event.id) || joinedEventIds.has(normalizeEventIdForDb(event.id)),
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

async function hasProfileLiked(fromUserId, toUserId) {
  const { data, error } = await supabase
    .from("profile_likes")
    .select("id")
    .eq("from_user_id", fromUserId)
    .eq("to_user_id", toUserId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

async function getProfileLikeCount(toUserId) {
  const { count, error } = await supabase
    .from("profile_likes")
    .select("*", { count: "exact", head: true })
    .eq("to_user_id", toUserId)

  if (error) {
    throw error
  }

  return count ?? 0
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

async function getOrCreateEventGroupConversation(eventId, creatorUserId) {
  const dbEventId = normalizeEventIdForDb(eventId)

  // Check if an event group conversation already exists
  const { data: existingConversation, error: existingError } = await supabase
    .from("conversations")
    .select("*")
    .eq("type", "event_group")
    .eq("event_id", dbEventId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existingConversation) {
    return existingConversation
  }

  // Find other users (not the creator) to satisfy the foreign key constraint
  const { data: otherUsers, error: otherUsersError } = await supabase
    .from("users")
    .select("id")
    .neq("id", creatorUserId)

  if (otherUsersError) {
    throw otherUsersError
  }

  if (!otherUsers || otherUsers.length === 0) {
    throw new Error("Need at least two users to create event group conversation")
  }

  // Existing schema has no conversation_members role/owner column.
  // For event_group conversations, user1_id is the stable owner/admin marker.
  const user1Id = creatorUserId

  // Try each other user as user2_id until one succeeds (avoids unique constraint conflict)
  for (const otherUser of otherUsers) {
    const user2Id = otherUser.id

    const { data: conversation, error: insertError } = await supabase
      .from("conversations")
      .insert({
        type: "event_group",
        event_id: dbEventId,
        user1_id: user1Id,
        user2_id: user2Id,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single()

    if (insertError) {
      // If duplicate key violation, try next user
      if (insertError.code === "23505") {
        continue
      }

      throw insertError
    }

    // Automatically add the creator as a member of the group
    await addUserToEventGroupConversation(conversation.id, creatorUserId)

    return conversation
  }

  throw new Error("Need at least two users to create event group conversation")
}

async function addUserToEventGroupConversation(conversationId, userId) {
  const { data: existingMember, error: existingError } = await supabase
    .from("conversation_members")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existingMember) {
    return existingMember
  }

  const { data: member, error: insertError } = await supabase
    .from("conversation_members")
    .insert({
      conversation_id: conversationId,
      user_id: userId,
    })
    .select("*")
    .single()

  if (insertError) {
    throw insertError
  }

  return member
}

async function addEventCreatorToEventGroupConversation(eventId, creatorUserId) {
  const conversation = await getOrCreateEventGroupConversation(eventId, creatorUserId)
  const member = await addUserToEventGroupConversation(conversation.id, creatorUserId)

  return {
    conversation,
    member,
  }
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

  if (!data) {
    return null
  }

  if (data.type === "event_group") {
    const eventTitle = await resolveEventTitleByEventId(data.event_id)

    return {
      ...data,
      event_title: eventTitle,
    }
  }

  return data
}

async function checkConversationAccess(conversationId, userId) {
  const conversation = await getConversationById(conversationId)

  if (!conversation) {
    return null
  }

  const isGroup = conversation.type === "event_group"

  if (isGroup) {
    const { data: member, error } = await supabase
      .from("conversation_members")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!member) {
      return null
    }

    return {
      conversation,
      isGroup: true,
    }
  }

  if (conversation.user1_id !== userId && conversation.user2_id !== userId) {
    return null
  }

  return {
    conversation,
    isGroup: false,
  }
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

  const messages = data || []

  // Enrich messages with sender user info (avatar_url, username, pet_name)
  const senderIds = [...new Set(messages.map((msg) => msg.sender_id).filter(Boolean))]
  let usersById = new Map()

  if (senderIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, avatar_url, username, pet_name")
      .in("id", senderIds)

    if (!usersError && users) {
      usersById = new Map(users.map((u) => [String(u.id), u]))
    }
  }

  return messages.map((msg) => {
    const sender = usersById.get(String(msg.sender_id)) || {}
    return {
      ...msg,
      sender_avatar_url: sender.avatar_url ?? null,
      sender_username: sender.username ?? null,
      sender_pet_name: sender.pet_name ?? null,
    }
  })
}

async function createMessage(conversationId, senderId, content, messageType = "text", imageUrl = null) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: messageType,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

function truncateNotificationBody(content) {
  const text = String(content || "").trim()

  if (text.length <= 80) {
    return text
  }

  return `${text.slice(0, 80)}...`
}

async function getActivePushTokens(userId) {
  const { data: tokenRows, error: tokenError } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId)
    .eq("is_active", true)

  if (tokenError) {
    throw tokenError
  }

  return [...new Set((tokenRows || []).map((row) => String(row.token || "").trim()).filter(Boolean))]
}

async function isConversationMutedForUser(conversationId, userId) {
  try {
    const { data: settings, error } = await supabase
      .from("chat_settings")
      .select("is_muted")
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .maybeSingle()

    if (error) {
      console.warn(
        "Chat mute check failed, fallback to send push:",
        error?.message || error
      )
      return false
    }

    return settings?.is_muted === true
  } catch (error) {
    console.warn(
      "Chat mute check exception, fallback to send push:",
      error?.message || error
    )
    return false
  }
}

async function sendNewMessagePushNotification({
  conversationId,
  senderId,
  senderDisplayName,
  otherUserId,
  content,
}) {
  if (!firebaseMessaging) {
    return
  }

  try {
    const isMuted = await isConversationMutedForUser(conversationId, otherUserId)

    if (isMuted) {
      console.log(
        `Skip chat message push: user ${otherUserId} muted conversation ${conversationId}`
      )
      return
    }

    const tokens = await getActivePushTokens(otherUserId)

    if (tokens.length === 0) {
      return
    }

    await firebaseMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: senderDisplayName || "New message",
        body: truncateNotificationBody(content),
      },
      android: {
        priority: "high",
        notification: {
          priority: "high",
          channelId: "chat_messages",
        },
      },
      data: {
        type: "new_message",
        conversationId: String(conversationId),
        senderId: String(senderId),
        senderUserId: String(senderId),
      },
    })
  } catch (error) {
    console.warn("Send chat message push failed:", error?.message || error)
  }
}

async function sendLikePushNotification({
  fromUser,
  toUserId,
  isMutualMatch,
}) {
  if (!firebaseMessaging) {
    return
  }

  try {
    const tokens = await getActivePushTokens(toUserId)

    if (tokens.length === 0) {
      return
    }

    const senderDisplayName =
      String(fromUser?.pet_name || "").trim() ||
      String(fromUser?.username || "").trim() ||
      "Someone"

    const title = isMutualMatch ? "You have a new match!" : "Someone liked you!"

    await firebaseMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body: `${senderDisplayName} liked your pet`,
      },
      android: {
        priority: "high",
        notification: {
          priority: "high",
          channelId: "chat_messages",
        },
      },
      data: {
        type: "pet_like",
        senderUserId: String(fromUser.id),
      },
    })
  } catch (error) {
    console.warn("Send pet like push failed:", error?.message || error)
  }
}

async function sendProfileLikePushNotification({
  fromUser,
  toUserId,
}) {
  if (!firebaseMessaging) {
    return
  }

  try {
    const tokens = await getActivePushTokens(toUserId)

    if (tokens.length === 0) {
      return
    }

    const senderDisplayName =
      String(fromUser?.pet_name || "").trim() ||
      String(fromUser?.username || "").trim() ||
      "Someone"

    await firebaseMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: "你收到一个新的点赞",
        body: `${senderDisplayName} 给你的主页点了爱心`,
      },
      android: {
        priority: "high",
        notification: {
          priority: "high",
          channelId: "profile_likes",
        },
      },
      data: {
        type: "profile_like",
        senderUserId: String(fromUser.id),
      },
    })
  } catch (error) {
    console.warn("Send profile like push failed:", error?.message || error)
  }
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

function normalizePetSpecies(value) {
  const normalized = String(value || "").toLowerCase().trim()

  if (!normalized) {
    return null
  }

  const speciesKeywords = {
    dog: [
      "dog",
      "puppy",
      "狗",
      "犬",
      "강아지",
      "개",
      "labulado",
      "요크셔테리어",
      "말티즈",
      "포메라니안",
      "비숑프리제",
      "래브라도 리트리버",
      "웰시 코기",
      "사모예드",
      "吉娃娃",
      "골든",
      "泰迪",
      "french bulldog",
      "골든리트리버",
      "corgi",
      "시바견",
      "닥스훈트",
      "巴吉度猎犬",
      "푸들",
      "chihuahua",
      "golden retriever",
      "labrador",
      "husky",
      "shiba",
      "pomeranian",
      "poodle",
      "bulldog",
      "maltese",
      "bichon",
      "dachshund",
      "basset",
    ],
    cat: [
      "cat",
      "kitten",
      "猫",
      "고양이",
      "삼고양이",
      "아메리칸숏헤어",
      "브숏",
      "英国短毛猫",
      "布偶猫",
      "먼치킨",
      "러시안블루",
      "munchkin",
      "ragdoll",
      "british shorthair",
      "british short hair",
      "american shorthair",
      "siamese",
      "persian",
      "russian blue",
    ],
    rabbit: ["rabbit", "bunny", "兔", "兔子", "토끼"],
    turtle: ["turtle", "tortoise", "乌龟", "龟", "거북이"],
    hamster: ["hamster", "仓鼠", "햄스터"],
    bird: ["bird", "parrot", "鸟", "鹦鹉", "새", "앵무새"],
    fish: ["fish", "clownfish", "물고기", "鱼", "小丑鱼"],
    reptile: ["reptile", "lizard", "snake", "爬虫", "蜥蜴", "蛇", "도마뱀", "뱀"],
  }

  for (const [species, keywords] of Object.entries(speciesKeywords)) {
    if (keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      return species
    }
  }

  return "other"
}

function getSpeciesCompatibility(speciesA, speciesB) {
  if (!speciesA || !speciesB) {
    return 60
  }

  const sameSpeciesScores = {
    dog: 100,
    cat: 100,
    rabbit: 100,
    turtle: 90,
    bird: 100,
    hamster: 95,
    fish: 90,
    reptile: 85,
    other: 70,
  }

  if (speciesA === speciesB) {
    return sameSpeciesScores[speciesA] ?? 70
  }

  if (speciesA === "other" || speciesB === "other") {
    return 50
  }

  const compatibilityMatrix = {
    "dog-cat": 45,
    "dog-rabbit": 35,
    "dog-turtle": 25,
    "dog-bird": 30,
    "dog-hamster": 20,
    "dog-fish": 15,
    "dog-reptile": 25,
    "cat-rabbit": 30,
    "cat-turtle": 25,
    "cat-bird": 20,
    "cat-hamster": 10,
    "cat-fish": 15,
    "cat-reptile": 20,
    "rabbit-turtle": 35,
    "rabbit-bird": 30,
    "rabbit-hamster": 45,
    "rabbit-fish": 15,
    "rabbit-reptile": 20,
    "turtle-bird": 25,
    "turtle-hamster": 25,
    "turtle-fish": 20,
    "turtle-reptile": 40,
    "bird-hamster": 25,
    "bird-fish": 15,
    "bird-reptile": 20,
    "hamster-fish": 15,
    "hamster-reptile": 15,
    "fish-reptile": 20,
  }

  return compatibilityMatrix[`${speciesA}-${speciesB}`] ?? compatibilityMatrix[`${speciesB}-${speciesA}`] ?? 50
}

function getAgeStage(species, age) {
  const numericAge = Number(age)

  if (!Number.isFinite(numericAge)) {
    return "unknown"
  }

  switch (species) {
    case "dog":
      if (numericAge < 1) return "puppy"
      if (numericAge < 3) return "young"
      if (numericAge < 8) return "adult"
      return "senior"
    case "cat":
      if (numericAge < 1) return "kitten"
      if (numericAge < 3) return "young"
      if (numericAge < 10) return "adult"
      return "senior"
    case "rabbit":
      if (numericAge < 1) return "young"
      if (numericAge < 5) return "adult"
      return "senior"
    case "turtle":
      if (numericAge < 5) return "young"
      if (numericAge < 30) return "adult"
      return "senior"
    case "fish":
      if (numericAge < 1) return "young"
      if (numericAge < 5) return "adult"
      return "senior"
    case "hamster":
      if (numericAge < 0.5) return "young"
      if (numericAge < 2) return "adult"
      return "senior"
    case "bird":
      if (numericAge < 1) return "young"
      if (numericAge < 8) return "adult"
      return "senior"
    case "reptile":
      if (numericAge < 1) return "young"
      if (numericAge < 10) return "adult"
      return "senior"
    default:
      if (numericAge < 1) return "young"
      if (numericAge < 7) return "adult"
      return "senior"
  }
}

function getAgeCompatibility(speciesA, ageA, speciesB, ageB) {
  const stageA = getAgeStage(speciesA, ageA)
  const stageB = getAgeStage(speciesB, ageB)

  if (stageA === "unknown" || stageB === "unknown") {
    return 70
  }

  const stageOrder = {
    puppy: 0,
    kitten: 0,
    young: 0,
    adult: 1,
    senior: 2,
  }
  const diff = Math.abs(stageOrder[stageA] - stageOrder[stageB])

  if (diff === 0) {
    return 100
  }

  if (diff === 1) {
    return 75
  }

  return 40
}

function extractTags(user) {
  const tagFields = ["personality", "personality_tags", "tags", "interests", "bio", "description"]
  const tags = []

  for (const field of tagFields) {
    const value = user?.[field]

    if (Array.isArray(value)) {
      tags.push(...value)
    } else if (typeof value === "string") {
      tags.push(...value.split(/[,\s/|，、]+/))
    }
  }

  return [...new Set(tags.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean))]
}

function getPersonalityCompatibility(currentUser, candidate) {
  const currentTags = extractTags(currentUser)
  const candidateTags = extractTags(candidate)

  if (currentTags.length === 0 && candidateTags.length === 0) {
    return 55
  }

  const currentTagSet = new Set(currentTags)
  const candidateTagSet = new Set(candidateTags)
  const commonCount = currentTags.filter((tag) => candidateTagSet.has(tag)).length
  const conflictGroups = [
    {
      a: ["活泼", "active", "energetic", "활발", "외향적"],
      b: ["安静", "quiet", "calm", "조용", "차분"],
    },
    {
      a: ["社牛", "social", "friendly", "사교적", "친화적"],
      b: ["胆小", "shy", "timid", "소심", "겁많음"],
    },
    {
      a: ["공격적", "aggressive", "공격성"],
      b: ["온순", "gentle", "calm", "순함"],
    },
  ]
  const conflictCount = conflictGroups.filter(({ a, b }) => {
    const currentHasA = a.some((tag) => currentTagSet.has(tag))
    const currentHasB = b.some((tag) => currentTagSet.has(tag))
    const candidateHasA = a.some((tag) => candidateTagSet.has(tag))
    const candidateHasB = b.some((tag) => candidateTagSet.has(tag))

    return (currentHasA && candidateHasB) || (currentHasB && candidateHasA)
  }).length
  const score = 60 + Math.min(30, commonCount * 12) - Math.min(20, conflictCount * 10)

  return Math.max(30, Math.min(100, score))
}

function getDistanceScore(distanceKm) {
  const km = Number(distanceKm)

  if (!Number.isFinite(km)) {
    return 60
  }

  if (km < 1) {
    return 100
  }

  if (km < 5) {
    return 85
  }

  if (km < 20) {
    return 60
  }

  if (km < 100) {
    return 30
  }

  return 10
}

function extractInterestTags(user) {
  const interests = user?.interests

  if (Array.isArray(interests)) {
    return [...new Set(interests.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean))]
  }

  if (typeof interests === "string" && interests.trim()) {
    return [...new Set(interests.split(/[,\s/|，、]+/).map((tag) => tag.toLowerCase().trim()).filter(Boolean))]
  }

  return extractTags(user)
}

function getInterestCompatibility(currentUser, candidate) {
  const currentInterests = extractInterestTags(currentUser)
  const candidateInterests = extractInterestTags(candidate)

  if (currentInterests.length === 0 && candidateInterests.length === 0) {
    return 55
  }

  const candidateInterestSet = new Set(candidateInterests)
  const commonCount = currentInterests.filter((interest) => candidateInterestSet.has(interest)).length

  return Math.min(100, 50 + commonCount * 15)
}

function buildMatchScore(currentUser, candidate, distanceKm) {
  const speciesA = normalizePetSpecies(currentUser.pet_type)
  const speciesB = normalizePetSpecies(candidate.pet_type)

  const speciesScore = getSpeciesCompatibility(speciesA, speciesB)
  const ageScore = getAgeCompatibility(speciesA, currentUser.pet_age, speciesB, candidate.pet_age)
  const personalityScore = getPersonalityCompatibility(currentUser, candidate)
  const distanceScore = getDistanceScore(distanceKm)
  const interestScore = getInterestCompatibility(currentUser, candidate)
  const finalScore =
    speciesScore * 0.35 +
    ageScore * 0.20 +
    personalityScore * 0.25 +
    distanceScore * 0.10 +
    interestScore * 0.10

  return Math.max(35, Math.min(98, Math.round(finalScore)))
}

function toSafeSearchUser(user) {
  return {
    id: user.id,
    username: user.username ?? null,
    pet_name: user.pet_name ?? null,
    pet_breed: user.pet_type ?? null,
    avatar_url: user.avatar_url ?? null,
    pet_age: user.pet_age ?? null,
    pet_gender: user.pet_gender ?? null,
    location: user.city ?? null,
  }
}

function escapeIlikePattern(value) {
  return String(value || "").replace(/[\\%_]/g, "\\$&")
}

function matchesUserSearchKeyword(user, keyword) {
  const normalizedKeyword = String(keyword || "").trim().toLowerCase()

  if (!normalizedKeyword) {
    return false
  }

  return [user?.username, user?.pet_name].some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(normalizedKeyword)
  )
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
    const loginIdentifier = String(req.body?.loginIdentifier || req.body?.email || "").trim()
    const password = String(req.body?.password || "")

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        error: "Username or email and password are required",
      })
    }

    const isEmailLogin = loginIdentifier.includes("@")
    const loginColumn = isEmailLogin ? "email" : "username"
    const loginValue = isEmailLogin ? loginIdentifier.toLowerCase() : loginIdentifier

    const { data: user, error } = await supabase
        .from("users")
        .select(
          "id, email, username, password_hash, deleted_at, pet_name, pet_type, pet_age, description, avatar_url, city, city_lat, city_lng, current_lat, current_lng, location_updated_at, last_seen, created_at, updated_at, is_ai"
        )
        .eq(loginColumn, loginValue)
        .maybeSingle()

    if (error) throw error

    if (!user || !user.password_hash) {
      return sendUnauthorized(res)
    }

    if (user.deleted_at) {
      return res.status(403).json({
        success: false,
        error: "Account has been deleted",
      })
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

app.delete("/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim()

    if (!userId) {
      return sendUnauthorized(res)
    }

    const deletedAt = new Date().toISOString()

    const { data: updatedUser, error: updateUserError } = await supabase
      .from("users")
      .update({
        deleted_at: deletedAt,
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle()

    if (updateUserError) {
      throw updateUserError
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    const { error: deleteSessionsError } = await supabase
      .from("sessions")
      .delete()
      .eq("user_id", userId)

    if (
      deleteSessionsError &&
      deleteSessionsError?.code !== "PGRST205" &&
      !deleteSessionsError?.message?.includes("Could not find the table 'public.sessions'")
    ) {
      throw deleteSessionsError
    }

    const { error: membershipsError } = await supabase
      .from("memberships")
      .update({
        status: "cancelled",
      })
      .eq("user_id", userId)
      .eq("status", "active")

    if (
      membershipsError &&
      membershipsError?.code !== "PGRST205" &&
      !membershipsError?.message?.includes("Could not find the table 'public.memberships'")
    ) {
      throw membershipsError
    }

    return res.json({ success: true })
  } catch (error) {
    console.error("Delete account error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to delete account",
    })
  }
})

app.post("/auth/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase()
    const verificationCode = String(req.body?.verificationCode || "").trim()
    const password = String(req.body?.password || "")
    const username = String(req.body?.username || "").trim()
    const petName = String(req.body?.pet_name || "").trim()
    const petType = String(req.body?.pet_type || "").trim()
    const petGender = String(req.body?.pet_gender || "").trim()
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

    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code",
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

    const now = new Date().toISOString()
    const { data: latestVerificationCode, error: verificationError } = await supabase
      .from("email_verification_codes")
      .select("id")
      .eq("email", email)
      .eq("code", verificationCode)
      .not("used_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (verificationError) {
      throw verificationError
    }

    if (!latestVerificationCode) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code",
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
          pet_gender: petGender || null,
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

    const { error: markCodeUsedError } = await supabase
      .from("email_verification_codes")
      .update({
        used_at: now,
      })
      .eq("email", email)

    if (markCodeUsedError) throw markCodeUsedError

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

app.post("/auth/send-verification-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase()

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: "Valid email is required",
      })
    }

    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from("email_verification_codes")
      .insert({
        email,
        code,
        expires_at: expiresAt,
      })

    if (error) {
      throw error
    }

    if (resend) {
      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject: "WePet Verification Code",
        text: `Your WePet verification code is: ${code}\nThis code will expire in 10 minutes.`,
      })
    }

    console.log(`[Email Verification] ${email}: ${code}`)

    return res.json({
      success: true,
    })
  } catch (error) {
    console.error("Send verification code error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to send verification code",
    })
  }
})

app.post("/auth/verify-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase()
    const code = String(req.body?.code || "").trim()

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "email and code are required",
      })
    }

    const now = new Date().toISOString()

    const { data: verificationCode, error: selectError } = await supabase
      .from("email_verification_codes")
      .select("id, used_at")
      .eq("email", email)
      .eq("code", code)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw selectError
    }

    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code",
      })
    }

    if (!verificationCode.used_at) {
      const { error: updateError } = await supabase
        .from("email_verification_codes")
        .update({ used_at: now })
        .eq("id", verificationCode.id)

      if (updateError) {
        throw updateError
      }
    }

    return res.json({
      success: true,
    })
  } catch (error) {
    console.error("Verify code error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to verify code",
    })
  }
})

app.post("/auth/check-availability", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase()
    const username = String(req.body?.username || "").trim()

    if (!email || !username) {
      return res.status(400).json({
        success: false,
        error: "email and username are required",
      })
    }

    const { data: emailUser, error: emailError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle()

    if (emailError) {
      throw emailError
    }

    const { data: usernameUser, error: usernameError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .is("deleted_at", null)
      .maybeSingle()

    if (usernameError) {
      throw usernameError
    }

    return res.json({
      success: true,
      emailAvailable: !emailUser,
      usernameAvailable: !usernameUser,
    })
  } catch (error) {
    console.error("Check availability error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to check availability",
    })
  }
})

app.post("/push/register", authMiddleware, async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim()

    if (!userId) {
      return sendUnauthorized(res)
    }

    const token = String(req.body?.token || "").trim()
    const platformInput = String(req.body?.platform || "android").trim().toLowerCase()
    const platform = platformInput || "android"

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "token is required",
      })
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          is_active: true,
          last_seen_at: now,
          updated_at: now,
        },
        {
          onConflict: "token",
        }
      )

    if (error) {
      throw error
    }

    return res.json({ success: true })
  } catch (error) {
    console.error("Push register error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to register push token",
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
      .is("deleted_at", null)
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
        const currentLocation = getPreferredUserLocation(currentUser)
        const candidateLocation = getPreferredUserLocation(candidate)
        const normalizeCity = (value) => String(value || "").trim().toLowerCase()
        const currentCity = normalizeCity(currentUser?.city)
        const candidateCity = normalizeCity(candidate?.city)
        const isBothUsingCityLocation =
          currentLocation.source === "city" && candidateLocation.source === "city"
        const isCityNameSame = currentCity !== "" && currentCity === candidateCity
        const isCityCoordinateSame =
          currentLocation.lat !== null &&
          currentLocation.lng !== null &&
          candidateLocation.lat !== null &&
          candidateLocation.lng !== null &&
          currentLocation.lat === candidateLocation.lat &&
          currentLocation.lng === candidateLocation.lng

        const useSameCityLabel = isBothUsingCityLocation && (isCityNameSame || isCityCoordinateSame)

        const distanceKm = useSameCityLabel
          ? null
          : calculateDistanceKm(
              currentLocation.lat,
              currentLocation.lng,
              candidateLocation.lat,
              candidateLocation.lng
            )

        return {
          ...toSafeUser(candidate),
          membership_active: activeMembershipUserIds.has(String(candidate.id)),
          matchScore: buildMatchScore(currentUser, candidate, distanceKm),
          matchReasons: buildMatchReasons(currentUser, candidate),
          distance_km: distanceKm,
          distance_label: useSameCityLabel ? "same_city" : null,
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

    void sendLikePushNotification({
      fromUser: currentUser,
      toUserId: targetUserId,
      isMutualMatch,
    })

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

app.get("/users/search", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const keyword = String(req.query?.keyword || "").trim()

    if (keyword.length < 1) {
      return toDataResponse(res, [])
    }

    // 只允许 username 和 pet_name 参与搜索
    // pet_age、pet_type、pet_breed、email、location、gender、bio、description 等字段不参与搜索
    const selectedFields = "id, username, pet_name, pet_type, avatar_url, pet_age, pet_gender, city"
    const searchPattern = `%${escapeIlikePattern(keyword)}%`
    const searchResults = await Promise.all([
      supabaseAdmin
        .from("users")
        .select(selectedFields)
        .neq("id", currentUserId)
        .is("deleted_at", null)
        .ilike("username", searchPattern)
        .limit(20),
      supabaseAdmin
        .from("users")
        .select(selectedFields)
        .neq("id", currentUserId)
        .is("deleted_at", null)
        .ilike("pet_name", searchPattern)
        .limit(20),
    ])

    searchResults.forEach((result) => {
      if (result.error) {
        throw result.error
      }
    })

    const usersById = new Map()
    searchResults.forEach((result) => {
      ;(result.data || []).forEach((user) => {
        if (!usersById.has(String(user.id))) {
          usersById.set(String(user.id), user)
        }
      })
    })

    // JS 层兜底过滤：只保留 username 或 pet_name 包含 keyword 的用户
    // 数字也按字符串匹配（如搜索 "1" 不会因为 pet_age=1 而命中）
    const keywordLower = keyword.toLowerCase()

    const filtered = [...usersById.values()].filter((user) => {
      return (
        String(user.username || "").toLowerCase().includes(keywordLower) ||
        String(user.pet_name || "").toLowerCase().includes(keywordLower)
      )
    })

    return toDataResponse(
      res,
      filtered.slice(0, 20).map(toSafeSearchUser)
    )
  } catch (error) {
    console.error("User search error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to search users",
    })
  }
})

app.get("/friends/mutual-likes", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const [sentLikesResult, receivedLikesResult] = await Promise.all([
      supabase
        .from("likes")
        .select("to_user_id")
        .eq("from_user_id", currentUserId),
      supabase
        .from("likes")
        .select("from_user_id")
        .eq("to_user_id", currentUserId),
    ])

    if (sentLikesResult.error) {
      throw sentLikesResult.error
    }

    if (receivedLikesResult.error) {
      throw receivedLikesResult.error
    }

    const sentUserIds = new Set(
      (sentLikesResult.data || [])
        .map((like) => String(like.to_user_id || "").trim())
        .filter(Boolean)
    )
    const receivedUserIds = new Set(
      (receivedLikesResult.data || [])
        .map((like) => String(like.from_user_id || "").trim())
        .filter(Boolean)
    )
    const mutualUserIds = [...sentUserIds].filter((userId) => receivedUserIds.has(userId))

    if (mutualUserIds.length === 0) {
      return toDataResponse(res, [])
    }

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, email, avatar_url, pet_name, pet_type, pet_age, pet_gender")
      .in("id", mutualUserIds)
      .is("deleted_at", null)

    if (usersError) {
      throw usersError
    }

    const usersById = new Map((users || []).map((user) => [String(user.id), user]))
    const friends = mutualUserIds
      .map((userId) => usersById.get(userId))
      .filter(Boolean)
      .map((user) => ({
        id: user.id,
        username: user.username ?? null,
        email: user.email ?? null,
        avatar_url: user.avatar_url ?? null,
        pet_name: user.pet_name ?? null,
        pet_type: user.pet_type ?? null,
        pet_age: user.pet_age ?? null,
        pet_gender: user.pet_gender ?? null,
      }))

    return toDataResponse(res, friends)
  } catch (error) {
    console.error("Mutual likes friends error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load mutual friends",
    })
  }
})

app.get("/profile/stats", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const [likesSentResult, likesReceivedResult, conversationsResult, profileLikesResult, membership] =
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
        supabase
          .from("profile_likes")
          .select("*", { count: "exact", head: true })
          .eq("to_user_id", currentUserId),
        getActiveMembership(currentUserId),
      ])

    if (likesSentResult.error) throw likesSentResult.error
    if (likesReceivedResult.error) throw likesReceivedResult.error
    if (conversationsResult.error) throw conversationsResult.error
    if (profileLikesResult.error) throw profileLikesResult.error

    return toDataResponse(res, {
      stats: {
        likesSent: likesSentResult.count ?? 0,
        likesReceived: likesReceivedResult.count ?? 0,
        conversations: conversationsResult.count ?? 0,
        profileLikesReceived: profileLikesResult.count ?? 0,
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

app.get("/profile/conversations", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .order("updated_at", { ascending: false })

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

        return {
          id: otherUser.id,
          name: otherUser.pet_name ?? otherUser.username ?? null,
          username: otherUser.username ?? null,
          email: otherUser.email ?? null,
          avatar_url: otherUser.avatar_url ?? null,
          pet_name: otherUser.pet_name ?? null,
          pet_type: otherUser.pet_type ?? null,
          pet_age: otherUser.pet_age ?? null,
          pet_gender: otherUser.pet_gender ?? null,
          updated_at: conversation.updated_at ?? null,
        }
      })
    )

    const data = enriched.filter(Boolean)

    return toDataResponse(res, data)
  } catch (error) {
    console.error("Profile conversations error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load conversations",
    })
  }
})

app.get("/profile/likes/match-received", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const { data: likes, error } = await supabase
      .from("likes")
      .select(`
        id,
        created_at,
        from_user_id,
        to_user_id
      `)
      .eq("to_user_id", currentUserId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    if (!likes || likes.length === 0) {
      return toDataResponse(res, [])
    }

    const fromUserIds = [...new Set(likes.map((like) => like.from_user_id))]

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, email, avatar_url, pet_name, pet_type, pet_age, pet_gender, created_at")
      .in("id", fromUserIds)

    if (usersError) {
      throw usersError
    }

    const usersById = new Map((users || []).map((u) => [u.id, u]))

    const result = likes.map((like) => {
      const user = usersById.get(like.from_user_id) || {}
      return {
        id: like.id,
        name: user.pet_name || user.username || null,
        username: user.username || null,
        email: user.email || null,
        avatar_url: user.avatar_url || null,
        pet_name: user.pet_name || null,
        pet_type: user.pet_type || null,
        pet_age: user.pet_age ?? null,
        pet_gender: user.pet_gender || null,
        created_at: like.created_at || null,
      }
    })

    return toDataResponse(res, result)
  } catch (error) {
    console.error("Profile likes match-received error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load match received likes",
    })
  }
})

app.get("/profile/likes/match-sent", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const { data: likes, error } = await supabase
      .from("likes")
      .select(`
        id,
        created_at,
        from_user_id,
        to_user_id
      `)
      .eq("from_user_id", currentUserId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    if (!likes || likes.length === 0) {
      return toDataResponse(res, [])
    }

    const toUserIds = [...new Set(likes.map((like) => like.to_user_id))]

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, email, avatar_url, pet_name, pet_type, pet_age, pet_gender, created_at")
      .in("id", toUserIds)

    if (usersError) {
      throw usersError
    }

    const usersById = new Map((users || []).map((u) => [u.id, u]))

    const result = likes.map((like) => {
      const user = usersById.get(like.to_user_id) || {}
      return {
        id: like.id,
        name: user.pet_name || user.username || null,
        username: user.username || null,
        email: user.email || null,
        avatar_url: user.avatar_url || null,
        pet_name: user.pet_name || null,
        pet_type: user.pet_type || null,
        pet_age: user.pet_age ?? null,
        pet_gender: user.pet_gender || null,
        created_at: like.created_at || null,
      }
    })

    return toDataResponse(res, result)
  } catch (error) {
    console.error("Profile likes match-sent error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load match sent likes",
    })
  }
})

app.get("/profile/likes/profile-received", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const { data: profileLikes, error } = await supabase
      .from("profile_likes")
      .select(`
        id,
        created_at,
        from_user_id,
        to_user_id
      `)
      .eq("to_user_id", currentUserId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    if (!profileLikes || profileLikes.length === 0) {
      return toDataResponse(res, [])
    }

    const fromUserIds = [...new Set(profileLikes.map((like) => like.from_user_id))]

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, email, avatar_url, pet_name, pet_type, pet_age, pet_gender, created_at")
      .in("id", fromUserIds)

    if (usersError) {
      throw usersError
    }

    const usersById = new Map((users || []).map((u) => [u.id, u]))

    const result = profileLikes.map((like) => {
      const user = usersById.get(like.from_user_id) || {}
      return {
        id: like.id,
        name: user.pet_name || user.username || null,
        username: user.username || null,
        email: user.email || null,
        avatar_url: user.avatar_url || null,
        pet_name: user.pet_name || null,
        pet_type: user.pet_type || null,
        pet_age: user.pet_age ?? null,
        pet_gender: user.pet_gender || null,
        created_at: like.created_at || null,
      }
    })

    return toDataResponse(res, result)
  } catch (error) {
    console.error("Profile likes profile-received error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load profile received likes",
    })
  }
})

app.post("/profile/like", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const targetUserId = String(req.body?.targetUserId || "").trim()

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "targetUserId is required",
      })
    }

    if (currentUserId === targetUserId) {
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

    // Check if like already exists to avoid duplicate notifications
    const { data: existingLike } = await supabase
      .from("profile_likes")
      .select("id")
      .eq("from_user_id", currentUserId)
      .eq("to_user_id", targetUserId)
      .maybeSingle()

    if (!existingLike) {
      const { error: insertError } = await supabase
        .from("profile_likes")
        .insert({
          from_user_id: currentUserId,
          to_user_id: targetUserId,
        })

      if (insertError) {
        throw insertError
      }

      // Only send notification on new like (not on repeat)
      const currentUser = await getCurrentUserById(currentUserId)

      if (currentUser) {
        void sendProfileLikePushNotification({
          fromUser: currentUser,
          toUserId: targetUserId,
        })
      }
    }

    const count = await getProfileLikeCount(targetUserId)

    return res.json({
      success: true,
      liked: true,
      count,
    })
  } catch (error) {
    console.error("Profile like error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to like profile",
    })
  }
})

app.delete("/profile/like/:targetUserId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const targetUserId = String(req.params?.targetUserId || "").trim()

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "targetUserId is required",
      })
    }

    const { error: deleteError } = await supabase
      .from("profile_likes")
      .delete()
      .eq("from_user_id", currentUserId)
      .eq("to_user_id", targetUserId)

    if (deleteError) {
      throw deleteError
    }

    const count = await getProfileLikeCount(targetUserId)

    return res.json({
      success: true,
      liked: false,
      count,
    })
  } catch (error) {
    console.error("Profile unlike error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to unlike profile",
    })
  }
})

app.get("/profile/like/:targetUserId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const targetUserId = String(req.params?.targetUserId || "").trim()

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "targetUserId is required",
      })
    }

    const [liked, count] = await Promise.all([
      hasProfileLiked(currentUserId, targetUserId),
      getProfileLikeCount(targetUserId),
    ])

    return res.json({
      success: true,
      liked,
      count,
    })
  } catch (error) {
    console.error("Profile like status error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load profile like status",
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

    if (req.body?.pet_gender !== undefined) {
      updates.pet_gender = String(req.body.pet_gender).trim() || null
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

app.put("/profile/location", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    const currentLat = Number(req.body?.current_lat)
    const currentLng = Number(req.body?.current_lng)

    if (Number.isNaN(currentLat)) {
      return res.status(400).json({
        success: false,
        error: "current_lat must be a number",
      })
    }

    if (Number.isNaN(currentLng)) {
      return res.status(400).json({
        success: false,
        error: "current_lng must be a number",
      })
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update({
        current_lat: currentLat,
        current_lng: currentLng,
        location_updated_at: new Date().toISOString(),
      })
      .eq("id", currentUserId)
      .select("id,current_lat,current_lng,location_updated_at")
      .maybeSingle()

    if (error) throw error

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    return toDataResponse(res, updatedUser)
  } catch (error) {
    console.error("Profile location update error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update location",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.get("/events", async (req, res) => {
  try {
    // 可选认证：如果 token 存在且有效则解析 userId，否则为 null
    let userId = null
    const authHeader = req.headers.authorization || ""
    if (authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice("Bearer ".length).trim()
        const payload = jwt.verify(token, JWT_SECRET)
        userId = payload.userId || payload.sub
      } catch {
        // token 无效，忽略即可，不返回 401
      }
    }

    const events = await listEventsWithOrganizers(userId)

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

      const normalizedTitle = title.toLowerCase()
      const { data: allEvents, error: lookupError } = await supabase
        .from("events")
        .select("id, title")

      if (lookupError) {
        console.error("Duplicate event title check error:", lookupError)

        return res.status(500).json({
          success: false,
          error: lookupError.message || "Failed to check event title",
          code: lookupError.code,
          details: lookupError.details,
          hint: lookupError.hint,
        })
      }

      const hasDuplicateTitle = (allEvents || []).some((event) => {
        return (
          String(event.id) !== String(eventId) &&
          String(event.title || "").trim().toLowerCase() === normalizedTitle
        )
      })

      if (hasDuplicateTitle) {
        return res.status(409).json({
          success: false,
          code: "EVENT_TITLE_DUPLICATE",
          error: "Event title already exists",
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

app.delete("/events/:id", authMiddleware, async (req, res) => {
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

    const dbEventId = normalizeEventIdForDb(eventId)
    const existingEvent = await getEventWithOrganizer(dbEventId)

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      })
    }

    // 权限检查：只有活动创建者/organizer 才能删除
    if (String(existingEvent.organizer_id) !== String(currentUser.id)) {
      return res.status(403).json({
        success: false,
        error: "Only the event organizer can delete this event",
      })
    }

    const isMissingOptionalCleanupTable = (error) => {
      const message = String(error?.message || "")

      return (
        error?.code === "PGRST205" ||
        error?.code === "42P01" ||
        message.includes("Could not find the table") ||
        message.includes("schema cache")
      )
    }

    const deleteConversationScopedRows = async (tableName, label, { optional = false } = {}) => {
      if (conversationIds.length === 0) {
        return
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .in("conversation_id", conversationIds)

      if (!error) {
        return
      }

      if (optional && isMissingOptionalCleanupTable(error)) {
        console.warn(`Skip ${label} cleanup:`, error?.message || error)
        return
      }

      throw error
    }

    // 1) 查找该活动对应的 event_group 群聊。只按 event_group + event_id 命中，避免影响普通私聊。
    const { data: groupConversations, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("type", "event_group")
      .eq("event_id", dbEventId)

    if (convError) {
      console.error("Find event group conversations error:", convError)
      throw convError
    }

    const conversationIds = (groupConversations || []).map((c) => c.id)

    // 2) 先清理群聊子表，再删除 conversations，确保聊天页群聊列表不会再查到该 event_group。
    if (conversationIds.length > 0) {
      await deleteConversationScopedRows("conversation_members", "conversation_members")
      await deleteConversationScopedRows("chat_messages", "chat_messages", { optional: true })
      await deleteConversationScopedRows("messages", "messages", { optional: true })
      await deleteConversationScopedRows("chat_settings", "chat_settings", { optional: true })

      // 3) 删除 event_group conversations 本体
      const { error: delConvError } = await supabase
        .from("conversations")
        .delete()
        .in("id", conversationIds)

      if (delConvError) {
        throw delConvError
      }
    }

    // 4) 删除 event_participants（有 on delete cascade 到 events，但显式删除更安全）
    const { error: partError } = await supabase
      .from("event_participants")
      .delete()
      .eq("event_id", dbEventId)

    if (partError) {
      throw partError
    }

    // 5) 最后删除活动本身
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", dbEventId)

    if (deleteError) {
      console.error("Delete event Supabase error:", deleteError)

      return res.status(500).json({
        success: false,
        error: deleteError.message || "Failed to delete event",
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint,
      })
    }

    eventParticipationState.delete(eventId)
    eventParticipationState.delete(dbEventId)

    return res.json({
      success: true,
      message: "Event deleted successfully",
    })
  } catch (error) {
    console.error("Delete event error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete event",
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

    // Check for duplicate event title (trim + case-insensitive strict equality)
    const normalizedTitle = title.trim().toLowerCase()

    const { data: allEvents, error: lookupError } = await supabase
      .from("events")
      .select("id, title")

    if (lookupError) {
      console.error("Duplicate event title check error:", lookupError)
    }

    if (allEvents && allEvents.some((event) => event.title?.trim().toLowerCase() === normalizedTitle)) {
      return res.status(409).json({
        success: false,
        error: "已创建的活动名称，请更改",
        code: "EVENT_TITLE_DUPLICATE",
      })
    }

    const newEventId = randomUUID()

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        id: newEventId,
        title,
        image_url: imageUrl || null,
        time,
        max_people: Number.isFinite(maxPeople) ? maxPeople : null,
        current_people: 1,
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

    const { error: participantError } = await supabase
      .from("event_participants")
      .insert({
        event_id: event.id,
        user_id: organizerId,
      })

    if (participantError && participantError.code !== "23505") {
      throw participantError
    }

    const groupChatResult = await addEventCreatorToEventGroupConversation(event.id, organizerId)

    const state = getEventParticipationState(event.id, Number(event.current_people || 1), event.max_people)
    state.participants.add(organizerId)
    state.currentPeople = Math.max(Number(event.current_people || 1), state.participants.size)

    return toDataResponse(res, {
      ...event,
      group_chat_created: true,
      group_conversation_id: groupChatResult.conversation.id,
    })
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
    const dbEventId = normalizeEventIdForDb(eventId)

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", dbEventId)
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

    // 查 event_participants 是否已有该用户
    const { data: existingParticipant, error: existingParticipantError } = await supabase
      .from("event_participants")
      .select("id")
      .eq("event_id", dbEventId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existingParticipantError) {
      throw existingParticipantError
    }

    if (existingParticipant) {
      // 已参加，同步 state 后返回
      const { count: participantCount, error: countError } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", dbEventId)

      if (countError) {
        throw countError
      }

      const currentPeople = event ? Number(event.current_people || 0) : STATIC_EVENT_PEOPLE[eventId]
      const maxPeople = event?.max_people == null ? null : Number(event.max_people)
      const state = getEventParticipationState(eventId, currentPeople, maxPeople)
      state.participants.add(userId)
      state.currentPeople = participantCount

      return toDataResponse(res, {
        ...(event || { id: eventId }),
        current_people: participantCount,
        joined: true,
      })
    }

    // 用 event_participants count 判断是否满员
    const { count: participantCount, error: countError } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", dbEventId)

    if (countError) {
      throw countError
    }

    const maxPeople = event?.max_people == null ? null : Number(event.max_people)

    if (Number.isFinite(maxPeople) && participantCount >= maxPeople) {
      return res.status(400).json({
        success: false,
        error: "Event is full",
      })
    }

    const nextPeople = participantCount + 1

    if (!event) {
      // 无 events 表时只更新内存
      const state = getEventParticipationState(eventId, STATIC_EVENT_PEOPLE[eventId], null)
      state.participants.add(userId)
      state.currentPeople = nextPeople

      return toDataResponse(res, {
        id: eventId,
        current_people: state.currentPeople,
        joined: true,
      })
    }

    // 插入 event_participants
    const { error: insertError } = await supabase
      .from("event_participants")
      .insert({
        event_id: dbEventId,
        user_id: userId,
      })

    if (insertError) {
      // 唯一约束冲突 => 已存在，视为成功
      if (insertError.code === "23505") {
        const { count: finalCount, error: finalCountError } = await supabase
          .from("event_participants")
          .select("*", { count: "exact", head: true })
          .eq("event_id", dbEventId)

        if (finalCountError) {
          throw finalCountError
        }

        const state = getEventParticipationState(eventId, Number(event.current_people || 0), maxPeople)
        state.participants.add(userId)
        state.currentPeople = finalCount

        return toDataResponse(res, {
          ...event,
          current_people: finalCount,
          joined: true,
        })
      }

      throw insertError
    }

    // 更新 events.current_people
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        current_people: nextPeople,
      })
      .eq("id", dbEventId)
      .select("*")
      .single()

    if (updateError) {
      throw updateError
    }

    // 同步 eventParticipationState
    const state = getEventParticipationState(eventId, Number(event.current_people || 0), maxPeople)
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
    const dbEventId = normalizeEventIdForDb(eventId)

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", dbEventId)
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

    // 删除 event_participants 记录
    const { error: deleteError } = await supabase
      .from("event_participants")
      .delete()
      .eq("event_id", dbEventId)
      .eq("user_id", userId)

    if (deleteError) {
      throw deleteError
    }

    // 重新 count
    const { count: participantCount, error: countError } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", dbEventId)

    if (countError) {
      throw countError
    }

    const nextPeople = participantCount

    if (!event) {
      const state = getEventParticipationState(eventId, STATIC_EVENT_PEOPLE[eventId], null)
      state.participants.delete(userId)
      state.currentPeople = nextPeople

      return toDataResponse(res, {
        id: eventId,
        current_people: state.currentPeople,
        joined: false,
      })
    }

    // 更新 events.current_people
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        current_people: nextPeople,
      })
      .eq("id", dbEventId)
      .select("*")
      .single()

    if (updateError) {
      throw updateError
    }

    // 同步 eventParticipationState
    const maxPeople = event?.max_people == null ? null : Number(event.max_people)
    const state = getEventParticipationState(eventId, Number(event.current_people || 0), maxPeople)
    state.participants.delete(userId)
    state.currentPeople = Number(updatedEvent.current_people || nextPeople)

    // 从活动群聊 conversation_members 删除该用户（容错：如果不在群聊或表不存在，不阻塞取消参加）
    try {
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .eq("type", "event_group")
        .eq("event_id", dbEventId)
        .maybeSingle()

      if (!convError && conversation) {
        const { error: removeMemberError } = await supabase
          .from("conversation_members")
          .delete()
          .eq("conversation_id", conversation.id)
          .eq("user_id", userId)

        if (removeMemberError) {
          console.warn("Failed to remove user from event group chat (non-blocking):", removeMemberError)
        }
      } else if (convError) {
        console.warn("Failed to find event group conversation (non-blocking):", convError)
      }
    } catch (innerError) {
      console.warn("Error removing user from event group chat (non-blocking):", innerError)
    }

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

app.post("/events/:eventId/group-chat/join", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const eventId = String(req.params?.eventId || "").trim()

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "eventId is required",
      })
    }

    const userId = String(currentUser.id)
    const dbEventId = normalizeEventIdForDb(eventId)

    // Check if event exists
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", dbEventId)
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

    const { data: existingConversation, error: existingConversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("type", "event_group")
      .eq("event_id", dbEventId)
      .maybeSingle()

    if (existingConversationError) {
      throw existingConversationError
    }

    if (existingConversation) {
      const { data: existingMember, error: existingMemberError } = await supabase
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", existingConversation.id)
        .eq("user_id", userId)
        .maybeSingle()

      if (existingMemberError) {
        throw existingMemberError
      }

      if (existingMember) {
        return toDataResponse(res, {
          conversationId: existingConversation.id,
          eventId: eventId,
          type: "event_group",
          alreadyMember: true,
        })
      }
    }

    // Check if user has joined the event. Event participation is persisted in
    // event_participants, while eventParticipationState is only an in-memory
    // cache. Do not reject users who joined before the current server process
    // populated the cache.
    const currentPeople = event ? Number(event.current_people || 0) : STATIC_EVENT_PEOPLE[eventId]
    const maxPeople = event?.max_people == null ? null : Number(event.max_people)
    const state = getEventParticipationState(eventId, currentPeople, maxPeople)
    let hasJoinedEvent = state.participants.has(userId)

    if (!hasJoinedEvent) {
      // 查数据库确认（即使 event 为 null，也尝试查 event_participants 表）
      const { data: existingParticipant, error: participantError } = await supabase
        .from("event_participants")
        .select("id")
        .eq("event_id", dbEventId)
        .eq("user_id", userId)
        .maybeSingle()

      // 只 throw 非"表不存在"的错误
      if (participantError && !isMissingEventsTableError(participantError)) {
        throw participantError
      }

      hasJoinedEvent = Boolean(existingParticipant)

      if (hasJoinedEvent) {
        state.participants.add(userId)
      }
    }

    if (!hasJoinedEvent) {
      return res.status(403).json({
        success: false,
        code: "EVENT_PARTICIPATION_REQUIRED",
        error: "You must join the event before joining the group chat",
      })
    }

    // Find or create event group conversation
    const conversation = existingConversation || await getOrCreateEventGroupConversation(eventId, userId)

    // Add user to conversation members
    await addUserToEventGroupConversation(conversation.id, userId)

    return toDataResponse(res, {
      conversationId: conversation.id,
      eventId: eventId,
      type: "event_group",
      alreadyMember: false,
    })
  } catch (error) {
    console.error("Event group chat join error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to join event group chat",
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

app.get("/chat/settings", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId
    const conversationId = String(req.query?.conversation_id || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversation_id is required",
      })
    }

    const access = await checkConversationAccess(conversationId, String(currentUserId))

    if (!access) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      })
    }

    const { data: settings, error } = await supabase
      .from("chat_settings")
      .select("conversation_id, background_key, background_url, is_pinned, is_muted")
      .eq("user_id", currentUserId)
      .eq("conversation_id", conversationId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return toDataResponse(res, {
      conversation_id: conversationId,
      background_key: settings?.background_key ?? "",
      background_url: settings?.background_url ?? "",
      is_pinned: settings?.is_pinned ?? false,
      is_muted: settings?.is_muted ?? false,
    })
  } catch (error) {
    console.error("Chat settings get error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load chat settings",
    })
  }
})

app.put("/chat/settings", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId
    const conversationId = String(req.body?.conversation_id || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversation_id is required",
      })
    }

    const access = await checkConversationAccess(conversationId, String(currentUserId))

    if (!access) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      })
    }

    const updates = {}

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "background_key")) {
      const backgroundKey = req.body.background_key

      if (backgroundKey !== null && typeof backgroundKey !== "string") {
        return res.status(400).json({
          success: false,
          error: "background_key must be a string",
        })
      }

      updates.background_key = String(backgroundKey || "")
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "background_url")) {
      const backgroundUrl = req.body.background_url

      if (backgroundUrl !== null && typeof backgroundUrl !== "string") {
        return res.status(400).json({
          success: false,
          error: "background_url must be a string or null",
        })
      }

      updates.background_url = String(backgroundUrl || "")
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "is_pinned")) {
      if (typeof req.body.is_pinned !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "is_pinned must be a boolean",
        })
      }

      updates.is_pinned = req.body.is_pinned
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "is_muted")) {
      if (typeof req.body.is_muted !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "is_muted must be a boolean",
        })
      }

      updates.is_muted = req.body.is_muted
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No chat setting fields to update",
      })
    }

    const now = new Date().toISOString()
    const payload = {
      user_id: currentUserId,
      conversation_id: conversationId,
      updated_at: now,
      ...updates,
    }

    const { error: upsertError } = await supabase
      .from("chat_settings")
      .upsert(payload, { onConflict: "user_id,conversation_id" })

    if (upsertError) {
      throw upsertError
    }

    const { data: latestSettings, error: latestError } = await supabase
      .from("chat_settings")
      .select("conversation_id, background_key, background_url, is_pinned, is_muted")
      .eq("user_id", currentUserId)
      .eq("conversation_id", conversationId)
      .maybeSingle()

    if (latestError) {
      throw latestError
    }

    return toDataResponse(res, {
      conversation_id: conversationId,
      background_key: latestSettings?.background_key ?? "",
      background_url: latestSettings?.background_url ?? "",
      is_pinned: latestSettings?.is_pinned ?? false,
      is_muted: latestSettings?.is_muted ?? false,
    })
  } catch (error) {
    console.error("Chat settings put error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to save chat settings",
    })
  }
})

app.get("/chat/group-settings", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()
    const conversationId = String(req.query?.conversation_id || req.query?.conversationId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversation_id is required",
      })
    }

    const payload = await buildEventGroupSettingsPayload(conversationId, currentUserId)

    if (!payload) {
      // 如果 activity group 没有 settings 数据，返回默认值而不是 404
      return toDataResponse(res, {
        conversation_id: conversationId,
        type: "event_group",
        event_id: null,
        group_name: "活动群聊",
        event_title: null,
        announcement: "",
        announcement_updated_at: null,
        announcement_updated_by: null,
        owner_id: null,
        is_owner: false,
        member_count: 0,
        my_nickname: "",
        is_pinned: false,
        is_muted: false,
        members: [],
      })
    }

    return toDataResponse(res, payload)
  } catch (error) {
    console.error("Chat group settings get error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to load group settings",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.put("/chat/group-settings", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()
    const conversationId = String(req.body?.conversation_id || req.body?.conversationId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversation_id is required",
      })
    }

    const currentPayload = await buildEventGroupSettingsPayload(conversationId, currentUserId)

    if (!currentPayload) {
      return res.status(404).json({
        success: false,
        error: "Group conversation not found",
      })
    }

    const chatSettingUpdates = {}
    const conversationUpdates = {}

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "is_pinned")) {
      if (typeof req.body.is_pinned !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "is_pinned must be a boolean",
        })
      }

      chatSettingUpdates.is_pinned = req.body.is_pinned
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "is_muted")) {
      if (typeof req.body.is_muted !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "is_muted must be a boolean",
        })
      }

      chatSettingUpdates.is_muted = req.body.is_muted
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "announcement")) {
      if (!currentPayload.is_owner) {
        return res.status(403).json({
          success: false,
          error: "Only the group owner can update announcement",
        })
      }

      conversationUpdates.announcement = normalizeOptionalText(req.body.announcement, 1000)
      conversationUpdates.announcement_updated_at = new Date().toISOString()
      conversationUpdates.announcement_updated_by = currentUserId
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "group_name")) {
      if (!currentPayload.is_owner) {
        return res.status(403).json({
          success: false,
          error: "Only the group owner can update group name",
        })
      }

      conversationUpdates.group_name = normalizeOptionalText(req.body.group_name, 120)
    }

    if (
      Object.keys(chatSettingUpdates).length === 0 &&
      Object.keys(conversationUpdates).length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "No group setting fields to update",
      })
    }

    if (Object.keys(conversationUpdates).length > 0) {
      const { error: conversationUpdateError } = await supabase
        .from("conversations")
        .update(conversationUpdates)
        .eq("id", conversationId)
        .eq("type", "event_group")

      if (conversationUpdateError) {
        // 如果是因为列不存在导致的错误（如 announcement_updated_by），
        // 移除可能不存在的列后重试
        const isColumnError =
          conversationUpdateError?.code === "42703" ||
          (typeof conversationUpdateError?.message === "string" &&
            conversationUpdateError.message.includes("does not exist"))

        if (isColumnError) {
          console.warn(
            "Conversation update failed due to missing column, retrying with safe fields:",
            conversationUpdateError.message
          )

          // 只保留肯定存在的列：announcement, group_name
          const safeUpdates = {}
          if (Object.prototype.hasOwnProperty.call(conversationUpdates, "announcement")) {
            safeUpdates.announcement = conversationUpdates.announcement
          }
          if (Object.prototype.hasOwnProperty.call(conversationUpdates, "group_name")) {
            safeUpdates.group_name = conversationUpdates.group_name
          }

          if (Object.keys(safeUpdates).length > 0) {
            const { error: retryError } = await supabase
              .from("conversations")
              .update(safeUpdates)
              .eq("id", conversationId)
              .eq("type", "event_group")

            if (retryError) {
              throw retryError
            }
          }
        } else {
          throw conversationUpdateError
        }
      }
    }

    if (Object.keys(chatSettingUpdates).length > 0) {
      const now = new Date().toISOString()
      const { error: settingUpdateError } = await supabase
        .from("chat_settings")
        .upsert(
          {
            user_id: currentUserId,
            conversation_id: conversationId,
            updated_at: now,
            ...chatSettingUpdates,
          },
          { onConflict: "user_id,conversation_id" }
        )

      if (settingUpdateError) {
        // 如果是因为列不存在导致的错误，
        // 移除可能不存在的列后重试
        const isColumnError =
          settingUpdateError?.code === "42703" ||
          (typeof settingUpdateError?.message === "string" &&
            settingUpdateError.message.includes("does not exist"))

        if (isColumnError) {
          console.warn(
            "Chat settings upsert failed due to missing column, retrying with safe fields:",
            settingUpdateError.message
          )

          // 只保留肯定存在的列：is_pinned, is_muted
          const safeUpdates = {}
          if (Object.prototype.hasOwnProperty.call(chatSettingUpdates, "is_pinned")) {
            safeUpdates.is_pinned = chatSettingUpdates.is_pinned
          }
          if (Object.prototype.hasOwnProperty.call(chatSettingUpdates, "is_muted")) {
            safeUpdates.is_muted = chatSettingUpdates.is_muted
          }

          if (Object.keys(safeUpdates).length > 0) {
            const { error: retryError } = await supabase
              .from("chat_settings")
              .upsert(
                {
                  user_id: currentUserId,
                  conversation_id: conversationId,
                  updated_at: now,
                  ...safeUpdates,
                },
                { onConflict: "user_id,conversation_id" }
              )

            if (retryError) {
              throw retryError
            }
          }
        } else {
          throw settingUpdateError
        }
      }
    }

    const payload = await buildEventGroupSettingsPayload(conversationId, currentUserId)

    return toDataResponse(res, payload)
  } catch (error) {
    console.error("Chat group settings put error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to save group settings",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.delete("/chat/group-settings", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()
    const conversationId = String(req.body?.conversation_id || req.body?.conversationId || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversation_id is required",
      })
    }

    // Verify the conversation exists and is an event_group type
    const conversation = await resolveGroupConversationAccess(conversationId, currentUserId)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Group conversation not found",
      })
    }

    // Remove user from conversation_members
    const { error: removeError } = await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId)

    if (removeError) {
      throw removeError
    }

    // Also clean up chat_settings for this user+conversation
    const { error: settingsDeleteError } = await supabase
      .from("chat_settings")
      .delete()
      .eq("user_id", currentUserId)
      .eq("conversation_id", conversationId)

    if (settingsDeleteError) {
      // Non-blocking: chat_settings might not exist
      console.warn("Failed to delete chat_settings on leave (non-blocking):", settingsDeleteError)
    }

    return toDataResponse(res, {
      success: true,
      message: "Successfully left the group chat",
    })
  } catch (error) {
    console.error("Chat group settings delete (leave) error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to leave group chat",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.get("/chat/conversations", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user?.userId

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    // Get direct conversations (non-event_group) where user is user1 or user2
    const { data: directConversations, error: directError } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .neq("type", "event_group")

    if (directError) {
      throw directError
    }

    // Get event_group conversations where user is in conversation_members
    const { data: memberConversations, error: memberError } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", currentUserId)

    if (memberError) {
      throw memberError
    }

    const memberConversationIds = (memberConversations || []).map((m) => m.conversation_id)

    let eventGroupConversations = []
    if (memberConversationIds.length > 0) {
      const { data: egConversations, error: egError } = await supabase
        .from("conversations")
        .select("*")
        .in("id", memberConversationIds)
        .eq("type", "event_group")

      if (egError) {
        throw egError
      }

      eventGroupConversations = egConversations || []
    }

    // Merge: direct conversations + event_group conversations (only those user is still a member of)
    const conversationMap = new Map()
    for (const c of directConversations || []) {
      conversationMap.set(c.id, c)
    }
    for (const c of eventGroupConversations) {
      if (!conversationMap.has(c.id)) {
        conversationMap.set(c.id, c)
      }
    }
    const conversations = Array.from(conversationMap.values())

    // Sort by created_at descending
    conversations.sort((a, b) => {
      const aTime = Date.parse(a.created_at || "")
      const bTime = Date.parse(b.created_at || "")
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
        return bTime - aTime
      }
      return 0
    })

    const { data: chatSettings, error: chatSettingsError } = await supabase
      .from("chat_settings")
      .select("conversation_id, is_pinned, is_muted")
      .eq("user_id", currentUserId)

    if (chatSettingsError) {
      throw chatSettingsError
    }

    const conversationSettingsById = new Map(
      (chatSettings || []).map((item) => [
        String(item.conversation_id),
        {
          is_pinned: Boolean(item?.is_pinned),
          is_muted: Boolean(item?.is_muted),
        },
      ])
    )

    const enriched = await Promise.all(
      (conversations || []).map(async (conversation) => {
        const isEventGroup = conversation.type === "event_group"

        if (isEventGroup) {
          // Event group conversation
          const [eventTitle, eventImageResult, memberCountResult, { data: lastMessage }] = await Promise.all([
            resolveEventTitleByEventId(conversation.event_id),
            supabase
              .from("events")
              .select("image_url")
              .eq("id", normalizeEventIdForDb(conversation.event_id))
              .maybeSingle(),
            supabase
              .from("conversation_members")
              .select("user_id", { count: "exact", head: true })
              .eq("conversation_id", conversation.id),
            supabase
              .from("messages")
              .select("content, created_at")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ])

          if (memberCountResult?.error) {
            throw memberCountResult.error
          }

          if (eventImageResult?.error && !isMissingEventsTableError(eventImageResult.error)) {
            throw eventImageResult.error
          }

          const rawMemberCount = Number(memberCountResult?.count ?? 0)
          const memberCount = Number.isFinite(rawMemberCount) ? Math.max(0, rawMemberCount) : 0
          const eventImageUrl = String(eventImageResult?.data?.image_url || "").trim()

          const settings = conversationSettingsById.get(String(conversation.id))
          const rawUnreadCount = Number(conversation.unread_count ?? 0)
          const unreadCount = Number.isFinite(rawUnreadCount)
            ? Math.max(0, rawUnreadCount)
            : 0

          return {
            id: conversation.id,
            type: "event_group",
            event_id: conversation.event_id ?? null,
            event_title: eventTitle,
            event_image_url: eventImageUrl || null,
            group_avatar_url: eventImageUrl || null,
            member_count: memberCount,
            other_user_id: "",
            other_username: "",
            other_pet_name: "",
            other_avatar_url: "",
            other_user_is_ai: 0,
            other_last_seen: null,
            other_membership_active: false,
            last_message: lastMessage?.content ?? null,
            last_message_time: lastMessage?.created_at ?? null,
            updated_at: conversation.updated_at ?? null,
            created_at: conversation.created_at ?? null,
            is_pinned: settings?.is_pinned ?? false,
            is_muted: settings?.is_muted ?? false,
            liked_by_me: 0,
            liked_me: 0,
            is_match: 0,
            single_message_used_by_me: 0,
            unread_count: unreadCount,
          }
        }

        // Direct conversation
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

        const settings = conversationSettingsById.get(String(conversation.id))
        const rawUnreadCount = Number(conversation.unread_count ?? 0)
        const unreadCount = Number.isFinite(rawUnreadCount)
          ? Math.max(0, rawUnreadCount)
          : 0

        return {
          id: conversation.id,
          type: "direct",
          other_user_id: otherUser.id,
          other_username: otherUser.username ?? "",
          other_pet_name: otherUser.pet_name ?? "",
          other_avatar_url: otherUser.avatar_url ?? "",
          other_user_is_ai: otherUser.is_ai ? 1 : 0,
          other_last_seen: otherUser.last_seen ?? null,
          other_membership_active: Boolean(otherMembership),
          last_message: lastMessage?.content ?? null,
          last_message_time: lastMessage?.created_at ?? null,
          updated_at: conversation.updated_at ?? null,
          created_at: conversation.created_at ?? null,
          is_pinned: settings?.is_pinned ?? false,
          is_muted: settings?.is_muted ?? false,
          liked_by_me: likedByMe ? 1 : 0,
          liked_me: likedMe ? 1 : 0,
          is_match: likedByMe && likedMe ? 1 : 0,
          single_message_used_by_me: (sentCount || 0) >= 1 ? 1 : 0,
          unread_count: unreadCount,
        }
      })
    )

    const sortedConversations = enriched
      .filter(Boolean)
      .sort((a, b) => {
        const aPinned = Boolean(a?.is_pinned)
        const bPinned = Boolean(b?.is_pinned)

        if (aPinned !== bPinned) {
          return bPinned ? 1 : -1
        }

        const aTime = Date.parse(a?.last_message_time || "")
        const bTime = Date.parse(b?.last_message_time || "")

        if (!Number.isNaN(aTime) || !Number.isNaN(bTime)) {
          if (Number.isNaN(aTime)) return 1
          if (Number.isNaN(bTime)) return -1
          if (aTime !== bTime) return bTime - aTime
        }

        const aFallback = Date.parse(a?.updated_at || a?.created_at || "")
        const bFallback = Date.parse(b?.updated_at || b?.created_at || "")

        if (!Number.isNaN(aFallback) || !Number.isNaN(bFallback)) {
          if (Number.isNaN(aFallback)) return 1
          if (Number.isNaN(bFallback)) return -1
          if (aFallback !== bFallback) return bFallback - aFallback
        }

        return 0
      })

    return toDataResponse(res, {
      conversations: sortedConversations,
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

app.patch("/chat/conversations/:conversationId/read", authMiddleware, async (req, res) => {
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

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        unread_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)

    if (updateError) {
      throw updateError
    }

    return toDataResponse(res, {
      conversationId,
      unread_count: 0,
    })
  } catch (error) {
    console.error("Chat mark conversation read error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark conversation as read",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.delete("/chat/conversations/:conversationId", authMiddleware, async (req, res) => {
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

    const { error: deleteMessagesError } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId)

    if (deleteMessagesError) {
      throw deleteMessagesError
    }

    const { error: deleteSettingsError } = await supabase
      .from("chat_settings")
      .delete()
      .eq("conversation_id", conversationId)

    if (deleteSettingsError) {
      throw deleteSettingsError
    }

    const { error: deleteConversationError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)

    if (deleteConversationError) {
      throw deleteConversationError
    }

    return res.json({ success: true })
  } catch (error) {
    console.error("Chat delete conversation error:", error)

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete conversation",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
  }
})

app.get("/chat/messages", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user?.userId || "").trim()
    const conversationId = String(req.query?.conversationId || req.query?.conversation_id || "").trim()

    if (!currentUserId) {
      return sendUnauthorized(res)
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversationId is required",
      })
    }

    const access = await checkConversationAccess(conversationId, currentUserId)

    if (!access) {
      const conversation = await getConversationById(conversationId)

      if (conversation?.type === "event_group") {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
        })
      }

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
    console.error("Chat messages query error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to load messages",
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

    const access = await checkConversationAccess(conversationId, String(currentUserId))

    if (!access) {
      const conversation = await getConversationById(conversationId)

      if (conversation?.type === "event_group") {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
        })
      }

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

    const conversationId = String(req.body?.conversationId || req.body?.conversation_id || "").trim()
    const content = String(req.body?.content || "").trim()
    const messageType = String(req.body?.message_type || "text").trim().toLowerCase() || "text"
    const imageUrl = String(req.body?.image_url || "").trim()

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversationId is required",
      })
    }

    if (messageType !== "text" && messageType !== "image") {
      return res.status(400).json({
        success: false,
        error: "message_type must be text or image",
      })
    }

    if (messageType === "text" && !content) {
      return res.status(400).json({
        success: false,
        error: "content is required",
      })
    }

    if (messageType === "image" && !imageUrl) {
      return res.status(400).json({
        success: false,
        error: "image_url is required when message_type is image",
      })
    }

    const checked = await checkConversationAccess(conversationId, String(currentUser.id))

    if (!checked) {
      const conversation = await getConversationById(conversationId)

      if (conversation?.type === "event_group") {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
        })
      }

      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      })
    }

    const { conversation, isGroup } = checked
    let latestAccess = null

    if (!isGroup) {
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
    }

    const message = await createMessage(
      conversationId,
      String(currentUser.id),
      content || null,
      messageType,
      imageUrl || null
    )
    if (!isGroup) {
      latestAccess = await getConversationAccess(conversationId, String(currentUser.id))
      const otherUserId =
        conversation.user1_id === currentUser.id ? conversation.user2_id : conversation.user1_id

      if (String(otherUserId) !== String(currentUser.id)) {
        const rawUnreadCount = Number(conversation.unread_count ?? 0)
        const currentUnreadCount = Number.isFinite(rawUnreadCount) ? rawUnreadCount : 0
        const nextUnreadCount = currentUnreadCount + 1

        const { error: unreadUpdateError } = await supabase
          .from("conversations")
          .update({
            unread_count: nextUnreadCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId)

        if (unreadUpdateError) {
          throw unreadUpdateError
        }
      }

      const senderDisplayName = currentUser.pet_name || currentUser.username || "New message"
      const notificationBody = messageType === "image" ? "📷 Photo" : content

      void sendNewMessagePushNotification({
        conversationId,
        senderId: String(currentUser.id),
        senderDisplayName,
        otherUserId: String(otherUserId),
        content: notificationBody,
      })
    }

    return toDataResponse(res, {
      message,
      access: {
        likedByMe: isGroup ? true : latestAccess?.liked_by_me ?? false,
        likedMe: isGroup ? true : latestAccess?.liked_me ?? false,
        isMatch: isGroup ? true : latestAccess?.is_match ?? false,
        canSendUnlimited: isGroup ? true : latestAccess?.can_send_unlimited ?? false,
        singleMessageUsedByMe: isGroup ? false : latestAccess?.single_message_used_by_me ?? false,
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

app.post("/chat/send", authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentUserById(req.user?.userId)

    if (!currentUser) {
      return sendUnauthorized(res)
    }

    const conversationIdInput = String(
      req.body?.conversationId || req.body?.conversation_id || ""
    ).trim()
    const targetUserId = String(
      req.body?.userId || req.body?.user_id || req.body?.targetUserId || ""
    ).trim()
    const content = String(req.body?.content || "").trim()
    const messageType = String(req.body?.message_type || "text").trim().toLowerCase() || "text"
    const imageUrl = String(req.body?.image_url || "").trim()

    const isTextMessage = messageType === "text"
    const isImageMessage = messageType === "image"
    const isEventMessage = messageType === "event"

    if (!isTextMessage && !isImageMessage && !isEventMessage) {
      return res.status(400).json({
        success: false,
        error: "message_type must be text, image or event",
      })
    }

    if (isTextMessage && !content) {
      return res.status(400).json({
        success: false,
        error: "content is required",
      })
    }

    if (isImageMessage && !imageUrl) {
      return res.status(400).json({
        success: false,
        error: "image_url is required when message_type is image",
      })
    }

    if (isEventMessage) {
      if (!content) {
        return res.status(400).json({
          success: false,
          error: "content is required when message_type is event",
        })
      }

      let parsedEventContent = null

      try {
        parsedEventContent = JSON.parse(content)
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: "content must be valid JSON when message_type is event",
        })
      }

      const eventId = String(parsedEventContent?.eventId || "").trim()
      const title = String(parsedEventContent?.title || "").trim()

      if (!eventId || !title) {
        return res.status(400).json({
          success: false,
          error: "event content must include eventId and title",
        })
      }
    }

    let conversationId = conversationIdInput

    if (!conversationId) {
      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          error: "conversationId or userId is required",
        })
      }

      if (targetUserId === String(currentUser.id)) {
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
      conversationId = String(conversation.id)
    }

    const checked = await checkConversationAccess(conversationId, String(currentUser.id))

    if (!checked) {
      const conversation = await getConversationById(conversationId)

      if (conversation?.type === "event_group") {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
        })
      }

      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      })
    }

    const { conversation, isGroup } = checked
    let latestAccess = null

    if (!isGroup) {
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
    }

    const message = await createMessage(
      conversationId,
      String(currentUser.id),
      content || null,
      messageType,
      imageUrl || null
    )

    if (!isGroup) {
      latestAccess = await getConversationAccess(conversationId, String(currentUser.id))
      const otherUserId =
        conversation.user1_id === currentUser.id ? conversation.user2_id : conversation.user1_id

      if (String(otherUserId) !== String(currentUser.id)) {
        const rawUnreadCount = Number(conversation.unread_count ?? 0)
        const currentUnreadCount = Number.isFinite(rawUnreadCount) ? rawUnreadCount : 0
        const nextUnreadCount = currentUnreadCount + 1

        const { error: unreadUpdateError } = await supabase
          .from("conversations")
          .update({
            unread_count: nextUnreadCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId)

        if (unreadUpdateError) {
          throw unreadUpdateError
        }
      }

      const senderDisplayName = currentUser.pet_name || currentUser.username || "New message"
      const notificationBody = isImageMessage ? "📷 Photo" : isEventMessage ? "📅 Event" : content

      void sendNewMessagePushNotification({
        conversationId,
        senderId: String(currentUser.id),
        senderDisplayName,
        otherUserId: String(otherUserId),
        content: notificationBody,
      })
    }

    return toDataResponse(res, {
      message,
      access: {
        likedByMe: isGroup ? true : latestAccess?.liked_by_me ?? false,
        likedMe: isGroup ? true : latestAccess?.liked_me ?? false,
        isMatch: isGroup ? true : latestAccess?.is_match ?? false,
        canSendUnlimited: isGroup ? true : latestAccess?.can_send_unlimited ?? false,
        singleMessageUsedByMe: isGroup ? false : latestAccess?.single_message_used_by_me ?? false,
      },
    })
  } catch (error) {
    console.error("Chat send alias error:", error)

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
    const symptom = String(
      req.body?.description || req.body?.prompt || req.body?.message || req.body?.symptom || ""
    ).trim()
    const uiLanguage = String(req.body?.uiLanguage || req.body?.locale || "").trim()

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

Language rules:
Respond in the same language as the user's description.
If the description is Korean, answer in Korean.
If the description is Chinese, answer in Chinese.
If the description is English, answer in English.
If the description is another language, answer in that same language as much as possible.
If no description is provided, respond in the current UI language if available; otherwise Korean by default.
Current UI language: ${uiLanguage || "not provided"}

Medical safety rules:
This is preliminary guidance only and cannot replace an in-person veterinarian.
For severe symptoms such as breathing difficulty, repeated seizures, heavy bleeding, inability to stand, rapid worsening, or extreme pain, clearly advise offline veterinary care immediately.

Output format:
[Visual Observations]
[Possible Issues]
[Suggested Care]
[Should Visit a Vet Offline]
Keep the same four-section structure, but write the section headings and content in the response language.

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
