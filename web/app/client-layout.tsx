"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  MessageCircle,
  Map,
  User,
  PawPrint,
  Battery,
  Wifi,
  Signal,
  Stethoscope,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function ClientLayout({
                                       children,
                                     }: {
  children: React.ReactNode
}) {
  const { t } = useLanguage()
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isCapacitor, setIsCapacitor] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  useEffect(() => {
    const hasCapacitorBridge = Boolean(
        (window as typeof window & { Capacitor?: unknown }).Capacitor
    )
    const hasCapacitorUserAgent = navigator.userAgent
        .toLowerCase()
        .includes("capacitor")

    setIsCapacitor(hasCapacitorBridge || hasCapacitorUserAgent)
  }, [])

  const displayName = useMemo(() => {
    return (
        user?.username?.trim() ||
        user?.email?.trim()?.split("@")[0] ||
        "User"
    )
  }, [user])

  const avatarLetter = useMemo(() => {
    return displayName.charAt(0).toUpperCase()
  }, [displayName])

  if (loading) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-orange-500"></div>
        </div>
    )
  }

  if (!user) {
    return null
  }

  const appContent = (
      <div className="relative flex h-full w-full flex-col bg-stone-50">
        <header className="flex items-center justify-between bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 px-5 py-4 shadow-lg">
          <Link href="/match" className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white p-2 shadow-md">
              <PawPrint className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <span className="tracking-tight text-xl font-bold text-white">
                WePet
              </span>
              <p className="text-xs text-orange-100">위펫</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
              <span className="text-lg font-bold text-orange-500">
                {avatarLetter}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-stone-50">
          {children}
        </main>

        <nav className="safe-bottom flex items-center justify-around border-t border-stone-200 bg-white px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <NavLink
              href="/match"
              icon={<Home className="h-5 w-5" />}
              label={t.nav.match}
              active={pathname === "/match"}
          />
          <NavLink
              href="/chat"
              icon={<MessageCircle className="h-5 w-5" />}
              label={t.nav.chat}
              active={pathname === "/chat"}
          />
          <NavLink
              href="/doctor"
              icon={<Stethoscope className="h-5 w-5" />}
              label={t.nav.doctor}
              active={pathname === "/doctor" || pathname === "/journal"}
          />
          <NavLink
              href="/explore"
              icon={<Map className="h-5 w-5" />}
              label={t.nav.explore}
              active={pathname === "/explore"}
          />
          <NavLink
              href="/profile"
              icon={<User className="h-5 w-5" />}
              label={t.nav.profile}
              active={pathname === "/profile"}
          />
        </nav>
      </div>
  )

  if (isCapacitor) {
    return (
        <div className="h-screen w-screen overflow-hidden bg-stone-50">
          {appContent}
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200 flex items-center justify-center p-4">
        <div className="relative h-[812px] w-full max-w-[380px] overflow-hidden rounded-[50px] border-[14px] border-stone-900 bg-black shadow-2xl">
          <div className="absolute left-1/2 top-0 z-50 h-7 w-40 -translate-x-1/2 rounded-b-3xl bg-black" />

          <div className="absolute left-0 right-0 top-0 z-40 flex h-11 items-center justify-between bg-gradient-to-b from-stone-50 to-white px-8 pt-2 text-stone-800">
            <div className="flex items-center gap-1 text-xs font-semibold">
              <span>
                {new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Signal className="h-3.5 w-3.5" />
              <Wifi className="h-3.5 w-3.5" />
              <Battery className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="h-full w-full pt-11">
            {appContent}
          </div>
        </div>
      </div>
  )
}

function NavLink({
                   href,
                   icon,
                   label,
                   active = false,
                 }: {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
      <Link
          href={href}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${
              active
                  ? "bg-orange-50 text-orange-500"
                  : "text-stone-400 hover:bg-stone-50 hover:text-stone-600"
          }`}
      >
        <div className={active ? "scale-110" : ""}>{icon}</div>
        <span className="text-[10px] font-semibold">{label}</span>
      </Link>
  )
}
