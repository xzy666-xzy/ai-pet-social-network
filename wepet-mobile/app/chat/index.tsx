import { useEffect, useState } from "react"
import { router } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { apiRequest } from "@/lib/api"

type Conversation = {
  id: string
  other_user_id: string
  other_username: string
  other_pet_name: string
  last_message: string | null
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

  return (
    <AppScaffold title="Chat">
      {items.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/chat/${item.id}`)}>
          <Text style={styles.name}>{item.other_pet_name || item.other_username}</Text>
          <Text style={styles.message}>{item.last_message || "No messages yet"}</Text>
        </Pressable>
      ))}
    </AppScaffold>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    gap: 6,
    padding: 16,
  },
  name: {
    color: "#1c1917",
    fontSize: 18,
    fontWeight: "700",
  },
  message: {
    color: "#57534e",
  },
})
