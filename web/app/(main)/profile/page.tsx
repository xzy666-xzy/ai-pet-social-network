"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { apiRequest } from "@/lib/api-client"

type ProfileStatsResponse = {
  success: true
  data: {
    stats: {
      likesSent: number
      likesReceived: number
      conversations: number
    }
    membership: {
      isActive: boolean
      planName: string | null
      expiresAt: string | null
      startedAt: string | null
    }
  }
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState({
    likesSent: 0,
    likesReceived: 0,
    conversations: 0,
  })
  const [membership, setMembership] = useState({
    isActive: false,
    planName: null as string | null,
    expiresAt: null as string | null,
    startedAt: null as string | null,
  })
  const [statsError, setStatsError] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || loading || !user) {
      return
    }

    let cancelled = false

    async function loadProfileStats() {
      try {
        setStatsError("")

        const response = await apiRequest<ProfileStatsResponse>("/profile/stats", {
          cache: "no-store",
          auth: true,
        })

        if (cancelled) {
          return
        }

        setStats(response.data.stats)
        setMembership(response.data.membership)
      } catch (error: unknown) {
        if (cancelled) {
          return
        }

        setStatsError(
          error instanceof Error ? error.message : "Failed to load profile stats"
        )
      }
    }

    loadProfileStats()

    return () => {
      cancelled = true
    }
  }, [mounted, loading, user])

  if (!mounted || loading) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4">
          <div className="mx-auto max-w-md pt-10 text-center text-stone-500">
            Loading profile...
          </div>
        </div>
    )
  }

  if (!user) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4">
          <div className="mx-auto max-w-md pt-10 text-center">
            <p className="text-stone-600 mb-4">Please log in first.</p>
            <Button onClick={() => (window.location.href = "/login")}>
              Go to Login
            </Button>
          </div>
        </div>
    )
  }

  const displayName =
      user.username?.trim() ||
      user.pet_name?.trim() ||
      user.email?.split("@")[0] ||
      "User"

  const displayInitial =
      user.username?.trim()?.charAt(0)?.toUpperCase() ||
      user.pet_name?.trim()?.charAt(0)?.toUpperCase() ||
      user.email?.trim()?.charAt(0)?.toUpperCase() ||
      "U"

  const petName = user.pet_name || "No pet name yet"
  const petType = user.pet_type || "No pet type yet"
  const petAge =
      user.pet_age !== null && user.pet_age !== undefined
          ? `${user.pet_age} yrs`
          : "Age not set"

  const bio =
      user.description || "No description yet. Add your pet profile info."

  return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4">
        <div className="mx-auto max-w-md space-y-5 pt-4">
          <Card className="rounded-3xl border-orange-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              {user.avatar_url ? (
                  <img
                      src={user.avatar_url}
                      alt={displayName}
                      className="h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover shadow-md"
                  />
              ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-2xl font-bold text-white shadow-md">
                    {displayInitial}
                  </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold text-stone-900">
                  {petName}
                  {petAge !== "Age not set" ? ` · ${petAge}` : ""}
                </p>
                <p className="mt-1 truncate text-xs text-stone-500">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
                    {petType}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
                    {displayName}
                  </span>
                  {user.description ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
                        Profile ready
                      </span>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-orange-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-medium leading-6 text-stone-800">
              ✨ {user.description || "非常活泼，喜欢和小伙伴玩"}
            </p>
          </Card>

          <Card className="rounded-3xl border-orange-100 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-stone-900">🐾 我的宠物</h2>

            <div className="space-y-4 text-sm">
              <div className="space-y-2 rounded-2xl bg-stone-50 p-4">
                <p className="font-medium text-stone-900">名字：{petName}</p>
                <p className="font-medium text-stone-900">类型：{petType}</p>
                <p className="font-medium text-stone-900">年龄：{petAge}</p>
              </div>

              <div>
                <p className="mb-2 font-bold text-stone-900">✨ 关于它：</p>
                <p className="leading-6 text-stone-700">{bio}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-orange-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 mb-3">Account Info</h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-stone-500">Username</p>
                <p className="font-medium text-stone-900">
                  {user.username || "Not set"}
                </p>
              </div>

              <div>
                <p className="text-stone-500">Created At</p>
                <p className="font-medium text-stone-900">
                  {user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : "Unknown"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-orange-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 mb-3">Activity Stats</h2>

            {statsError ? (
              <p className="text-sm text-red-600">{statsError}</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-stone-500">Likes Sent</p>
                  <p className="font-medium text-stone-900">{stats.likesSent}</p>
                </div>

                <div>
                  <p className="text-stone-500">Likes Received</p>
                  <p className="font-medium text-stone-900">{stats.likesReceived}</p>
                </div>

                <div>
                  <p className="text-stone-500">Conversations</p>
                  <p className="font-medium text-stone-900">{stats.conversations}</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="rounded-3xl border-orange-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-stone-900">🌟 月度会员</h2>
                <p className="mt-2 text-sm text-stone-500">
                  到期：
                  {membership.expiresAt
                    ? new Date(membership.expiresAt).toLocaleDateString()
                    : "暂无"}
                </p>
              </div>

              <Button className="shrink-0 rounded-full bg-orange-500 px-4 text-white hover:bg-orange-600">
                升级会员
              </Button>
            </div>
          </Card>
        </div>
      </div>
  )
}
