import { useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { apiRequest } from "@/lib/api"

export default function DoctorPage() {
  const [message, setMessage] = useState("")
  const [result, setResult] = useState("")

  async function askDoctor() {
    try {
      const data = await apiRequest<{ success: true; data: { response: string } }>("/ai/chat", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          mode: "doctor_chat",
          message,
          history: [],
        }),
      })

      setResult(data.data.response)
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Request failed")
    }
  }

  return (
    <AppScaffold title="Doctor">
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Describe your pet symptoms"
        multiline
      />
      <Pressable style={styles.button} onPress={askDoctor}>
        <Text style={styles.buttonText}>Ask AI Doctor</Text>
      </Pressable>
      <View style={styles.card}>
        <Text style={styles.result}>{result || "AI response will appear here."}</Text>
      </View>
    </AppScaffold>
  )
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    backgroundColor: "#ffffff",
    borderColor: "#fdba74",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    textAlignVertical: "top",
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
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
  },
  result: {
    color: "#1c1917",
    lineHeight: 22,
  },
})
