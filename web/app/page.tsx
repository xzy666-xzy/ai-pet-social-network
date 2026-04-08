"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Heart, MapPin, MessageCircle, PawPrint } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function LandingPage() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Hero Section */}
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80 backdrop-blur-lg border-b border-orange-100 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-2xl shadow-lg">
            <PawPrint className="text-white h-6 w-6" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-xl text-stone-900">{t.landing.title}</span>
            <span className="text-[10px] text-orange-600 font-medium tracking-wide">{t.landing.subtitle}</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher />
          <Link href="/login" className="hidden sm:block text-sm font-medium text-stone-600 hover:text-orange-500 py-2">
            {t.landing.login}
          </Link>
          <Link href="/match">
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-md hover:shadow-lg transition-all">
              {t.landing.getStarted}
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 sm:py-20 px-4 sm:px-6 text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 text-sm font-semibold border border-orange-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            {t.landing.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-stone-900 tracking-tight leading-[1.1]">
            {t.landing.hero.title}{" "}
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {t.landing.hero.titleHighlight}
            </span>
            <br />
            {t.landing.hero.titleEnd}
          </h1>
          <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
            {t.landing.hero.description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4">
            <Link href="/match" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-stone-900 to-stone-800 text-white hover:from-stone-800 hover:to-stone-700 rounded-full h-12 px-8 shadow-lg hover:shadow-xl transition-all"
              >
                {t.landing.hero.findMatch}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-full h-12 px-8 border-2 border-orange-200 bg-white hover:bg-orange-50 text-stone-700 hover:border-orange-300 transition-all"
            >
              {t.landing.hero.howItWorks}
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 sm:py-20 bg-white/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard
              icon={<Heart className="h-7 w-7 text-rose-500" />}
              title={t.landing.features.match.title}
              desc={t.landing.features.match.desc}
            />
            <FeatureCard
              icon={<MessageCircle className="h-7 w-7 text-blue-500" />}
              title={t.landing.features.chat.title}
              desc={t.landing.features.chat.desc}
            />
            <FeatureCard
              icon={<MapPin className="h-7 w-7 text-emerald-500" />}
              title={t.landing.features.explore.title}
              desc={t.landing.features.explore.desc}
            />
          </div>
        </section>
      </main>

      <footer className="py-6 text-center text-stone-400 text-sm bg-white/50">{t.landing.footer}</footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-3xl bg-white border-2 border-orange-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300 group">
      <div className="p-4 bg-gradient-to-br from-white to-orange-50 rounded-2xl shadow-sm border border-orange-100 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-stone-900">{title}</h3>
      <p className="text-stone-600 leading-relaxed text-sm sm:text-base">{desc}</p>
    </div>
  )
}
