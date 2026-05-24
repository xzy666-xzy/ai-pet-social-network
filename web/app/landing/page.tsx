"use client"

import Link from "next/link"
import { useState, useEffect, useRef, type SyntheticEvent } from "react"
import {
  Heart,
  MessageCircle,
  MapPin,
  PawPrint,
  ShieldCheck,
  UserRound,
  UsersRound,
  ChevronRight,
  CheckCircle,
  ArrowDown,
} from "lucide-react"
import type { Locale } from "@/lib/i18n/translations"

type Lang = Locale

type FeatureDeepItem = {
  key: string
  imageSrc: string
  label: string
  title: string
  description: string
}

/* ── Feature copy: en / zh / ko ─────────────────────────────── */
const featureCopy: Record<Lang, FeatureDeepItem[]> = {
  en: [
    {
      key: "match",
      imageSrc: "/landing/match.png",
      label: "WEPET MATCH",
      title: "Find nearby pet friends\nthat truly fit",
      description:
        "WePet recommends companions based on distance, age, breed, and personality.\nA simple swipe can start a new connection for both pets and owners.",
    },
    {
      key: "chat",
      imageSrc: "/landing/chat.png",
      label: "WEPET CHAT",
      title: "Start talking after\nmutual likes",
      description:
        "When both sides show interest, private chat opens naturally.\nPlan walks, share updates, and build safe pet friendships.",
    },
    {
      key: "doctor",
      imageSrc: "/landing/doctor.png",
      label: "WEPET AI DOCTOR",
      title: "Ask about symptoms\nbefore you worry",
      description:
        "Describe symptoms or upload a photo for quick AI-assisted guidance.\nWePet helps you understand what to check before visiting a clinic.",
    },
    {
      key: "explore",
      imageSrc: "/landing/explore.png",
      label: "WEPET EXPLORE",
      title: "Discover pet-friendly\nactivities nearby",
      description:
        "Find local walks, meetups, parks, and pet-friendly places around you.\nTurn online matches into real-world moments.",
    },
    {
      key: "profile",
      imageSrc: "/landing/profile.png",
      label: "WEPET PROFILE",
      title: "Show your pet's\npersonality clearly",
      description:
        "Share breed, age, traits, photos, and a short introduction.\nA richer profile helps better matches happen naturally.",
    },
  ],
  zh: [
    {
      key: "match",
      imageSrc: "/landing/match.png",
      label: "WEPET 匹配",
      title: "发现真正适合的\n附近宠物朋友",
      description:
        "WePet 会根据距离、年龄、品种和性格推荐更合适的伙伴。\n一次简单的滑动，就能为宠物和主人开启新的连接。",
    },
    {
      key: "chat",
      imageSrc: "/landing/chat.png",
      label: "WEPET 聊天",
      title: "互相喜欢后，\n自然开始聊天",
      description:
        "双方都表达兴趣后，私聊会安全开启。\n可以约散步、分享日常，也能慢慢建立真实的宠物友谊。",
    },
    {
      key: "doctor",
      imageSrc: "/landing/doctor.png",
      label: "WEPET AI 医生",
      title: "担心症状时，\n先问问 AI 医生",
      description:
        "输入症状或上传照片，快速获得 AI 辅助的初步建议。\nWePet 帮你在去医院前先了解需要关注的情况。",
    },
    {
      key: "explore",
      imageSrc: "/landing/explore.png",
      label: "WEPET 探索",
      title: "发现附近的\n宠物友好活动",
      description:
        "找到周边散步、聚会、公园和宠物友好地点。\n让线上匹配延伸到真实的线下相遇。",
    },
    {
      key: "profile",
      imageSrc: "/landing/profile.png",
      label: "WEPET 资料",
      title: "更清楚地展示\n你的宠物性格",
      description:
        "展示品种、年龄、性格、照片和简短介绍。\n更完整的资料，会让匹配和聊天更自然。",
    },
  ],
  ko: [
    {
      key: "match",
      imageSrc: "/landing/match.png",
      label: "WEPET 매칭",
      title: "우리 아이에게 잘 맞는\n가까운 친구를 찾아요",
      description:
        "거리, 나이, 품종, 성격을 바탕으로 어울리는 반려동물 친구를 추천해요.\n간단한 스와이프로 반려동물과 보호자 모두에게 새로운 연결이 시작돼요.",
    },
    {
      key: "chat",
      imageSrc: "/landing/chat.png",
      label: "WEPET 채팅",
      title: "서로 좋아요를 누르면\n대화가 시작돼요",
      description:
        "서로 관심을 표현한 뒤 안전하게 1:1 채팅이 열려요.\n산책을 약속하고 일상을 나누며 자연스럽게 반려동물 친구를 만들 수 있어요.",
    },
    {
      key: "doctor",
      imageSrc: "/landing/doctor.png",
      label: "WEPET AI 의사",
      title: "걱정되는 증상은\n먼저 AI에게 물어보세요",
      description:
        "증상을 입력하거나 사진을 올리면 AI가 빠르게 초기 상담을 도와줘요.\n병원에 가기 전 어떤 점을 확인해야 할지 먼저 살펴볼 수 있어요.",
    },
    {
      key: "explore",
      imageSrc: "/landing/explore.png",
      label: "WEPET 탐색",
      title: "근처 반려동물\n활동을 발견해요",
      description:
        "주변 산책 모임, 이벤트, 공원, 반려동물 친화 장소를 찾아보세요.\n온라인에서 시작된 연결을 실제 만남으로 이어갈 수 있어요.",
    },
    {
      key: "profile",
      imageSrc: "/landing/profile.png",
      label: "WEPET 프로필",
      title: "우리 아이의 성격을\n더 잘 보여주세요",
      description:
        "품종, 나이, 성격, 사진, 소개를 한곳에 담을 수 있어요.\n풍부한 프로필은 더 자연스러운 매칭과 대화를 만들어줘요.",
    },
  ],
}

/* ── refined, mature palette ─────────────────────────────────── */
const btnPrimary =
  "inline-flex items-center gap-2 rounded-full bg-[#F97316] px-8 py-4 text-base font-bold text-white " +
  "shadow-[0_8px_24px_rgba(249,115,22,0.20)] transition-all duration-300 " +
  "hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(249,115,22,0.28)] active:translate-y-0"

const btnSecondary =
  "inline-flex items-center gap-2 rounded-full border border-[#E8E4DE] bg-white px-8 py-4 text-base font-semibold text-[#1A1A1A] " +
  "shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 " +
  "hover:-translate-y-0.5 hover:border-[#F97316]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:translate-y-0"

const copy = {
  en: {
    nav: {
      features: "Features",
      safety: "Safety",
      download: "Download",
      login: "Log In",
      create: "Get Started",
    },
    langLabels: { en: "EN", zh: "中文", ko: "한국어" },
    badge: "Pet social network",
    heroTitle: "More than a walk.\nWePet connects pet worlds.",
    heroSubtitle:
      "A warm, real social space for pets and their people. Match, chat, and explore pet-friendly places — naturally.",
    ctaPrimary: "Get Started",
    ctaSecondary: "Open Web App",
    featuresLabel: "Features",
    featuresTitle: "Everything for real pet friendships.",
    featuresSubtitle:
      "WePet brings matching, chat, local discovery, pet care, and community into one simple, warm experience.",
    features: [
      { title: "Nearby Pet Matching", text: "Find pets and owners around your daily area with a warm, social matching flow." },
      { title: "Mutual Like Chat", text: "Start chatting only after both sides show interest, keeping first messages comfortable." },
      { title: "Pet Events & Meetups", text: "Discover walks, meetups, and local pet activities built around real communities." },
      { title: "Explore Pet-friendly Places", text: "Browse parks, cafes, clinics, and places that fit life with pets in Korea." },
      { title: "AI Pet Doctor", text: "Use AI guidance to organize symptoms, daily care notes, and questions before a clinic visit." },
      { title: "Pet Profile", text: "Create a clear profile for your pet with personality, routine, photos, and location." },
    ],
    aiCareNote: {
      title: "AI guidance for everyday pet care.",
      text: "Not a replacement for professional veterinary care.",
      tip: "Care tip",
      bubble: "Keep notes and ask better questions before a clinic visit.",
    },
    howLabel: "How WePet Works",
    howTitle: "Start with your pet, then meet the right people nearby.",
    steps: [
      { title: "Create your pet profile", text: "Add your pet's name, personality, routine, photos, and neighborhood." },
      { title: "Match with nearby pets", text: "See compatible pet friends around you and send likes when it feels right." },
      { title: "Chat after mutual likes", text: "Open a conversation after both owners choose to connect." },
      { title: "Join events and explore", text: "Plan walks, meetups, and everyday outings from local discovery." },
    ],
    safetyLabel: "Safety & Trust",
    safetyTitle: "Built for safe pet friendships",
    safety: [
      { title: "Mutual likes before chat", text: "Conversations begin only when both owners choose to connect." },
      { title: "Pet-centered profiles", text: "Profiles focus on pets, routines, and practical information for better matches." },
      { title: "Friendly community", text: "WePet is designed around respectful, local, pet-first social behavior." },
      { title: "AI advice is for guidance only", text: "AI Pet Doctor helps organize care thoughts, but it does not replace professional veterinary care." },
    ],
    downloadTitle: "Download WePet",
    downloadSubtitle: "Start matching, chatting, and exploring pet-friendly places with WePet.",
    appStore: "App Store",
    googlePlay: "Google Play",
    openApp: "Open Web App",
    footerText: "Pet social platform in Korea",
    footerDescription: "안산 · Ansan",
    footerProduct: "Product",
    footerCompany: "Company",
    footerLinks: {
      features: "Features",
      explore: "Explore",
      doctor: "AI Pet Doctor",
      download: "Download",
      about: "About",
      privacy: "Privacy",
      terms: "Terms",
      contact: "Contact",
    },
    copyright: "© 2026 WePet · Made with pets in Ansan",
    scrollHint: "Scroll to explore",
    featurePanels: [
      {
        title: "Nearby Pet Matching",
        subtitle: "Find compatible pets and owners around your neighborhood with a warm, social matching flow.",
        imageLabel: "Match",
        imageSub: "1.8 km away",
        imageName1: "Mochi",
        imageName2: "Dodo",
      },
      {
        title: "Mutual Like Chat",
        subtitle: "Start chatting only after both sides show interest. First messages feel comfortable and natural.",
        imageLabel: "Chat",
        imageSub: "Today",
        chatQuestion: "Walk near Hangang today?",
        chatAnswer: "See you at 6!",
      },
      {
        title: "Pet Events & Meetups",
        subtitle: "Discover walks, meetups, and local pet activities built around real communities near you.",
        imageLabel: "Events",
        imageSub: "This week",
        event1: "Weekend Dog Walk",
        event2: "Pet Cafe Meetup",
      },
      {
        title: "AI Pet Doctor",
        subtitle: "Use AI guidance to organize symptoms, daily care notes, and questions before a clinic visit.",
        imageLabel: "AI Doctor",
        imageSub: "Smart Assistant",
        tip: "Care tip",
        bubble: "Keep notes and ask better questions before a clinic visit.",
      },
    ],
  },
  zh: {
    nav: {
      features: "功能",
      safety: "安全",
      download: "下载",
      login: "登录",
      create: "开始使用",
    },
    langLabels: { en: "EN", zh: "中文", ko: "한국어" },
    badge: "宠物社交平台",
    heroTitle: "不仅仅是散步。\nWePet 让宠物世界相连。",
    heroSubtitle:
      "一个温暖、真实的宠物社交空间。匹配、聊天、探索宠物友好地点 — 一切自然而然。",
    ctaPrimary: "开始使用",
    ctaSecondary: "打开网页版",
    featuresLabel: "功能",
    featuresTitle: "为真实的宠物友谊而生。",
    featuresSubtitle: "WePet 将匹配、聊天、本地探索、宠物护理和社区整合进一个温暖简单的体验。",
    features: [
      { title: "附近宠物匹配", text: "在日常生活区域发现附近宠物和主人，用温暖的社交流程开启连接。" },
      { title: "双向喜欢聊天", text: "只有双方都表达兴趣后才开始聊天，让第一句对话更自然安心。" },
      { title: "宠物活动与聚会", text: "发现遛宠、见面会和围绕真实社区产生的本地宠物活动。" },
      { title: "探索宠物友好地点", text: "浏览适合韩国宠物生活的公园、咖啡店、医院和友好空间。" },
      { title: "AI 宠物医生", text: "用 AI 整理症状、日常护理记录和就诊前想咨询的问题。" },
      { title: "宠物资料", text: "为宠物创建清晰资料，展示性格、日常习惯、照片和所在区域。" },
    ],
    aiCareNote: {
      title: "日常宠物护理的 AI 指引。",
      text: "不能替代专业兽医诊疗。",
      tip: "护理提示",
      bubble: "记录情况，并在就诊前整理更清晰的问题。",
    },
    howLabel: "使用流程",
    howTitle: "从宠物资料开始，认识附近合适的人和宠物。",
    steps: [
      { title: "创建宠物资料", text: "添加宠物名字、性格、日常习惯、照片和所在社区。" },
      { title: "匹配附近宠物", text: "浏览附近合适的宠物朋友，并在有兴趣时发送喜欢。" },
      { title: "双向喜欢后聊天", text: "双方都选择连接后，再开启安全自然的对话。" },
      { title: "参加活动并探索", text: "通过本地探索计划散步、聚会和日常出行。" },
    ],
    safetyLabel: "安全与信任",
    safetyTitle: "为安全的宠物社交而设计",
    safety: [
      { title: "双向喜欢后再聊天", text: "只有双方主人都选择连接后，对话才会开始。" },
      { title: "以宠物为中心的资料", text: "资料聚焦宠物、生活习惯和实用信息，让匹配更合适。" },
      { title: "友好的社区氛围", text: "WePet 围绕尊重、本地和宠物优先的社交体验设计。" },
      { title: "AI 建议仅供参考", text: "AI 宠物医生可帮助整理护理思路，但不能替代专业兽医诊疗。" },
    ],
    downloadTitle: "下载 WePet",
    downloadSubtitle: "使用 WePet 开始匹配、聊天，并探索宠物友好地点。",
    appStore: "App Store",
    googlePlay: "Google Play",
    openApp: "打开 Web App",
    footerText: "韩国宠物社交平台",
    footerDescription: "안산 · Ansan",
    footerProduct: "产品",
    footerCompany: "公司",
    footerLinks: {
      features: "功能",
      explore: "探索",
      doctor: "AI 宠物医生",
      download: "下载",
      about: "关于",
      privacy: "隐私",
      terms: "条款",
      contact: "联系",
    },
    copyright: "© 2026 WePet · Made with pets in Ansan",
    scrollHint: "向下滚动探索",
    featurePanels: [
      {
        title: "附近宠物匹配",
        subtitle: "在日常生活区域发现附近宠物和主人，用温暖的社交流程开启连接。",
        imageLabel: "匹配",
        imageSub: "1.8 公里",
        imageName1: "Mochi",
        imageName2: "Dodo",
      },
      {
        title: "双向喜欢聊天",
        subtitle: "只有双方都表达兴趣后才开始聊天，让第一句对话更自然安心。",
        imageLabel: "聊天",
        imageSub: "今天",
        chatQuestion: "今天在汉江散步吗？",
        chatAnswer: "6 点见！",
      },
      {
        title: "宠物活动与聚会",
        subtitle: "发现遛宠、见面会和围绕真实社区产生的本地宠物活动。",
        imageLabel: "活动",
        imageSub: "本周",
        event1: "周末遛狗",
        event2: "宠物咖啡聚会",
      },
      {
        title: "AI 宠物医生",
        subtitle: "用 AI 整理症状、日常护理记录和就诊前想咨询的问题。",
        imageLabel: "AI 医生",
        imageSub: "智能助手",
        tip: "护理提示",
        bubble: "记录情况，并在就诊前整理更清晰的问题。",
      },
    ],
  },
  ko: {
    nav: {
      features: "기능",
      safety: "안전",
      download: "다운로드",
      login: "로그인",
      create: "시작하기",
    },
    langLabels: { en: "EN", zh: "中文", ko: "한국어" },
    badge: "반려동물 소셜 네트워크",
    heroTitle: "단순한 산책이 아닙니다.\nWePet이 반려동물 세상을 연결합니다.",
    heroSubtitle:
      "반려동물과 사람을 위한 따뜻하고 진정한 소셜 공간. 매칭, 채팅, 반려동물 친화 장소 탐색까지 — 자연스럽게.",
    ctaPrimary: "시작하기",
    ctaSecondary: "웹에서 보기",
    featuresLabel: "기능",
    featuresTitle: "진정한 반려동물 친구 관계를 위한 모든 것.",
    featuresSubtitle: "WePet은 매칭, 채팅, 지역 탐색, 반려동물 케어, 커뮤니티를 하나의 따뜻한 경험으로 연결합니다.",
    features: [
      { title: "근처 반려동물 매칭", text: "일상 생활권 안의 반려동물과 보호자를 따뜻한 소셜 매칭 흐름으로 만나보세요." },
      { title: "상호 좋아요 채팅", text: "양쪽 모두 관심을 보낸 뒤 채팅이 시작되어 첫 대화가 더 편안합니다." },
      { title: "반려동물 이벤트와 모임", text: "산책, 만남, 지역 커뮤니티 중심의 반려동물 활동을 발견하세요." },
      { title: "반려동물 동반 장소 탐색", text: "한국에서 반려동물과 함께하기 좋은 공원, 카페, 병원, 공간을 둘러보세요." },
      { title: "AI 반려동물 의사", text: "증상, 일상 케어 기록, 병원 방문 전 질문을 AI로 정리해보세요." },
      { title: "반려동물 프로필", text: "성격, 생활 패턴, 사진, 지역을 담은 명확한 반려동물 프로필을 만드세요." },
    ],
    aiCareNote: {
      title: "일상 반려동물 케어를 위한 AI 가이드.",
      text: "전문 수의사 진료를 대체하지 않습니다.",
      tip: "케어 팁",
      bubble: "기록을 남기고 병원 방문 전 질문을 정리해보세요.",
    },
    howLabel: "이용 방법",
    howTitle: "반려동물 프로필에서 시작해 가까운 좋은 인연을 만나세요.",
    steps: [
      { title: "반려동물 프로필 만들기", text: "이름, 성격, 생활 패턴, 사진, 동네 정보를 추가하세요." },
      { title: "근처 반려동물과 매칭", text: "주변의 잘 맞는 반려동물 친구를 보고 마음에 들면 좋아요를 보내세요." },
      { title: "상호 좋아요 후 채팅", text: "두 보호자가 모두 연결을 선택한 뒤 자연스럽게 대화를 시작하세요." },
      { title: "이벤트 참여와 탐색", text: "지역 탐색으로 산책, 모임, 일상 외출을 계획하세요." },
    ],
    safetyLabel: "안전과 신뢰",
    safetyTitle: "안전한 반려동물 친구 관계를 위해",
    safety: [
      { title: "서로 좋아요 후 채팅", text: "두 보호자가 모두 연결을 선택했을 때만 대화가 시작됩니다." },
      { title: "반려동물 중심 프로필", text: "프로필은 반려동물, 생활 패턴, 실용적인 정보에 집중합니다." },
      { title: "따뜻한 커뮤니티", text: "WePet은 존중, 지역성, 반려동물 우선 소셜 경험을 중심으로 설계되었습니다." },
      { title: "AI 조언은 참고용", text: "AI 반려동물 의사는 케어 생각을 정리하도록 돕지만 전문 진료를 대체하지 않습니다." },
    ],
    downloadTitle: "WePet 다운로드",
    downloadSubtitle: "WePet에서 매칭, 채팅, 반려동물 동반 장소 탐색을 시작하세요.",
    appStore: "App Store",
    googlePlay: "Google Play",
    openApp: "Web App 열기",
    footerText: "한국의 반려동물 소셜 플랫폼",
    footerDescription: "안산 · Ansan",
    footerProduct: "제품",
    footerCompany: "회사",
    footerLinks: {
      features: "기능",
      explore: "탐색",
      doctor: "AI 반려동물 의사",
      download: "다운로드",
      about: "소개",
      privacy: "개인정보",
      terms: "약관",
      contact: "문의",
    },
    copyright: "© 2026 WePet · Made with pets in Ansan",
    scrollHint: "스크롤하여 탐색",
    featurePanels: [
      {
        title: "근처 반려동물 매칭",
        subtitle: "일상 생활권 안의 반려동물과 보호자를 따뜻한 소셜 매칭 흐름으로 만나보세요.",
        imageLabel: "매칭",
        imageSub: "1.8km",
        imageName1: "모치",
        imageName2: "도도",
      },
      {
        title: "상호 좋아요 채팅",
        subtitle: "양쪽 모두 관심을 보낸 뒤 채팅이 시작되어 첫 대화가 더 편안합니다.",
        imageLabel: "채팅",
        imageSub: "오늘",
        chatQuestion: "오늘 한강에서 산책할까요?",
        chatAnswer: "6시에 만나요!",
      },
      {
        title: "반려동물 이벤트와 모임",
        subtitle: "산책, 만남, 지역 커뮤니티 중심의 반려동물 활동을 발견하세요.",
        imageLabel: "이벤트",
        imageSub: "이번 주",
        event1: "주말 강아지 산책",
        event2: "반려동물 카페 모임",
      },
      {
        title: "AI 반려동물 의사",
        subtitle: "증상, 일상 케어 기록, 병원 방문 전 질문을 AI로 정리해보세요.",
        imageLabel: "AI 의사",
        imageSub: "스마트 도우미",
        tip: "케어 팁",
        bubble: "기록을 남기고 병원 방문 전 질문을 정리해보세요.",
      },
    ],
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/* ── FeaturesSection: KakaoTalk-style scrollable feature panels ── */
function FeaturesSection({ lang }: { lang: Lang }) {
  const items: FeatureDeepItem[] = featureCopy[lang]
  const [activeIndex, setActiveIndex] = useState(0)
  const outerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const handleFeatureImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    if (img.dataset.fallbackApplied === "1") return
    img.dataset.fallbackApplied = "1"
    img.src = "/placeholder.jpg"
  }

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return

    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const rect = outer.getBoundingClientRect()
        const scrollableHeight = rect.height - window.innerHeight
        if (scrollableHeight <= 0) return
        const rawProgress = -rect.top / scrollableHeight
        const progress = clamp(rawProgress, 0, 1)
        const index = Math.round(progress * (items.length - 1))
        setActiveIndex(index)
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [items.length])

  return (
    <section id="features" className="bg-white">
      {/* ── Section header ─────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl px-6 pb-8 pt-24 md:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7A00]">
          {lang === "zh" ? "功能" : lang === "ko" ? "기능" : "Features"}
        </p>
        <h2 className="mt-4 whitespace-pre-line text-4xl font-semibold leading-[1.12] text-[#111111] md:text-5xl lg:text-6xl">
          {lang === "zh"
            ? "一次安静滚动，\n展示 WePet 五大核心体验"
            : lang === "ko"
              ? "한 번의 조용한 스크롤로,\nWePet 핵심 5가지를 보여줍니다"
              : "One calm scroll,\nfive core WePet experiences"}
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[#5E5E5E] md:text-lg">
          {lang === "zh"
            ? "大留白、单栏呼吸节奏、Sticky 手机图与流畅淡入淡出。"
            : lang === "ko"
              ? "넓은 여백, 단일 컬럼 호흡감, Sticky 폰 목업, 부드러운 페이드 전환."
              : "Large white space, single-column rhythm, sticky phone mockup, and smooth fade transitions."}
        </p>
      </div>

      {/* ── Tall scroll spacer + sticky inner ──────────────────── */}
      <div
        ref={outerRef}
        className="relative"
        style={{ height: `${items.length * 100}vh` }}
      >
        <div
          className="sticky top-[72px]"
          style={{ height: "calc(100vh - 72px)" }}
        >
          <div className="mx-auto grid h-full max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-[minmax(0,1fr)_420px] md:gap-24 md:px-10 lg:px-16">
            {/* ── Left: text content (vertically centered) ──────────── */}
            <div className="relative flex flex-col justify-center">
              <div className="w-full max-w-[460px]">
                {items.map((item, index) => {
                  const isActive = index === activeIndex
                  const isPrev = index < activeIndex
                  const isNext = index > activeIndex

                  let textClasses = "opacity-0 translate-y-10"
                  if (isActive) {
                    textClasses = "opacity-100 translate-y-0"
                  } else if (isPrev) {
                    textClasses = "opacity-0 -translate-y-[30px]"
                  } else if (isNext) {
                    textClasses = "opacity-0 translate-y-10"
                  }

                  return (
                    <div
                      key={item.key}
                      className={`absolute left-0 top-0 w-full transition-all duration-700 ease-out ${textClasses}`}
                      aria-hidden={!isActive}
                    >
                      {/* Orange label */}
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">
                        {item.label}
                      </p>
                      {/* Title: 2~3 lines */}
                      <h3 className="mt-6 whitespace-pre-line text-5xl font-bold leading-tight text-[#111111] md:text-6xl">
                        {item.title}
                      </h3>
                      {/* Description: 2 paragraphs */}
                      {item.description.split("\n").map((para, i) => (
                        <p
                          key={i}
                          className={`text-lg leading-8 text-neutral-500 font-medium ${
                            i === 0 ? "mt-6" : "mt-4"
                          }`}
                        >
                          {para}
                        </p>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Right: phone mockup ──────────────────────────────── */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="w-full max-w-[400px] rounded-[36px] border border-[#EDEDED] bg-white p-3 shadow-[0_24px_70px_rgba(0,0,0,0.09)]">
                <div className="relative h-[580px] overflow-hidden rounded-[28px] bg-[#F7F7F7] md:h-[640px]">
                  {items.map((item, index) => {
                    const isActive = index === activeIndex
                    const isPrev = index < activeIndex
                    const isNext = index > activeIndex

                    let imgClasses = "opacity-0 translate-y-10"
                    if (isActive) {
                      imgClasses = "opacity-100 translate-y-0"
                    } else if (isPrev) {
                      imgClasses = "opacity-0 -translate-y-[30px]"
                    } else if (isNext) {
                      imgClasses = "opacity-0 translate-y-10"
                    }

                    return (
                      <img
                        key={item.key}
                        src={item.imageSrc}
                        alt={item.label}
                        onError={handleFeatureImageError}
                        className={`absolute inset-0 h-full w-full object-contain transition-all duration-700 ease-out ${imgClasses}`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* ── Dots ──────────────────────────────────────────── */}
              <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2">
                {items.map((item, index) => (
                  <span
                    key={`${item.key}-dot`}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      index === activeIndex ? "w-8 bg-[#FF7A00]" : "w-1.5 bg-[#D8D8D8]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("en")
  const t = copy[lang]

  return (
    <main className="min-h-screen bg-[#FBF9F6] text-[#1A1A1A]">
      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#E8E4DE] bg-[#FBF9F6]/88 backdrop-blur-lg">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/landing" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#1A1A1A]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F97316] text-white">
              <PawPrint className="h-5 w-5" />
            </span>
            WePet
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-[#6B6B6B] lg:flex">
            <a href="#features" className="transition hover:text-[#1A1A1A]">{t.nav.features}</a>
            <a href="#safety" className="transition hover:text-[#1A1A1A]">{t.nav.safety}</a>
            <a href="#download" className="transition hover:text-[#1A1A1A]">{t.nav.download}</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex rounded-full border border-[#E8E4DE] bg-white p-0.5 shadow-sm">
              {(["en", "zh", "ko"] as Lang[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    lang === value ? "bg-[#F97316] text-white" : "text-[#6B6B6B] hover:text-[#1A1A1A]"
                  }`}
                >
                  {t.langLabels[value]}
                </button>
              ))}
            </div>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#6B6B6B] transition hover:text-[#1A1A1A]"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#F97316] px-5 py-2 text-sm font-bold text-white shadow-[0_4px_12px_rgba(249,115,22,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(249,115,22,0.28)]"
            >
              {t.nav.create}
            </Link>
          </div>
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════════════
          STEP 1: HERO — KakaoTalk-inspired centered layout
          ══════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pt-16">
        {/* ultra-clean background — no gradients, no noise */}
        <div className="pointer-events-none absolute inset-0 bg-[#FBF9F6]" />

        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          {/* ── App Logo / Badge ──────────────────────────────── */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-2xl border border-[#E8E4DE] bg-white px-5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316] text-white">
              <PawPrint className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-[#6B6B6B]">
              {t.badge}
            </span>
          </div>

          {/* ── Main Title — giant,沉稳, centered ─────────────── */}
          <h1 className="whitespace-pre-line text-5xl font-bold leading-[1.12] tracking-tight text-[#1A1A1A] sm:text-6xl lg:text-7xl xl:text-[4.75rem]">
            {t.heroTitle}
          </h1>

          {/* ── Subtitle ──────────────────────────────────────── */}
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-[#6B6B6B] sm:text-xl">
            {t.heroSubtitle}
          </p>

          {/* ── CTA Buttons ──────────────────────────────────────── */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className={btnPrimary}>
              {t.ctaPrimary}
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/app" className={btnSecondary}>
              {t.ctaSecondary}
            </Link>
          </div>

          {/* ── Trust indicators — centered horizontally ─────────── */}
          <div className="mt-12 flex items-center justify-center gap-6 text-xs font-medium text-[#9C9C9C]">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-[#9C9C9C]" />
              Mutual likes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-[#9C9C9C]" />
              Real profiles
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-[#9C9C9C]" />
              Safe community
            </span>
          </div>

          {/* ── Scroll hint ──────────────────────────────────────── */}
          <div className="mt-16 flex animate-bounce flex-col items-center gap-2 text-xs font-semibold text-[#9C9C9C]">
            <span>{t.scrollHint}</span>
            <ArrowDown className="h-4 w-4" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STEP 2: Full-screen feature panels (Snap Scrolling)
          ══════════════════════════════════════════════════════════ */}
      <FeaturesSection lang={lang} />

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#FBF9F6] px-5 py-20 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute left-[-8rem] top-12 h-72 w-72 rounded-full bg-[#F97316]/[0.03] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-[#F97316]/[0.03] blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F97316]">{t.howLabel}</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#1A1A1A] sm:text-5xl">{t.howTitle}</h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-4">
            {t.steps.map((step, index) => {
              const StepIcon = [UserRound, Heart, MessageCircle, MapPin][index]
              return (
                <article
                  key={step.title}
                  className="group relative min-h-[18rem] overflow-hidden rounded-3xl border border-[#E8E4DE] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-[#E8E4DE] bg-white px-3 py-1 text-[10px] font-semibold text-[#9C9C9C]">
                      Step {index + 1}
                    </span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF5ED] text-[#F97316] shadow-sm transition duration-300 group-hover:scale-110">
                      <StepIcon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="relative mt-8 rounded-2xl border border-[#E8E4DE]/60 bg-[#FBF9F6] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#F97316]" />
                        <span className="h-2 w-2 rounded-full bg-[#FB923C]" />
                        <span className="h-2 w-2 rounded-full bg-[#E8E4DE]" />
                      </div>
                    </div>
                    <div className="mt-4 h-2.5 w-24 rounded-full bg-[#E8E4DE]" />
                    <div className="mt-2.5 h-2 w-32 rounded-full bg-[#F97316]/20" />
                    <div className="mt-2 h-2 w-20 rounded-full bg-[#E8E4DE]" />
                  </div>

                  <h3 className="relative mt-6 text-xl font-bold tracking-tight text-[#1A1A1A]">{step.title}</h3>
                  <p className="relative mt-3 text-sm leading-7 text-[#6B6B6B]">{step.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SAFETY
          ══════════════════════════════════════════════════════════ */}
      <section id="safety" className="relative overflow-hidden bg-[#F8F5F0] px-5 py-20 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute left-[-9rem] bottom-[-8rem] h-80 w-80 rounded-full bg-[#F97316]/[0.03] blur-3xl" />
        <div className="pointer-events-none absolute right-[-9rem] top-16 h-96 w-96 rounded-full bg-[#F97316]/[0.03] blur-3xl" />
        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F97316]">{t.safetyLabel}</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#1A1A1A] sm:text-5xl">{t.safetyTitle}</h2>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-2">
            {t.safety.map((item, index) => {
              const Icon = [Heart, PawPrint, UsersRound, ShieldCheck][index]
              return (
                <article
                  key={item.title}
                  className="group relative overflow-hidden rounded-3xl border border-[#E8E4DE] bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-start gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF5ED] text-[#F97316] shadow-sm transition duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-[#1A1A1A]">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#6B6B6B]">{item.text}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          DOWNLOAD
          ══════════════════════════════════════════════════════════ */}
      <section id="download" className="relative overflow-hidden bg-[#FBF9F6] px-5 py-20 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#F97316]/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-8rem] right-[-8rem] h-96 w-96 rounded-full bg-[#F97316]/[0.03] blur-3xl" />
        <div className="relative mx-auto w-full max-w-5xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F97316]">{t.nav.download}</p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight text-[#1A1A1A] sm:text-6xl lg:text-7xl">
            {t.downloadTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-[#6B6B6B]">
            {t.downloadSubtitle}
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="#" className={btnSecondary}>
              {t.appStore}
            </Link>
            <Link href="#" className={btnSecondary}>
              {t.googlePlay}
            </Link>
            <Link href="/app" className={btnPrimary}>
              {t.openApp}
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER — updated: 안산 · Ansan
          ══════════════════════════════════════════════════════════ */}
      <footer className="relative overflow-hidden bg-[#1A1A1A] px-5 py-20 text-white sm:px-8 lg:py-24">
        <div className="pointer-events-none absolute left-[-8rem] top-[-10rem] h-80 w-80 rounded-full bg-[#F97316]/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute right-[-10rem] bottom-[-10rem] h-96 w-96 rounded-full bg-[#F97316]/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl">
          <div className="grid gap-12 md:grid-cols-[1.35fr_0.75fr_0.75fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F97316] text-white">
                  <PawPrint className="h-5 w-5" />
                </span>
                <span className="text-xl font-bold tracking-tight">WePet</span>
              </div>
              <p className="mt-6 text-lg font-bold text-white">{t.footerText}</p>
              <p className="mt-3 max-w-sm text-sm font-medium tracking-wide text-[#9C9C9C]">{t.footerDescription}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9C9C9C]">{t.footerProduct}</h3>
              <div className="mt-5 grid gap-3 text-sm font-medium text-[#9C9C9C]">
                <a href="#features" className="transition hover:text-white">{t.footerLinks.features}</a>
                <Link href="/explore" className="transition hover:text-white">{t.footerLinks.explore}</Link>
                <Link href="/doctor" className="transition hover:text-white">{t.footerLinks.doctor}</Link>
                <a href="#download" className="transition hover:text-white">{t.footerLinks.download}</a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9C9C9C]">{t.footerCompany}</h3>
              <div className="mt-5 grid gap-3 text-sm font-medium text-[#9C9C9C]">
                <a href="#download" className="transition hover:text-white">{t.footerLinks.about}</a>
                <a href="#download" className="transition hover:text-white">{t.footerLinks.privacy}</a>
                <a href="#download" className="transition hover:text-white">{t.footerLinks.terms}</a>
                <a href="#download" className="transition hover:text-white">{t.footerLinks.contact}</a>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-white/10 pt-8 text-sm font-medium text-[#6B6B6B]">
            <p>{t.copyright}</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
