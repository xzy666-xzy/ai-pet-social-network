"use client"

import { useEffect, useRef, useState } from "react"
import { Settings } from "lucide-react"
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
  const [coverLiked, setCoverLiked] = useState(false)
  const [isCoverExpanded, setIsCoverExpanded] = useState(false)
  const profileRootRef = useRef<HTMLDivElement>(null)
  const hasScrolledCoverRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || loading || !user) {
      return
    }

    const scrollContainer = profileRootRef.current?.parentElement

    if (!scrollContainer) {
      return
    }

    function handleScroll() {
      const scrollTop = scrollContainer.scrollTop

      if (scrollTop > 24) {
        hasScrolledCoverRef.current = true
      }

      setIsCoverExpanded(hasScrolledCoverRef.current && scrollTop <= 4)
    }

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll)
    }
  }, [mounted, loading, user])

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
      <div
          ref={profileRootRef}
          className="min-h-screen overflow-x-hidden bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4"
      >
        <div className="sticky top-0 z-0 -mx-4 -mt-4 h-[260px] bg-gradient-to-br from-orange-200 via-amber-100 to-rose-100">
          <button
              type="button"
              onClick={() => (window.location.href = "/settings")}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur"
              aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            {!isCoverExpanded ? (
                <button
                    type="button"
                    aria-pressed={coverLiked}
                    onClick={() => setCoverLiked((liked) => !liked)}
                    className={`rounded-full bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur ${
                        coverLiked ? "text-rose-500" : "text-stone-700"
                    }`}
                >
                  {coverLiked ? "❤️" : "♡"} {coverLiked ? 2 : 1}
                </button>
            ) : null}
            {isCoverExpanded ? (
                <button
                    type="button"
                    onClick={() => console.log("change cover")}
                    className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur"
                >
                  换封面
                </button>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 -mt-4 mx-auto max-w-md space-y-5 pt-4">
          <Card className="rounded-3xl border-orange-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-24 shrink-0 text-center">
                {user.avatar_url ? (
                    <img
                        src={user.avatar_url}
                        alt={displayName}
                        className="mx-auto h-20 w-20 rounded-full border-4 border-white object-cover shadow-md"
                    />
                ) : (
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-2xl font-bold text-white shadow-md">
                      {displayInitial}
                    </div>
                )}
                <p className="mt-2 truncate text-sm font-bold text-stone-900">{petName}</p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold text-stone-900">
                  {petAge !== "Age not set" ? petAge : "Age not set"}
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
