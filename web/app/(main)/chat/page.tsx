"use client"

import { type ChangeEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Send, ChevronLeft, Heart, Settings, ImagePlus } from "lucide-react"
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
}

type ConversationSummary = {
  id: string
  other_user_id: string
  other_username: string
  other_pet_name: string
  other_avatar_url: string
  other_user_is_ai?: number
  other_last_seen?: string | null
  other_membership_active?: boolean
  last_message: string | null
  last_message_time: string | null
  is_pinned?: boolean
  liked_by_me?: number
  liked_me?: number
  is_match?: number
  single_message_used_by_me?: number
  last_message_type?: "text" | "image" | null
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

type MatchLikeResponse = {
  success: true
  data: {
    isMutualMatch?: boolean
    isMatch?: boolean
    matched?: boolean
  }
}

type ChatSettings = {
  background_key?: string | null
  is_muted?: boolean | number | null
  is_pinned?: boolean | number | null
}

type ChatSettingsResponse = {
  success?: boolean
  data?: ChatSettings | null
  background_key?: string | null
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

  const [conversationId, setConversationId] = useState<string | null>(null)
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [background_key, setBackgroundKey] = useState<ChatBackgroundKey>("default")
  const [is_muted, setIsMuted] = useState(false)
  const [is_pinned, setIsPinned] = useState(false)
  const [messageMenu, setMessageMenu] = useState<ChatMessage | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [deletingConversation, setDeletingConversation] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasToken = Boolean(getAccessToken())

  const chatBackgroundClass = useMemo(
      () => getChatBackgroundClass(background_key),
      [background_key]
  )

  const headerName = useMemo(() => {
    if (!targetUserId) return t.chat.title
    if (!targetUser) return t.chat.title
    return targetUser.petName?.trim() || targetUser.pet_name?.trim() || targetUser.username || t.chat.title
  }, [targetUser, targetUserId, t.chat.title])

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
    const data = await apiRequest<MessagesResponse>(`/chat/messages/${convId}`, {
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
            (item: ConversationSummary) =>
                item &&
                typeof item.other_user_id === "string" &&
                item.other_user_id.trim() !== "" &&
                item.other_user_id !== "undefined" &&
                item.other_user_id !== "null"
        )
        : []

    setConversations(safeConversations)
    return safeConversations
  }

  const loadChatSettings = async (convId: string) => {
    try {
      const data = await apiRequest<ChatSettingsResponse>(`/chat/settings?conversation_id=${encodeURIComponent(convId)}`, {
        cache: "no-store",
        auth: true,
      })

      const source = data?.data && typeof data.data === "object" ? data.data : data

      setBackgroundKey(parseBackgroundKey(source?.background_key))
      setIsMuted(normalizeBoolean(source?.is_muted))
      setIsPinned(normalizeBoolean(source?.is_pinned))
    } catch (error) {
      console.warn("Failed to load chat settings:", error)
    }
  }

  const saveChatSettings = async (next: Partial<{ background_key: ChatBackgroundKey; is_muted: boolean; is_pinned: boolean }>) => {
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
    saveChatSettings({ background_key: nextBackgroundKey })
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
        setIsMuted(false)
        setIsPinned(false)
        setMessageMenu(null)
        setDeletingMessageId(null)

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
  }, [loading, user, targetUserId, hasToken])

  useEffect(() => {
    if (!conversationId) {
      setBackgroundKey("default")
      setIsMuted(false)
      setIsPinned(false)
      return
    }

    loadChatSettings(conversationId)
  }, [conversationId])

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
    if (targetUserId) return
    if (loading || !hasToken) return

    const timer = setInterval(() => {
      loadConversations().catch(() => {})
    }, 3000)

    return () => clearInterval(timer)
  }, [targetUserId, loading, hasToken])

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

  const handleSend = async () => {
    if (!conversationId || !inputText.trim() || sending || introLocked) return

    try {
      setSending(true)
      setInlineNotice(false)
      setPageError("")

      const text = inputText.trim()

      const data = await apiRequest<SendMessageResponse>("/chat/messages", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          conversationId,
          content: text,
        }),
      })

      setInputText("")
      setPageError("")

      // 发成功后立刻重新拉取，确保第一条消息显示出来
      await loadMessages(conversationId)

      if (!data.data.access?.isMatch) {
        setInlineNotice(true)
        setIntroLocked(true)
      } else {
        setInlineNotice(false)
        setIntroLocked(false)
      }
    } catch (error: unknown) {
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
    if (!targetUserId || !conversationId || introLocked || sending || uploadingImage) return
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

      const data = await apiRequest<SendMessageResponse>("/chat/messages", {
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

      if (!data.data.access?.isMatch) {
        setInlineNotice(true)
        setIntroLocked(true)
      } else {
        setInlineNotice(false)
        setIntroLocked(false)
      }
    } catch (error: unknown) {
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

  return (
      <div className={`flex h-full min-h-0 flex-col overflow-hidden ${chatBackgroundClass}`}>
        <div className="flex items-center justify-between gap-3 border-b border-orange-100/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            {targetUserId ? (
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
              {!targetUserId ? (
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.12)]" />
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
                      WePet Chat
                    </span>
                  </div>
              ) : null}
              {targetUserId ? (
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
              {!targetUserId ? (
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
              <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl">
                <div className="mb-3 flex justify-end">
                  <button
                      type="button"
                      onClick={() => setProfileOpen(false)}
                      className="rounded-full px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-orange-100 shadow-md">
                        {targetUser.avatar_url ? (
                            <img
                                src={targetUser.avatar_url || "/placeholder.svg"}
                                alt={headerName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-orange-600">
                              {profilePetName.charAt(0).toUpperCase()}
                            </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xl font-bold text-stone-900">
                          {profilePetName}
                        </div>
                        <div className="mt-1 truncate text-xs text-stone-500">
                          {targetUser.username || "-"}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
                            {profilePetAge}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
                            {profilePetType}
                          </span>
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                            {hasProfileDescription ? t.profile.profileReady : t.profile.noDescriptionYet}
                          </span>
                          {targetUser.is_ai ? (
                              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                                AI
                              </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-bold text-stone-900">🐾 {t.profile.myPet}</h2>
                    <div className="space-y-2 rounded-2xl bg-stone-50 p-4 text-sm">
                      <p className="font-medium text-stone-900">{t.profile.nameLabel}: {profilePetName}</p>
                      <p className="font-medium text-stone-900">{t.profile.typeLabel}: {profilePetType}</p>
                      <p className="font-medium text-stone-900">{t.profile.ageLabel}: {profilePetAge}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
                    <p className="mb-2 font-bold text-stone-900">✨ {t.profile.aboutPet}:</p>
                    <p className="rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-700">
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
              {targetUserId ? t.chat.today : t.chat.recentMessages}
            </div>

            {pageError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {pageError}
                </div>
            ) : null}

            <div className="space-y-3">
              {!targetUserId ? (
                  loadingConversations ? (
                      <div className="flex items-center justify-center py-16 text-stone-500">
                        {t.chat.loadingHistory}
                      </div>
                  ) : conversations.length === 0 ? (
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
                      conversations.map((item) => (
                          <button
                              key={item.id}
                              onClick={() => {
                                if (!item.other_user_id) return
                                router.push(`/chat?userId=${item.other_user_id}`)
                              }}
                              className="w-full rounded-[1.65rem] border border-orange-100/70 bg-white/95 px-4 py-3.5 text-left shadow-lg shadow-orange-900/5 ring-1 ring-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/10 active:translate-y-0 active:scale-[0.985]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white bg-gradient-to-br from-orange-100 to-amber-100 shadow-md shadow-orange-900/10">
                                {item.other_avatar_url ? (
                                    <img
                                        src={item.other_avatar_url || "/placeholder.svg"}
                                        alt={item.other_pet_name || item.other_username}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-lg font-black text-orange-600">
                                      {(item.other_pet_name || item.other_username || "W").charAt(0).toUpperCase()}
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
                                      {item.other_pet_name || item.other_username}
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
                                  <div className="shrink-0 pt-0.5 text-[11px] font-semibold text-stone-400">
                                    {item.last_message_time
                                        ? formatTime(item.last_message_time)
                                        : ""}
                                  </div>
                                </div>

                                <div className="mt-1.5 flex items-center gap-2">
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
                      ))
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
                                    onClick={() => setProfileOpen(true)}
                                    className="h-9 w-9 shrink-0 overflow-hidden rounded-2xl border border-white bg-orange-100 shadow-sm"
                                >
                                  {targetUser?.avatar_url ? (
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
                  disabled={!targetUserId || !conversationId || introLocked || sending || uploadingImage}
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
                    !targetUserId
                        ? t.chat.selectConversationFirst
                        : introLocked
                            ? t.chat.waitForLike
                            : t.chat.typeMessage
                  }
                  disabled={!targetUserId || introLocked}
                  className="h-10 border-0 bg-transparent px-1 py-0 text-[15px] shadow-none placeholder:text-stone-400 focus-visible:ring-0"
              />

              <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={
                      !targetUserId ||
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
