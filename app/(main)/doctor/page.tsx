"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  ImagePlus,
  Send,
  ShieldAlert,
  Stethoscope,
  Upload,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  time: string
}

type QuickNotice = {
  id: string
  label: {
    zh: string
    ko: string
    en: string
  }
  prompt: {
    zh: string
    ko: string
    en: string
  }
}

type DoctorTab = "chat" | "image"

const notices: QuickNotice[] = [
  {
    id: "vomit",
    label: {
      zh: "呕吐后怎么办",
      ko: "구토 후 어떻게 하나요",
      en: "What to do after vomiting",
    },
    prompt: {
      zh: "宠物呕吐后我应该先观察哪些情况？",
      ko: "반려동물이 구토한 뒤 어떤 점을 먼저 확인해야 하나요?",
      en: "What should I check first after my pet vomits?",
    },
  },
  {
    id: "diarrhea",
    label: {
      zh: "腹泻观察重点",
      ko: "설사 관찰 포인트",
      en: "Diarrhea checklist",
    },
    prompt: {
      zh: "宠物腹泻时有哪些需要重点观察的症状？",
      ko: "반려동물이 설사할 때 중점적으로 봐야 할 증상은 무엇인가요?",
      en: "What symptoms should I watch closely if my pet has diarrhea?",
    },
  },
  {
    id: "appetite",
    label: {
      zh: "没食欲怎么办",
      ko: "식욕이 없을 때",
      en: "Low appetite advice",
    },
    prompt: {
      zh: "宠物没有食欲时，家庭里可以先怎么处理？",
      ko: "반려동물이 식욕이 없을 때 집에서 먼저 어떻게 해야 하나요?",
      en: "What can I do at home if my pet has low appetite?",
    },
  },
  {
    id: "hospital",
    label: {
      zh: "什么情况要立刻去医院",
      ko: "바로 병원 가야 하는 경우",
      en: "When to go immediately",
    },
    prompt: {
      zh: "哪些情况说明宠物需要立刻去医院？",
      ko: "어떤 경우에 반려동물을 바로 병원에 데려가야 하나요?",
      en: "When should I take my pet to the hospital immediately?",
    },
  },
]

const copy = {
  zh: {
    homeTitle: "AI健康初步分析",
    homeDesc: "填写症状后，系统会调用 OpenAI 生成初步健康建议，并可一键跳转查看附近宠物医院。",
    consultNow: "立即咨询",
    emergency: "紧急就医指引",
    chatTitle: "AI宠物医生",
    chatSubTitle: "在线中",
    inputPlaceholder: "输入消息...",
    today: "今天",
    tipsTitle: "注意事项",
    tipsDesc: "先描述症状、持续时间、食欲、排便、精神状态，AI 会给你更准确的初步建议。",
    emergencyNotice: "若出现持续抽搐、呼吸困难、大量出血、无法站立，请立即线下就医。",
    fallback: "抱歉，当前无法获取 AI 回复，请稍后再试。",
    welcome:
        "你好，我是 WePet AI 宠物医生。你可以告诉我宠物现在的症状、持续时间、食欲、排便和精神状态，我会先做初步分析。",
    faqTitle: "FAQ",

    tabChat: "文字咨询",
    tabImage: "图片诊断",
    imageTitle: "AI图片诊断",
    imageDesc: "可拍照或上传宠物照片，再补充症状描述，AI 会给出初步观察建议。",
    symptomPlaceholder: "补充症状描述，例如：耳朵发红两天、一直抓挠、精神一般、食欲下降",
    openCamera: "打开摄像头",
    closeCamera: "关闭摄像头",
    capturePhoto: "拍照",
    uploadPhoto: "上传照片",
    retakePhoto: "重新选择",
    diagnoseNow: "开始诊断",
    diagnosing: "AI分析中...",
    previewTitle: "图片预览",
    resultTitle: "诊断结果",
    noImageError: "请先拍照或上传照片",
    cameraError: "无法打开摄像头，请检查浏览器权限",
    imageFallback: "抱歉，当前无法完成图片诊断，请稍后再试。",
    imageSafety:
        "图片诊断仅供初步参考，不能替代线下兽医面诊；若出现呼吸困难、持续抽搐、大量出血、无法站立等情况，请立即就医。",
  },
  ko: {
    homeTitle: "AI 건강 1차 분석",
    homeDesc: "증상을 입력하면 OpenAI 기반으로 1차 건강 분석을 제공하고, 필요 시 근처 병원도 확인할 수 있습니다.",
    consultNow: "즉시 상담",
    emergency: "응급 진료 안내",
    chatTitle: "AI 반려동물 의사",
    chatSubTitle: "온라인",
    inputPlaceholder: "메시지를 입력하세요...",
    today: "오늘",
    tipsTitle: "주의사항",
    tipsDesc: "증상, 지속 시간, 식욕, 배변, 활력 상태를 함께 알려주면 더 정확한 1차 조언을 받을 수 있습니다.",
    emergencyNotice: "지속적인 경련, 호흡 곤란, 심한 출혈, 기립 불가 시 즉시 병원으로 가세요.",
    fallback: "죄송합니다. 지금은 AI 응답을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.",
    welcome:
        "안녕하세요. 저는 WePet AI 반려동물 의사입니다. 현재 증상, 지속 시간, 식욕, 배변, 활력 상태를 알려주시면 1차로 도와드릴게요.",
    faqTitle: "FAQ",

    tabChat: "텍스트 상담",
    tabImage: "이미지 진단",
    imageTitle: "AI 이미지 진단",
    imageDesc: "사진을 찍거나 업로드한 뒤 증상을 함께 입력하면 AI가 1차 관찰 의견을 제공합니다.",
    symptomPlaceholder:
        "증상을 보충해서 입력하세요. 예: 귀가 이틀째 붉고 계속 긁어요. 활력이 조금 떨어졌어요.",
    openCamera: "카메라 열기",
    closeCamera: "카메라 닫기",
    capturePhoto: "사진 촬영",
    uploadPhoto: "사진 업로드",
    retakePhoto: "다시 선택",
    diagnoseNow: "진단 시작",
    diagnosing: "AI 분석 중...",
    previewTitle: "이미지 미리보기",
    resultTitle: "진단 결과",
    noImageError: "먼저 사진을 찍거나 업로드해 주세요.",
    cameraError: "카메라를 열 수 없습니다. 브라우저 권한을 확인해 주세요.",
    imageFallback: "죄송합니다. 지금은 이미지 진단을 완료할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    imageSafety:
        "이미지 진단은 참고용이며 대면 진료를 대신할 수 없습니다. 호흡 곤란, 지속적 경련, 심한 출혈, 기립 불가 시 즉시 병원으로 가세요.",
  },
  en: {
    homeTitle: "AI Health Snapshot",
    homeDesc: "Describe symptoms to get an OpenAI-based first-pass health suggestion and quick next-step guidance.",
    consultNow: "Ask Now",
    emergency: "Emergency Guide",
    chatTitle: "AI Pet Doctor",
    chatSubTitle: "Online",
    inputPlaceholder: "Type a message...",
    today: "Today",
    tipsTitle: "Important Notes",
    tipsDesc: "Include symptoms, duration, appetite, stool changes, and energy level for a better first-pass suggestion.",
    emergencyNotice: "For seizures, breathing difficulty, heavy bleeding, or inability to stand, seek in-person care immediately.",
    fallback: "Sorry, I can't get an AI response right now. Please try again later.",
    welcome:
        "Hi, I’m the WePet AI Pet Doctor. Tell me the symptoms, duration, appetite, stool, and activity level, and I’ll give an initial suggestion.",
    faqTitle: "FAQ",

    tabChat: "Text Chat",
    tabImage: "Image Diagnosis",
    imageTitle: "AI Image Diagnosis",
    imageDesc: "Take a photo or upload one, add symptom details, and get an initial AI observation.",
    symptomPlaceholder:
        "Add symptom details, e.g. red ears for 2 days, scratching often, lower appetite, low energy.",
    openCamera: "Open Camera",
    closeCamera: "Close Camera",
    capturePhoto: "Take Photo",
    uploadPhoto: "Upload Photo",
    retakePhoto: "Choose Again",
    diagnoseNow: "Start Diagnosis",
    diagnosing: "Analyzing...",
    previewTitle: "Image Preview",
    resultTitle: "Diagnosis Result",
    noImageError: "Please take or upload a photo first.",
    cameraError: "Unable to open the camera. Please check browser permissions.",
    imageFallback: "Sorry, image diagnosis is unavailable right now. Please try again later.",
    imageSafety:
        "Image diagnosis is for initial reference only and cannot replace an in-person vet visit. For breathing difficulty, seizures, heavy bleeding, or inability to stand, seek immediate care.",
  },
} as const

function getCurrentTime() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

export default function DoctorPage() {
  const { locale } = useLanguage()
  const c = copy[locale]

  const [mounted, setMounted] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [activeTab, setActiveTab] = useState<DoctorTab>("chat")

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [imageSymptom, setImageSymptom] = useState("")
  const [imageLoading, setImageLoading] = useState(false)
  const [imageResult, setImageResult] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    setMessages((prev) => {
      if (prev.length === 0) {
        return [
          {
            role: "assistant",
            content: c.welcome,
            time: getCurrentTime(),
          },
        ]
      }

      const firstAssistantIndex = prev.findIndex((m) => m.role === "assistant")
      if (firstAssistantIndex === -1) return prev

      const next = [...prev]
      next[firstAssistantIndex] = {
        ...next[firstAssistantIndex],
        content: c.welcome,
      }
      return next
    })
  }, [mounted, c.welcome])

  useEffect(() => {
    if (!mounted) return
    if (activeTab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [mounted, messages, loading, activeTab])

  useEffect(() => {
    return () => {
      stopCamera()
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const todayLabel = useMemo(() => c.today, [c.today])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
  }

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })

      streamRef.current = stream
      setCameraOpen(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (error) {
      console.error(error)
      alert(c.cameraError)
    }
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video.videoWidth || !video.videoHeight) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
        (blob) => {
          if (!blob) return

          const file = new File([blob], "pet-photo.jpg", { type: "image/jpeg" })
          setImageFile(file)
          setImageResult("")

          const nextUrl = URL.createObjectURL(file)
          setImagePreview((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return nextUrl
          })

          stopCamera()
        },
        "image/jpeg",
        0.92
    )
  }

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setImageResult("")

    const nextUrl = URL.createObjectURL(file)
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextUrl
    })
  }

  const resetImageDiagnosis = () => {
    setImageFile(null)
    setImageResult("")
    setImageSymptom("")
    stopCamera()

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
  }

  const sendMessage = async (preset?: string) => {
    const text = (preset ?? input).trim()
    if (!text || loading) return

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      time: getCurrentTime(),
    }

    const historyForApi = messages.map(({ role, content }) => ({ role, content }))

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setShowChat(true)
    setActiveTab("chat")
    setLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "doctor_chat",
          message: text,
          history: historyForApi,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Request failed")
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response || c.fallback,
          time: getCurrentTime(),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: c.fallback,
          time: getCurrentTime(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleImageDiagnose = async () => {
    if (!imageFile || imageLoading) {
      if (!imageFile) alert(c.noImageError)
      return
    }

    try {
      setImageLoading(true)
      setImageResult("")

      const formData = new FormData()
      formData.append("image", imageFile)
      formData.append("symptom", imageSymptom)

      const res = await fetch("/api/ai/doctor", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Request failed")
      }

      setImageResult(data.result || c.imageFallback)
    } catch (error) {
      console.error(error)
      setImageResult(c.imageFallback)
    } finally {
      setImageLoading(false)
    }
  }

  if (!mounted) return null

  return (
      <div className="h-full min-h-0">
        <div className="mx-auto flex h-full min-h-0 max-w-md flex-col bg-stone-50">
          {!showChat ? (
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <section className="rounded-3xl bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 p-5 text-white shadow-lg">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    <Stethoscope className="h-4 w-4" />
                    {c.chatTitle}
                  </div>

                  <h1 className="text-3xl font-bold leading-tight">{c.homeTitle}</h1>
                  <p className="mt-3 text-sm leading-7 text-orange-50">{c.homeDesc}</p>

                  <div className="mt-5 flex gap-2">
                    <button
                        onClick={() => {
                          setShowChat(true)
                          setActiveTab("chat")
                        }}
                        className="rounded-2xl bg-white px-5 py-3 font-semibold text-orange-500 shadow-sm"
                    >
                      {c.consultNow}
                    </button>

                    <button className="rounded-2xl border border-white/60 px-5 py-3 font-semibold text-white">
                      {c.emergency}
                    </button>
                  </div>
                </section>

                <section className="rounded-3xl border border-stone-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                      <ShieldAlert className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-stone-900">{c.tipsTitle}</h2>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{c.tipsDesc}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-600">
                    {c.emergencyNotice}
                  </div>
                </section>

                <section className="rounded-3xl border border-stone-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold text-stone-900">{c.faqTitle}</h3>
                  </div>

                  <div className="space-y-3">
                    {notices.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => sendMessage(item.prompt[locale])}
                            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-left transition hover:bg-stone-100"
                        >
                          <div className="flex items-center justify-between">
                      <span className="pr-3 text-sm font-medium text-stone-700">
                        {item.label[locale]}
                      </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                          </div>
                        </button>
                    ))}
                  </div>
                </section>
              </div>
          ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 border-b border-stone-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                        className="rounded-full p-1 text-stone-700"
                        onClick={() => {
                          setShowChat(false)
                          setActiveTab("chat")
                          stopCamera()
                        }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>

                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-stone-100 bg-stone-200">
                      <img
                          src="/pet-doctor-avatar.png"
                          alt="Pet Doctor"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-lg font-bold leading-none text-stone-900">{c.chatTitle}</p>
                      <div className="mt-1 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
                    </span>
                        <p className="text-sm text-stone-500">{c.chatSubTitle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 rounded-2xl bg-stone-100 p-1">
                    <button
                        onClick={() => {
                          setActiveTab("chat")
                          stopCamera()
                        }}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            activeTab === "chat"
                                ? "bg-white text-orange-500 shadow-sm"
                                : "text-stone-600"
                        }`}
                    >
                      {c.tabChat}
                    </button>
                    <button
                        onClick={() => setActiveTab("image")}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            activeTab === "image"
                                ? "bg-white text-orange-500 shadow-sm"
                                : "text-stone-600"
                        }`}
                    >
                      {c.tabImage}
                    </button>
                  </div>
                </div>

                {activeTab === "chat" ? (
                    <>
                      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                        <div className="mb-4 text-center text-sm text-stone-400">{todayLabel}</div>

                        <div className="space-y-4">
                          {messages.map((msg, index) => {
                            const isUser = msg.role === "user"

                            return (
                                <div
                                    key={index}
                                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                      className={`max-w-[72%] rounded-3xl px-4 py-3 shadow-sm ${
                                          isUser
                                              ? "rounded-br-xl bg-orange-500 text-white"
                                              : "rounded-bl-xl border border-stone-100 bg-white text-stone-800"
                                      }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words text-base leading-7">
                                      {msg.content}
                                    </p>
                                    <p
                                        className={`mt-2 text-xs ${
                                            isUser ? "text-orange-100" : "text-stone-400"
                                        }`}
                                    >
                                      {msg.time}
                                    </p>
                                  </div>
                                </div>
                            )
                          })}

                          {loading && (
                              <div className="flex justify-start">
                                <div className="max-w-[72%] rounded-3xl rounded-bl-xl border border-stone-100 bg-white px-4 py-3 text-stone-500 shadow-sm">
                                  <p className="text-sm">...</p>
                                </div>
                              </div>
                          )}

                          <div ref={bottomRef} />
                        </div>
                      </div>

                      <div className="shrink-0 border-t border-stone-200 bg-white px-3 py-3">
                        <div className="flex items-center gap-2 rounded-3xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
                          <input
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder={c.inputPlaceholder}
                              className="flex-1 bg-transparent text-base text-stone-700 outline-none placeholder:text-stone-400"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  sendMessage()
                                }
                              }}
                          />

                          <button
                              onClick={() => sendMessage()}
                              disabled={!input.trim() || loading}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-400 text-white hover:bg-orange-500 disabled:bg-stone-200 disabled:text-stone-400"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                      <div className="rounded-3xl border border-stone-100 bg-white p-4 shadow-sm">
                        <h2 className="text-lg font-bold text-stone-900">{c.imageTitle}</h2>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{c.imageDesc}</p>

                        <textarea
                            value={imageSymptom}
                            onChange={(e) => setImageSymptom(e.target.value)}
                            placeholder={c.symptomPlaceholder}
                            className="mt-4 min-h-[110px] w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm leading-6 text-stone-700 outline-none focus:border-orange-300"
                        />

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                              onClick={openCamera}
                              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white"
                          >
                            <Camera className="h-4 w-4" />
                            {c.openCamera}
                          </button>

                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700">
                            <Upload className="h-4 w-4" />
                            {c.uploadPhoto}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadFile}
                            />
                          </label>

                          {(imageFile || imagePreview) && (
                              <button
                                  onClick={resetImageDiagnosis}
                                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700"
                              >
                                {c.retakePhoto}
                              </button>
                          )}

                          {cameraOpen && (
                              <button
                                  onClick={stopCamera}
                                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-500"
                              >
                                {c.closeCamera}
                              </button>
                          )}
                        </div>

                        {cameraOpen && (
                            <div className="mt-4 overflow-hidden rounded-3xl border border-stone-200 bg-black">
                              <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="aspect-[4/3] w-full object-cover"
                              />
                              <div className="p-3">
                                <button
                                    onClick={handleCapture}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-stone-900"
                                >
                                  <ImagePlus className="h-4 w-4" />
                                  {c.capturePhoto}
                                </button>
                              </div>
                            </div>
                        )}

                        <canvas ref={canvasRef} className="hidden" />

                        {imagePreview && (
                            <div className="mt-4">
                              <p className="mb-2 text-sm font-semibold text-stone-700">{c.previewTitle}</p>
                              <img
                                  src={imagePreview}
                                  alt="pet preview"
                                  className="w-full rounded-3xl border border-stone-200 object-cover"
                              />
                            </div>
                        )}

                        <button
                            onClick={handleImageDiagnose}
                            disabled={imageLoading}
                            className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:bg-stone-300"
                        >
                          {imageLoading ? c.diagnosing : c.diagnoseNow}
                        </button>

                        {imageResult && (
                            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                              <p className="mb-2 text-sm font-bold text-stone-900">{c.resultTitle}</p>
                              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
                        {imageResult}
                      </pre>
                            </div>
                        )}

                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                          {c.imageSafety}
                        </div>
                      </div>
                    </div>
                )}
              </div>
          )}
        </div>
      </div>
  )
}