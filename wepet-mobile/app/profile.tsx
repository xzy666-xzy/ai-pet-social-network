import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { AppScaffold } from "@/components/AppScaffold"
import { apiRequest } from "@/lib/api"
import { clearAccessToken } from "@/lib/auth"

type ProfileStats = {
  success: true
  data: {
    stats: {
      likesSent: number
      likesReceived: number
      conversations: number
    }
  }
}

export default function ProfilePage() {
  const [stats, setStats] = useState({
    likesSent: 0,
    likesReceived: 0,
    conversations: 0,
  })

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<ProfileStats>("/profile/stats", { auth: true })
        setStats(data.data.stats)
      } catch {}
    }

    load()
  }, [])

  async function logout() {
    await clearAccessToken()
    router.replace("/login")
  }

  return (
    <AppScaffold title="Profile">
      <View style={styles.card}>
        <Text style={styles.text}>Likes Sent: {stats.likesSent}</Text>
        <Text style={styles.text}>Likes Received: {stats.likesReceived}</Text>
        <Text style={styles.text}>Conversations: {stats.conversations}</Text>
      </View>
      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </AppScaffold>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    gap: 8,
    padding: 16,
  },
  text: {
    color: "#1c1917",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#1c1917",
    borderRadius: 16,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
})
