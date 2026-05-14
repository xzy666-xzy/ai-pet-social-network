"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Capacitor } from "@capacitor/core"
import { PushNotifications } from "@capacitor/push-notifications"
import {
  Home,
  MessageCircle,
  Map,
  User,
  PawPrint,
  Stethoscope,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"
import { apiRequest, getAccessToken } from "@/lib/api-client"
import { LanguageSwitcher } from "@/components/language-switcher"

function isCapacitorRuntime() {
  if (typeof window === "undefined") {
    return false
  }

  const hasCapacitorBridge = Boolean(
      (window as typeof window & { Capacitor?: unknown }).Capacitor
  )
  const hasCapacitorUserAgent = navigator.userAgent
      .toLowerCase()
      .includes("capacitor")

  return hasCapacitorBridge || hasCapacitorUserAgent
}

function isAndroidCapacitorWebView() {
  if (typeof window === "undefined") {
    return false
  }

  const capacitorOnWindow = (window as typeof window & {
    Capacitor?: {
      getPlatform?: () => string
      isNativePlatform?: () => boolean
    }
  }).Capacitor

  if (!capacitorOnWindow) {
    return false
  }

  const windowPlatform =
    typeof capacitorOnWindow.getPlatform === "function"
      ? capacitorOnWindow.getPlatform()
      : undefined

  const corePlatform = Capacitor.getPlatform()
  const platform = windowPlatform ?? corePlatform
  const isNativePlatform =
    typeof capacitorOnWindow.isNativePlatform === "function"
      ? capacitorOnWindow.isNativePlatform()
      : corePlatform !== "web"

  return isNativePlatform && corePlatform !== "web" && platform === "android"
}

export default function ClientLayout({
                                       children,
                                     }: {
  children: React.ReactNode
}) {
  const { t } = useLanguage()
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isCapacitor, setIsCapacitor] = useState(isCapacitorRuntime)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  useEffect(() => {
    setIsCapacitor(isCapacitorRuntime())
  }, [])

  useEffect(() => {
    const setupPushNotifications = async () => {
      try {
        if (!isAndroidCapacitorWebView()) {
          return
        }

        console.log("[Push] setup start")

        await PushNotifications.addListener("registration", async (token) => {
          console.log("[Push] FCM token:", token.value)

          if (!token?.value) {
            return
          }

          if (!user && !getAccessToken()) {
            return
          }

          try {
            await apiRequest("/push/register", {
              method: "POST",
              auth: true,
              body: JSON.stringify({
                token: token.value,
                platform: "android",
              }),
            })
            console.log("[Push] token registered")
          } catch {
            console.warn("[Push] token register failed")
          }
        })

        await PushNotifications.addListener("registrationError", (error) => {
          console.error("[Push] registration error:", error)
        })

        console.log("[Push] listener attached")

        const permissionState = await PushNotifications.checkPermissions()
        let receivePermission = permissionState.receive

        if (receivePermission === "prompt") {
          const requested = await PushNotifications.requestPermissions()
          receivePermission = requested.receive
        }

        if (receivePermission !== "granted") {
          console.warn("[Push] notification permission not granted")
          return
        }

        console.log("[Push] permissions granted")
        console.log("[Push] calling register")

        await PushNotifications.register()
      } catch (error) {
        console.warn("[Push] setup skipped or failed:", error)
      }
    }

    void setupPushNotifications()

    return () => {
      if (!isAndroidCapacitorWebView()) {
        return
      }

      try {
        void PushNotifications.removeAllListeners()
      } catch (error) {
        console.warn("[Push] remove listeners failed:", error)
      }
    }
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
  const showLanguageSwitcher = true

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

  const headerSafeTop = isCapacitor
      ? "pt-[calc(0.875rem+max(env(safe-area-inset-top),14px))]"
      : "pt-[calc(1rem+env(safe-area-inset-top))]"
  const mainSafeTop = isCapacitor
      ? "pt-[calc(5.25rem+max(env(safe-area-inset-top),14px))]"
      : "pt-[calc(5.25rem+env(safe-area-inset-top))]"
  const mainSafeBottom = isCapacitor
      ? "pb-[calc(5.75rem+max(env(safe-area-inset-bottom),14px))]"
      : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
  const navSafeBottom = isCapacitor
      ? "pb-[calc(0.6rem+max(env(safe-area-inset-bottom),14px))]"
      : "pb-[calc(0.5rem+env(safe-area-inset-bottom))]"

  const appContent = (
      <div className="relative mx-auto flex h-[100dvh] min-h-[100dvh] w-full max-w-[430px] touch-pan-y flex-col overflow-hidden bg-stone-50 shadow-2xl shadow-orange-950/10">
        <header className={`absolute inset-x-0 top-0 z-40 flex items-center justify-between bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 px-5 pb-4 shadow-lg ${headerSafeTop}`}>
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
            {showLanguageSwitcher ? <LanguageSwitcher /> : null}

            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
              <span className="text-lg font-bold text-orange-500">
                {avatarLetter}
              </span>
            </div>
          </div>
        </header>

        <main className={`h-full overflow-y-auto overscroll-contain bg-stone-50 [-webkit-overflow-scrolling:touch] ${mainSafeBottom} ${mainSafeTop}`}>
          {children}
        </main>

        <nav className={`safe-bottom absolute inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-stone-200 bg-white/95 px-4 pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur-xl ${navSafeBottom}`}>
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
        <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden overscroll-none bg-stone-100">
          {appContent}
        </div>
    )
  }

  return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-orange-100 via-stone-100 to-amber-100">
        {appContent}
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
