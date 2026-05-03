"use client"

import { useRouter } from "next/navigation"
import { Check, ChevronLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"
import type { Locale } from "@/lib/i18n/translations"

const languages: Array<{ label: string; value: Locale }> = [
  { label: "한국어", value: "ko" },
  { label: "English", value: "en" },
  { label: "中文", value: "zh" },
]

export default function SettingsLanguagePage() {
  const router = useRouter()
  const { locale, setLocale } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4">
      <div className="mx-auto max-w-md pt-4">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-stone-900">界面语言</h1>
        </div>

        <Card className="overflow-hidden rounded-3xl border-orange-100 bg-white shadow-sm">
          {languages.map((language, index) => {
            const selected = locale === language.value

            return (
              <button
                key={language.value}
                type="button"
                onClick={() => setLocale(language.value)}
                className={`flex w-full items-center justify-between px-5 py-4 text-left ${
                  index === languages.length - 1 ? "" : "border-b border-orange-50"
                } ${selected ? "bg-orange-50" : "bg-white"}`}
              >
                <span className="font-semibold text-stone-800">{language.label}</span>
                {selected ? <Check className="h-5 w-5 text-orange-500" /> : null}
              </button>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
