"use client"

import { type ChangeEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Send, ChevronLeft, Heart, Settings, ImagePlus, Pin, BellOff, Upload, Loader2, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"
import { apiRequest, ApiError, getAccessToken } from "@/lib/api-client"
import { supabase } from "@/lib/supabase"

type ChatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  message_type?: "text" | "image"
  image_url?: string | null
  is_read?: number
  is_deleted?: boolean | number
  deleted_at?: string | null
  created_at: string
}

type TargetUser = {
  id: string
  username: string | null
  petName?: string | null
  pet_name: string | null
  petAge?: number | string | null
  avatar_url: string | null
  pet_age?: number | null
  petType?: string | null
  pet_type?: string | null
  petBio?: string | null
  pet_bio?: string | null
  description?: string | null
  last_seen?: string | null
  is_ai?: boolean | number | null
  cover_url?: string | null
  coverImage?: string | null
  cover_image_url?: string | null
  email?: string | null
  pet_gender?: string | null
  tagline?: string | null
}

type ConversationSummary = {
  id: string
  type?: string | null
  event_id?: string | null
  event_title?: string | null
  member_count?: number
  other_user_id: string
  other_username: string
  other_pet_name: string
  other_avatar_url: string
  other_user_is_ai?: number
  other_last_seen?: string | null
  other_membership_active?: boolean
  last_message: string | null
  last_message_time: string | null
  is_pinned?: boolean | number | null
  is_muted?: boolean | number | null
  liked_by_me?: number
  liked_me?: number
  is_match?: number
  single_message_used_by_me?: number
  last_message_type?: "text" | "image" | null
  unread_count?: number | null
}

type ConversationsResponse = {
  success: true
  data: {
    conversations: ConversationSummary[]
  }
}

type MessagesResponse = {
  success: true
  data: {
    messages: ChatMessage[]
  }
}

type CreateConversationResponse = {
  success: true
  data: {
    conversationId: string
    conversation: {
      id: string
    }
    targetUser: TargetUser
  }
}

type SendMessageResponse = {
  success: true
  data: {
    message: ChatMessage
    access: {
      likedByMe: boolean
      likedMe: boolean
      isMatch: boolean
      canSendUnlimited: boolean
      singleMessageUsedByMe: boolean
    }
  }
}

type DeleteMessageResponse = {
  success: true
  data: {
    message: ChatMessage
  }
}

type DeleteConversationResponse = {
  success: true
}

type MarkConversationReadResponse = {
  success: true
  data: {
    conversationId: string
    unread_count: number
  }
}

type MatchLikeResponse = {
  success: true
  data: {
    isMutualMatch?: boolean
    isMatch?: boolean
    matched?: boolean
  }
}

type ProfileLikeResponse = {
  success: true
  data: {
    liked: boolean
    count: number
  }
}

type ChatSettings = {
  background_key?: string | null
  background_url?: string | null
  is_muted?: boolean | number | null
  is_pinned?: boolean | number | null
}

type ChatSettingsResponse = {
  success?: boolean
  data?: ChatSettings | null
  background_key?: string | null
  background_url?: string | null
  is_muted?: boolean | number | null
  is_pinned?: boolean | number | null
}

type ChatBackgroundKey = "default" | "orange" | "green" | "blue"

const CHAT_BACKGROUND_OPTIONS: ChatBackgroundKey[] = ["default", "orange", "green", "blue"]

function parseBackgroundKey(value: unknown): ChatBackgroundKey {
  if (value === "orange" || value === "green" || value === "blue" || value === "default") {
    return value
  }
  return "default"
}

function parseBackgroundUrl(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function sanitizeStorageToken(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

  return cleaned || "file"
}

function resolveImageExtension(file: File): string {
  const typeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "image/avif": "avif",
  }

  if (typeMap[file.type]) {
    return typeMap[file.type]
  }

  const nameExt = file.name.split(".").pop()?.toLowerCase() || ""
  const safeExt = nameExt.replace(/[^a-z0-9]/g, "")
  const allowList = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "avif"])

  if (allowList.has(safeExt)) {
    return safeExt === "jpeg" ? "jpg" : safeExt
  }

  return "jpg"
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

function getChatBackgroundClass(backgroundKey: ChatBackgroundKey) {
  if (backgroundKey === "orange") {
    return "bg-gradient-to-br from-orange-50/55 via-amber-50/45 to-stone-50"
  }
  if (backgroundKey === "green") {
    return "bg-gradient-to-br from-emerald-50/55 via-lime-50/45 to-stone-50"
  }
  if (backgroundKey === "blue") {
    return "bg-gradient-to-br from-sky-50/60 via-blue-50/45 to-stone-50"
  }
  return "bg-gradient-to-b from-[#fffaf5] via-[#f8f7f4] to-[#f5f6f8]"
}

function isUserOnline(lastSeen?: string | null) {
  if (!lastSeen) {
    return false
  }

  const lastSeenTime = new Date(lastSeen).getTime()
  if (Number.isNaN(lastSeenTime)) {
    return false
  }

  return Date.now() - lastSeenTime <= 3 * 60 * 1000
}

export default function ChatPage() {
  const { t } = useLanguage()
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const targetUserId = searchParams.get("userId")
  const conversationIdParam = searchParams.get("conversationId")
  const showProfile = searchParams.get("showProfile")
  const isConversationMode = Boolean(conversationIdParam)

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [chatTab, setChatTab] = useState<"direct" | "group">("direct")
  const [targetUser, setTargetUser] = useState<TargetUser | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [inputText, setInputText] = useState("")
  const [sending, setSending] = useState(false)
  const [pageError, setPageError] = useState("")
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [inlineNotice, setInlineNotice] = useState<string | boolean>(false)
  const [introLocked, setIntroLocked] = useState(false)
  const [chatLikeLoading, setChatLikeLoading] = useState(false)
  const [chatLiked, setChatLiked] = useState(false)
  const [chatMatched, setChatMatched] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileLiked, setProfileLiked] = useState(false)
  const [profileLikeCount, setProfileLikeCount] = useState(0)
  const [profileLikeLoading, setProfileLikeLoading] = useState(false)
  const [profileLikeInitialized, setProfileLikeInitialized] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [background_key, setBackgroundKey] = useState<ChatBackgroundKey>("default")
  const [background_url, setBackgroundUrl] = useState("")
  const [is_muted, setIsMuted] = useState(false)
  const [is_pinned, setIsPinned] = useState(false)
  const [messageMenu, setMessageMenu] = useState<ChatMessage | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [deletingConversation, setDeletingConversation] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [backgroundUploadError, setBackgroundUploadError] = useState("")
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundImageInputRef = useRef<HTMLInputElement | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoProfileOpenedRef = useRef(false)
  const hasToken = Boolean(getAccessToken())

  const hasCustomBackground = Boolean(background_url)

  const activeConversationSummary = useMemo(
    () => conversations.find((item) => item.id === conversationIdParam) || null,
    [conversations, conversationIdParam]
  )

  const chatBackgroundClass = useMemo(
      () => getChatBackgroundClass(background_key),
      [background_key]
  )

  const chatBackgroundStyle = useMemo(() => {
    if (!hasCustomBackground) {
      return undefined
    }

    return {
      backgroundImage: `url("${background_url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    } as const
  }, [background_url, hasCustomBackground])

  const headerName = useMemo(() => {
    if (isConversationMode) {
      return activeConversationSummary?.event_title?.trim() || "活动群聊"
    }
    if (!targetUserId) return t.chat.title
    if (!targetUser) return t.chat.title
    return targetUser.petName?.trim() || targetUser.pet_name?.trim() || targetUser.username || t.chat.title
  }, [activeConversationSummary?.event_title, isConversationMode, targetUser, targetUserId, t.chat.title])

  const profilePetName = targetUser?.petName || targetUser?.pet_name || targetUser?.username || "-"
  const profilePetAge = targetUser?.petAge ?? targetUser?.pet_age ?? "Age not set"
  const profilePetType = targetUser?.petType || targetUser?.pet_type || "Type not set"
  const hasProfileDescription = Boolean(
      targetUser?.description || targetUser?.petBio || targetUser?.pet_bio
  )
  const profileDescription =
      targetUser?.description || targetUser?.petBio || targetUser?.pet_bio || "No bio yet"
  const targetOnline = isUserOnline(targetUser?.last_seen)

  const loadMessages = async (convId: string) => {
    const data = isConversationMode
      ? await apiRequest<MessagesResponse>(`/chat/messages?conversationId=${encodeURIComponent(convId)}`, {
          cache: "no-store",
          auth: true,
        })
      : await apiRequest<MessagesResponse>(`/chat/messages/${convId}`, {
          cache: "no-store",
          auth: true,
        })

    const safeMessages = Array.isArray(data.data.messages) ? data.data.messages : []
    setMessages(safeMessages)

    return safeMessages as ChatMessage[]
  }

  const loadConversations = async () => {
    const data = await apiRequest<ConversationsResponse>("/chat/conversations", {
      cache: "no-store",
      auth: true,
    })

    const safeConversations = Array.isArray(data.data.conversations)
        ? data.data.conversations.filter(
            (item: ConversationSummary) => {
              if (!item) return false
              // event_group conversations don't have other_user_id
              if (item.type === "event_group") return true
              // direct conversations must have a valid other_user_id
              return (
                typeof item.other_user_id === "string" &&
                item.other_user_id.trim() !== "" &&
                item.other_user_id !== "undefined" &&
                item.other_user_id !== "null"
              )
            }
        )
        : []

    setConversations(safeConversations)
    return safeConversations
  }

  const markConversationAsRead = async (convId: string) => {
    await apiRequest<MarkConversationReadResponse>(`/chat/conversations/${convId}/read`, {
      method: "PATCH",
      auth: true,
    })

    setConversations((prev) =>
      prev.map((item) =>
        item.id === convId
          ? {
              ...item,
              unread_count: 0,
            }
          : item
      )
    )
  }

  const loadChatSettings = async (convId: string) => {
    try {
      const data = await apiRequest<ChatSettingsResponse>(`/chat/settings?conversation_id=${encodeURIComponent(convId)}`, {
        cache: "no-store",
        auth: true,
      })

      const source = data?.data && typeof data.data === "object" ? data.data : data

      setBackgroundKey(parseBackgroundKey(source?.background_key))
      setBackgroundUrl(parseBackgroundUrl(source?.background_url))
      setIsMuted(normalizeBoolean(source?.is_muted))
      setIsPinned(normalizeBoolean(source?.is_pinned))
    } catch (error) {
      console.warn("Failed to load chat settings:", error)
    }
  }

  const saveChatSettings = async (next: Partial<{ background_key: ChatBackgroundKey; background_url: string | null; is_muted: boolean; is_pinned: boolean }>) => {
    if (!conversationId) return

    try {
      await apiRequest<ChatSettingsResponse>("/chat/settings", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          conversation_id: conversationId,
          ...next,
        }),
      })
    } catch (error) {
      console.warn("Failed to save chat settings:", error)
    }
  }

  const handleMuteChange = (checked: boolean) => {
    setIsMuted(checked)
    saveChatSettings({ is_muted: checked })
  }

  const handlePinChange = (checked: boolean) => {
    setIsPinned(checked)
    saveChatSettings({ is_pinned: checked })
  }

  const handleBackgroundChange = (nextBackgroundKey: ChatBackgroundKey) => {
    setBackgroundKey(nextBackgroundKey)
    setBackgroundUrl("")
    setBackgroundUploadError("")
    saveChatSettings({ background_key: nextBackgroundKey, background_url: "" })
  }

  const handlePickBackgroundImage = () => {
    if (!conversationId || uploadingBackground) return
    backgroundImageInputRef.current?.click()
  }

  const handleBackgroundImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file || !conversationId || !user?.id || uploadingBackground) return

    if (!file.type.startsWith("image/")) {
      setBackgroundUploadError("Only image files are allowed")
      return
    }

    try {
      setUploadingBackground(true)
      setBackgroundUploadError("")

      const ext = resolveImageExtension(file)
      const safeConversationId = sanitizeStorageToken(conversationId)
      const safeUserId = sanitizeStorageToken(String(user.id))
      const filePath = `${safeConversationId}/${safeUserId}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("chat-backgrounds")
        .upload(filePath, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: publicData } = supabase.storage
        .from("chat-backgrounds")
        .getPublicUrl(filePath)
      const publicUrl = publicData.publicUrl

      if (!publicUrl) {
        throw new Error("Failed to resolve uploaded background URL")
      }

      setBackgroundUrl(publicUrl)
      await saveChatSettings({ background_url: publicUrl })
    } catch (error) {
      setBackgroundUploadError(error instanceof Error ? error.message : "Failed to upload background")
    } finally {
      setUploadingBackground(false)
    }
  }

  const handleDeleteConversation = async () => {
    if (!conversationId || deletingConversation) return

    const confirmed = window.confirm(t.chat.settings.delete)
    if (!confirmed) return

    try {
      setDeletingConversation(true)

      await apiRequest<DeleteConversationResponse>(`/chat/conversations/${conversationId}`, {
        method: "DELETE",
        auth: true,
      })

      setSettingsOpen(false)
      setProfileOpen(false)
      setConversationId(null)
      setTargetUser(null)
      setMessages([])
      setInputText("")
      setInlineNotice(false)
      setIntroLocked(false)
      setChatLiked(false)
      setChatMatched(false)
      setBackgroundKey("default")
      setBackgroundUrl("")
      setBackgroundUploadError("")
      setIsMuted(false)
      setIsPinned(false)
      setMessageMenu(null)
      setDeletingMessageId(null)

      await loadConversations()
      router.push("/chat")
      router.refresh()
    } catch (error) {
      console.warn("Failed to delete conversation:", error)
    } finally {
      setDeletingConversation(false)
    }
  }

  useEffect(() => {
    if (loading) return
    if (!hasToken) return

    let cancelled = false

    async function initPage() {
      try {
        setPageError("")
        setInlineNotice(false)
        setConversationId(null)
        setTargetUser(null)
        setMessages([])
        setIntroLocked(false)
        setChatLiked(false)
        setChatMatched(false)
        setProfileOpen(false)
        setSettingsOpen(false)
        setBackgroundKey("default")
        setBackgroundUrl("")
        setBackgroundUploadError("")
        setIsMuted(false)
        setIsPinned(false)
        setMessageMenu(null)
        setDeletingMessageId(null)
        autoProfileOpenedRef.current = false

        if (conversationIdParam) {
          const safeConversationId = String(conversationIdParam).trim()

          if (
            !safeConversationId ||
            safeConversationId === "undefined" ||
            safeConversationId === "null"
          ) {
            throw new Error("Invalid conversation ID")
          }

          setConversationId(safeConversationId)
          setTargetUser(null)

          await loadChatSettings(safeConversationId)
          await loadMessages(safeConversationId)
          await loadConversations()
          return
        }

        if (!targetUserId) {
          setLoadingConversations(true)
          await loadConversations()
          return
        }

        const safeTargetUserId = String(targetUserId).trim()

        if (
            !safeTargetUserId ||
            safeTargetUserId === "undefined" ||
            safeTargetUserId === "null"
        ) {
          throw new Error("Invalid target user")
        }

        const data = await apiRequest<CreateConversationResponse>("/chat/conversations", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ targetUserId: safeTargetUserId }),
        })

        if (cancelled) return

        if (!data.data.conversationId) {
          throw new Error("Conversation ID not found")
        }

        if (!data.data.targetUser) {
          throw new Error("Target user data not found")
        }

        setConversationId(data.data.conversationId)
        setTargetUser(data.data.targetUser)

        await loadChatSettings(data.data.conversationId)

        const loadedMessages = await loadMessages(data.data.conversationId)
        const latestConversations = await loadConversations()

        if (cancelled) return

        const currentConversation = latestConversations.find(
            (item) => item.other_user_id === safeTargetUserId
        )
        const isMatched = Boolean(currentConversation?.is_match)

        setChatMatched(isMatched)

        // 如果当前会话里已经有我发出的消息，并且还没 match，就锁住输入框
        const hasMyMessage = loadedMessages.some(
            (msg) => msg.sender_id === user?.id
        )

        if (hasMyMessage && !isMatched) {
          setIntroLocked(true)
          setInlineNotice(true)
        }
      } catch (error: unknown) {
        if (cancelled) return
        setPageError(
            error instanceof Error ? error.message : "Failed to initialize chat"
        )
      } finally {
        if (!cancelled) {
          setLoadingConversations(false)
        }
      }
    }

    initPage()

    return () => {
      cancelled = true
    }
  }, [loading, user, targetUserId, conversationIdParam, hasToken])

  // 自动打开资料弹窗（来自 profile_like 通知）
  useEffect(() => {
    if (isConversationMode) return
    if (
      showProfile === "true" &&
      targetUser &&
      targetUserId &&
      !autoProfileOpenedRef.current
    ) {
      autoProfileOpenedRef.current = true
      setProfileOpen(true)
    }
  }, [isConversationMode, showProfile, targetUser, targetUserId])

  useEffect(() => {
    if (!conversationId) {
      setBackgroundKey("default")
      setBackgroundUrl("")
      setBackgroundUploadError("")
      setIsMuted(false)
      setIsPinned(false)
      return
    }

    loadChatSettings(conversationId)
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    if (!targetUserId && !isConversationMode) return

    let cancelled = false

    const run = async () => {
      try {
        await apiRequest<MarkConversationReadResponse>(`/chat/conversations/${conversationId}/read`, {
          method: "PATCH",
          auth: true,
        })

        if (cancelled) return

        setConversations((prev) =>
          prev.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  unread_count: 0,
                }
              : item
          )
        )
      } catch (error) {
        console.warn("Failed to mark conversation as read:", error)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [targetUserId, conversationId, isConversationMode])

  useEffect(() => {
    if (!conversationId) return

    const timer = setInterval(async () => {
      try {
        const latestMessages = await loadMessages(conversationId)

        const hasMyMessage = latestMessages.some(
            (msg) => msg.sender_id === user?.id
        )

        if (hasMyMessage && !introLocked && !chatMatched) {
          setIntroLocked(true)
        }
      } catch {
        // ignore polling errors
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [conversationId, user?.id, introLocked, chatMatched])

  useEffect(() => {
    if (isConversationMode) return
    if (targetUserId) return
    if (loading || !hasToken) return

    const timer = setInterval(() => {
      loadConversations().catch(() => {})
    }, 3000)

    return () => clearInterval(timer)
  }, [isConversationMode, targetUserId, loading, hasToken])

  const handleMessageLike = async () => {
    if (!targetUserId || chatLikeLoading || chatLiked) return

    try {
      setChatLikeLoading(true)

      const data = await apiRequest<MatchLikeResponse>("/match/like", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ targetUserId }),
      })

      setChatLiked(true)

      const isMatched =
          Boolean(data.data.isMutualMatch) ||
          Boolean(data.data.isMatch) ||
          Boolean(data.data.matched)

      if (isMatched) {
        setChatMatched(true)
        setIntroLocked(false)
        setInlineNotice(false)

        if (conversationId) {
          await loadMessages(conversationId)
        }

        return
      }

      const latestConversations = await apiRequest<ConversationsResponse>(
          "/chat/conversations",
          {
            cache: "no-store",
            auth: true,
          }
      )
      const currentConversation = latestConversations.data.conversations.find(
          (item) => item.other_user_id === targetUserId
      )

      if (currentConversation?.is_match) {
        setChatMatched(true)
        setIntroLocked(false)
        setInlineNotice(false)
      }

      if (conversationId) {
        await loadMessages(conversationId)
      }
    } catch (error) {
      console.error("Failed to like from chat:", error)
      alert("Failed to like this pet. Please try again.")
    } finally {
      setChatLikeLoading(false)
    }
  }

  // 打开弹窗时获取点赞状态
  useEffect(() => {
    if (!profileOpen || !targetUserId || !user) return

    let cancelled = false

    const fetchProfileLike = async () => {
      try {
        const data = await apiRequest<ProfileLikeResponse>(`/profile/like/${targetUserId}`, {
          cache: "no-store",
          auth: true,
        })

        if (cancelled) return

        // 兼容两种返回格式：
        //   { success: true, data: { liked: true, count: 1 } }
        //   { success: true, liked: true, count: 1 }
        const likeData = data.data ?? data
        setProfileLiked(Boolean(likeData.liked))
        setProfileLikeCount(Number(likeData.count ?? 0))
        setProfileLikeInitialized(true)
      } catch (error) {
        console.warn("Failed to fetch profile like status:", error)
        if (!cancelled) {
          setProfileLikeInitialized(true)
        }
      }
    }

    fetchProfileLike()

    return () => {
      cancelled = true
    }
  }, [profileOpen, targetUserId, user])

  const handleProfileLike = async () => {
    if (!targetUserId || !user || profileLikeLoading || !profileLikeInitialized) return

    // 自己不能给自己点赞
    if (targetUserId === user.id) return

    try {
      setProfileLikeLoading(true)

      if (profileLiked) {
        // 取消点赞
        await apiRequest(`/profile/like/${targetUserId}`, {
          method: "DELETE",
          auth: true,
        })

        setProfileLiked(false)
        setProfileLikeCount((prev) => Math.max(0, prev - 1))
      } else {
        // 点赞
        await apiRequest("/profile/like", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ targetUserId }),
        })

        setProfileLiked(true)
        setProfileLikeCount((prev) => prev + 1)
      }
    } catch (error) {
      console.warn("Failed to toggle profile like:", error)
    } finally {
      setProfileLikeLoading(false)
    }
  }

  const handleSend = async () => {
    if (!conversationId || !inputText.trim() || sending || introLocked) return

    try {
      setSending(true)
      setInlineNotice(false)
      setPageError("")

      const text = inputText.trim()

      const sendPath = isConversationMode ? "/chat/send" : "/chat/messages"

      const data = await apiRequest<SendMessageResponse>(sendPath, {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          conversationId,
          content: text,
          message_type: "text",
          image_url: null,
        }),
      })

      setInputText("")
      setPageError("")

      // 发成功后立刻重新拉取，确保第一条消息显示出来
      await loadMessages(conversationId)

      if (!isConversationMode) {
        if (!data.data.access?.isMatch) {
          setInlineNotice(true)
          setIntroLocked(true)
        } else {
          setInlineNotice(false)
          setIntroLocked(false)
        }
      }
    } catch (error: unknown) {
      if (isConversationMode) {
        if (error instanceof Error) {
          setPageError(error.message)
        } else {
          setPageError(t.chat.sendFailed)
        }
        return
      }

      if (
          error instanceof ApiError &&
          (error.code === "INTRO_MESSAGE_LIMIT_REACHED" ||
              error.code === "LIKE_REQUIRED" ||
              error.code === "MESSAGE_NOT_ALLOWED")
      ) {
        setInlineNotice(error.code)

        if (error.code === "INTRO_MESSAGE_LIMIT_REACHED") {
          setIntroLocked(true)
        }

        await loadMessages(conversationId)
        return
      }

      if (error instanceof Error) {
        setPageError(error.message)
      } else {
        setPageError(t.chat.sendFailed)
      }
    } finally {
      setSending(false)
    }
  }

  const handlePickImage = () => {
    if (!conversationId || introLocked || sending || uploadingImage) return
    if (!targetUserId && !isConversationMode) return
    imageInputRef.current?.click()
  }

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file || !conversationId || sending || uploadingImage || introLocked) return

    try {
      setUploadingImage(true)
      setInlineNotice(false)
      setPageError("")

      const filePath = `chat-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: publicData } = supabase.storage.from("chat-images").getPublicUrl(filePath)
      const publicUrl = publicData.publicUrl

      if (!publicUrl) {
        throw new Error("Failed to resolve uploaded image URL")
      }

      const sendPath = isConversationMode ? "/chat/send" : "/chat/messages"

      const data = await apiRequest<SendMessageResponse>(sendPath, {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          conversationId,
          message_type: "image",
          image_url: publicUrl,
          content: null,
        }),
      })

      await loadMessages(conversationId)

      if (!isConversationMode) {
        if (!data.data.access?.isMatch) {
          setInlineNotice(true)
          setIntroLocked(true)
        } else {
          setInlineNotice(false)
          setIntroLocked(false)
        }
      }
    } catch (error: unknown) {
      if (isConversationMode) {
        if (error instanceof Error) {
          setPageError(error.message)
        } else {
          setPageError(t.chat.sendFailed)
        }
        return
      }

      if (
        error instanceof ApiError &&
        (error.code === "INTRO_MESSAGE_LIMIT_REACHED" ||
          error.code === "LIKE_REQUIRED" ||
          error.code === "MESSAGE_NOT_ALLOWED")
      ) {
        setInlineNotice(error.code)

        if (error.code === "INTRO_MESSAGE_LIMIT_REACHED") {
          setIntroLocked(true)
        }

        await loadMessages(conversationId)
        return
      }

      if (error instanceof Error) {
        setPageError(error.message)
      } else {
        setPageError(t.chat.sendFailed)
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    })
  }

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleMessageContextMenu = (
      event: MouseEvent,
      message: ChatMessage
  ) => {
    event.preventDefault()
    setMessageMenu(message)
  }

  const handleMessageTouchStart = (message: ChatMessage) => {
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      setMessageMenu(message)
      longPressTimerRef.current = null
    }, 550)
  }

  const handleDeleteMessage = async () => {
    if (!messageMenu || deletingMessageId) return

    try {
      setDeletingMessageId(messageMenu.id)

      const data = await apiRequest<DeleteMessageResponse>(
          `/chat/messages/${messageMenu.id}`,
          {
            method: "DELETE",
            auth: true,
          }
      )
      const updatedMessage = data.data.message

      setMessages((prev) =>
          prev.map((message) =>
              message.id === updatedMessage.id
                  ? {
                    ...message,
                    ...updatedMessage,
                    is_deleted: true,
                  }
                  : message
          )
      )
      setMessageMenu(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      alert(message)
    } finally {
      setDeletingMessageId(null)
    }
  }

  const shouldShowTimeDivider = (
      prev: ChatMessage | undefined,
      current: ChatMessage
  ) => {
    if (!prev) return true

    const prevTime = new Date(prev.created_at).getTime()
    const currentTime = new Date(current.created_at).getTime()

    if (Number.isNaN(prevTime) || Number.isNaN(currentTime)) return false

    return currentTime - prevTime > 5 * 60 * 1000
  }

  const getKstDateParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)

    return {
      year: parts.find((part) => part.type === "year")?.value || "",
      month: parts.find((part) => part.type === "month")?.value || "",
      day: parts.find((part) => part.type === "day")?.value || "",
    }
  }

  const formatChatDividerTime = (time: string) => {
    const date = new Date(time)
    if (Number.isNaN(date.getTime())) return ""

    const messageDate = getKstDateParts(date)
    const today = getKstDateParts(new Date())
    const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const yesterday = getKstDateParts(yesterdayDate)
    const formattedTime = date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    })

    const messageDateKey = `${messageDate.year}/${messageDate.month}/${messageDate.day}`
    const todayKey = `${today.year}/${today.month}/${today.day}`
    const yesterdayKey = `${yesterday.year}/${yesterday.month}/${yesterday.day}`

    if (messageDateKey === todayKey) {
      return formattedTime
    }

    if (messageDateKey === yesterdayKey) {
      return `${t.chat.yesterday} ${formattedTime}`
    }

    return `${messageDateKey} ${formattedTime}`
  }

  const getConversationStatusText = (item: ConversationSummary) => {
    if (item.is_match) return t.chat.statusMatched
    if (item.liked_by_me) return t.chat.statusLikedByMe
    if (item.liked_me) return t.chat.statusLikedMe
    return t.chat.statusNoRelation
  }

  const filteredConversations = useMemo(() => {
    if (chatTab === "group") {
      return conversations.filter((conversation) => conversation.type === "event_group")
    }

    return conversations.filter((conversation) => conversation.type !== "event_group")
  }, [chatTab, conversations])

  return (
      <div
        className={`flex h-full min-h-0 flex-col overflow-hidden ${hasCustomBackground ? "bg-stone-100" : chatBackgroundClass}`}
        style={chatBackgroundStyle}
      >
        <div className="flex items-center justify-between gap-3 border-b border-orange-100/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            {targetUserId || isConversationMode ? (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-orange-100 bg-white text-stone-700 shadow-sm hover:bg-orange-50"
                    onClick={() => router.push("/chat")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
            ) : null}

            <div className="min-w-0">
              {!targetUserId && !isConversationMode ? (
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.12)]" />
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
                      WePet Chat
                    </span>
                  </div>
              ) : null}
              {isConversationMode ? (
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white bg-gradient-to-br from-orange-100 to-amber-100 shadow-md shadow-orange-900/10">
                      <MessageCircle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold tracking-tight text-stone-900">
                        {headerName}
                      </div>
                    </div>
                  </div>
              ) : targetUserId ? (
                  <button
                      type="button"
                      onClick={() => setProfileOpen(true)}
                      className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white bg-gradient-to-br from-orange-100 to-amber-100 shadow-md shadow-orange-900/10">
                      {targetUser?.avatar_url ? (
                          <img
                              src={targetUser.avatar_url || "/placeholder.svg"}
                              alt={headerName}
                              className="h-full w-full object-cover"
                          />
                      ) : (
                          <div className="flex h-full w-full items-center justify-center text-base font-black text-orange-600">
                            {headerName.charAt(0).toUpperCase()}
                          </div>
                      )}
                      <span
                          className={`absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                              targetOnline ? "bg-emerald-400" : "bg-stone-300"
                          }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold tracking-tight text-stone-900">
                        {headerName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${
                                targetOnline ? "bg-emerald-500" : "bg-stone-300"
                            }`}
                        />
                        <span>{targetOnline ? t.chat.activeNow : t.chat.offline}</span>
                      </div>
                    </div>
                  </button>
              ) : (
                  <div className="text-3xl font-black tracking-tight text-stone-900">
                    {headerName}
                  </div>
              )}
              {!targetUserId && !isConversationMode ? (
                  <div className="mt-1 text-sm font-medium text-stone-500">
                    {t.chat.recentMessages}
                  </div>
              ) : null}
            </div>
          </div>

          {targetUserId ? (
              <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-orange-100 bg-white text-stone-700 shadow-sm hover:bg-orange-50"
                  onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>
          ) : null}

        </div>

        {!targetUserId && !isConversationMode ? (
          <div className="border-b border-orange-100/80 bg-white/90 px-5 pb-3 pt-2">
            <div className="inline-flex rounded-full border border-orange-100 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setChatTab("direct")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  chatTab === "direct"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                个人
              </button>
              <button
                type="button"
                onClick={() => setChatTab("group")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  chatTab === "group"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                群聊
              </button>
            </div>
          </div>
        ) : null}

        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="right" className="w-[86%] border-l border-orange-100 p-0 sm:max-w-sm">
            <SheetHeader className="border-b border-orange-100 px-5 py-4">
              <SheetTitle className="text-base font-extrabold tracking-tight text-stone-900">
                {t.chat.settings.title}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-3 px-5 py-5">
              <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-stone-800">{t.chat.settings.mute}</span>
                <Switch checked={is_muted} onCheckedChange={handleMuteChange} />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-stone-800">{t.chat.settings.pin}</span>
                <Switch checked={is_pinned} onCheckedChange={handlePinChange} />
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white px-4 py-3">
                <div className="mb-3 text-sm font-semibold text-stone-800">{t.chat.settings.background}</div>
                <input
                  ref={backgroundImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBackgroundImageSelect}
                />
                <div className="grid grid-cols-2 gap-2">
                  {CHAT_BACKGROUND_OPTIONS.map((option) => {
                    const active = background_key === option

                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => handleBackgroundChange(option)}
                            className={`h-11 rounded-xl border text-sm font-semibold transition ${
                                active
                                    ? "border-orange-400 ring-2 ring-orange-200"
                                    : "border-orange-200 hover:bg-orange-50"
                            } ${
                                option === "orange"
                                    ? "bg-gradient-to-br from-orange-100 to-amber-50"
                                    : option === "green"
                                        ? "bg-gradient-to-br from-emerald-100 to-lime-50"
                                        : option === "blue"
                                            ? "bg-gradient-to-br from-sky-100 to-blue-50"
                                            : "bg-white"
                            } text-stone-800`}
                        >
                          {option}
                        </button>
                    )
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePickBackgroundImage}
                  disabled={!conversationId || uploadingBackground}
                  className="mt-3 h-11 w-full justify-start rounded-xl border-orange-200 text-sm font-semibold text-stone-700 hover:bg-orange-50"
                >
                  {uploadingBackground ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload custom background
                    </>
                  )}
                </Button>
                {backgroundUploadError ? (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {backgroundUploadError}
                  </div>
                ) : null}
              </div>

              <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteConversation}
                  disabled={!conversationId || deletingConversation}
                  className="h-11 w-full justify-start rounded-2xl border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                {deletingConversation ? t.chat.deleting : t.chat.settings.delete}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {profileOpen && targetUser ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 sm:items-center sm:pb-0">
              <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
                {/* 点赞按钮 - 右上角，不挡关闭按钮 */}
                {targetUserId && user && targetUserId !== user.id ? (
                    <button
                        type="button"
                        disabled={profileLikeLoading || !profileLikeInitialized}
                        onClick={handleProfileLike}
                        className={`absolute right-14 top-3 z-20 flex h-8 items-center gap-1 rounded-full px-3 backdrop-blur-sm transition-all duration-200 ${
                          !profileLikeInitialized
                            ? "bg-black/10 cursor-not-allowed opacity-50 text-white"
                            : profileLikeLoading
                              ? "bg-black/10 cursor-not-allowed opacity-50 text-white"
                              : profileLiked
                                ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                : "bg-black/20 text-white hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        }`}
                    >
                      {profileLikeLoading ? (
                          <span className="text-xs font-bold">...</span>
                      ) : profileLiked ? (
                          <span className="text-sm scale-110 transition-transform duration-200">❤️</span>
                      ) : (
                          <span className="text-sm">♡</span>
                      )}
                      <span className={`text-xs font-bold ${profileLiked && profileLikeInitialized ? "text-red-500" : "text-inherit"}`}>
                        {profileLikeCount}
                      </span>
                    </button>
                ) : null}

                {/* 关闭按钮 */}
                <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm hover:bg-black/30"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* 封面背景 */}
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-200 via-amber-100 to-rose-100">
                  {(() => {
                    const coverSrc = targetUser.cover_url || targetUser.coverImage || targetUser.cover_image_url
                    return coverSrc ? (
                        <img
                            src={coverSrc}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    ) : null
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-orange-950/35" />
                </div>

                <div className="relative z-10 -mt-12 px-5 pb-5">
                  {/* 头像压在封面下方 */}
                  <div className="mb-4 flex justify-center">
                    <div className="h-24 w-24 overflow-hidden rounded-[1.75rem] border-4 border-white bg-gradient-to-br from-orange-100 to-amber-100 shadow-xl shadow-orange-900/15">
                      {targetUser.avatar_url ? (
                          <img
                              src={targetUser.avatar_url || "/placeholder.svg"}
                              alt={headerName}
                              className="h-full w-full object-cover"
                          />
                      ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl font-black text-orange-600">
                            {profilePetName.charAt(0).toUpperCase()}
                          </div>
                      )}
                    </div>
                  </div>

                  {/* 用户资料卡片 */}
                  <div className="mb-4 rounded-[2rem] border border-orange-100/80 bg-white/95 p-5 shadow-xl shadow-orange-900/5">
                    <div className="text-center">
                      <div className="truncate text-2xl font-black tracking-tight text-stone-900">
                        {profilePetName}
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-stone-500">
                        {targetUser.username || "-"}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-stone-400">
                        {targetUser.email || ""}
                      </div>
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 shadow-sm">
                          {profilePetType}
                        </span>
                        <span className="rounded-full border border-stone-100 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 shadow-sm">
                          {profilePetAge}
                          {targetUser.pet_gender === "male" ? (
                              <span className="ml-0.5 text-blue-500">♂</span>
                          ) : targetUser.pet_gender === "female" ? (
                              <span className="ml-0.5 text-pink-500">♀</span>
                          ) : null}
                        </span>
                        {targetUser.is_ai ? (
                            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 shadow-sm">
                              AI
                            </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* 我的宠物卡片 */}
                  <div className="mb-4 rounded-[2rem] border border-orange-100/80 bg-white/95 p-5 shadow-xl shadow-orange-900/5">
                    <h2 className="mb-4 text-lg font-black tracking-tight text-stone-900">🐾 {t.profile.myPet}</h2>
                    <div className="space-y-2 rounded-[1.5rem] border border-orange-100 bg-orange-50/70 p-4 text-sm">
                      <p className="font-semibold text-stone-900">{t.profile.nameLabel}: {profilePetName}</p>
                      <p className="font-semibold text-stone-900">{t.profile.typeLabel}: {profilePetType}</p>
                      <p className="font-semibold text-stone-900">
                        {t.profile.ageLabel}: {profilePetAge}
                        {targetUser.pet_gender === "male" ? (
                            <span className="ml-0.5 text-blue-500">♂</span>
                        ) : targetUser.pet_gender === "female" ? (
                            <span className="ml-0.5 text-pink-500">♀</span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {/* 关于它卡片 */}
                  <div className="rounded-[2rem] border border-orange-100/80 bg-white/95 p-5 shadow-xl shadow-orange-900/5">
                    <p className="mb-2 font-bold text-stone-900">✨ {t.profile.aboutPet}:</p>
                    <p className="rounded-[1.4rem] bg-stone-50 p-4 text-sm leading-6 text-stone-700">
                      {profileDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1 px-5 py-5">
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              {targetUserId || isConversationMode ? t.chat.today : t.chat.recentMessages}
              </div>

            {pageError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {pageError}
                </div>
            ) : null}

            <div className="space-y-3">
              {!targetUserId && !isConversationMode ? (
                  loadingConversations ? (
                      <div className="flex items-center justify-center py-16 text-stone-500">
                        {t.chat.loadingHistory}
                      </div>
                  ) : filteredConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-stone-500">
                        <div className="mb-2 text-lg font-semibold text-stone-700">
                          {t.chat.noHistory}
                        </div>
                        <div className="mb-4 text-sm">
                          {t.chat.selectConversationFirst}
                        </div>
                        <Button
                            onClick={() => router.push("/match")}
                            className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                        >
                          {t.chat.goToMatch}
                        </Button>
                      </div>
                  ) : (
                      filteredConversations.map((item) => {
                        const conversationDisplayName =
                          item.type === "event_group"
                            ? item.event_title?.trim() || "活动群聊"
                            : item.other_pet_name || item.other_username
                        const unreadCount = Number(item.unread_count || 0)
                        const showUnreadBadge = Number.isFinite(unreadCount) && unreadCount > 0
                        const unreadBadgeText = unreadCount > 99 ? "99+" : String(unreadCount)

                        return (
                          <button
                              key={item.id}
                              onClick={async () => {
                                if (item.type !== "event_group" && !item.other_user_id) return
                                try {
                                  await markConversationAsRead(item.id)
                                } catch (error) {
                                  console.warn("Failed to mark conversation as read:", error)
                                }
                                if (item.type === "event_group") {
                                  router.push(`/chat?conversationId=${item.id}`)
                                } else {
                                  router.push(`/chat?userId=${item.other_user_id}`)
                                }
                              }}
                              className="w-full rounded-[1.65rem] border border-orange-100/70 bg-white/95 px-4 py-3.5 text-left shadow-lg shadow-orange-900/5 ring-1 ring-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/10 active:translate-y-0 active:scale-[0.985]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white bg-gradient-to-br from-orange-100 to-amber-100 shadow-md shadow-orange-900/10">
                                {item.other_avatar_url ? (
                                    <img
                                        src={item.other_avatar_url || "/placeholder.svg"}
                                        alt={conversationDisplayName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-lg font-black text-orange-600">
                                      {(conversationDisplayName || "W").charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span
                                    className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${
                                        isUserOnline(item.other_last_seen)
                                            ? "bg-emerald-400"
                                            : "bg-stone-300"
                                    }`}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div className="truncate text-base font-extrabold tracking-tight text-stone-900">
                                      {conversationDisplayName}
                                    </div>
                                    {item.is_pinned ? (
                                        <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                          Pinned
                                        </span>
                                    ) : null}
                                    {item.other_membership_active ? (
                                        <span className="shrink-0 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                          VIP
                                        </span>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[11px] font-semibold text-stone-400">
                                    {normalizeBoolean(item.is_pinned) ? (
                                        <Pin className="h-3.5 w-3.5 text-orange-500" />
                                    ) : null}
                                    {normalizeBoolean(item.is_muted) ? (
                                        <BellOff className="h-3.5 w-3.5 text-stone-400" />
                                    ) : null}
                                    <span>
                                      {item.last_message_time
                                          ? formatTime(item.last_message_time)
                                          : ""}
                                    </span>
                                    {showUnreadBadge ? (
                                      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white">
                                        {unreadBadgeText}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="mt-1.5 flex items-center gap-2">
                                  {item.type === "event_group" ? (
                                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600">
                                      👥 {item.member_count ?? 0} 人
                                    </span>
                                  ) : (
                                    <>
                                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600">
                                        {getConversationStatusText(item)}
                                      </span>
                                      {item.liked_me && !item.is_match ? (
                                          <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm shadow-orange-500/20">
                                            New
                                          </span>
                                      ) : null}
                                      <span className="flex items-center gap-1 text-[11px] font-semibold text-stone-400">
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                isUserOnline(item.other_last_seen)
                                                    ? "bg-emerald-500"
                                                    : "bg-stone-300"
                                            }`}
                                        />
                                        <span>
                                          {isUserOnline(item.other_last_seen)
                                              ? t.chat.activeNow
                                              : t.chat.offline}
                                        </span>
                                      </span>
                                    </>
                                  )}
                                </div>

                                  <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
                                    <div className="truncate text-sm font-medium leading-5 text-stone-600">
                                    {item.last_message_type === "image"
                                      ? "📷 Photo"
                                      : item.last_message || t.chat.noMessagesYet}
                                    </div>
                                    {item.liked_me && !item.is_match ? (
                                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-black text-white shadow-md shadow-orange-500/25">
                                        1
                                      </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })
                  )
              ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-sm text-stone-400">
                    {t.chat.noMessages}
                  </div>
              ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.sender_id === user?.id
                    const isDeleted = Boolean(msg.is_deleted)
                    const showTimeDivider = shouldShowTimeDivider(
                        messages[index - 1],
                        msg
                    )
                    const showLikeButton =
                        !isDeleted &&
                        !isMe &&
                        !chatMatched &&
                        (introLocked || inlineNotice === "LIKE_REQUIRED")

                    return (
                        <div key={msg.id}>
                          {showTimeDivider ? (
                              <div className="my-5 flex justify-center">
                                <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-stone-400 shadow-sm ring-1 ring-stone-100">
                                  {formatChatDividerTime(msg.created_at)}
                                </span>
                              </div>
                          ) : null}

                          <div
                              className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            {!isMe ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                      if (!isConversationMode) {
                                        setProfileOpen(true)
                                      }
                                    }}
                                    className="h-9 w-9 shrink-0 overflow-hidden rounded-2xl border border-white bg-orange-100 shadow-sm"
                                >
                                  {isConversationMode ? (
                                      <div className="flex h-full w-full items-center justify-center text-orange-600">
                                        <MessageCircle className="h-4 w-4" />
                                      </div>
                                  ) : targetUser?.avatar_url ? (
                                      <img
                                          src={targetUser.avatar_url || "/placeholder.svg"}
                                          alt={headerName}
                                          className="h-full w-full object-cover"
                                      />
                                  ) : (
                                      <div className="flex h-full w-full items-center justify-center text-sm font-black text-orange-600">
                                        {headerName.charAt(0).toUpperCase()}
                                      </div>
                                  )}
                                </button>
                            ) : null}
                            {isDeleted ? (
                              <div
                                className="max-w-[76%] rounded-full bg-stone-100 px-4 py-3 text-xs text-stone-500"
                                onContextMenu={undefined}
                                onTouchStart={undefined}
                                onTouchEnd={undefined}
                                onTouchMove={undefined}
                              >
                                <div className="break-words whitespace-pre-wrap leading-relaxed text-xs">
                                  {t.chat.messageDeleted}
                                </div>
                              </div>
                            ) : msg.message_type === "image" && msg.image_url ? (
                              <button
                                type="button"
                                className={`overflow-hidden rounded-2xl border bg-white p-1 shadow-[0_3px_12px_rgba(15,23,42,0.08)] ${
                                  isMe
                                    ? "border-orange-300/70"
                                    : "border-stone-200/80"
                                }`}
                                style={{ maxWidth: 220 }}
                                onClick={() => setPreviewImageUrl(msg.image_url || null)}
                                onContextMenu={(event) => handleMessageContextMenu(event, msg)}
                                onTouchStart={() => handleMessageTouchStart(msg)}
                                onTouchEnd={clearLongPressTimer}
                                onTouchMove={clearLongPressTimer}
                              >
                                <img
                                  src={msg.image_url}
                                  alt="Chat image"
                                  className="h-auto w-full rounded-xl object-cover"
                                />
                              </button>
                            ) : (
                              <div
                                className={`max-w-[76%] px-4 py-3 ${
                                  isMe
                                    ? "rounded-[1.35rem] rounded-br-[0.45rem] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 text-white shadow-[0_8px_18px_rgba(251,146,60,0.32)]"
                                    : "rounded-[1.35rem] rounded-bl-[0.45rem] border border-stone-200/80 bg-white text-stone-800 shadow-[0_3px_12px_rgba(15,23,42,0.08)]"
                                }`}
                                onContextMenu={(event) => handleMessageContextMenu(event, msg)}
                                onTouchStart={() => handleMessageTouchStart(msg)}
                                onTouchEnd={clearLongPressTimer}
                                onTouchMove={clearLongPressTimer}
                              >
                                <div className="break-words whitespace-pre-wrap text-[15px] leading-relaxed">
                                  {msg.content}
                                </div>
                              </div>
                            )}
                            {showLikeButton ? (
                                <button
                                    type="button"
                                    aria-label={chatLiked ? "Liked this pet" : "Like this pet"}
                                    disabled={chatLikeLoading || chatLiked}
                                    onClick={handleMessageLike}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {chatLikeLoading ? (
                                      <span className="text-xs font-bold">...</span>
                                  ) : (
                                      <Heart className={`h-4 w-4 ${chatLiked ? "fill-white" : ""}`} />
                                  )}
                                </button>
                            ) : null}
                            {isMe ? (
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-2xl border border-white bg-stone-200 shadow-sm">
                                  {user?.avatar_url ? (
                                      <img
                                          src={user.avatar_url || "/placeholder.svg"}
                                          alt={user.pet_name || user.username || "Me"}
                                          className="h-full w-full object-cover"
                                      />
                                  ) : (
                                      <div className="flex h-full w-full items-center justify-center text-sm font-black text-orange-600">
                                        {(user?.pet_name || user?.username || "M").charAt(0).toUpperCase()}
                                      </div>
                                  )}
                                </div>
                            ) : null}
                          </div>
                        </div>
                    )
                  })
              )}
            </div>
          </div>
        </ScrollArea>

        {messageMenu ? (
            <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-4 pb-4">
              <div className="rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5">
                <button
                    type="button"
                    onClick={handleDeleteMessage}
                    disabled={deletingMessageId === messageMenu.id}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  {deletingMessageId === messageMenu.id ? t.chat.deleting : t.chat.delete}
                </button>
                <button
                    type="button"
                    onClick={() => setMessageMenu(null)}
                    className="mt-1 w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  {t.chat.cancel}
                </button>
              </div>
            </div>
        ) : null}

        <div className="shrink-0 border-t border-orange-100/80 bg-white/90 px-4 py-3 shadow-[0_-8px_24px_rgba(249,115,22,0.08)] backdrop-blur-xl">
          <div className="mx-auto max-w-2xl">
            {inlineNotice ? (
                <div className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                  {inlineNotice === true
                      ? t.chat.notMatchedNotice
                      : inlineNotice === "LIKE_REQUIRED"
                          ? t.chat.waitForLike
                          : inlineNotice === "INTRO_MESSAGE_LIMIT_REACHED"
                              ? t.chat.notMatchedNotice
                              : inlineNotice}
                </div>
            ) : null}

            <div className="flex items-center gap-2 rounded-[1.6rem] border border-orange-100 bg-stone-50/90 px-3 py-2 shadow-inner">
              <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
              />

              <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handlePickImage}
                  disabled={(!targetUserId && !isConversationMode) || !conversationId || introLocked || sending || uploadingImage}
                  className="h-10 w-10 shrink-0 rounded-full text-stone-600 hover:bg-orange-100/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus className="h-5 w-5" />
              </Button>

              <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={
                    !targetUserId && !isConversationMode
                        ? t.chat.selectConversationFirst
                        : introLocked
                            ? t.chat.waitForLike
                            : t.chat.typeMessage
                  }
                  disabled={(!targetUserId && !isConversationMode) || introLocked}
                  className="h-10 border-0 bg-transparent px-1 py-0 text-[15px] shadow-none placeholder:text-stone-400 focus-visible:ring-0"
              />

              <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={
                      (!targetUserId && !isConversationMode) ||
                      !inputText.trim() ||
                      !conversationId ||
                      sending ||
                      uploadingImage ||
                      introLocked
                  }
                  className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
          <DialogContent
            showCloseButton={false}
            className="max-w-[92vw] border-0 bg-transparent p-0 shadow-none"
          >
            <DialogTitle className="sr-only">Image preview</DialogTitle>
            <div className="flex items-center justify-center">
              {previewImageUrl ? (
                <button
                  type="button"
                  className="cursor-zoom-out"
                  onClick={() => setPreviewImageUrl(null)}
                >
                  <img
                    src={previewImageUrl}
                    alt="Preview"
                    className="max-h-[80vh] max-w-[92vw] rounded-2xl object-contain"
                  />
                </button>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
  )
}
