import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { apiRequest } from "@/lib/api"

type MatchUser = {
  id: string
  pet_name: string | null
  username: string | null
  pet_type: string | null
  description: string | null
}

export default function MatchPage() {
  const [users, setUsers] = useState<MatchUser[]>([])
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const recommend = await apiRequest<{ success: true; data: { users: MatchUser[] } }>("/match/recommend", {
          auth: true,
        })
        const quota = await apiRequest<{ success: true; data: { remaining: number; remainingLikes: number } }>(
          "/match/likes/today",
          { auth: true }
        )

        setUsers(recommend.data.users)
        setRemaining(quota.data.remaining ?? quota.data.remainingLikes)
      } catch {}
    }

    load()
  }, [])

  return (
    <AppScaffold title="Match">
      <View style={styles.card}>
        <Text style={styles.label}>Remaining Likes</Text>
        <Text style={styles.value}>{remaining ?? "-"}</Text>
      </View>
      {users.slice(0, 5).map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.name}>{user.pet_name || user.username || "Unknown Pet"}</Text>
          <Text style={styles.meta}>{user.pet_type || "Unknown Type"}</Text>
          <Text style={styles.desc}>{user.description || "No description"}</Text>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Like</Text>
          </Pressable>
        </View>
      ))}
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
  label: {
    color: "#78716c",
  },
  value: {
    color: "#1c1917",
    fontSize: 24,
    fontWeight: "700",
  },
  name: {
    color: "#1c1917",
    fontSize: 20,
    fontWeight: "700",
  },
  meta: {
    color: "#9a3412",
  },
  desc: {
    color: "#57534e",
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#f97316",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
})
