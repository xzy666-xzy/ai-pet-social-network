import { createContext, createElement, type PropsWithChildren, useContext, useMemo, useState } from "react"

export type Language = "en" | "zh" | "ko"

type LanguageContextValue = {
  language: Language
  languageLabel: "EN" | "中" | "한"
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const labels: Record<Language, LanguageContextValue["languageLabel"]> = {
  en: "EN",
  zh: "中",
  ko: "한",
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>("en")

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languageLabel: labels[language],
      setLanguage,
    }),
    [language],
  )

  return createElement(LanguageContext.Provider, { value }, children)
}

export function useLanguage() {
  const value = useContext(LanguageContext)

  if (!value) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }

  return value
}

