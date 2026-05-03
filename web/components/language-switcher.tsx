"use client"

import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/lib/i18n/language-context"

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Languages className="h-5 w-5" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[9999] w-[120px] min-w-[120px] max-w-[140px] overflow-hidden rounded-xl bg-white">
        <DropdownMenuItem onClick={() => setLocale("ko")} className={locale === "ko" ? "w-full bg-orange-50" : "w-full"}>
          한국어
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("en")} className={locale === "en" ? "w-full bg-orange-50" : "w-full"}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("zh")} className={locale === "zh" ? "w-full bg-orange-50" : "w-full"}>
          中文
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
