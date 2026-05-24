"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Heart,
  MapPin,
  MessageCircle,
  PawPrint,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react"

type Lang = "en" | "zh" | "ko"

const featureIcons = [Heart, MessageCircle, CalendarDays, MapPin, Stethoscope, UserRound]
const trustIcons = [Heart, PawPrint, UsersRound, ShieldCheck]

const primaryButtonClass =
  "rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 px-8 py-4 text-base font-black text-white shadow-[0_18px_45px_rgba(249,115,22,0.24)] transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_24px_60px_rgba(249,115,22,0.34)]"
const secondaryButtonClass =
  "rounded-full border border-orange-100/80 bg-white/75 px-8 py-4 text-base font-black text-stone-950 shadow-[0_14px_35px_rgba(124,45,18,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-orange-200 hover:bg-white"
const glassCardClass =
  "border border-orange-100/70 bg-white/70 shadow-[0_22px_70px_rgba(124,45,18,0.09)] backdrop-blur-xl"

const copy = {
  en: {
    nav: {
      features: "Features",
      safety: "Safety",
      download: "Download",
      login: "Log In",
      create: "Create Account",
    },
    langLabels: {
      en: "EN",
      zh: "中文",
      ko: "한국어",
    },
    badge: "Pet social network in Korea",
    heroTitle: "Meet Pet Friends Nearby",
    heroSubtitle:
      "Discover nearby pets, match with pet owners, chat, join events, explore pet-friendly places, and care for pets with AI.",
    mockup: {
      today: "Today",
      match: "Pet Match",
      distance: "1.8 km away",
      petNames: "Mochi & Dodo",
      walk: "Weekend walks in Seoul",
      chat: "Chat preview",
      chatQuestion: "Walk near Hangang today?",
      chatAnswer: "See you at 6",
      explore: "Explore map",
      doctor: "AI Pet Doctor",
      doctorText: "Care guidance in seconds",
    },
    featuresLabel: "Features",
    featuresTitle: "Built for modern pet friendships.",
    featuresSubtitle:
      "WePet brings matching, chat, local discovery, pet care, and community tools into one simple experience.",
    features: [
      {
        title: "Nearby Pet Matching",
        text: "Find pets and owners around your daily area with a warm, social matching flow.",
      },
      {
        title: "Mutual Like Chat",
        text: "Start chatting only after both sides show interest, keeping first messages comfortable.",
      },
      {
        title: "Pet Events & Meetups",
        text: "Discover walks, meetups, and local pet activities built around real communities.",
      },
      {
        title: "Explore Pet-friendly Places",
        text: "Browse parks, cafes, clinics, and places that fit life with pets in Korea.",
      },
      {
        title: "AI Pet Doctor",
        text: "Use AI guidance to organize symptoms, daily care notes, and questions before a clinic visit.",
      },
      {
        title: "Pet Profile",
        text: "Create a clear profile for your pet with personality, routine, photos, and location.",
      },
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
      {
        title: "Create your pet profile",
        text: "Add your pet's name, personality, routine, photos, and neighborhood.",
      },
      {
        title: "Match with nearby pets",
        text: "See compatible pet friends around you and send likes when it feels right.",
      },
      {
        title: "Chat after mutual likes",
        text: "Open a conversation after both owners choose to connect.",
      },
      {
        title: "Join events and explore pet-friendly places",
        text: "Plan walks, meetups, and everyday outings from local discovery.",
      },
    ],
    safetyLabel: "Safety & Trust",
    safetyTitle: "Built for safe pet friendships",
    safety: [
      {
        title: "Mutual likes before chat",
        text: "Conversations begin only when both owners choose to connect.",
      },
      {
        title: "Pet-centered profiles",
        text: "Profiles focus on pets, routines, and practical information for better matches.",
      },
      {
        title: "Friendly community",
        text: "WePet is designed around respectful, local, pet-first social behavior.",
      },
      {
        title: "AI advice is for guidance only",
        text: "AI Pet Doctor helps organize care thoughts, but it does not replace professional veterinary care.",
      },
    ],
    downloadTitle: "Download WePet",
    downloadSubtitle: "Start matching, chatting, and exploring pet-friendly places with WePet.",
    appStore: "App Store",
    googlePlay: "Google Play",
    openApp: "Open Web App",
    footerText: "Pet social platform in Korea",
    footerDescription: "Seoul · Seoul",
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
    copyright: "© 2026 WePet · Made with pets in Seoul",
  },
  zh: {
    nav: {
      features: "功能",
      safety: "安全",
      download: "下载",
      login: "登录",
      create: "创建账号",
    },
    langLabels: {
      en: "EN",
      zh: "中文",
      ko: "한국어",
    },
    badge: "韩国宠物社交网络",
    heroTitle: "发现附近的宠物朋友",
    heroSubtitle:
      "发现附近宠物，与宠物主人匹配、聊天、参加活动、探索宠物友好地点，并用 AI 更好地照顾宠物。",
    mockup: {
      today: "今日",
      match: "宠物匹配",
      distance: "距离 1.8 km",
      petNames: "Mochi & Dodo",
      walk: "首尔周末遛宠",
      chat: "聊天预览",
      chatQuestion: "今天在汉江附近散步吗？",
      chatAnswer: "6 点见",
      explore: "探索地图",
      doctor: "AI 宠物医生",
      doctorText: "几秒内获得护理建议",
    },
    featuresLabel: "功能",
    featuresTitle: "为现代宠物社交打造。",
    featuresSubtitle:
      "WePet 将匹配、聊天、本地探索、宠物护理和社区工具整合进一个简单体验。",
    features: [
      {
        title: "附近宠物匹配",
        text: "在日常生活区域发现附近宠物和主人，用温暖的社交流程开启连接。",
      },
      {
        title: "双向喜欢聊天",
        text: "只有双方都表达兴趣后才开始聊天，让第一句对话更自然安心。",
      },
      {
        title: "宠物活动与聚会",
        text: "发现遛宠、见面会和围绕真实社区产生的本地宠物活动。",
      },
      {
        title: "探索宠物友好地点",
        text: "浏览适合韩国宠物生活的公园、咖啡店、医院和友好空间。",
      },
      {
        title: "AI 宠物医生",
        text: "用 AI 整理症状、日常护理记录和就诊前想咨询的问题。",
      },
      {
        title: "宠物资料",
        text: "为宠物创建清晰资料，展示性格、日常习惯、照片和所在区域。",
      },
    ],
    aiCareNote: {
      title: "日常宠物护理的 AI 指引。",
      text: "不能替代专业兽医诊疗。",
      tip: "护理提示",
      bubble: "记录情况，并在就诊前整理更清晰的问题。",
    },
    howLabel: "WePet 使用流程",
    howTitle: "从宠物资料开始，认识附近合适的人和宠物。",
    steps: [
      {
        title: "创建宠物资料",
        text: "添加宠物名字、性格、日常习惯、照片和所在社区。",
      },
      {
        title: "匹配附近宠物",
        text: "浏览附近合适的宠物朋友，并在有兴趣时发送喜欢。",
      },
      {
        title: "双向喜欢后聊天",
        text: "双方都选择连接后，再开启安全自然的对话。",
      },
      {
        title: "参加活动并探索宠物友好地点",
        text: "通过本地探索计划散步、聚会和日常出行。",
      },
    ],
    safetyLabel: "安全与信任",
    safetyTitle: "为安全的宠物社交而设计",
    safety: [
      {
        title: "双向喜欢后再聊天",
        text: "只有双方主人都选择连接后，对话才会开始。",
      },
      {
        title: "以宠物为中心的资料",
        text: "资料聚焦宠物、生活习惯和实用信息，让匹配更合适。",
      },
      {
        title: "友好的社区氛围",
        text: "WePet 围绕尊重、本地和宠物优先的社交体验设计。",
      },
      {
        title: "AI 建议仅供参考",
        text: "AI 宠物医生可帮助整理护理思路，但不能替代专业兽医诊疗。",
      },
    ],
    downloadTitle: "下载 WePet",
    downloadSubtitle: "使用 WePet 开始匹配、聊天，并探索宠物友好地点。",
    appStore: "App Store",
    googlePlay: "Google Play",
    openApp: "打开 Web App",
    footerText: "韩国宠物社交平台",
    footerDescription: "서울 · Seoul",
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
    copyright: "© 2026 WePet · Made with pets in Seoul",
  },
  ko: {
    nav: {
      features: "기능",
      safety: "안전",
      download: "다운로드",
      login: "로그인",
      create: "계정 만들기",
    },
    langLabels: {
      en: "EN",
      zh: "中文",
      ko: "한국어",
    },
    badge: "한국의 반려동물 소셜 네트워크",
    heroTitle: "가까운 반려동물 친구를 만나보세요",
    heroSubtitle:
      "주변 반려동물을 발견하고, 보호자와 매칭하고, 채팅하고, 모임에 참여하고, 반려동물 동반 장소를 탐색하며 AI로 케어하세요.",
    mockup: {
      today: "오늘",
      match: "반려동물 매칭",
      distance: "1.8 km 거리",
      petNames: "Mochi & Dodo",
      walk: "서울 주말 산책",
      chat: "채팅 미리보기",
      chatQuestion: "오늘 한강 근처에서 산책할까요?",
      chatAnswer: "6시에 만나요",
      explore: "탐색 지도",
      doctor: "AI 반려동물 의사",
      doctorText: "몇 초 만에 케어 가이드",
    },
    featuresLabel: "기능",
    featuresTitle: "현대적인 반려동물 친구 만들기를 위해.",
    featuresSubtitle:
      "WePet은 매칭, 채팅, 지역 탐색, 반려동물 케어, 커뮤니티 도구를 하나의 간단한 경험으로 연결합니다.",
    features: [
      {
        title: "근처 반려동물 매칭",
        text: "일상 생활권 안의 반려동물과 보호자를 따뜻한 소셜 매칭 흐름으로 만나보세요.",
      },
      {
        title: "상호 좋아요 채팅",
        text: "양쪽 모두 관심을 보낸 뒤 채팅이 시작되어 첫 대화가 더 편안합니다.",
      },
      {
        title: "반려동물 이벤트와 모임",
        text: "산책, 만남, 지역 커뮤니티 중심의 반려동물 활동을 발견하세요.",
      },
      {
        title: "반려동물 동반 장소 탐색",
        text: "한국에서 반려동물과 함께하기 좋은 공원, 카페, 병원, 공간을 둘러보세요.",
      },
      {
        title: "AI 반려동물 의사",
        text: "증상, 일상 케어 기록, 병원 방문 전 질문을 AI로 정리해보세요.",
      },
      {
        title: "반려동물 프로필",
        text: "성격, 생활 패턴, 사진, 지역을 담은 명확한 반려동물 프로필을 만드세요.",
      },
    ],
    aiCareNote: {
      title: "일상 반려동물 케어를 위한 AI 가이드.",
      text: "전문 수의사 진료를 대체하지 않습니다.",
      tip: "케어 팁",
      bubble: "기록을 남기고 병원 방문 전 질문을 정리해보세요.",
    },
    howLabel: "WePet 이용 방법",
    howTitle: "반려동물 프로필에서 시작해 가까운 좋은 인연을 만나세요.",
    steps: [
      {
        title: "반려동물 프로필 만들기",
        text: "이름, 성격, 생활 패턴, 사진, 동네 정보를 추가하세요.",
      },
      {
        title: "근처 반려동물과 매칭",
        text: "주변의 잘 맞는 반려동물 친구를 보고 마음에 들면 좋아요를 보내세요.",
      },
      {
        title: "상호 좋아요 후 채팅",
        text: "두 보호자가 모두 연결을 선택한 뒤 자연스럽게 대화를 시작하세요.",
      },
      {
        title: "이벤트에 참여하고 동반 장소 탐색",
        text: "지역 탐색으로 산책, 모임, 일상 외출을 계획하세요.",
      },
    ],
    safetyLabel: "안전과 신뢰",
    safetyTitle: "안전한 반려동물 친구 관계를 위해",
    safety: [
      {
        title: "서로 좋아요 후 채팅",
        text: "두 보호자가 모두 연결을 선택했을 때만 대화가 시작됩니다.",
      },
      {
        title: "반려동물 중심 프로필",
        text: "프로필은 반려동물, 생활 패턴, 실용적인 정보에 집중합니다.",
      },
      {
        title: "따뜻한 커뮤니티",
        text: "WePet은 존중, 지역성, 반려동물 우선 소셜 경험을 중심으로 설계되었습니다.",
      },
      {
        title: "AI 조언은 참고용",
        text: "AI 반려동물 의사는 케어 생각을 정리하도록 돕지만 전문 진료를 대체하지 않습니다.",
      },
    ],
    downloadTitle: "WePet 다운로드",
    downloadSubtitle: "WePet에서 매칭, 채팅, 반려동물 동반 장소 탐색을 시작하세요.",
    appStore: "App Store",
    googlePlay: "Google Play",
    openApp: "Web App 열기",
    footerText: "한국의 반려동물 소셜 플랫폼",
    footerDescription: "서울 · Seoul",
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
    copyright: "© 2026 WePet · Made with pets in Seoul",
  },
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("en")
  const t = copy[lang]

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf3] text-stone-950">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-orange-100/70 bg-[#fffaf3]/82 shadow-[0_12px_40px_rgba(124,45,18,0.05)] backdrop-blur-2xl">
        <nav className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-5 py-3 sm:h-16 sm:px-8 sm:py-0">
          <Link href="/landing" className="flex items-center gap-2.5 text-xl font-black tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 text-white shadow-lg shadow-orange-500/20">
              <PawPrint className="h-5 w-5" />
            </span>
            WePet
          </Link>

          <div className="hidden items-center gap-8 text-sm font-bold text-stone-700 lg:flex">
            <a href="#features" className="transition hover:text-orange-600">
              {t.nav.features}
            </a>
            <a href="#safety" className="transition hover:text-orange-600">
              {t.nav.safety}
            </a>
            <a href="#download" className="transition hover:text-orange-600">
              {t.nav.download}
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
            <div className="order-3 flex rounded-full border border-orange-100/70 bg-white/70 p-1 shadow-sm backdrop-blur-xl sm:order-none">
              {(["en", "zh", "ko"] as Lang[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                    lang === value ? "bg-orange-500 text-white" : "text-stone-700 hover:bg-orange-50"
                  }`}
                >
                  {t.langLabels[value]}
                </button>
              ))}
            </div>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-black text-stone-800 transition hover:-translate-y-0.5 hover:bg-white/80"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 px-4 py-2 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:shadow-orange-500/30 sm:px-5"
            >
              {t.nav.create}
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden bg-[linear-gradient(135deg,#fffaf3_0%,#fff2e5_38%,#ffe2b0_100%)] px-5 pb-20 pt-32 sm:px-8 lg:pb-24 lg:pt-28">
        <div className="pointer-events-none absolute -left-28 top-14 h-[28rem] w-[28rem] rounded-full bg-orange-300/30 blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute right-[-9rem] top-16 h-[36rem] w-[36rem] rounded-full bg-yellow-200/42 blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute bottom-[-15rem] left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[#ffd2bd]/38 blur-3xl" />
        <div className="pointer-events-none absolute bottom-24 right-1/4 h-80 w-80 rounded-full bg-orange-100/65 blur-3xl" />
        <div className="pointer-events-none absolute left-[39%] top-[17%] h-px w-[34rem] rotate-[-18deg] bg-gradient-to-r from-transparent via-white/90 to-transparent shadow-[0_0_64px_rgba(255,255,255,0.9)]" />
        <div className="pointer-events-none absolute right-[9%] top-[30%] h-px w-[22rem] rotate-[28deg] bg-gradient-to-r from-transparent via-orange-200/90 to-transparent shadow-[0_0_54px_rgba(251,146,60,0.32)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_10%,rgba(255,255,255,0.94),rgba(255,250,243,0)_48%)]" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="max-w-4xl text-center lg:text-left">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/70 px-4 py-2 text-sm font-black text-orange-700 shadow-[0_12px_35px_rgba(124,45,18,0.08)] backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              {t.badge}
            </div>
            <h1 className="mx-auto max-w-5xl text-7xl font-black leading-[0.84] tracking-tight text-stone-950 sm:text-8xl lg:mx-0 lg:text-[7.75rem] xl:text-[9rem]">
              {lang === "en" ? (
                <>
                  Meet Pet{" "}
                  <span className="bg-gradient-to-r from-orange-600 via-orange-400 to-amber-300 bg-[length:180%_180%] bg-clip-text text-transparent drop-shadow-[0_18px_45px_rgba(249,115,22,0.18)] motion-safe:animate-pulse">
                    Friends Nearby
                  </span>
                </>
              ) : (
                t.heroTitle
              )}
            </h1>
            <p className="mx-auto mt-9 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl lg:mx-0">
              {t.heroSubtitle}
            </p>
            <div className="mt-11 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/register"
                className={`${primaryButtonClass} px-10 py-5 sm:text-lg`}
              >
                {t.nav.create}
              </Link>
              <Link
                href="/app"
                className={`${secondaryButtonClass} px-10 py-5 sm:text-lg`}
              >
                {t.openApp}
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="group relative min-h-[690px] w-full max-w-[620px]">
              <div className="absolute left-1/2 top-1/2 h-[580px] w-[410px] -translate-x-1/2 -translate-y-1/2 rounded-[4.5rem] bg-orange-500/20 blur-3xl transition duration-500 group-hover:scale-110" />
              <div className="absolute left-1/2 top-1/2 h-[640px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-[5rem] border border-white/60 bg-white/18 shadow-[0_0_110px_rgba(255,255,255,0.38)] backdrop-blur-[2px]" />
              <div className={`absolute left-0 top-12 hidden w-60 -rotate-6 rounded-[2rem] p-4 transition duration-500 hover:-translate-y-3 hover:rotate-[-4deg] hover:scale-105 lg:block ${glassCardClass}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600">
                    {t.mockup.match}
                  </span>
                  <span className="text-xs font-black text-stone-400">{t.mockup.distance}</span>
                </div>
                <div className="h-32 rounded-[1.5rem] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 p-4 text-white shadow-inner">
                  <h3 className="mt-12 text-2xl font-black">Mochi</h3>
                </div>
              </div>

              <div className={`absolute bottom-20 left-[-1rem] hidden w-64 rotate-3 rounded-[2rem] p-4 transition duration-500 hover:-translate-y-3 hover:rotate-2 hover:scale-105 xl:block ${glassCardClass}`}>
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <MessageCircle className="h-4 w-4 text-orange-500" />
                  {t.mockup.chat}
                </div>
                <div className="space-y-2">
                  <div className="w-4/5 rounded-2xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
                    {t.mockup.chatQuestion}
                  </div>
                  <div className="ml-auto rounded-2xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white">
                    {t.mockup.chatAnswer}
                  </div>
                </div>
              </div>

              <div className={`absolute right-[-1rem] top-[4.25rem] hidden w-64 rotate-6 rounded-[2rem] p-4 transition duration-500 hover:-translate-y-3 hover:rotate-4 hover:scale-105 xl:block ${glassCardClass}`}>
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  {t.mockup.explore}
                </div>
                <div className="relative h-28 overflow-hidden rounded-[1.5rem] bg-white">
                  <div className="absolute left-4 top-5 h-12 w-20 rounded-full border-2 border-orange-200" />
                  <div className="absolute right-3 top-4 h-16 w-24 rounded-full border-2 border-amber-200" />
                  <span className="absolute left-14 top-11 h-4 w-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/40" />
                  <span className="absolute right-14 top-12 h-4 w-4 rounded-full bg-stone-950" />
                </div>
              </div>

              <div className="absolute bottom-8 right-0 hidden w-64 -rotate-3 rounded-[2rem] border border-white/10 bg-stone-950/92 p-4 text-white shadow-2xl shadow-stone-950/20 backdrop-blur-xl transition duration-500 hover:-translate-y-3 hover:rotate-[-2deg] hover:scale-105 lg:block">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <Bot className="h-5 w-5 text-amber-300" />
                  </span>
                  <div>
                    <h3 className="font-black">{t.mockup.doctor}</h3>
                    <p className="text-xs font-semibold text-white/60">{t.mockup.doctorText}</p>
                  </div>
                </div>
              </div>

              <div className="relative mx-auto w-[304px] rotate-[-2deg] rounded-[3.4rem] border-[1px] border-stone-700/80 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-800 p-[12px] shadow-[0_42px_120px_rgba(28,25,23,0.34),0_0_0_1px_rgba(255,255,255,0.18)_inset,0_0_70px_rgba(249,115,22,0.16)] transition duration-500 motion-safe:animate-[bounce_7s_ease-in-out_infinite] hover:rotate-0 hover:scale-[1.02] sm:w-[372px]">
                <div className="absolute left-1/2 top-3 z-10 h-6 w-28 -translate-x-1/2 rounded-b-3xl bg-stone-950" />
                <div className="min-h-[650px] overflow-hidden rounded-[2.45rem] bg-[#fffaf3] px-5 pb-6 pt-10 shadow-inner ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">WePet</p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight">{t.mockup.today}</h2>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                      <PawPrint className="h-5 w-5" />
                    </span>
                  </div>

                  <div className="mt-5 rounded-[2rem] bg-gradient-to-br from-orange-500 to-amber-400 p-4 text-white shadow-xl shadow-orange-500/25 transition duration-300 hover:scale-[1.02]">
                    <div className="flex h-48 flex-col justify-between rounded-[1.5rem] bg-white/16 p-4 backdrop-blur">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">{t.mockup.match}</span>
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">{t.mockup.distance}</span>
                      </div>
                      <div>
                        <div className="mb-3 flex gap-2">
                          <span className="h-10 w-10 rounded-full bg-white/90" />
                          <span className="h-10 w-10 rounded-full bg-amber-200" />
                          <span className="h-10 w-10 rounded-full bg-stone-900" />
                        </div>
                        <h3 className="text-3xl font-black">{t.mockup.petNames}</h3>
                        <p className="mt-1 text-sm font-semibold text-white/85">{t.mockup.walk}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className={`rounded-3xl p-4 transition duration-300 hover:-translate-y-1 hover:scale-[1.01] ${glassCardClass}`}>
                      <div className="mb-3 flex items-center gap-2 text-sm font-black text-stone-900">
                        <MessageCircle className="h-4 w-4 text-orange-500" />
                        {t.mockup.chat}
                      </div>
                      <div className="space-y-2">
                        <div className="w-4/5 rounded-2xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
                          {t.mockup.chatQuestion}
                        </div>
                        <div className="ml-auto flex w-3/4 items-center justify-between rounded-2xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white">
                          {t.mockup.chatAnswer}
                          <Send className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <div className={`rounded-3xl p-4 transition duration-300 hover:-translate-y-1 hover:scale-[1.01] ${glassCardClass}`}>
                      <div className="mb-3 flex items-center gap-2 text-sm font-black text-stone-900">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        {t.mockup.explore}
                      </div>
                      <div className="relative h-24 overflow-hidden rounded-2xl bg-white">
                        <div className="absolute left-5 top-5 h-12 w-20 rounded-full border-2 border-orange-200" />
                        <div className="absolute right-4 top-3 h-16 w-24 rounded-full border-2 border-amber-200" />
                        <span className="absolute left-14 top-10 h-4 w-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/40" />
                        <span className="absolute right-16 top-12 h-4 w-4 rounded-full bg-stone-950" />
                      </div>
                    </div>

                    <div className="rounded-3xl bg-stone-950 p-4 text-white shadow-lg shadow-stone-950/10 transition duration-300 hover:-translate-y-1 hover:scale-[1.01]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                          <Bot className="h-5 w-5 text-amber-300" />
                        </span>
                        <div>
                          <h3 className="font-black">{t.mockup.doctor}</h3>
                          <p className="text-xs font-semibold text-white/60">{t.mockup.doctorText}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative overflow-hidden bg-[#fffaf3] px-5 py-20 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute left-[-10rem] top-16 h-80 w-80 rounded-full bg-orange-200/24 blur-3xl" />
        <div className="pointer-events-none absolute right-[-12rem] bottom-12 h-96 w-96 rounded-full bg-yellow-200/26 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">{t.featuresLabel}</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
              {t.featuresTitle}
            </h2>
            <p className="mt-5 text-lg leading-8 text-stone-600">{t.featuresSubtitle}</p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {t.features.map((feature, index) => {
              const Icon = featureIcons[index]

              return (
                <article
                  key={feature.title}
                  className={`group relative min-h-[21rem] overflow-hidden rounded-[2.5rem] p-7 transition duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-[0_30px_80px_rgba(249,115,22,0.14)] ${glassCardClass}`}
                >
                  <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-orange-200/28 transition duration-300 group-hover:scale-125" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 text-white shadow-lg shadow-orange-500/25 transition duration-300 group-hover:scale-110">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full border border-orange-100 bg-white/55 px-3 py-1 text-xs font-black text-orange-600 shadow-sm backdrop-blur">
                      0{index + 1}
                    </span>
                  </div>

                  <div className="relative mt-8 min-h-[8.75rem] rounded-[1.75rem] border border-orange-100/70 bg-white/50 p-4 shadow-inner backdrop-blur">
                    {index === 0 ? (
                      <div className="flex h-full flex-col justify-between rounded-[1.25rem] bg-gradient-to-br from-orange-500 to-amber-300 p-4 text-white">
                        <div className="flex justify-between text-xs font-black">
                          <span>Match</span>
                          <span>1.8 km</span>
                        </div>
                        <div>
                          <div className="mb-2 flex gap-1.5">
                            <span className="h-7 w-7 rounded-full bg-white/90" />
                            <span className="h-7 w-7 rounded-full bg-amber-100" />
                            <span className="h-7 w-7 rounded-full bg-stone-950" />
                          </div>
                          <div className="h-3 w-24 rounded-full bg-white/70" />
                        </div>
                      </div>
                    ) : null}

                    {index === 1 ? (
                      <div className="space-y-3 pt-2">
                        <div className="h-9 w-4/5 rounded-2xl bg-stone-100" />
                        <div className="ml-auto h-9 w-3/4 rounded-2xl bg-orange-500" />
                        <div className="h-2 w-1/2 rounded-full bg-orange-100" />
                      </div>
                    ) : null}

                    {index === 2 ? (
                      <div className="grid h-full grid-cols-2 gap-3">
                        <div className="rounded-[1.25rem] bg-orange-100 p-3">
                          <CalendarDays className="h-5 w-5 text-orange-500" />
                          <div className="mt-7 h-2 w-16 rounded-full bg-orange-300" />
                        </div>
                        <div className="rounded-[1.25rem] bg-white p-3 shadow-sm">
                          <div className="h-8 w-8 rounded-full bg-amber-200" />
                          <div className="mt-7 h-2 w-14 rounded-full bg-stone-200" />
                        </div>
                      </div>
                    ) : null}

                    {index === 3 ? (
                      <div className="relative h-full overflow-hidden rounded-[1.25rem] bg-white">
                        <div className="absolute left-5 top-5 h-14 w-24 rounded-full border-2 border-orange-200" />
                        <div className="absolute right-3 top-6 h-16 w-24 rounded-full border-2 border-amber-200" />
                        <span className="absolute left-16 top-14 h-4 w-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/40" />
                        <span className="absolute right-14 top-16 h-4 w-4 rounded-full bg-stone-950" />
                      </div>
                    ) : null}

                    {index === 4 ? (
                      <div className="grid h-full gap-3 rounded-[1.25rem] bg-gradient-to-br from-amber-100 via-orange-50 to-white p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                            <Bot className="h-5 w-5" />
                          </span>
                          <div className="rounded-2xl rounded-tl-sm bg-white/85 px-4 py-3 text-sm font-bold leading-5 text-stone-700 shadow-sm">
                            {t.aiCareNote.title}
                          </div>
                        </div>
                        <div className="ml-8 rounded-2xl border border-orange-100 bg-white/70 p-3 shadow-sm">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-orange-500">
                            <Stethoscope className="h-4 w-4" />
                            {t.aiCareNote.tip}
                          </div>
                          <p className="mt-2 text-xs font-semibold leading-5 text-stone-600">{t.aiCareNote.bubble}</p>
                        </div>
                      </div>
                    ) : null}

                    {index === 5 ? (
                      <div className="flex h-full items-center gap-4 rounded-[1.25rem] bg-white p-4 shadow-sm">
                        <div className="h-16 w-16 rounded-[1.35rem] bg-gradient-to-br from-orange-200 to-amber-100" />
                        <div className="flex-1">
                          <div className="h-3 w-28 rounded-full bg-stone-300" />
                          <div className="mt-3 h-2 w-20 rounded-full bg-orange-200" />
                          <div className="mt-2 h-2 w-24 rounded-full bg-stone-200" />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <h3 className="relative mt-7 text-2xl font-black tracking-tight text-stone-950">{feature.title}</h3>
                  <p className="relative mt-4 text-sm leading-7 text-stone-600">{feature.text}</p>
                  {index === 4 ? (
                    <div className="relative mt-5 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
                      <p>{t.aiCareNote.title}</p>
                      <p className="mt-1 text-xs font-semibold text-amber-800/75">{t.aiCareNote.text}</p>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#fffaf3_0%,#fff3e7_100%)] px-5 py-20 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute left-[-8rem] top-12 h-72 w-72 rounded-full bg-orange-200/24 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-yellow-200/28 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">{t.howLabel}</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
              {t.howTitle}
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-4">
            {t.steps.map((step, index) => {
              const StepIcon = [UserRound, Heart, MessageCircle, MapPin][index]
              const stepEmoji = ["🐾", "🧡", "💬", "📍"][index]

              return (
                <article
                  key={step.title}
                  className={`group relative min-h-[20rem] overflow-hidden rounded-[2.5rem] p-6 transition duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-[0_26px_70px_rgba(249,115,22,0.13)] ${glassCardClass}`}
                >
                  <div className="absolute right-[-2.5rem] top-[-2.5rem] h-28 w-28 rounded-full bg-orange-200/25 transition duration-300 group-hover:scale-125" />
                  <div className="relative flex items-center justify-between">
                    <span className="rounded-full border border-orange-100 bg-white/60 px-3 py-1 text-xs font-black text-orange-600 backdrop-blur">
                      Step {index + 1}
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 text-white shadow-lg shadow-orange-500/20 transition duration-300 group-hover:scale-110">
                      <StepIcon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="relative mt-9 rounded-[1.85rem] border border-orange-100/70 bg-gradient-to-br from-white/65 to-orange-50/55 p-4 shadow-inner backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                      </div>
                      <span className="text-2xl" aria-hidden="true">
                        {stepEmoji}
                      </span>
                    </div>
                    <div className="mt-5 h-3 w-24 rounded-full bg-stone-200/90" />
                    <div className="mt-3 h-2 w-32 rounded-full bg-orange-100" />
                    <div className="mt-2 h-2 w-20 rounded-full bg-stone-100" />
                  </div>

                  <h3 className="relative mt-7 text-2xl font-black tracking-tight text-stone-950">{step.title}</h3>
                  <p className="relative mt-3 text-sm leading-7 text-stone-600">{step.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="safety" className="relative overflow-hidden bg-[#fffaf3] px-5 py-20 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-orange-50/90 to-[#fffaf3]" />
        <div className="pointer-events-none absolute left-[-9rem] bottom-[-8rem] h-80 w-80 rounded-full bg-orange-200/24 blur-3xl" />
        <div className="pointer-events-none absolute right-[-9rem] top-16 h-96 w-96 rounded-full bg-yellow-200/24 blur-3xl" />
        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">{t.safetyLabel}</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
              {t.safetyTitle}
            </h2>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-2">
            {t.safety.map((item, index) => {
              const Icon = trustIcons[index]

              return (
                <article
                  key={item.title}
                  className={`group relative overflow-hidden rounded-[2.35rem] p-7 transition duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-[0_26px_70px_rgba(249,115,22,0.13)] ${glassCardClass}`}
                >
                  <div className="absolute right-[-2.5rem] top-[-2.5rem] h-28 w-28 rounded-full bg-orange-200/24 transition duration-300 group-hover:scale-125" />
                  <div className="relative flex items-start gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 text-white shadow-lg shadow-orange-500/20 transition duration-300 group-hover:scale-110">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-stone-950">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-stone-600">{item.text}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="download" className="relative overflow-hidden bg-[linear-gradient(180deg,#fffaf3_0%,#fff1df_100%)] px-5 py-20 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-200/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-8rem] right-[-8rem] h-96 w-96 rounded-full bg-orange-300/25 blur-3xl" />
        <div className="relative mx-auto w-full max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">{t.nav.download}</p>
          <h2 className="mt-4 text-5xl font-black tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
            {t.downloadTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-stone-600">
            {t.downloadSubtitle}
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="#"
              className={secondaryButtonClass}
            >
              {t.appStore}
            </Link>
            <Link
              href="#"
              className={secondaryButtonClass}
            >
              {t.googlePlay}
            </Link>
            <Link
              href="/app"
              className={primaryButtonClass}
            >
              {t.openApp}
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden bg-[#1b1714] px-5 py-20 text-white sm:px-8 lg:py-24">
        <div className="pointer-events-none absolute left-[-8rem] top-[-10rem] h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[-10rem] bottom-[-10rem] h-96 w-96 rounded-full bg-yellow-300/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl">
          <div className="grid gap-12 md:grid-cols-[1.35fr_0.75fr_0.75fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 text-white">
                  <PawPrint className="h-5 w-5" />
                </span>
                <span className="text-2xl font-black tracking-tight">WePet</span>
              </div>
              <p className="mt-7 text-xl font-black text-white">{t.footerText}</p>
              <p className="mt-3 max-w-sm text-sm font-semibold tracking-wide text-stone-400">{t.footerDescription}</p>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-orange-300">{t.footerProduct}</h3>
              <div className="mt-6 grid gap-3 text-sm font-semibold text-stone-300">
                <a href="#features" className="transition hover:text-white hover:brightness-125">{t.footerLinks.features}</a>
                <Link href="/explore" className="transition hover:text-white hover:brightness-125">{t.footerLinks.explore}</Link>
                <Link href="/doctor" className="transition hover:text-white hover:brightness-125">{t.footerLinks.doctor}</Link>
                <a href="#download" className="transition hover:text-white hover:brightness-125">{t.footerLinks.download}</a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-orange-300">{t.footerCompany}</h3>
              <div className="mt-6 grid gap-3 text-sm font-semibold text-stone-300">
                <a href="#download" className="transition hover:text-white hover:brightness-125">{t.footerLinks.about}</a>
                <a href="#download" className="transition hover:text-white hover:brightness-125">{t.footerLinks.privacy}</a>
                <a href="#download" className="transition hover:text-white hover:brightness-125">{t.footerLinks.terms}</a>
                <a href="#download" className="transition hover:text-white hover:brightness-125">{t.footerLinks.contact}</a>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-white/10 pt-8 text-sm font-semibold text-stone-500">
            <p>{t.copyright}</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
