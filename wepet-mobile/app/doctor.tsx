import { useState } from "react"
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { AppHeader } from "@/components/AppHeader"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { InfoCard } from "@/components/InfoCard"
import { MobileTabs } from "@/components/MobileTabs"
import { PrimaryButton } from "@/components/PrimaryButton"
import { Screen } from "@/components/Screen"
import { apiRequest } from "@/lib/api"
import { useLanguage, type Language } from "@/lib/language-context"
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

const doctorAvatar = require("../assets/pet-doctor-avatar.png")

const imageCopy: Record<
  Language,
  {
    tabChat: string
    tabImage: string
    title: string
    description: string
    choose: string
    chooseAgain: string
    emptyUploadTitle: string
    emptyUploadText: string
    previewTitle: string
    inputPlaceholder: string
    analyze: string
    analyzing: string
    resultTitle: string
    resultEmpty: string
    safetyTitle: string
    safetyText: string
    noImageError: string
    permissionError: string
    imageReadError: string
    fallback: string
  }
> = {
  en: {
    tabChat: "Text Chat",
    tabImage: "Image Diagnosis",
    title: "AI Image Diagnosis",
    description: "Choose a pet photo, add symptom details, and get an initial AI observation.",
    choose: "Choose Photo",
    chooseAgain: "Choose Again",
    emptyUploadTitle: "Upload a pet photo",
    emptyUploadText: "Select an image from your album before starting diagnosis.",
    previewTitle: "Image Preview",
    inputPlaceholder: "Add symptom details, e.g. red ears for 2 days, scratching often...",
    analyze: "Analyze",
    analyzing: "Analyzing...",
    resultTitle: "Diagnosis Result",
    resultEmpty: "Analysis result will appear here after you choose an image and start diagnosis.",
    safetyTitle: "Safety Notice",
    safetyText:
      "Image diagnosis cannot replace an in-person veterinary exam. If symptoms are severe or worsening, visit a vet immediately.",
    noImageError: "Please choose a photo first.",
    permissionError: "Photo library permission is required to choose an image.",
    imageReadError: "Unable to read this image. Please choose another photo.",
    fallback: "Sorry, image diagnosis is unavailable right now. Please try again later.",
  },
  zh: {
    tabChat: "文字咨询",
    tabImage: "图片诊断",
    title: "AI 图片诊断",
    description: "选择宠物照片，补充症状描述，AI 会给出初步观察建议。",
    choose: "选择图片",
    chooseAgain: "重新选择",
    emptyUploadTitle: "上传宠物照片",
    emptyUploadText: "开始诊断前，请先从相册选择一张图片。",
    previewTitle: "图片预览",
    inputPlaceholder: "补充症状描述，例如：耳朵发红两天、一直抓挠...",
    analyze: "分析",
    analyzing: "分析中...",
    resultTitle: "诊断结果",
    resultEmpty: "选择图片并开始诊断后，分析结果会显示在这里。",
    safetyTitle: "安全提示",
    safetyText: "图片诊断不能替代线下兽医面诊；如果症状严重或持续恶化，请立即就医。",
    noImageError: "请先选择图片。",
    permissionError: "需要相册权限才能选择图片。",
    imageReadError: "无法读取这张图片，请重新选择。",
    fallback: "抱歉，当前无法完成图片诊断，请稍后再试。",
  },
  ko: {
    tabChat: "텍스트 상담",
    tabImage: "이미지 진단",
    title: "AI 이미지 진단",
    description: "반려동물 사진을 선택하고 증상을 입력하면 AI가 1차 관찰 의견을 제공합니다.",
    choose: "사진 선택",
    chooseAgain: "다시 선택",
    emptyUploadTitle: "반려동물 사진 업로드",
    emptyUploadText: "진단을 시작하기 전에 앨범에서 이미지를 선택하세요.",
    previewTitle: "이미지 미리보기",
    inputPlaceholder: "증상을 입력하세요. 예: 귀가 이틀째 붉고 계속 긁어요...",
    analyze: "진단",
    analyzing: "진단 중...",
    resultTitle: "진단 결과",
    resultEmpty: "이미지를 선택하고 진단을 시작하면 결과가 여기에 표시됩니다.",
    safetyTitle: "안전 안내",
    safetyText: "이미지 진단은 대면 진료를 대신할 수 없습니다. 증상이 심하거나 악화되면 병원에 방문하세요.",
    noImageError: "먼저 사진을 선택해 주세요.",
    permissionError: "사진을 선택하려면 앨범 권한이 필요합니다.",
    imageReadError: "이미지를 읽을 수 없습니다. 다른 사진을 선택해 주세요.",
    fallback: "죄송합니다. 지금은 이미지 진단을 완료할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  },
}

type PickedImage = {
  uri: string
  base64: string
  mimeType: string
}

export default function DoctorPage() {
  const { language } = useLanguage()
  const imageText = imageCopy[language]
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
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null)
  const [imageResult, setImageResult] = useState("")
  const [imageError, setImageError] = useState("")
  const [imageLoading, setImageLoading] = useState(false)

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

  async function chooseImage() {
    if (imageLoading) return

    setImageError("")

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setImageError(imageText.permissionError)
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
      base64: true,
    })

    if (result.canceled) return

    const asset = result.assets[0]
    if (!asset?.uri || !asset.base64) {
      setImageError(imageText.imageReadError)
      return
    }

    setPickedImage({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType || "image/jpeg",
    })
    setImageResult("")
    setImageError("")
  }

  async function handleImageDiagnose() {
    if (imageLoading) return

    if (!pickedImage) {
      setImageError(imageText.noImageError)
      return
    }

    try {
      setImageLoading(true)
      setImageError("")
      setImageResult("")

      const data = await apiRequest<{ success: true; data: { result: string } }>("/ai/diagnose", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          imageBase64: pickedImage.base64,
          mimeType: pickedImage.mimeType,
          symptom: imageNotes,
        }),
      })

      setImageResult(data.data.result || imageText.fallback)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : imageText.fallback)
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <AppHeader
          title="AI Pet Doctor"
          subtitle="Online"
          profileImage={doctorAvatar}
          profileLabel="Doctor"
          online
        />

        <View style={styles.segmented}>
          <Pressable
            style={[styles.segmentButton, activeTab === "chat" && styles.segmentActive]}
            onPress={() => setActiveTab("chat")}
          >
            <Text style={[styles.segmentText, activeTab === "chat" && styles.segmentTextActive]}>
              {imageText.tabChat}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, activeTab === "image" && styles.segmentActive]}
            onPress={() => setActiveTab("image")}
          >
            <Text style={[styles.segmentText, activeTab === "image" && styles.segmentTextActive]}>
              {imageText.tabImage}
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
              <Text style={styles.sectionTitle}>{imageText.title}</Text>
              <Text style={styles.sectionText}>{imageText.description}</Text>

              <Pressable
                style={[styles.uploadBox, imageLoading && styles.disabledControl]}
                onPress={chooseImage}
                disabled={imageLoading}
              >
                {pickedImage ? (
                  <>
                    <Image source={{ uri: pickedImage.uri }} style={styles.previewImage} />
                    <Text style={styles.previewLabel}>{imageText.previewTitle}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.uploadIcon}>+</Text>
                    <Text style={styles.uploadTitle}>{imageText.emptyUploadTitle}</Text>
                    <Text style={styles.uploadText}>{imageText.emptyUploadText}</Text>
                  </>
                )}
              </Pressable>

              <PrimaryButton onPress={chooseImage} disabled={imageLoading}>
                {pickedImage ? imageText.chooseAgain : imageText.choose}
              </PrimaryButton>

              <TextInput
                style={styles.imageInput}
                value={imageNotes}
                onChangeText={setImageNotes}
                placeholder={imageText.inputPlaceholder}
                placeholderTextColor={colors.textSubtle}
                multiline
                editable={!imageLoading}
              />

              {imageError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{imageError}</Text>
                </View>
              ) : null}

              <PrimaryButton
                onPress={handleImageDiagnose}
                disabled={imageLoading}
              >
                {imageLoading ? imageText.analyzing : imageText.analyze}
              </PrimaryButton>
            </InfoCard>

            <InfoCard style={styles.resultCard}>
              <Text style={styles.sectionTitle}>{imageText.resultTitle}</Text>
              <Text style={styles.resultText}>
                {imageResult || imageText.resultEmpty}
              </Text>
            </InfoCard>

            <InfoCard warm style={styles.safetyCard}>
              <Text style={styles.safetyTitle}>{imageText.safetyTitle}</Text>
              <Text style={styles.safetyText}>{imageText.safetyText}</Text>
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
  disabledControl: {
    opacity: 0.6,
  },
  previewImage: {
    borderRadius: radii.lg,
    height: 210,
    width: "100%",
  },
  previewLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.sm,
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
