"use client"

import type React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, MessageCircle, Map, User, PawPrint, Battery, Wifi, Signal, BookOpen } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200 flex items-center justify-center p-4">
      {/* Phone Frame */}
      <div className="relative w-full max-w-[380px] h-[812px] bg-black rounded-[50px] shadow-2xl overflow-hidden border-[14px] border-stone-900">
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-50" />

        {/* Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-11 bg-gradient-to-b from-stone-50 to-white px-8 flex items-center justify-between text-stone-800 z-40 pt-2">
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
          </div>
          <div className="flex items-center gap-1">
            <Signal className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <Battery className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* App Container */}
        <div className="relative h-full w-full bg-stone-50 flex flex-col pt-11">
          {/* App Header */}
          <header className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 px-5 py-4 flex items-center justify-between shadow-lg">
            <Link href="/app/match" className="flex items-center gap-2.5">
              <div className="bg-white p-2 rounded-xl shadow-md">
                <PawPrint className="text-orange-500 h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-xl text-white tracking-tight">WePet</span>
                <p className="text-xs text-orange-100">위펫</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <div className="h-10 w-10 bg-white rounded-full overflow-hidden border-2 border-white shadow-md flex items-center justify-center">
                {user ? (
                  <span className="text-orange-500 font-bold text-lg">{user.username.charAt(0).toUpperCase()}</span>
                ) : (
                  <img src="/diverse-user-avatars.png" alt="User" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-stone-50">{children}</main>

          {/* Bottom Navigation */}
          <nav className="bg-white border-t border-stone-200 px-4 py-2 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)] safe-bottom">
            <NavLink
              href="/app/match"
              icon={<Home className="h-5 w-5" />}
              label={t.nav.match}
              active={pathname === "/app/match"}
            />
            <NavLink
              href="/app/chat"
              icon={<MessageCircle className="h-5 w-5" />}
              label={t.nav.chat}
              active={pathname === "/app/chat"}
            />
            <NavLink
              href="/app/journal"
              icon={<BookOpen className="h-5 w-5" />}
              label={t.nav.journal}
              active={pathname === "/app/journal"}
            />
            <NavLink
              href="/app/explore"
              icon={<Map className="h-5 w-5" />}
              label={t.nav.explore}
              active={pathname === "/app/explore"}
            />
            <NavLink
              href="/app/profile"
              icon={<User className="h-5 w-5" />}
              label={t.nav.profile}
              active={pathname === "/app/profile"}
            />
          </nav>
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
}: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 ${
        active ? "text-orange-500 bg-orange-50" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
      }`}
    >
      <div className={active ? "scale-110" : ""}>{icon}</div>
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  )
}