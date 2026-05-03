"use client"

import { useEffect, useRef, useState } from "react"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

export function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage()
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const chooseLanguage = (value: "ko" | "en" | "zh") => {
        setLocale(value)
        setOpen(false)
    }

    return (
        <div ref={menuRef} className="relative inline-block h-9 w-9">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setOpen((value) => !value)}
            >
                <Languages className="h-5 w-5" />
                <span className="sr-only">Switch language</span>
            </Button>

            {open && (
                <div className="absolute right-0 top-10 z-[9999] w-[120px] overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
                    <button
                        type="button"
                        onClick={() => chooseLanguage("ko")}
                        className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                            locale === "ko" ? "bg-orange-50" : "bg-white"
                        }`}
                    >
                        한국어
                    </button>

                    <button
                        type="button"
                        onClick={() => chooseLanguage("en")}
                        className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                            locale === "en" ? "bg-orange-50" : "bg-white"
                        }`}
                    >
                        English
                    </button>

                    <button
                        type="button"
                        onClick={() => chooseLanguage("zh")}
                        className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                            locale === "zh" ? "bg-orange-50" : "bg-white"
                        }`}
                    >
                        中文
                    </button>
                </div>
            )}
        </div>
    )
}