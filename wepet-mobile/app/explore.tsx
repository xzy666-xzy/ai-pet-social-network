import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { apiRequest } from "@/lib/api"

type MeResponse = {
  success: true
  user: {
    id: string
    username: string | null
  }
}

export default function ExplorePage() {
  const [status, setStatus] = useState("Loading...")

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<MeResponse>("/auth/me", { auth: true })
        setStatus(`Connected as ${data.user?.username || data.user?.id || "user"}`)
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Request failed")
      }
    }

    load()
  }, [])

  return (
    <AppScaffold title="Explore">
      <View style={styles.card}>
        <Text style={styles.text}>{status}</Text>
      </View>
    </AppScaffold>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
  },
  text: {
    color: "#1c1917",
  },
})
