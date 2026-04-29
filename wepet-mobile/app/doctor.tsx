import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Avatar } from "@/components/Avatar"
import { Badge } from "@/components/Badge"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { InfoCard } from "@/components/InfoCard"
import { LanguageMenu } from "@/components/LanguageMenu"
import { MobileTabs } from "@/components/MobileTabs"
import { PrimaryButton } from "@/components/PrimaryButton"
import { Screen } from "@/components/Screen"
import { apiRequest } from "@/lib/api"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type DoctorTab = "chat" | "image"

type DoctorMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  time: string
}

const quickPrompts = [
  "What should I check first after vomiting?",
  "When should I visit a vet immediately?",
  "My pet has low appetite. What can I do?",
]

export default function DoctorPage() {
  const [activeTab, setActiveTab] = useState<DoctorTab>("chat")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<DoctorMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi, I am the WePet AI Pet Doctor. Describe symptoms, duration, appetite, stool, and energy level for a first-pass suggestion.",
      time: getCurrentTime(),
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [imageNotes, setImageNotes] = useState("")
  const [imageResult, setImageResult] = useState("")

  async function askDoctor(preset?: string) {
    const text = (preset ?? message).trim()
    if (!text || loading) return

    const userMessage: DoctorMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      time: getCurrentTime(),
    }

    const history = messages.map(({ role, content }) => ({ role, content }))

    try {
      setLoading(true)
      setError("")
      setMessage("")
      setActiveTab("chat")
      setMessages((prev) => [...prev, userMessage])

      const data = await apiRequest<{ success: true; data: { response: string } }>("/ai/chat", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          mode: "doctor_chat",
          message: text,
          history,
        }),
      })

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.data.response || "I could not generate a response. Please try again.",
          time: getCurrentTime(),
        },
      ])
    } catch (err) {
      const fallback = err instanceof Error ? err.message : "Request failed"
      setError(fallback)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: fallback,
          time: getCurrentTime(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleImagePlaceholder() {
    setImageResult(
      "Image diagnosis UI is ready, but photo upload is not enabled in this mobile build yet. Describe symptoms here or use Text Chat for AI guidance."
    )
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <View style={styles.header}>
          <View style={styles.doctorIcon}>
            <Text style={styles.doctorIconText}>AI</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Pet Doctor</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
              <Badge tone="warm" style={styles.statusBadge}>
                First-pass advice
              </Badge>
            </View>
          </View>
          <LanguageMenu />
          <Avatar label="Doctor" size={44} />
        </View>

        <View style={styles.segmented}>
          <Pressable
            style={[styles.segmentButton, activeTab === "chat" && styles.segmentActive]}
            onPress={() => setActiveTab("chat")}
          >
            <Text style={[styles.segmentText, activeTab === "chat" && styles.segmentTextActive]}>
              Text Chat
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, activeTab === "image" && styles.segmentActive]}
            onPress={() => setActiveTab("image")}
          >
            <Text style={[styles.segmentText, activeTab === "image" && styles.segmentTextActive]}>
              Image Diagnosis
            </Text>
          </Pressable>
        </View>

        {activeTab === "chat" ? (
          <>
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.chatContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.dayLabel}>Today</Text>

              <InfoCard warm style={styles.safetyCard}>
                <Text style={styles.safetyTitle}>Important</Text>
                <Text style={styles.safetyText}>
                  AI advice is for initial reference only. For breathing difficulty, seizures,
                  heavy bleeding, or inability to stand, seek in-person care immediately.
                </Text>
              </InfoCard>

              <View style={styles.promptRow}>
                {quickPrompts.map((item) => (
                  <Pressable key={item} style={styles.promptChip} onPress={() => askDoctor(item)}>
                    <Text style={styles.promptText}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {messages.map((item) => (
                <MessageBubble
                  key={item.id}
                  content={item.content}
                  time={item.time}
                  isMe={item.role === "user"}
                />
              ))}

              {loading ? (
                <MessageBubble content="Analyzing..." time={getCurrentTime()} isMe={false} />
              ) : null}
            </ScrollView>

            <View style={styles.composerWrap}>
              <ChatComposer
                value={message}
                onChangeText={setMessage}
                onSend={() => askDoctor()}
                disabled={loading}
                placeholder="Describe your pet symptoms"
              />
            </View>
          </>
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={styles.imageContent}>
            <InfoCard style={styles.uploadCard}>
              <Text style={styles.sectionTitle}>AI Image Diagnosis</Text>
              <Text style={styles.sectionText}>
                Upload support is not enabled yet. This area preserves the Web layout so a photo
                picker can be connected later without changing the page structure.
              </Text>

              <View style={styles.uploadBox}>
                <Text style={styles.uploadIcon}>+</Text>
                <Text style={styles.uploadTitle}>Photo upload placeholder</Text>
                <Text style={styles.uploadText}>No camera or image picker dependency is installed.</Text>
              </View>

              <TextInput
                style={styles.imageInput}
                value={imageNotes}
                onChangeText={setImageNotes}
                placeholder="Add symptom details, e.g. red ears for 2 days, scratching often..."
                placeholderTextColor={colors.textSubtle}
                multiline
              />

              <PrimaryButton onPress={handleImagePlaceholder}>Start Diagnosis</PrimaryButton>
            </InfoCard>

            <InfoCard style={styles.resultCard}>
              <Text style={styles.sectionTitle}>Diagnosis Result</Text>
              <Text style={styles.resultText}>
                {imageResult || "Analysis result will appear here after image upload is enabled."}
              </Text>
            </InfoCard>

            <InfoCard warm style={styles.safetyCard}>
              <Text style={styles.safetyTitle}>Safety Notice</Text>
              <Text style={styles.safetyText}>
                Image diagnosis cannot replace an in-person veterinary exam. If symptoms are
                severe or worsening, visit a vet immediately.
              </Text>
            </InfoCard>
          </ScrollView>
        )}

        <MobileTabs />
      </KeyboardAvoidingView>
    </Screen>
  )
}

function getCurrentTime() {
  const now = new Date()
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
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
  doctorIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    height: 46,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    width: 46,
  },
  doctorIconText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  statusRow: {
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
  segmented: {
    backgroundColor: colors.border,
    borderRadius: radii.xl,
    flexDirection: "row",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: radii.lg,
    flex: 1,
    paddingVertical: spacing.md,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  chatContent: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  imageContent: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  dayLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  safetyCard: {
    gap: spacing.xs,
  },
  safetyTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
  },
  safetyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  promptChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  promptText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#fecaca",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  composerWrap: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  uploadCard: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  uploadBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderWarm,
    borderRadius: radii.xl,
    borderStyle: "dashed",
    borderWidth: 1,
    minHeight: 150,
    justifyContent: "center",
    padding: spacing.lg,
  },
  uploadIcon: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "300",
  },
  uploadTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  uploadText: {
    color: colors.textSubtle,
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  imageInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.text,
    minHeight: 110,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  resultCard: {
    gap: spacing.sm,
  },
  resultText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
})
