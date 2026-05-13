"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, MoreHorizontal, Settings, Sparkles, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { apiRequest } from "@/lib/api-client"
import { useLanguage } from "@/lib/i18n/language-context"

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

type MembershipCheckoutResponse = {
  success: true
  data: {
    membership: {
      id: string
      user_id: string
      plan_type: string | null
      status: string | null
      start_at: string | null
      end_at: string | null
    }
    quota?: unknown
  }
}

const COLLAPSED_COVER_HEIGHT = 220
const EXPANDED_COVER_HEIGHT = 420

export default function ProfilePage() {
  const { t } = useLanguage()
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
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [membershipError, setMembershipError] = useState("")
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
      const scrollTop = scrollContainer?.scrollTop ?? 0

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

  async function fetchProfileStats() {
    const response = await apiRequest<ProfileStatsResponse>("/profile/stats", {
      cache: "no-store",
      auth: true,
    })

    return response.data
  }

  async function handleCheckoutMembership(plan: "monthly" | "annual") {
    try {
      setCheckingOut(true)
      setMembershipError("")

      await apiRequest<MembershipCheckoutResponse>("/membership/checkout", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          plan,
        }),
      })

      const profileData = await fetchProfileStats()
      setStats(profileData.stats)
      setMembership(profileData.membership)
      setShowMembershipModal(false)
    } catch (error: unknown) {
      setMembershipError(
          error instanceof Error ? error.message : t.match.membership.quotaExceeded
      )
    } finally {
      setCheckingOut(false)
    }
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

        const profileData = await fetchProfileStats()

        if (cancelled) {
          return
        }

        setStats(profileData.stats)
        setMembership(profileData.membership)
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
            {t.profile.loadingProfile}
          </div>
        </div>
    )
  }

  if (!user) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4">
          <div className="mx-auto max-w-md pt-10 text-center">
            <p className="text-stone-600 mb-4">{t.profile.pleaseLoginFirst}</p>
            <Button onClick={() => (window.location.href = "/login")}>
              {t.profile.goToLogin}
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

  const petName = user.pet_name || t.profile.noPetNameYet
  const petType = user.pet_type || t.profile.noPetTypeYet
  const petAge =
      user.pet_age !== null && user.pet_age !== undefined
          ? `${user.pet_age} ${t.profile.yearsSuffix}`
          : t.profile.ageNotSet
  const petGenderSymbol =
      user.pet_gender === "male"
          ? "♂"
          : user.pet_gender === "female"
              ? "♀"
              : ""
  const petAgeWithGender = `${petAge}${petGenderSymbol ? ` ${petGenderSymbol}` : ""}`

  const tagline = user.tagline || ""
  const bio =
      user.description || t.profile.noDescriptionYet
  const savedCoverUrl = (user as { cover_url?: string | null }).cover_url || ""
  const displayCoverImageUrl = coverImageUrl || savedCoverUrl
  const displayAvatarUrl = avatarPreviewUrl || user.avatar_url

  return (
      <div
          ref={profileRootRef}
          onTouchStart={handleCoverTouchStart}
          onTouchMove={handleCoverTouchMove}
          onTouchEnd={handleCoverTouchEnd}
          className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-orange-50 via-stone-50 to-white px-5 py-4 -mt-[calc(5.25rem+env(safe-area-inset-top))]"
      >
        <div
            className="relative sticky top-0 z-0 -mx-5 -mt-4 overflow-hidden bg-gradient-to-br from-orange-200 via-amber-100 to-rose-100 shadow-2xl shadow-orange-900/10 transition-all duration-300 ease-out"
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-orange-950/35" />
          <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverFileChange}
          />

          <div className="absolute bottom-14 right-5 flex items-center gap-2 z-50">
            {isCoverExpanded === false ? (
                <button
                    type="button"
                    aria-pressed={coverLiked}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCoverLiked((liked) => !liked)
                    }}
                    className={`pointer-events-auto rounded-full border-2 border-white/90 bg-white/95 px-4 py-2.5 text-sm font-bold shadow-xl shadow-black/20 backdrop-blur-sm hover:bg-white active:scale-95 ${
                        coverLiked ? "text-rose-500" : "text-stone-800"
                    }`}
                >
                  {coverLiked ? "❤️" : "♡"} {coverLiked ? 2 : 1}
                </button>
            ) : null}
            {isCoverExpanded === true ? (
                <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      coverInputRef.current?.click()
                    }}
                    className="pointer-events-auto rounded-full border-2 border-white/90 bg-white/95 px-4 py-2.5 text-sm font-bold text-stone-800 shadow-xl shadow-black/20 backdrop-blur-sm hover:bg-white active:scale-95"
                >
                  {t.profile.changeCover}
                </button>
            ) : null}
          </div>
        </div>


        <button
            type="button"
            onClick={() => (window.location.href = "/settings")}
            className="absolute right-5 top-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg text-stone-700"
            aria-label="Settings"
        >
          <Settings className="h-6 w-6" />
        </button>

        <div className="relative z-10 mx-auto max-w-md space-y-5 pt-4">
          <Card className="-mt-14 overflow-hidden rounded-[2rem] border border-orange-100/80 bg-white/95 p-5 shadow-2xl shadow-orange-900/10 ring-1 ring-white/70">
            <div className="flex items-center gap-4">
              <div className="w-24 shrink-0 text-center">
                <button
                    type="button"
                    onClick={() => setIsAvatarPreviewOpen(true)}
                    className="mx-auto block rounded-[1.75rem] transition hover:scale-[1.02]"
                    aria-label="Preview avatar"
                >
                  {displayAvatarUrl ? (
                      <img
                          src={displayAvatarUrl}
                          alt={displayName}
                          className="h-24 w-24 rounded-[1.75rem] border-4 border-white object-cover shadow-xl shadow-orange-900/15"
                      />
                  ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border-4 border-white bg-gradient-to-br from-orange-500 to-amber-400 text-3xl font-black text-white shadow-xl shadow-orange-900/15">
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
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-2xl font-black tracking-tight text-stone-900">
                    {petName}
                  </p>
                  {membership.isActive ? (
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[10px] font-black text-white shadow-md shadow-orange-500/20">
                        VIP
                      </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-stone-500">{displayName}</p>
                <p className="mt-0.5 truncate text-xs text-stone-400">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 shadow-sm">
                    {petType}
                  </span>
                  <span className="rounded-full border border-stone-100 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 shadow-sm">
                    {petAgeWithGender}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-orange-100/80 bg-white/95 p-5 shadow-xl shadow-orange-900/5">
            <h2 className="mb-4 text-lg font-black tracking-tight text-stone-900">🐾 {t.profile.myPet}</h2>

            <div className="space-y-4 text-sm">
              <div className="space-y-2 rounded-[1.5rem] border border-orange-100 bg-orange-50/70 p-4">
                <p className="font-semibold text-stone-900">{t.profile.nameLabel}: {petName}</p>
                <p className="font-semibold text-stone-900">{t.profile.typeLabel}: {petType}</p>
                <p className="font-semibold text-stone-900">{t.profile.ageLabel}: {petAgeWithGender}</p>
              </div>

              <div>
                <p className="mb-2 font-bold text-stone-900">✨ {t.profile.aboutPet}:</p>
                {tagline ? (
                  <p className="mb-2 rounded-[1.2rem] border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                    {tagline}
                  </p>
                ) : null}
                <p className="rounded-[1.4rem] bg-stone-50 p-4 font-medium leading-6 text-stone-700">{bio}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-orange-100/80 bg-white/95 p-5 shadow-xl shadow-orange-900/5">
            <h2 className="mb-4 text-lg font-black tracking-tight text-stone-900">📊 {t.profile.activityStats}</h2>

            {statsError ? (
              <p className="text-sm text-red-600">{statsError}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-[1.4rem] border border-orange-100 bg-gradient-to-br from-orange-50 to-white px-2 py-4 shadow-sm">
                  <p className="min-h-[2rem] text-[11px] font-bold leading-4 text-stone-500">{t.profile.likesSent}</p>
                  <p className="mt-2 text-2xl font-black text-orange-600">{stats.likesSent}</p>
                </div>

                <div className="rounded-[1.4rem] border border-rose-100 bg-gradient-to-br from-rose-50 to-white px-2 py-4 shadow-sm">
                  <p className="min-h-[2rem] text-[11px] font-bold leading-4 text-stone-500">{t.profile.likesReceived}</p>
                  <p className="mt-2 text-2xl font-black text-rose-500">{stats.likesReceived}</p>
                </div>

                <div className="rounded-[1.4rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-2 py-4 shadow-sm">
                  <p className="min-h-[2rem] text-[11px] font-bold leading-4 text-stone-500">{t.profile.conversations}</p>
                  <p className="mt-2 text-2xl font-black text-amber-600">{stats.conversations}</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border border-orange-100/80 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950 p-5 text-white shadow-2xl shadow-orange-900/15">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-white">🌟 {t.profile.monthlyMembership}</h2>
                <p className="mt-2 text-sm font-medium text-stone-300">
                  {t.profile.expiresPrefix}: 
                  {membership.expiresAt
                    ? new Date(membership.expiresAt).toLocaleDateString()
                    : t.profile.none}
                </p>
              </div>

              <Button
                  onClick={() => {
                    setMembershipError("")
                    setShowMembershipModal(true)
                  }}
                  className="shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 px-4 font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35"
              >
                {t.profile.upgradeMembership}
              </Button>
            </div>
          </Card>
        </div>

        {showMembershipModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-stone-900">
                    {t.match.membership.title}
                  </h2>
                  <button
                      type="button"
                      onClick={() => {
                        setShowMembershipModal(false)
                        setMembershipError("")
                      }}
                      className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50/70 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-bold text-stone-900">{t.match.membership.monthlyVipTitle}</div>
                        <div className="mt-1 text-sm text-stone-600">{t.match.membership.monthlyVipName}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-bold text-stone-900">
                      ¥19.9
                      <span className="ml-1 text-sm font-normal text-stone-500">
                        {t.match.membership.monthlyVipDuration}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-stone-700">
                      <div>• {t.match.membership.monthlyVipBenefit1}</div>
                      <div>• {t.match.membership.monthlyVipBenefit2}</div>
                      <div>• {t.match.membership.monthlyVipBenefit3}</div>
                      <div>• {t.match.membership.monthlyVipBenefit4}</div>
                    </div>
                    <Button
                        onClick={() => handleCheckoutMembership("monthly")}
                        disabled={checkingOut}
                        className="mt-4 w-full rounded-full bg-yellow-500 text-white hover:bg-yellow-600"
                    >
                      {checkingOut
                          ? t.match.membership.processing
                          : t.match.membership.activateMonthly}
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-stone-900">{t.match.membership.annualVipTitle}</span>
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {t.match.membership.bestValue}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-stone-600">{t.match.membership.annualVipName}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-bold text-stone-900">
                      ¥99.9
                      <span className="ml-1 text-sm font-normal text-stone-500">
                        {t.match.membership.annualVipDuration}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-amber-600">
                      {t.match.membership.annualSave}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-stone-700">
                      <div>• {t.match.membership.annualVipBenefit1}</div>
                      <div>• {t.match.membership.annualVipBenefit2}</div>
                      <div>• {t.match.membership.annualVipBenefit3}</div>
                      <div>• {t.match.membership.annualVipBenefit4}</div>
                    </div>
                    <Button
                        onClick={() => handleCheckoutMembership("annual")}
                        disabled={checkingOut}
                        className="mt-4 w-full rounded-full bg-amber-500 text-white hover:bg-amber-600"
                    >
                      {checkingOut
                          ? t.match.membership.processing
                          : t.match.membership.activateAnnual}
                    </Button>
                  </div>
                </div>

                {membershipError ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {membershipError}
                    </div>
                ) : null}

                <div className="mt-5">
                  <Button
                      variant="outline"
                      onClick={() => {
                        setShowMembershipModal(false)
                        setMembershipError("")
                      }}
                      className="w-full rounded-full"
                  >
                    {t.match.membership.later}
                  </Button>
                </div>
              </div>
            </div>
        ) : null}

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
                <h2 className="text-base font-semibold">{t.profile.avatarTitle}</h2>
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
                        {t.profile.takePhoto}
                      </button>
                      <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="block w-full border-b border-stone-100 px-4 py-4"
                      >
                        {t.profile.chooseFromAlbum}
                      </button>
                      <button
                          type="button"
                          onClick={() => alert("暂未支持保存图片")}
                          className="block w-full px-4 py-4"
                      >
                        {t.profile.saveImage}
                      </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsAvatarActionsOpen(false)}
                        className="mt-2 block w-full rounded-2xl bg-white px-4 py-4 text-center text-base font-semibold text-stone-900"
                    >
                      {t.profile.cancel}
                    </button>
                  </div>
              ) : null}
            </div>
        ) : null}
      </div>
  )
}
