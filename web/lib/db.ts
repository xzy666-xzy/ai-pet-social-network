import Database from "better-sqlite3"
import path from "path"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

const DB_PATH = path.join(process.cwd(), "data", "wepet.db")
const DEFAULT_DAILY_LIKE_LIMIT = 8

let db: Database.Database | null = null

function getNowIso(): string {
  return new Date().toISOString()
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getNowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ")
}

function getFutureSql(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ")
}

function sortPair(a: string, b: string): [string, string] {
  return [a, b].sort() as [string, string]
}

function columnExists(database: Database.Database, tableName: string, columnName: string): boolean {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  return columns.some((column) => column.name === columnName)
}

function ensureColumn(
  database: Database.Database,
  tableName: string,
  columnName: string,
  definition: string
): void {
  if (!columnExists(database, tableName, columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`)
  }
}

function runMigrations(database: Database.Database): void {
  ensureColumn(database, "users", "is_ai", "is_ai INTEGER DEFAULT 0")
  ensureColumn(database, "users", "ai_profile_prompt", "ai_profile_prompt TEXT DEFAULT ''")
  ensureColumn(
    database,
    "users",
    "daily_like_limit",
    `daily_like_limit INTEGER DEFAULT ${DEFAULT_DAILY_LIKE_LIMIT}`
  )
  ensureColumn(
    database,
    "users",
    "profile_like_count_start_at",
    "profile_like_count_start_at TEXT"
  )

  database.exec(`
    UPDATE users
    SET profile_like_count_start_at = CURRENT_TIMESTAMP
    WHERE profile_like_count_start_at IS NULL
       OR profile_like_count_start_at = ''
  `)

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

    CREATE INDEX IF NOT EXISTS idx_conversations_user1_user2 ON conversations(user1_id, user2_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
    ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      like_date TEXT NOT NULL,
      UNIQUE(from_user_id, to_user_id),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_likes_from_user_date
    ON likes(from_user_id, like_date);

    CREATE INDEX IF NOT EXISTS idx_likes_to_user
    ON likes(to_user_id);

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id),
      FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_matches_user1_user2
    ON matches(user1_id, user2_id);

    CREATE TABLE IF NOT EXISTS message_permissions (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      single_message_used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_message_permissions_conversation_user
    ON message_permissions(conversation_id, user_id);

    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_memberships_user_status_expires
    ON memberships(user_id, status, expires_at);
  `)
}

function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs")
    const dir = path.dirname(DB_PATH)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    db = new Database(DB_PATH)
    db.pragma("journal_mode = WAL")
    db.pragma("foreign_keys = ON")

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        pet_name TEXT DEFAULT '',
        pet_breed TEXT DEFAULT '',
        pet_age TEXT DEFAULT '',
        pet_bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '/golden-retriever.png',
        is_ai INTEGER DEFAULT 0,
        ai_profile_prompt TEXT DEFAULT '',
        daily_like_limit INTEGER DEFAULT ${DEFAULT_DAILY_LIKE_LIMIT},
        profile_like_count_start_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user1_id TEXT NOT NULL,
        user2_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)

    runMigrations(db)
  }

  return db
}

export interface User {
  id: string
  email: string
  username: string
  password_hash: string
  pet_name: string
  pet_breed: string
  pet_age: string
  pet_bio: string
  avatar_url: string
  is_ai: number
  ai_profile_prompt: string
  daily_like_limit: number
  profile_like_count_start_at: string
  created_at: string
  updated_at: string
}

export interface UserPublic {
  id: string
  email: string
  username: string
  pet_name: string
  pet_breed: string
  pet_age: string
  pet_bio: string
  avatar_url: string
  is_ai: number
  daily_like_limit: number
  created_at: string
}

export interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: number
  created_at: string
}

export interface Like {
  id: string
  from_user_id: string
  to_user_id: string
  like_date: string
  created_at: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
}

export interface MessagePermission {
  id: string
  conversation_id: string
  user_id: string
  single_message_used: number
  created_at: string
}

export interface Membership {
  id: string
  user_id: string
  plan_name: string
  status: string
  started_at: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface LikeResult {
  conversation: Conversation
  is_mutual_match: boolean
  already_liked: boolean
  remaining_likes: number
}

export interface ConversationAccess {
  conversation_id: string
  current_user_id: string
  other_user_id: string
  other_user_is_ai: number
  liked_by_me: boolean
  liked_me: boolean
  is_match: boolean
  single_message_used_by_me: boolean
  can_send_unlimited: boolean
  can_send_one_intro_message: boolean
  can_send_message: boolean
}

export interface UserConversationSummary {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  updated_at: string
  other_user_id: string
  other_username: string
  other_pet_name: string
  other_avatar_url: string
  other_user_is_ai: number
  last_message: string | null
  last_message_time: string | null
  last_message_sender_id: string | null
  liked_by_me: number
  liked_me: number
  is_match: number
  single_message_used_by_me: number
}

function mapUserToPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    pet_name: user.pet_name,
    pet_breed: user.pet_breed,
    pet_age: user.pet_age,
    pet_bio: user.pet_bio,
    avatar_url: user.avatar_url,
    is_ai: user.is_ai,
    daily_like_limit: user.daily_like_limit,
    created_at: user.created_at,
  }
}

function getUserByIdInternal(userId: string): User | null {
  const database = getDb()
  const user = database.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined
  return user || null
}

function ensureMessagePermissionRow(conversationId: string, userId: string): void {
  const database = getDb()
  database
    .prepare(`
      INSERT OR IGNORE INTO message_permissions (id, conversation_id, user_id, single_message_used)
      VALUES (?, ?, ?, 0)
    `)
    .run(uuidv4(), conversationId, userId)
}

function ensureConversationPermissionRows(conversationId: string, userId1: string, userId2: string): void {
  ensureMessagePermissionRow(conversationId, userId1)
  ensureMessagePermissionRow(conversationId, userId2)
}

export function createUser(
  email: string,
  username: string,
  password: string,
  petName: string = "",
  petBreed: string = "",
  petAge: string = "",
  petBio: string = ""
): UserPublic {
  const database = getDb()
  const id = uuidv4()
  const passwordHash = bcrypt.hashSync(password, 10)

  database
    .prepare(`
      INSERT INTO users (
        id, email, username, password_hash, pet_name, pet_breed, pet_age, pet_bio,
        is_ai, ai_profile_prompt, daily_like_limit, profile_like_count_start_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, '', ?, CURRENT_TIMESTAMP)
    `)
    .run(
      id,
      email.toLowerCase(),
      username,
      passwordHash,
      petName,
      petBreed,
      petAge,
      petBio,
      DEFAULT_DAILY_LIKE_LIMIT
    )

  return {
    id,
    email: email.toLowerCase(),
    username,
    pet_name: petName,
    pet_breed: petBreed,
    pet_age: petAge,
    pet_bio: petBio,
    avatar_url: "/golden-retriever.png",
    is_ai: 0,
    daily_like_limit: DEFAULT_DAILY_LIKE_LIMIT,
    created_at: getNowIso(),
  }
}

export function createAiUser(data: {
  username: string
  pet_name?: string
  pet_breed?: string
  pet_age?: string
  pet_bio?: string
  avatar_url?: string
  ai_profile_prompt?: string
  email?: string
  daily_like_limit?: number
}): UserPublic {
  const database = getDb()
  const id = uuidv4()
  const randomPassword = uuidv4()
  const passwordHash = bcrypt.hashSync(randomPassword, 10)
  const email = (data.email || `${data.username}-${id.slice(0, 8)}@ai.wepet.local`).toLowerCase()
  const dailyLikeLimit = data.daily_like_limit ?? DEFAULT_DAILY_LIKE_LIMIT

  database
    .prepare(`
      INSERT INTO users (
        id, email, username, password_hash, pet_name, pet_breed, pet_age, pet_bio,
        avatar_url, is_ai, ai_profile_prompt, daily_like_limit, profile_like_count_start_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
    `)
    .run(
      id,
      email,
      data.username,
      passwordHash,
      data.pet_name ?? "",
      data.pet_breed ?? "",
      data.pet_age ?? "",
      data.pet_bio ?? "",
      data.avatar_url ?? "/golden-retriever.png",
      data.ai_profile_prompt ?? "",
      dailyLikeLimit
    )

  return {
    id,
    email,
    username: data.username,
    pet_name: data.pet_name ?? "",
    pet_breed: data.pet_breed ?? "",
    pet_age: data.pet_age ?? "",
    pet_bio: data.pet_bio ?? "",
    avatar_url: data.avatar_url ?? "/golden-retriever.png",
    is_ai: 1,
    daily_like_limit: dailyLikeLimit,
    created_at: getNowIso(),
  }
}

export function authenticateUser(email: string, password: string): UserPublic | null {
  const database = getDb()
  const user = database
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as User | undefined

  if (!user) return null
  if (!bcrypt.compareSync(password, user.password_hash)) return null

  return mapUserToPublic(user)
}

export function createSession(userId: string): string {
  const database = getDb()
  const sessionId = uuidv4()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  database
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sessionId, userId, expiresAt)

  return sessionId
}

export function getSessionUser(sessionId: string): UserPublic | null {
  const database = getDb()
  const row = database
    .prepare(`
      SELECT
        u.id, u.email, u.username, u.pet_name, u.pet_breed, u.pet_age, u.pet_bio,
        u.avatar_url, u.is_ai, u.daily_like_limit, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
    `)
    .get(sessionId, getNowIso()) as UserPublic | undefined

  return row || null
}

export function deleteSession(sessionId: string): void {
  const database = getDb()
  database.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId)
}

export function updateUserProfile(
  userId: string,
  data: { pet_name?: string; pet_breed?: string; pet_age?: string; pet_bio?: string; username?: string }
): UserPublic | null {
  const database = getDb()
  const fields: string[] = []
  const values: string[] = []

  if (data.pet_name !== undefined) {
    fields.push("pet_name = ?")
    values.push(data.pet_name)
  }
  if (data.pet_breed !== undefined) {
    fields.push("pet_breed = ?")
    values.push(data.pet_breed)
  }
  if (data.pet_age !== undefined) {
    fields.push("pet_age = ?")
    values.push(data.pet_age)
  }
  if (data.pet_bio !== undefined) {
    fields.push("pet_bio = ?")
    values.push(data.pet_bio)
  }
  if (data.username !== undefined) {
    fields.push("username = ?")
    values.push(data.username)
  }

  if (fields.length === 0) return null

  fields.push("updated_at = CURRENT_TIMESTAMP")
  values.push(userId)

  database.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values)

  const user = database
    .prepare(`
      SELECT
        id, email, username, pet_name, pet_breed, pet_age, pet_bio,
        avatar_url, is_ai, daily_like_limit, created_at
      FROM users
      WHERE id = ?
    `)
    .get(userId) as UserPublic | undefined

  return user || null
}

export function getUserById(userId: string): UserPublic | null {
  const database = getDb()
  const user = database
    .prepare(`
      SELECT
        id, email, username, pet_name, pet_breed, pet_age, pet_bio,
        avatar_url, is_ai, daily_like_limit, created_at
      FROM users
      WHERE id = ?
    `)
    .get(userId) as UserPublic | undefined

  return user || null
}

export function getUserWithPrivateFields(userId: string): User | null {
  return getUserByIdInternal(userId)
}

export function getUserCount(): number {
  const database = getDb()
  const row = database.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }
  return row.count
}

export function getAllUsers(): UserPublic[] {
  const database = getDb()
  return database
    .prepare(`
      SELECT
        id, email, username, pet_name, pet_breed, pet_age, pet_bio,
        avatar_url, is_ai, daily_like_limit, created_at
      FROM users
      ORDER BY created_at DESC
    `)
    .all() as UserPublic[]
}

export function getRealUsers(): UserPublic[] {
  const database = getDb()
  return database
    .prepare(`
      SELECT
        id, email, username, pet_name, pet_breed, pet_age, pet_bio,
        avatar_url, is_ai, daily_like_limit, created_at
      FROM users
      WHERE is_ai = 0
      ORDER BY created_at DESC
    `)
    .all() as UserPublic[]
}

export function getAiUsers(): UserPublic[] {
  const database = getDb()
  return database
    .prepare(`
      SELECT
        id, email, username, pet_name, pet_breed, pet_age, pet_bio,
        avatar_url, is_ai, daily_like_limit, created_at
      FROM users
      WHERE is_ai = 1
      ORDER BY created_at DESC
    `)
    .all() as UserPublic[]
}

export function getOrCreateConversation(userId1: string, userId2: string): Conversation {
  const database = getDb()
  const [a, b] = sortPair(userId1, userId2)

  let conversation = database
    .prepare(`
      SELECT * FROM conversations
      WHERE user1_id = ? AND user2_id = ?
    `)
    .get(a, b) as Conversation | undefined

  if (!conversation) {
    const id = uuidv4()

    database
      .prepare(`
        INSERT INTO conversations (id, user1_id, user2_id)
        VALUES (?, ?, ?)
      `)
      .run(id, a, b)

    conversation = database
      .prepare("SELECT * FROM conversations WHERE id = ?")
      .get(id) as Conversation
  }

  ensureConversationPermissionRows(conversation.id, a, b)
  return conversation
}

export function getConversationById(conversationId: string): Conversation | null {
  const database = getDb()
  const conversation = database
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(conversationId) as Conversation | undefined

  if (!conversation) return null

  ensureConversationPermissionRows(conversation.id, conversation.user1_id, conversation.user2_id)
  return conversation
}

export function getConversationOtherUserId(conversationId: string, currentUserId: string): string | null {
  const conversation = getConversationById(conversationId)
  if (!conversation) return null

  if (conversation.user1_id === currentUserId) return conversation.user2_id
  if (conversation.user2_id === currentUserId) return conversation.user1_id
  return null
}

export function getConversationMessages(conversationId: string): Message[] {
  const database = getDb()

  return database
    .prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `)
    .all(conversationId) as Message[]
}

export function createMessage(conversationId: string, senderId: string, content: string): Message {
  const database = getDb()
  const id = uuidv4()

  database
    .prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content)
      VALUES (?, ?, ?, ?)
    `)
    .run(id, conversationId, senderId, content)

  database
    .prepare(`
      UPDATE conversations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(conversationId)

  return database
    .prepare("SELECT * FROM messages WHERE id = ?")
    .get(id) as Message
}

export function getActiveMembership(userId: string): Membership | null {
  const database = getDb()

  const membership = database
    .prepare(`
      SELECT *
      FROM memberships
      WHERE user_id = ?
        AND status = 'active'
        AND expires_at > ?
      ORDER BY expires_at DESC
      LIMIT 1
    `)
    .get(userId, getNowSql()) as Membership | undefined

  return membership || null
}

export function isUserMember(userId: string): boolean {
  return !!getActiveMembership(userId)
}

export function activateMembership(
  userId: string,
  days: number = 30,
  planName: string = "monthly"
): Membership {
  const database = getDb()
  const startedAt = getNowSql()
  const expiresAt = getFutureSql(days)
  const id = uuidv4()

  database
    .prepare(`
      UPDATE memberships
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND status = 'active'
    `)
    .run(userId)

  database
    .prepare(`
      INSERT INTO memberships (
        id, user_id, plan_name, status, started_at, expires_at
      )
      VALUES (?, ?, ?, 'active', ?, ?)
    `)
    .run(id, userId, planName, startedAt, expiresAt)

  return database
    .prepare(`
      SELECT *
      FROM memberships
      WHERE id = ?
    `)
    .get(id) as Membership
}

export function cancelActiveMembership(userId: string): void {
  const database = getDb()

  database
    .prepare(`
      UPDATE memberships
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP,
          expires_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND status = 'active'
    `)
    .run(userId)
}

export function getDailyLikeCount(userId: string, likeDate: string = getTodayDate()): number {
  const database = getDb()
  const row = database
    .prepare(`
      SELECT COUNT(*) as count
      FROM likes
      WHERE from_user_id = ? AND like_date = ?
    `)
    .get(userId, likeDate) as { count: number }

  return row.count
}

export function getLikeQuota(userId: string, likeDate: string = getTodayDate()) {
  const user = getUserByIdInternal(userId)
  const activeMembership = getActiveMembership(userId)
  const usedLikes = getDailyLikeCount(userId, likeDate)

  if (activeMembership) {
    return {
      isMember: true,
      dailyLimit: null as number | null,
      usedLikes,
      remainingLikes: 9999,
      memberExpiresAt: activeMembership.expires_at,
    }
  }

  const dailyLimit = user?.daily_like_limit ?? DEFAULT_DAILY_LIKE_LIMIT
  const remainingLikes = Math.max(0, dailyLimit - usedLikes)

  return {
    isMember: false,
    dailyLimit,
    usedLikes,
    remainingLikes,
    memberExpiresAt: null as string | null,
  }
}

export function getRemainingLikes(userId: string, likeDate: string = getTodayDate()): number {
  const activeMembership = getActiveMembership(userId)

  if (activeMembership) {
    return 9999
  }

  const user = getUserByIdInternal(userId)
  const limit = user?.daily_like_limit ?? DEFAULT_DAILY_LIKE_LIMIT
  const used = getDailyLikeCount(userId, likeDate)
  return Math.max(0, limit - used)
}

export function hasLiked(fromUserId: string, toUserId: string): boolean {
  const database = getDb()
  const row = database
    .prepare(`
      SELECT 1 as ok
      FROM likes
      WHERE from_user_id = ? AND to_user_id = ?
      LIMIT 1
    `)
    .get(fromUserId, toUserId) as { ok: number } | undefined

  return !!row
}

export function getOrCreateMatch(userId1: string, userId2: string): Match {
  const database = getDb()
  const [a, b] = sortPair(userId1, userId2)

  let match = database
    .prepare(`
      SELECT * FROM matches
      WHERE user1_id = ? AND user2_id = ?
    `)
    .get(a, b) as Match | undefined

  if (!match) {
    const id = uuidv4()

    database
      .prepare(`
        INSERT INTO matches (id, user1_id, user2_id)
        VALUES (?, ?, ?)
      `)
      .run(id, a, b)

    match = database
      .prepare("SELECT * FROM matches WHERE id = ?")
      .get(id) as Match
  }

  return match
}

export function isUsersMatched(userId1: string, userId2: string): boolean {
  const database = getDb()
  const [a, b] = sortPair(userId1, userId2)

  const row = database
    .prepare(`
      SELECT 1 as ok
      FROM matches
      WHERE user1_id = ? AND user2_id = ?
      LIMIT 1
    `)
    .get(a, b) as { ok: number } | undefined

  return !!row
}

export function createLike(fromUserId: string, toUserId: string): LikeResult {
  if (fromUserId === toUserId) {
    throw new Error("You cannot like yourself")
  }

  const database = getDb()
  const fromUser = getUserByIdInternal(fromUserId)
  const toUser = getUserByIdInternal(toUserId)

  if (!fromUser || !toUser) {
    throw new Error("User not found")
  }

  const likeDate = getTodayDate()
  const alreadyLiked = hasLiked(fromUserId, toUserId)

  if (!alreadyLiked) {
    const activeMembership = getActiveMembership(fromUserId)

    if (!activeMembership) {
      const usedToday = getDailyLikeCount(fromUserId, likeDate)
      const dailyLimit = fromUser.daily_like_limit || DEFAULT_DAILY_LIKE_LIMIT

      if (usedToday >= dailyLimit) {
        throw new Error(`Today's like limit has been reached (${dailyLimit})`)
      }
    }

    database
      .prepare(`
        INSERT INTO likes (id, from_user_id, to_user_id, like_date)
        VALUES (?, ?, ?, ?)
      `)
      .run(uuidv4(), fromUserId, toUserId, likeDate)
  }

  const conversation = getOrCreateConversation(fromUserId, toUserId)
  const isMutualMatch = hasLiked(toUserId, fromUserId)

  if (isMutualMatch) {
    getOrCreateMatch(fromUserId, toUserId)
  }

  return {
    conversation,
    is_mutual_match: isMutualMatch,
    already_liked: alreadyLiked,
    remaining_likes: getRemainingLikes(fromUserId, likeDate),
  }
}

export function getMessagePermission(conversationId: string, userId: string): MessagePermission | null {
  const database = getDb()
  const permission = database
    .prepare(`
      SELECT *
      FROM message_permissions
      WHERE conversation_id = ? AND user_id = ?
    `)
    .get(conversationId, userId) as MessagePermission | undefined

  return permission || null
}

export function markSingleMessageUsed(conversationId: string, userId: string): void {
  const database = getDb()
  ensureMessagePermissionRow(conversationId, userId)

  database
    .prepare(`
      UPDATE message_permissions
      SET single_message_used = 1
      WHERE conversation_id = ? AND user_id = ?
    `)
    .run(conversationId, userId)
}

export function resetSingleMessageUsed(conversationId: string, userId: string): void {
  const database = getDb()
  ensureMessagePermissionRow(conversationId, userId)

  database
    .prepare(`
      UPDATE message_permissions
      SET single_message_used = 0
      WHERE conversation_id = ? AND user_id = ?
    `)
    .run(conversationId, userId)
}

export function getConversationAccess(conversationId: string, currentUserId: string): ConversationAccess | null {
  const conversation = getConversationById(conversationId)
  if (!conversation) return null

  const otherUserId = getConversationOtherUserId(conversationId, currentUserId)
  if (!otherUserId) return null

  const otherUser = getUserByIdInternal(otherUserId)
  const permission = getMessagePermission(conversationId, currentUserId)
  const likedByMe = hasLiked(currentUserId, otherUserId)
  const likedMe = hasLiked(otherUserId, currentUserId)
  const isMatch = isUsersMatched(currentUserId, otherUserId)
  const singleMessageUsedByMe = !!permission?.single_message_used
  const canSendUnlimited = isMatch
  const canSendOneIntroMessage = likedByMe && !isMatch && !singleMessageUsedByMe
  const canSendMessage = canSendUnlimited || canSendOneIntroMessage

  return {
    conversation_id: conversationId,
    current_user_id: currentUserId,
    other_user_id: otherUserId,
    other_user_is_ai: otherUser?.is_ai ?? 0,
    liked_by_me: likedByMe,
    liked_me: likedMe,
    is_match: isMatch,
    single_message_used_by_me: singleMessageUsedByMe,
    can_send_unlimited: canSendUnlimited,
    can_send_one_intro_message: canSendOneIntroMessage,
    can_send_message: canSendMessage,
  }
}

export function getUserConversations(userId: string): UserConversationSummary[] {
  const database = getDb()

  return database
    .prepare(`
      SELECT
        c.*,
        u.id as other_user_id,
        u.username as other_username,
        u.pet_name as other_pet_name,
        u.avatar_url as other_avatar_url,
        u.is_ai as other_user_is_ai,
        (
          SELECT m.content
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT m.created_at
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message_time,
        (
          SELECT m.sender_id
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message_sender_id,
        EXISTS(
          SELECT 1
          FROM likes l
          WHERE l.from_user_id = ? AND l.to_user_id = u.id
        ) as liked_by_me,
        EXISTS(
          SELECT 1
          FROM likes l
          WHERE l.from_user_id = u.id AND l.to_user_id = ?
        ) as liked_me,
        EXISTS(
          SELECT 1
          FROM matches mt
          WHERE mt.user1_id = c.user1_id AND mt.user2_id = c.user2_id
        ) as is_match,
        COALESCE((
          SELECT mp.single_message_used
          FROM message_permissions mp
          WHERE mp.conversation_id = c.id AND mp.user_id = ?
          LIMIT 1
        ), 0) as single_message_used_by_me
      FROM conversations c
      JOIN users u
        ON u.id = CASE
          WHEN c.user1_id = ? THEN c.user2_id
          ELSE c.user1_id
        END
      WHERE (c.user1_id = ? OR c.user2_id = ?)
        AND (
          EXISTS(
            SELECT 1
            FROM likes l1
            WHERE l1.from_user_id = ? AND l1.to_user_id = u.id
          )
          OR EXISTS(
            SELECT 1
            FROM likes l2
            WHERE l2.from_user_id = u.id AND l2.to_user_id = ?
          )
        )
      ORDER BY c.updated_at DESC
    `)
    .all(
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId
    ) as UserConversationSummary[]
}

export function getProfileStats(userId: string) {
  const database = getDb()

  const user = database
    .prepare(`
      SELECT profile_like_count_start_at
      FROM users
      WHERE id = ?
    `)
    .get(userId) as { profile_like_count_start_at: string } | undefined

  const startAt = user?.profile_like_count_start_at || "1970-01-01 00:00:00"

  const likesRow = database
    .prepare(`
      SELECT COUNT(*) as count
      FROM likes
      WHERE from_user_id = ?
        AND created_at >= ?
    `)
    .get(userId, startAt) as { count: number }

  const mutualRow = database
    .prepare(`
      SELECT COUNT(*) as count
      FROM matches
      WHERE (user1_id = ? OR user2_id = ?)
        AND created_at >= ?
    `)
    .get(userId, userId, startAt) as { count: number }

  return {
    likedCount: likesRow.count,
    mutualMatchCount: mutualRow.count,
    countStartAt: startAt,
  }
}

export function getAvailableMatchUsers(currentUserId: string): UserPublic[] {
  const database = getDb()

  return database
    .prepare(`
      SELECT
        id, email, username, pet_name, pet_breed, pet_age, pet_bio,
        avatar_url, is_ai, daily_like_limit, created_at
      FROM users u
      WHERE u.id != ?
        AND NOT EXISTS (
          SELECT 1
          FROM likes l
          WHERE l.from_user_id = ?
            AND l.to_user_id = u.id
        )
      ORDER BY RANDOM()
    `)
    .all(currentUserId, currentUserId) as UserPublic[]
}