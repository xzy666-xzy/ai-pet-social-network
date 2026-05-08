"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Bot,
  CalendarDays,
  Heart,
  MapPin,
  MessageCircle,
  PawPrint,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react"

type Lang = "en" | "zh" | "ko"

const featureIcons = [Heart, MessageCircle, Stethoscope, CalendarDays]

const copy = {
  en: {
    nav: {
      features: "Features",
      safety: "Safety",
      download: "Download",
      login: "Log In",
      create: "Create Account",
    },
    badge: "Pet social network in Korea",
    heroTitle: "Meet Pet Friends Nearby",
    heroSubtitle:
      "WePet helps pet owners in Korea discover nearby pets, chat with other owners, join pet events, explore pet-friendly places, and care for pets using AI.",
    appToday: "Today",
    appWalk: "Weekend walks in Seoul",
    appChat: "Chat UI",
    appChatQuestion: "Walk near Hangang today?",
    appChatAnswer: "See you at 6",
    appExplore: "Explore Map",
    appDoctor: "AI Doctor",
    appDoctorText: "Care notes ready in seconds",
    featuresLabel: "Features",
    featuresTitle: "Everything pet owners need to meet, talk, explore, and care.",
    featureCards: [
      {
        title: "Pet Matching",
        text: "Meet nearby pets and owners based on distance, profiles, and shared routines.",
      },
      {
        title: "Real-time Chat",
        text: "Start conversations after mutual interest and keep plans simple.",
      },
      {
        title: "AI Pet Doctor",
        text: "Get everyday care guidance and organize symptoms before visiting a clinic.",
      },
      {
        title: "Pet Events & Explore",
        text: "Find pet-friendly places, local walks, cafes, parks, and community events.",
      },
    ],
    safetyTitle: "Designed for comfortable pet socializing.",
    safetyCards: [
      {
        title: "Mutual interest first",
        text: "Chat begins when both owners choose to connect.",
      },
      {
        title: "Local and practical",
        text: "Discover places, events, and people around your daily route.",
      },
    ],
    ctaTitle: "Start WePet Today",
    footerText: "Pet social network in Korea",
  },
  zh: {
    nav: {
      features: "功能",
      safety: "安全",
      download: "下载",
      login: "登录",
      create: "创建账号",
    },
    badge: "韩国宠物社交网络",
    heroTitle: "发现附近的宠物朋友",
    heroSubtitle:
      "WePet 帮助韩国的宠物主人发现附近宠物、与其他主人聊天、参加宠物活动、探索宠物友好地点，并使用 AI 照顾宠物。",
    appToday: "今日",
    appWalk: "首尔周末遛宠",
    appChat: "聊天界面",
    appChatQuestion: "今天在汉江附近散步吗？",
    appChatAnswer: "6 点见",
    appExplore: "探索地图",
    appDoctor: "AI 宠物医生",
    appDoctorText: "几秒内整理护理建议",
    featuresLabel: "功能",
    featuresTitle: "宠物主人需要的匹配、聊天、探索与护理工具。",
    featureCards: [
      {
        title: "宠物匹配",
        text: "根据距离、宠物资料和日常习惯，认识附近宠物与主人。",
      },
      {
        title: "实时聊天",
        text: "双方都有兴趣后开启对话，让约见和沟通更简单。",
      },
      {
        title: "AI 宠物医生",
        text: "获取日常护理建议，并在就诊前整理宠物症状。",
      },
      {
        title: "宠物活动与探索",
        text: "发现宠物友好地点、本地遛宠、咖啡店、公园和社区活动。",
      },
    ],
    safetyTitle: "为更舒适的宠物社交体验而设计。",
    safetyCards: [
      {
        title: "先双向确认兴趣",
        text: "只有双方都选择连接后，聊天才会开始。",
      },
      {
        title: "本地且实用",
        text: "围绕你的日常路线发现地点、活动和附近的人。",
      },
    ],
    ctaTitle: "今天开始使用 WePet",
    footerText: "韩国宠物社交网络",
  },
  ko: {
    nav: {
      features: "기능",
      safety: "안전",
      download: "다운로드",
      login: "로그인",
      create: "계정 만들기",
    },
    badge: "한국의 반려동물 소셜 네트워크",
    heroTitle: "가까운 반려동물 친구를 만나보세요",
    heroSubtitle:
      "WePet은 한국의 반려동물 보호자가 주변 반려동물을 발견하고, 다른 보호자와 채팅하고, 반려동물 모임에 참여하고, 반려동물 동반 장소를 탐색하며, AI로 반려동물을 돌볼 수 있도록 돕습니다.",
    appToday: "오늘",
    appWalk: "서울 주말 산책",
    appChat: "채팅 UI",
    appChatQuestion: "오늘 한강 근처에서 산책할까요?",
    appChatAnswer: "6시에 만나요",
    appExplore: "탐색 지도",
    appDoctor: "AI 반려동물 의사",
    appDoctorText: "몇 초 만에 케어 메모 준비",
    featuresLabel: "기능",
    featuresTitle: "만남, 대화, 탐색, 케어까지 반려동물 보호자에게 필요한 모든 것.",
    featureCards: [
      {
        title: "반려동물 매칭",
        text: "거리, 프로필, 생활 패턴을 바탕으로 주변 반려동물과 보호자를 만나보세요.",
      },
      {
        title: "실시간 채팅",
        text: "서로 관심을 보낸 뒤 대화를 시작하고 약속을 간단하게 정하세요.",
      },
      {
        title: "AI 반려동물 의사",
        text: "일상 케어 가이드를 받고 병원 방문 전 증상을 정리하세요.",
      },
      {
        title: "반려동물 이벤트와 탐색",
        text: "반려동물 동반 장소, 산책 모임, 카페, 공원, 커뮤니티 이벤트를 찾아보세요.",
      },
    ],
    safetyTitle: "편안한 반려동물 소셜 경험을 위해 설계했습니다.",
    safetyCards: [
      {
        title: "상호 관심을 먼저 확인",
        text: "두 보호자가 모두 연결을 선택했을 때 채팅이 시작됩니다.",
      },
      {
        title: "지역 중심의 실용성",
        text: "일상 동선 주변의 장소, 이벤트, 사람들을 발견하세요.",
      },
    ],
    ctaTitle: "오늘 WePet을 시작하세요",
    footerText: "한국의 반려동물 소셜 네트워크",
  },
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("en")
  const t = copy[lang]

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8f1] text-stone-950">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-orange-100/80 bg-[#fff8f1]/90 backdrop-blur-xl">
        <nav className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-5 py-3 sm:h-16 sm:px-8 sm:py-0">
          <Link href="/landing" className="flex items-center gap-2.5 text-xl font-black tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25">
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
            <div className="order-3 flex rounded-full border border-orange-100 bg-white p-1 shadow-sm sm:order-none">
              {[
                ["en", "EN"],
                ["zh", "中文"],
                ["ko", "한국어"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value as Lang)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                    lang === value ? "bg-orange-500 text-white" : "text-stone-700 hover:bg-orange-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-black text-stone-800 transition hover:bg-white"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-black text-white shadow-lg shadow-stone-950/15 transition hover:-translate-y-0.5 hover:bg-stone-800 sm:px-5"
            >
              {t.nav.create}
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden bg-gradient-to-br from-[#fff8f1] via-[#fff0df] to-[#ffd7a6] px-5 pb-20 pt-32 sm:px-8 lg:pb-24 lg:pt-28">
        <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-orange-400/30 blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute right-[-7rem] top-24 h-96 w-96 rounded-full bg-amber-300/35 blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute bottom-[-12rem] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-rose-300/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_12%,rgba(255,255,255,0.84),rgba(255,248,241,0)_45%)]" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-3xl text-center lg:text-left">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-black text-orange-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {t.badge}
            </div>
            <h1 className="mx-auto max-w-5xl text-6xl font-black leading-[0.9] tracking-tight text-stone-950 sm:text-7xl lg:mx-0 lg:text-8xl xl:text-9xl">
              {t.heroTitle}
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl lg:mx-0">
              {t.heroSubtitle}
            </p>
            <div className="mt-11 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-10 py-5 text-base font-black text-white shadow-2xl shadow-orange-500/30 transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-orange-500/40 sm:text-lg"
              >
                {t.nav.create}
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white bg-white/90 px-10 py-5 text-base font-black text-stone-950 shadow-xl shadow-orange-950/10 backdrop-blur transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-orange-200 hover:bg-white sm:text-lg"
              >
                {t.nav.login}
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="group relative min-h-[650px] w-full max-w-[580px]">
              <div className="absolute left-1/2 top-1/2 h-[520px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-[4rem] bg-orange-500/20 blur-3xl transition duration-500 group-hover:scale-110" />
              <div className="absolute left-4 top-16 hidden w-56 -rotate-6 rounded-[2rem] bg-white/90 p-4 shadow-2xl shadow-orange-950/15 backdrop-blur transition duration-500 hover:-translate-y-2 hover:scale-105 lg:block">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600">Match</span>
                  <span className="text-xs font-black text-stone-400">1.8 km</span>
                </div>
                <div className="h-28 rounded-[1.5rem] bg-gradient-to-br from-orange-500 to-amber-400 p-4 text-white">
                  <h3 className="mt-12 text-2xl font-black">Mochi</h3>
                </div>
              </div>

              <div className="absolute bottom-20 left-0 hidden w-64 rotate-3 rounded-[2rem] bg-white p-4 shadow-2xl shadow-orange-950/15 transition duration-500 hover:-translate-y-2 hover:scale-105 xl:block">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <MessageCircle className="h-4 w-4 text-orange-500" />
                  {t.appChat}
                </div>
                <div className="space-y-2">
                  <div className="w-4/5 rounded-2xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
                    {t.appChatQuestion}
                  </div>
                  <div className="ml-auto rounded-2xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white">
                    {t.appChatAnswer}
                  </div>
                </div>
              </div>

              <div className="absolute right-0 top-20 hidden w-60 rotate-6 rounded-[2rem] bg-amber-50 p-4 shadow-2xl shadow-orange-950/15 transition duration-500 hover:-translate-y-2 hover:scale-105 xl:block">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  {t.appExplore}
                </div>
                <div className="relative h-28 overflow-hidden rounded-[1.5rem] bg-white">
                  <div className="absolute left-4 top-5 h-12 w-20 rounded-full border-2 border-orange-200" />
                  <div className="absolute right-3 top-4 h-16 w-24 rounded-full border-2 border-amber-200" />
                  <span className="absolute left-14 top-11 h-4 w-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/40" />
                  <span className="absolute right-14 top-12 h-4 w-4 rounded-full bg-stone-950" />
                </div>
              </div>

              <div className="absolute bottom-12 right-4 hidden w-60 -rotate-3 rounded-[2rem] bg-stone-950 p-4 text-white shadow-2xl shadow-stone-950/25 transition duration-500 hover:-translate-y-2 hover:scale-105 lg:block">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <Bot className="h-5 w-5 text-amber-300" />
                  </span>
                  <div>
                    <h3 className="font-black">{t.appDoctor}</h3>
                    <p className="text-xs font-semibold text-white/60">{t.appDoctorText}</p>
                  </div>
                </div>
              </div>

              <div className="relative mx-auto w-[304px] rotate-[-2deg] rounded-[3.25rem] border-[12px] border-stone-950 bg-stone-950 p-2 shadow-[0_34px_90px_rgba(28,25,23,0.28)] transition duration-500 hover:rotate-0 hover:scale-[1.02] sm:w-[372px]">
                <div className="absolute left-1/2 top-3 z-10 h-6 w-28 -translate-x-1/2 rounded-b-3xl bg-stone-950" />
                <div className="min-h-[650px] overflow-hidden rounded-[2.35rem] bg-[#fffaf5] px-5 pb-6 pt-10 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">WePet</p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight">{t.appToday}</h2>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                      <PawPrint className="h-5 w-5" />
                    </span>
                  </div>

                  <div className="mt-5 rounded-[2rem] bg-gradient-to-br from-orange-500 to-amber-400 p-4 text-white shadow-xl shadow-orange-500/25 transition duration-300 hover:scale-[1.02]">
                    <div className="flex h-48 flex-col justify-between rounded-[1.5rem] bg-white/16 p-4 backdrop-blur">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">Match</span>
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">1.8 km</span>
                      </div>
                      <div>
                        <div className="mb-3 flex gap-2">
                          <span className="h-10 w-10 rounded-full bg-white/90" />
                          <span className="h-10 w-10 rounded-full bg-amber-200" />
                          <span className="h-10 w-10 rounded-full bg-stone-900" />
                        </div>
                        <h3 className="text-3xl font-black">Mochi & Dodo</h3>
                        <p className="mt-1 text-sm font-semibold text-white/85">{t.appWalk}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-3xl bg-white p-4 shadow-lg shadow-orange-950/5 transition duration-300 hover:-translate-y-1 hover:scale-[1.01]">
                      <div className="mb-3 flex items-center gap-2 text-sm font-black text-stone-900">
                        <MessageCircle className="h-4 w-4 text-orange-500" />
                        {t.appChat}
                      </div>
                      <div className="space-y-2">
                        <div className="w-4/5 rounded-2xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
                          {t.appChatQuestion}
                        </div>
                        <div className="ml-auto flex w-3/4 items-center justify-between rounded-2xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white">
                          {t.appChatAnswer}
                          <Send className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-amber-50 p-4 shadow-lg shadow-orange-950/5 transition duration-300 hover:-translate-y-1 hover:scale-[1.01]">
                      <div className="mb-3 flex items-center gap-2 text-sm font-black text-stone-900">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        {t.appExplore}
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
                          <h3 className="font-black">{t.appDoctor}</h3>
                          <p className="text-xs font-semibold text-white/60">{t.appDoctorText}</p>
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

      <section id="features" className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute left-[-10rem] top-16 h-80 w-80 rounded-full bg-orange-200/35 blur-3xl" />
        <div className="pointer-events-none absolute right-[-12rem] bottom-12 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">{t.featuresLabel}</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
              {t.featuresTitle}
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.featureCards.map((feature, index) => {
              const Icon = featureIcons[index]

              return (
                <article
                  key={feature.title}
                  className="group relative overflow-hidden rounded-[2.25rem] border border-orange-100/80 bg-gradient-to-br from-white via-[#fffaf5] to-orange-50/80 p-7 shadow-[0_18px_50px_rgba(124,45,18,0.08)] transition duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-[0_28px_70px_rgba(249,115,22,0.16)]"
                >
                  <div className="absolute right-[-2.5rem] top-[-2.5rem] h-28 w-28 rounded-full bg-orange-200/35 transition duration-300 group-hover:scale-125" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25 transition duration-300 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="relative mt-8 text-xl font-black tracking-tight text-stone-950">{feature.title}</h3>
                  <p className="relative mt-4 text-sm leading-7 text-stone-600">{feature.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="safety" className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2.5rem] bg-stone-950 p-8 text-white shadow-2xl shadow-stone-950/15 sm:p-10">
            <ShieldCheck className="h-10 w-10 text-amber-300" />
            <h2 className="mt-7 text-4xl font-black tracking-tight sm:text-5xl">
              {t.safetyTitle}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-7 shadow-sm">
              <h3 className="text-xl font-black">{t.safetyCards[0].title}</h3>
              <p className="mt-3 leading-7 text-stone-600">{t.safetyCards[0].text}</p>
            </div>
            <div className="rounded-[2rem] bg-white p-7 shadow-sm">
              <h3 className="text-xl font-black">{t.safetyCards[1].title}</h3>
              <p className="mt-3 leading-7 text-stone-600">{t.safetyCards[1].text}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="download" className="px-5 pb-16 sm:px-8">
        <div className="mx-auto w-full max-w-7xl rounded-[2.75rem] bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 px-6 py-16 text-center text-white shadow-2xl shadow-orange-500/25 sm:px-10 sm:py-20">
          <h2 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">{t.ctaTitle}</h2>
          <Link
            href="/register"
            className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-base font-black text-orange-600 shadow-xl shadow-orange-900/10 transition hover:-translate-y-0.5"
          >
            {t.nav.create}
          </Link>
        </div>
      </section>

      <footer className="border-t border-orange-100 bg-[#fff8f1] px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex items-center justify-center gap-2.5 sm:justify-start">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white">
              <PawPrint className="h-5 w-5" />
            </span>
            <span className="text-xl font-black tracking-tight">WePet</span>
          </div>
          <p className="text-sm font-semibold text-stone-600">{t.footerText}</p>
        </div>
      </footer>
    </main>
  )
}
