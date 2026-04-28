import { useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { apiRequest } from "@/lib/api"

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default function ChatRoomPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState("")

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

  async function sendMessage() {
    if (!id || !content.trim()) return

    try {
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
    } catch {}
  }

  return (
    <AppScaffold title="Chat Room">
      {messages.map((message) => (
        <View key={message.id} style={styles.message}>
          <Text style={styles.content}>{message.content}</Text>
          <Text style={styles.time}>{new Date(message.created_at).toLocaleTimeString()}</Text>
        </View>
      ))}
      <View style={styles.composer}>
        <TextInput style={styles.input} value={content} onChangeText={setContent} placeholder="Type a message" />
        <Pressable style={styles.button} onPress={sendMessage}>
          <Text style={styles.buttonText}>Send</Text>
        </Pressable>
      </View>
    </AppScaffold>
  )
}

const styles = StyleSheet.create({
  message: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    gap: 4,
    padding: 14,
  },
  content: {
    color: "#1c1917",
  },
  time: {
    color: "#78716c",
    fontSize: 12,
  },
  composer: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderColor: "#fdba74",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#f97316",
    borderRadius: 16,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
})
