"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Send, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"

type ChatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: number
  created_at: string
}

type TargetUser = {
  id: string
  username: string
  pet_name: string
  avatar_url: string
}

type ConversationSummary = {
  id: string
  other_user_id: string
  other_username: string
  other_pet_name: string
  other_avatar_url: string
  other_user_is_ai?: number
  last_message: string | null
  last_message_time: string | null
  liked_by_me?: number
  liked_me?: number
  is_match?: number
  single_message_used_by_me?: number
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
  const [inlineNotice, setInlineNotice] = useState("")

  const headerName = useMemo(() => {
    if (!targetUserId) return t.chat.title
    if (!targetUser) return t.chat.title
    return targetUser.pet_name?.trim() || targetUser.username
  }, [targetUser, targetUserId, t.chat.title])

  const loadMessages = async (convId: string) => {
    const res = await fetch(`/api/chat/messages/${convId}`, {
      cache: "no-store",
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to load messages")
    }

    setMessages(data.messages || [])
  }

  const loadConversations = async () => {
    const res = await fetch("/api/chat/conversations", {
      cache: "no-store",
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to load conversations")
    }

    setConversations(data.conversations || [])
  }

  useEffect(() => {
    if (loading) return
    if (!user) return

    let cancelled = false

    async function initPage() {
      try {
        setPageError("")
        setInlineNotice("")
        setConversationId(null)
        setTargetUser(null)
        setMessages([])

        if (!targetUserId) {
          setLoadingConversations(true)
          await loadConversations()
          return
        }

        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetUserId }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Failed to initialize chat")
        }

        if (cancelled) return

        setConversationId(data.conversationId)
        setTargetUser(data.targetUser)
        await loadMessages(data.conversationId)
      } catch (error: unknown) {
        if (cancelled) return
        setPageError(error instanceof Error ? error.message : "Failed to initialize chat")
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
  }, [loading, user, targetUserId])

  useEffect(() => {
    if (!conversationId) return

    const timer = setInterval(() => {
      loadMessages(conversationId).catch(() => {})
    }, 2000)

    return () => clearInterval(timer)
  }, [conversationId])

  useEffect(() => {
    if (targetUserId) return
    if (loading || !user) return

    const timer = setInterval(() => {
      loadConversations().catch(() => {})
    }, 3000)

    return () => clearInterval(timer)
  }, [targetUserId, loading, user])

  const handleSend = async () => {
    if (!conversationId || !inputText.trim() || sending) return

    try {
      setSending(true)
      setInlineNotice("")
      setPageError("")

      const text = inputText.trim()

      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          content: text,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMessage = data.error || "Failed to send message"

        if (
          data.code === "INTRO_MESSAGE_LIMIT_REACHED" ||
          data.code === "LIKE_REQUIRED" ||
          data.code === "MESSAGE_NOT_ALLOWED"
        ) {
          setInlineNotice(errorMessage)
          return
        }

        setPageError(errorMessage)
        return
      }

      setMessages((prev) => [...prev, data.message])
      setInputText("")
      setPageError("")

      if (!data.access?.isMatch) {
        setInlineNotice(t.chat.introMessageSent)
      } else {
        setInlineNotice("")
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setPageError(error.message)
      } else {
        setPageError("发送失败，请稍后重试。")
      }
    } finally {
      setSending(false)
    }
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getConversationStatusText = (item: ConversationSummary) => {
    if (item.is_match) return t.chat.statusMatched
    if (item.liked_by_me) return t.chat.statusLikedByMe
    if (item.liked_me) return t.chat.statusLikedMe
    return t.chat.statusNoRelation
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-stone-50">
      <div className="flex items-center border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {targetUserId ? (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => router.push("/app/chat")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : null}

          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-stone-200">
            {targetUserId && targetUser?.avatar_url ? (
              <img
                src={targetUser.avatar_url || "/placeholder.svg"}
                alt={headerName}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div>
            <div className="font-semibold text-stone-900">{headerName}</div>
            <div className="text-xs text-stone-500">
              {targetUserId ? t.chat.activeNow : t.chat.historyTitle}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 text-center text-xs text-stone-400">
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
                  <div className="mb-2 text-lg font-semibold text-stone-700">{t.chat.noHistory}</div>
                  <div className="mb-4 text-sm">{t.chat.selectConversationFirst}</div>
                  <Button
                    onClick={() => router.push("/app/match")}
                    className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                  >
                    {t.chat.goToMatch}
                  </Button>
                </div>
              ) : (
                conversations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/app/chat?userId=${item.other_user_id}`)}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-stone-200">
                        {item.other_avatar_url ? (
                          <img
                            src={item.other_avatar_url || "/placeholder.svg"}
                            alt={item.other_pet_name || item.other_username}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate font-semibold text-stone-900">
                            {item.other_pet_name || item.other_username}
                          </div>
                          <div className="shrink-0 text-xs text-stone-400">
                            {item.last_message_time ? formatTime(item.last_message_time) : ""}
                          </div>
                        </div>

                        <div className="mt-1 text-xs text-stone-400">
                          {getConversationStatusText(item)}
                        </div>

                        <div className="mt-1 truncate text-sm text-stone-500">
                          {item.last_message || t.chat.noMessagesYet}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMe
                          ? "rounded-br-md bg-orange-500 text-white"
                          : "rounded-bl-md border border-stone-200 bg-white text-stone-800"
                      }`}
                    >
                      <div className="break-words whitespace-pre-wrap text-sm">
                        {msg.content}
                      </div>
                      <div
                        className={`mt-1 text-[11px] ${
                          isMe ? "text-orange-100" : "text-stone-400"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl">
          {inlineNotice ? (
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {inlineNotice}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-2xl border bg-stone-50 px-3 py-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={targetUserId ? t.chat.typeMessage : t.chat.selectConversationFirst}
              disabled={!targetUserId}
              className="h-auto border-0 bg-transparent p-0 shadow-none placeholder:text-stone-400 focus-visible:ring-0"
            />

            <Button
              onClick={handleSend}
              size="icon"
              disabled={!targetUserId || !inputText.trim() || !conversationId || sending}
              className="h-8 w-8 shrink-0 rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}