import { useState } from "react"
import { router } from "expo-router"
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { Screen } from "@/components/Screen"
import { apiRequest } from "@/lib/api"
import { setAccessToken } from "@/lib/auth"

type RegisterResponse = {
  success: true
  token?: string
  access_token?: string
  user: {
    id: string
    email: string | null
  }
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    pet_name: "",
    pet_type: "",
    pet_age: "",
    description: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    try {
      setLoading(true)
      setError("")

      const data = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      })

      const token = data.access_token || data.token
      if (!token) {
        throw new Error("Token not found")
      }

      await setAccessToken(token)
      router.replace("/match")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Register</Text>
        {Object.keys(form).map((key) => (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={key}
            secureTextEntry={key === "password"}
            autoCapitalize={key === "email" ? "none" : "sentences"}
            value={form[key as keyof typeof form]}
            onChangeText={(value) => setForm((prev) => ({ ...prev, [key]: value }))}
          />
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Creating..." : "Create Account"}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.link}>Back to Login</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
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
