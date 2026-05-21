"use client"

import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MapPin,
  PencilLine,
  Repeat,
  Shield,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"

export default function SettingsPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const { t } = useLanguage()

  const settingsItems = [
    { label: t.profile.settingsAccount, icon: Shield, href: "/settings/account" },
    { label: t.profile.editProfile, icon: PencilLine, href: "/profile/edit" },
    { label: t.profile.switchCity, icon: MapPin, href: "/profile/settings/city" },
    { label: t.profile.switchAccount, icon: Repeat, href: "/login" },
    { label: t.profile.logout, icon: LogOut, action: "logout" },
    { label: t.settings.deleteAccount, icon: AlertCircle, action: "deleteAccount", danger: true },
  ]

  const handleLogout = async () => {
    if (!confirm(t.profile.logoutConfirm)) return

    await logout()
  }

  const handleDeleteAccount = async () => {
    if (!confirm("确定要注销账号吗？此操作不可恢复。")) return

    try {
      await apiRequest("/auth/me", { method: "DELETE", auth: true })
      await logout()
    } catch (error) {
      const message = error instanceof Error ? error.message : "注销账号失败"
      alert(message)
    }
  }

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
          <h1 className="text-2xl font-bold text-stone-900">{t.profile.settings}</h1>
        </div>

        <Card className="overflow-hidden rounded-3xl border-orange-100 bg-white shadow-sm">
          {settingsItems.map((item, index) => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                onClick={
                  item.action === "logout"
                    ? handleLogout
                    : item.action === "deleteAccount"
                      ? handleDeleteAccount
                      : item.href
                        ? () => router.push(item.href)
                        : undefined
                }
                className={`flex items-center justify-between px-5 py-4 ${
                  index === settingsItems.length - 1 ? "" : "border-b border-orange-50"
                } ${item.href || item.action ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    item.danger ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`font-semibold ${
                    item.danger ? "text-red-600" : "text-stone-800"
                  }`}>{item.label}</span>
                </div>
                <ChevronRight className={`h-5 w-5 ${
                  item.danger ? "text-red-300" : "text-stone-300"
                }`} />
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
