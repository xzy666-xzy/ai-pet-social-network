import { useState } from "react"
import { router } from "expo-router"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Screen } from "@/components/Screen"
import { apiRequest } from "@/lib/api"
import { setAccessToken } from "@/lib/auth"

type AuthResponse = {
  success: true
  token?: string
  access_token?: string
  user: {
    id: string
    email: string | null
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    try {
      setLoading(true)
      setError("")

      const data = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      const token = data.access_token || data.token
      if (!token) {
        throw new Error("Token not found")
      }

      await setAccessToken(token)
      router.replace("/match")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Loading..." : "Login"}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/register")}>
          <Text style={styles.link}>Go to Register</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  title: {
    color: "#1c1917",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#fdba74",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#f97316",
    borderRadius: 16,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  link: {
    color: "#ea580c",
    textAlign: "center",
  },
  error: {
    color: "#dc2626",
  },
})
