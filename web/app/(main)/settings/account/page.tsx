"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

export default function SettingsAccountPage() {
  const router = useRouter()
  const { user } = useAuth()

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
          <h1 className="text-2xl font-bold text-stone-900">账号</h1>
        </div>

        <Card className="rounded-3xl border-orange-100 bg-white p-5 shadow-sm">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-stone-500">Username</p>
              <p className="mt-1 font-medium text-stone-900">
                {user?.username || "Not set"}
              </p>
            </div>

            <div>
              <p className="text-stone-500">Email</p>
              <p className="mt-1 font-medium text-stone-900">
                {user?.email || "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-stone-500">Created At</p>
              <p className="mt-1 font-medium text-stone-900">
                {user?.created_at ? new Date(user.created_at).toLocaleString() : "Unknown"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
