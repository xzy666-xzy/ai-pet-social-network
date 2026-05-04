"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, MoreHorizontal, Settings } from "lucide-react"
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

const COLLAPSED_COVER_HEIGHT = 220
const EXPANDED_COVER_HEIGHT = 420

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
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("")
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false)
  const [isAvatarActionsOpen, setIsAvatarActionsOpen] = useState(false)
  const profileRootRef = useRef<HTMLDivElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const touchStartYRef = useRef(0)

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

      if (scrollTop > 5) {
        setIsCoverExpanded(false)
      }
    }

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll)
    }
  }, [mounted, loading, user])

  function handleCoverTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartYRef.current = event.touches[0]?.clientY ?? 0
  }

  function updateCoverExpandedState(currentY: number) {
    const scrollContainer = profileRootRef.current?.parentElement

    if (!scrollContainer) {
      return
    }

    const deltaY = currentY - touchStartYRef.current

    if (deltaY < -10) {
      setIsCoverExpanded(false)
      return
    }

    if (scrollContainer.scrollTop <= 0 && deltaY > 40) {
      setIsCoverExpanded(true)
    }
  }

  function handleCoverTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    updateCoverExpandedState(event.touches[0]?.clientY ?? 0)
  }

  function handleCoverTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    updateCoverExpandedState(event.changedTouches[0]?.clientY ?? 0)
  }

  function handleCoverFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const imageUrl = URL.createObjectURL(file)

    setCoverImageUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }

      return imageUrl
    })
    event.target.value = ""
  }

  function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const imageUrl = URL.createObjectURL(file)

    setAvatarPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }

      return imageUrl
    })
    setIsAvatarActionsOpen(false)
    event.target.value = ""
  }

  useEffect(() => {
    return () => {
      if (coverImageUrl) {
        URL.revokeObjectURL(coverImageUrl)
      }
    }
  }, [coverImageUrl])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

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
  const savedCoverUrl = (user as { cover_url?: string | null }).cover_url || ""
  const displayCoverImageUrl = coverImageUrl || savedCoverUrl
  const displayAvatarUrl = avatarPreviewUrl || user.avatar_url

  return (
      <div
          ref={profileRootRef}
          onTouchStart={handleCoverTouchStart}
          onTouchMove={handleCoverTouchMove}
          onTouchEnd={handleCoverTouchEnd}
          className="min-h-screen overflow-x-hidden bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4"
      >
        <div
            className="sticky top-0 z-0 -mx-4 -mt-4 overflow-hidden bg-gradient-to-br from-orange-200 via-amber-100 to-rose-100 transition-all duration-300 ease-out"
            style={{
              height: isCoverExpanded
                  ? EXPANDED_COVER_HEIGHT
                  : COLLAPSED_COVER_HEIGHT,
            }}
        >
          {displayCoverImageUrl ? (
              <img
                  src={displayCoverImageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
              />
          ) : null}
          <button
              type="button"
              onClick={() => (window.location.href = "/settings")}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur"
              aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverFileChange}
          />

          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            {isCoverExpanded === false ? (
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
            {isCoverExpanded === true ? (
                <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur"
                >
                  换封面
                </button>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-md space-y-5 pt-4">
          <Card className="rounded-3xl border-orange-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-24 shrink-0 text-center">
                <button
                    type="button"
                    onClick={() => setIsAvatarPreviewOpen(true)}
                    className="mx-auto block rounded-full"
                    aria-label="Preview avatar"
                >
                  {displayAvatarUrl ? (
                      <img
                          src={displayAvatarUrl}
                          alt={displayName}
                          className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-md"
                      />
                  ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-2xl font-bold text-white shadow-md">
                        {displayInitial}
                      </div>
                  )}
                </button>
                <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                />
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

        {isAvatarPreviewOpen ? (
            <div className="fixed inset-0 z-50 bg-black text-white">
              <div className="absolute left-0 right-0 top-0 z-10 flex h-14 items-center justify-between px-4">
                <button
                    type="button"
                    onClick={() => {
                      setIsAvatarActionsOpen(false)
                      setIsAvatarPreviewOpen(false)
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                    aria-label="Close avatar preview"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <h2 className="text-base font-semibold">个人头像</h2>
                <button
                    type="button"
                    onClick={() => setIsAvatarActionsOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                    aria-label="More avatar options"
                >
                  <MoreHorizontal className="h-6 w-6" />
                </button>
              </div>

              <div className="flex min-h-screen items-center justify-center px-4">
                {displayAvatarUrl ? (
                    <img
                        src={displayAvatarUrl}
                        alt={displayName}
                        className="max-h-[75vh] max-w-full object-contain"
                    />
                ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-full bg-orange-500 text-6xl font-bold text-white">
                      {displayInitial}
                    </div>
                )}
              </div>

              {isAvatarActionsOpen ? (
                  <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3">
                    <div className="overflow-hidden rounded-2xl bg-white text-center text-base text-stone-900">
                      <button
                          type="button"
                          onClick={() => alert("暂未支持拍照")}
                          className="block w-full border-b border-stone-100 px-4 py-4"
                      >
                        拍照
                      </button>
                      <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="block w-full border-b border-stone-100 px-4 py-4"
                      >
                        从手机相册选择
                      </button>
                      <button
                          type="button"
                          onClick={() => alert("暂未支持保存图片")}
                          className="block w-full px-4 py-4"
                      >
                        保存图片
                      </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsAvatarActionsOpen(false)}
                        className="mt-2 block w-full rounded-2xl bg-white px-4 py-4 text-center text-base font-semibold text-stone-900"
                    >
                      取消
                    </button>
                  </div>
              ) : null}
            </div>
        ) : null}
      </div>
  )
}
