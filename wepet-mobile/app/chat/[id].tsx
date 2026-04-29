import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import { Avatar } from "@/components/Avatar"
import { Badge } from "@/components/Badge"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { MobileTabs } from "@/components/MobileTabs"
import { Screen } from "@/components/Screen"
import { apiRequest } from "@/lib/api"
import { getAccessToken } from "@/lib/auth"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default function ChatRoomPage() {
  const { id, name, avatarUrl, status } = useLocalSearchParams<{
    id: string
    name?: string
    avatarUrl?: string
    status?: string
  }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [notice, setNotice] = useState("If you are not matched yet, you can send one intro message.")

  async function loadMessages() {
    if (!id) return

    try {
      const data = await apiRequest<{ success: true; data: { messages: Message[] } }>(
        `/chat/messages/${id}`,
        { auth: true }
      )
      setMessages(data.data.messages)
    } catch {}
  }

  useEffect(() => {
    loadMessages()
  }, [id])

  useEffect(() => {
    async function loadCurrentUserId() {
      const token = await getAccessToken()
      setCurrentUserId(getUserIdFromToken(token))
    }

    loadCurrentUserId()
  }, [])

  async function sendMessage() {
    if (!id || !content.trim()) return

    try {
      setNotice("")
      await apiRequest("/chat/messages", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          conversationId: id,
          content,
        }),
      })
      setContent("")
      loadMessages()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Message could not be sent.")
    }
  }

  const title = firstString(name) || "Pet Friend"
  const imageUrl = firstString(avatarUrl)
  const statusText = firstString(status) || "Intro only"

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <View style={styles.header}>
          <Text style={styles.backButton} onPress={() => router.push("/chat")}>
            Back
          </Text>
          <Avatar uri={imageUrl} label={title} size={46} />
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
              <Badge tone="warm" style={styles.statusBadge}>
                {statusText}
              </Badge>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.messages}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.dayLabel}>Today</Text>

          {notice ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Send a short intro to start the conversation.</Text>
            </View>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                time={formatTime(message.created_at)}
                isMe={Boolean(currentUserId && message.sender_id === currentUserId)}
              />
            ))
          )}
        </ScrollView>

        <View style={styles.composerWrap}>
          <ChatComposer value={content} onChangeText={setContent} onSend={sendMessage} />
        </View>

        <MobileTabs />
      </KeyboardAvoidingView>
    </Screen>
  )
}

function firstString(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || ""
  return value || ""
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getUserIdFromToken(token: string | null) {
  if (!token) return null

  try {
    const payload = token.split(".")[1]
    if (!payload) return null

    const decoded = decodeBase64Url(payload)
    if (!decoded) return null

    const data = JSON.parse(decoded) as { userId?: string }
    return typeof data.userId === "string" ? data.userId : null
  } catch {
    return null
  }
}

function decodeBase64Url(value: string) {
  const atobFn = (globalThis as unknown as { atob?: (input: string) => string }).atob
  if (!atobFn) return null

  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  return atobFn(padded)
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  backButton: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
    paddingRight: spacing.xs,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  onlineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 5,
  },
  onlineDot: {
    backgroundColor: "#22c55e",
    borderRadius: radii.full,
    height: 8,
    width: 8,
  },
  onlineText: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  messages: {
    flex: 1,
  },
  messageContent: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  dayLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  notice: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.borderWarm,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textSubtle,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  composerWrap: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
})
