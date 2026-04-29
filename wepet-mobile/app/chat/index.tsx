import { useEffect, useState } from "react"
import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { ConversationCard } from "@/components/chat/ConversationCard"
import { PrimaryButton } from "@/components/PrimaryButton"
import { ScreenState } from "@/components/ScreenState"
import { apiRequest } from "@/lib/api"
import { colors } from "@/theme/colors"
import { spacing } from "@/theme/spacing"

type Conversation = {
  id: string
  other_user_id: string
  other_username: string
  other_pet_name: string
  other_avatar_url?: string | null
  last_message_time?: string | null
  last_message: string | null
  liked_by_me?: number
  liked_me?: number
  is_match?: number
}

export default function ChatListPage() {
  const [items, setItems] = useState<Conversation[]>([])

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<{ success: true; data: { conversations: Conversation[] } }>(
          "/chat/conversations",
          { auth: true }
        )
        setItems(data.data.conversations)
      } catch {}
    }

    load()
  }, [])

  const formatTime = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatus = (item: Conversation) => {
    if (item.is_match) return "Matched"
    if (item.liked_by_me) return "Liked"
    if (item.liked_me) return "Likes you"
    return "Intro only"
  }

  return (
    <AppScaffold title="Messages" subtitle="Recent chats with pet friends">
      {items.length === 0 ? (
        <View style={styles.emptyActionCard}>
          <ScreenState
            title="No conversations yet"
            message="Start with Match to meet nearby pet friends."
          />
          <PrimaryButton onPress={() => router.push("/match")} style={styles.emptyButton}>
            Go to Match
          </PrimaryButton>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const title = item.other_pet_name || item.other_username || "Unknown Pet"

            return (
              <ConversationCard
                key={item.id}
                title={title}
                message={item.last_message || "No messages yet"}
                time={formatTime(item.last_message_time)}
                avatarUrl={item.other_avatar_url}
                status={getStatus(item)}
                onPress={() =>
                  router.push({
                    pathname: "/chat/[id]",
                    params: {
                      id: item.id,
                      name: title,
                      avatarUrl: item.other_avatar_url || "",
                      status: getStatus(item),
                    },
                  })
                }
              />
            )
          })}
        </View>
      )}
    </AppScaffold>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  emptyActionCard: {
    gap: spacing.md,
    padding: 0,
  },
  emptyButton: {
    marginTop: spacing.sm,
  },
})
