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

        <DropdownMenuContent
            align="end"
            sideOffset={4}
            avoidCollisions={false}
            className="z-[9999] !w-[120px] !min-w-[120px] !max-w-[120px] overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-lg"
        >
          <DropdownMenuItem
              onClick={() => setLocale("ko")}
              className={`w-full rounded-md px-3 py-2 text-sm ${
                  locale === "ko" ? "bg-orange-50" : "bg-white"
              }`}
          >
            한국어
          </DropdownMenuItem>

          <DropdownMenuItem
              onClick={() => setLocale("en")}
              className={`w-full rounded-md px-3 py-2 text-sm ${
                  locale === "en" ? "bg-orange-50" : "bg-white"
              }`}
          >
            English
          </DropdownMenuItem>

          <DropdownMenuItem
              onClick={() => setLocale("zh")}
              className={`w-full rounded-md px-3 py-2 text-sm ${
                  locale === "zh" ? "bg-orange-50" : "bg-white"
              }`}
          >
            中文
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  )
}