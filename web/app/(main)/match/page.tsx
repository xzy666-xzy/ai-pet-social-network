"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "framer-motion"
import { X, Heart, Sparkles, Info, MapPin, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"
import { apiRequest, ApiError, getAccessToken } from "@/lib/api-client"

type MatchUser = {
  id: string
  email: string | null
  username: string | null
  pet_name: string | null
  pet_type: string | null
  pet_gender?: string | null
  pet_age: number | null
  description: string | null
  petBio?: string | null
  pet_bio?: string | null
  city?: string | null
  avatar_url: string | null
  is_ai?: boolean | null
  created_at?: string | null
  membership_active?: boolean
  distance_km?: number | null
  distance_label?: string | null
  matchScore?: number
  matchReasons?: string[]
  liked?: boolean
}

type MatchRecommendResponse = {
  success: true
  data: {
    users: MatchUser[]
  }
}

type LikeQuotaResponse = {
  success: true
  data: {
    isMember: boolean
    dailyLimit: number
    remainingLikes: number
    unlocked: boolean
  }
}

type LikeResponse = {
  success: true
  data: {
    alreadyLiked: boolean
    isMutualMatch: boolean
    conversation?: unknown
    like?: unknown
    remainingLikes: number
    dailyLikeLimit?: number
    quota?: {
      isMember: boolean
      dailyLimit: number
      remainingLikes: number
      unlocked: boolean
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
    quota: {
      isMember: boolean
      dailyLimit: number
      remainingLikes: number
      unlocked: boolean
    }
  }
}

export default function MatchPage() {
  const { t, locale } = useLanguage()
  const { loading } = useAuth()

  const [users, setUsers] = useState<MatchUser[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [pageError, setPageError] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [liking, setLiking] = useState(false)
  const [remainingLikes, setRemainingLikes] = useState<number>(8)
  const [inlineNotice, setInlineNotice] = useState("")
  const [isMember, setIsMember] = useState(false)
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [membershipError, setMembershipError] = useState("")
  const [likedUserIds, setLikedUserIds] = useState<Set<string>>(new Set())
  const [showPetDetail, setShowPetDetail] = useState(false)
  const hasToken = Boolean(getAccessToken())
  const dragX = useMotionValue(0)
  const dragRotate = useTransform(dragX, [-200, 0, 200], [-10, 0, 10])
  const swipeExitX = direction * (typeof window === "undefined" ? 300 : window.innerWidth)

  const loadLikeQuota = async () => {
    const data = await apiRequest<LikeQuotaResponse>("/match/likes/today", {
      cache: "no-store",
      auth: true,
    })

    setIsMember(Boolean(data.data.isMember))
    setRemainingLikes(
      typeof data.data.remainingLikes === "number" ? data.data.remainingLikes : 8
    )
  }

  useEffect(() => {
    if (loading) return
    if (!hasToken) {
      setLoadingUsers(false)
      return
    }

    let cancelled = false

    async function loadUsers() {
      try {
        setLoadingUsers(true)
        setPageError("")
        setInlineNotice("")

        const data = await apiRequest<MatchRecommendResponse>("/match/recommend", {
          cache: "no-store",
          auth: true,
        })

        if (cancelled) return

        const loadedUsers: MatchUser[] = Array.isArray(data.data.users)
          ? data.data.users.filter(
              (item) => !item.liked && !likedUserIds.has(item.id)
            )
          : []
        setUsers(loadedUsers)
        setCurrentIndex(0)

        await loadLikeQuota()
      } catch (error: unknown) {
        if (cancelled) return
        setPageError(error instanceof Error ? error.message : "Failed to load users")
      } finally {
        if (!cancelled) {
          setLoadingUsers(false)
        }
      }
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [loading, hasToken])

  useEffect(() => {
    if (loading || !hasToken) return

    loadLikeQuota().catch(() => {})
  }, [loading, hasToken])

  const currentPet = useMemo(() => {
    if (users.length === 0) return null
    if (currentIndex >= users.length) return null
    return users[currentIndex]
  }, [users, currentIndex])

  const handleSwipe = (dir: number) => {
    if (!currentPet) return

    setDirection(dir)

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setDirection(0)
    }, 300)
  }

  const handleLikedSwipe = (likedUserId: string) => {
    setDirection(1)

    setTimeout(() => {
      setUsers((prev) => prev.filter((item) => item.id !== likedUserId))
      setDirection(0)
    }, 300)
  }

  const handleDislike = () => {
    if (!currentPet) return
    setInlineNotice("")
    setPageError("")
    handleSwipe(-1)
  }

  const handleCheckoutMembership = async (plan: "monthly" | "annual" = "monthly") => {
    try {
      setCheckingOut(true)
      setMembershipError("")

      const data = await apiRequest<MembershipCheckoutResponse>("/membership/checkout", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          plan,
        }),
      })

      setIsMember(true)
      setRemainingLikes(
          typeof data.data.quota?.remainingLikes === "number" ? data.data.quota.remainingLikes : 9999
      )
      setInlineNotice(t.match.notices.memberActivated)
      setShowMembershipModal(false)
    } catch (error: unknown) {
      setMembershipError(
          error instanceof Error ? error.message : t.match.membership.quotaExceeded
      )
    } finally {
      setCheckingOut(false)
    }
  }

  const handleLike = async () => {
    if (!currentPet?.id || liking) return
    const likedUserId = currentPet.id

    if (!isMember && remainingLikes <= 0) {
      setMembershipError("")
      setShowMembershipModal(true)
      return
    }

    try {
      setLiking(true)
      setPageError("")
      setInlineNotice("")

      const data = await apiRequest<LikeResponse>("/match/like", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          targetUserId: likedUserId,
        }),
      })

      if (data.data.quota) {
        setIsMember(Boolean(data.data.quota.isMember))
        setRemainingLikes(
          typeof data.data.quota.remainingLikes === "number"
            ? data.data.quota.remainingLikes
            : remainingLikes
        )
      } else if (typeof data.data.remainingLikes === "number") {
        setRemainingLikes(data.data.remainingLikes)
      }

      if (data.data.alreadyLiked) {
        setInlineNotice(t.match.notices.alreadyLiked)
      } else if (data.data.isMutualMatch) {
        setInlineNotice(t.match.notices.mutualMatch)
      } else {
        setInlineNotice(t.match.notices.introOnly)
      }

      setLikedUserIds((prev) => {
        const next = new Set(prev)
        next.add(likedUserId)
        return next
      })
      await loadLikeQuota()
      handleLikedSwipe(likedUserId)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === "MEMBERSHIP_REQUIRED") {
        setMembershipError("")
        setShowMembershipModal(true)
        return
      }

      const message = error instanceof Error ? error.message : "Failed to like user"
      setPageError(message)
    } finally {
      setLiking(false)
    }
  }

  const distanceKm =
      typeof currentPet?.distance_km === "number" && Number.isFinite(currentPet.distance_km)
          ? currentPet.distance_km
          : null
  const isSameCityLocationOff = currentPet?.distance_label === "same_city"
  const sameCityLocationOffText =
      locale === "zh"
          ? "同城（未开启定位）"
          : locale === "ko"
              ? "같은 지역 (위치 비활성화)"
              : "Same city (location off)"
  const distanceDisplayText =
      distanceKm !== null
          ? `${t.match.distanceLabel} ${Math.round(distanceKm)} ${t.match.distanceUnit}`
          : ""
  const distanceClassName =
      distanceKm === null
          ? ""
          : distanceKm <= 20
              ? "text-emerald-600"
              : distanceKm <= 40
                  ? "text-amber-500"
                  : "text-red-500"

  const rawMatchScore = currentPet?.matchScore
  const hasMatchScore =
      typeof rawMatchScore === "number" && Number.isFinite(rawMatchScore)
  const matchScore = rawMatchScore ?? [98, 85, 92, 88, 95, 84, 90, 87][currentIndex % 8]

  const displayName =
      currentPet?.pet_name?.trim() ||
      currentPet?.username?.trim() ||
      "Unknown Pet"

  const displayAge =
      currentPet?.pet_age !== null && currentPet?.pet_age !== undefined
          ? `${currentPet.pet_age}${t.match.ageUnit}`
          : ""
  const petGenderSymbol =
      currentPet?.pet_gender === "male"
          ? "♂"
          : currentPet?.pet_gender === "female"
              ? "♀"
              : ""
  const petGenderColor =
      currentPet?.pet_gender === "male"
          ? "text-blue-500"
          : currentPet?.pet_gender === "female"
              ? "text-pink-500"
              : ""
  const displayAgeText = displayAge || ""

  const displayType = currentPet?.pet_type?.trim() || t.match.unknownBreed

  const displayDescription =
      currentPet?.description?.trim() ||
      currentPet?.petBio?.trim() ||
      currentPet?.pet_bio?.trim() ||
      t.match.noBio

  const displayCity = currentPet?.city?.trim() || ""

  const imageSrc =
      currentPet?.avatar_url && currentPet.avatar_url.trim() !== ""
          ? currentPet.avatar_url
          : "/placeholder-pet.png"

  if (showPetDetail && currentPet) {
    return (
        <div className="mx-auto flex h-full max-w-md flex-col bg-gradient-to-b from-orange-50 via-stone-50 to-white">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-orange-100/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-xl">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPetDetail(false)}
                className="h-11 w-11 rounded-full border border-orange-100 bg-white text-stone-700 shadow-sm hover:bg-orange-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-stone-900">{displayName}</h1>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-24">
            <div className="relative mx-4 mt-4 h-80 overflow-hidden rounded-[2rem] bg-orange-100 shadow-2xl shadow-orange-900/10">
              <img
                  src={imageSrc}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-pet.png"
                  }}
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent" />
              <Badge className="absolute right-4 top-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-orange-600 shadow-lg backdrop-blur">
                {matchScore}% {t.match.matchPercent}
              </Badge>
            </div>

            <div className="space-y-4 p-5">
              <Card className="rounded-[1.75rem] border-orange-100/80 bg-white/95 p-5 shadow-lg shadow-orange-900/5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
                    {displayName}
                    {displayAgeText
                        ? `, ${displayAgeText}${petGenderSymbol ? " " : ""}` : ""}
                    {petGenderSymbol ? (
                        <span className={petGenderColor}>{petGenderSymbol}</span>
                    ) : null}
                  </h2>
                  {currentPet.membership_active ? (
                      <span className="rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        VIP
                      </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {displayType ? (
                      <Badge variant="secondary" className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-orange-700">
                        {displayType}
                      </Badge>
                  ) : null}
                  {displayCity ? (
                      <Badge variant="secondary" className="rounded-full border border-stone-100 bg-stone-50 px-3 py-1 text-stone-600">
                        {displayCity}
                      </Badge>
                  ) : null}
                  {distanceDisplayText ? (
                      <Badge variant="secondary" className={`rounded-full border border-orange-100 bg-white px-3 py-1 shadow-sm ${distanceClassName}`}>
                        <MapPin className="mr-1 h-3 w-3" />
                        {distanceDisplayText}
                      </Badge>
                  ) : null}
                  {isSameCityLocationOff ? (
                      <Badge variant="secondary" className="rounded-full border border-orange-100 bg-white px-3 py-1 text-stone-600 shadow-sm">
                        <MapPin className="mr-1 h-3 w-3" />
                        {sameCityLocationOffText}
                      </Badge>
                  ) : null}
                </div>
              </Card>

              {currentPet.matchReasons && currentPet.matchReasons.length > 0 ? (
                  <Card className="rounded-[1.75rem] border-orange-100/80 bg-white/95 p-5 shadow-lg shadow-orange-900/5">
                    <div className="mb-3 text-sm font-semibold text-stone-700">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {currentPet.matchReasons.map((reason) => (
                          <Badge key={reason} variant="secondary" className="rounded-full border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 text-orange-700">
                            {reason}
                          </Badge>
                      ))}
                    </div>
                  </Card>
              ) : null}

              <Card className="rounded-[1.75rem] border-orange-100/80 bg-gradient-to-br from-white to-orange-50/80 p-5 shadow-lg shadow-orange-900/5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                    <Info className="h-4 w-4 text-orange-500" />
                  </span>
                  <span className="text-sm font-semibold text-orange-700">
                    {currentPet.is_ai ? t.match.roleIntro : t.match.aiAnalysis}
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">
                  {displayDescription}
                </p>
              </Card>
            </div>
          </div>
        </div>
    )
  }

  return (
      <>
        <div className="mx-auto flex max-w-md flex-col bg-gradient-to-b from-orange-50 via-stone-50 to-white px-5 py-4">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.12)]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">WePet Match</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-stone-900">{t.match.title}</h1>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-orange-100 bg-white/90 px-3.5 py-2 shadow-lg shadow-orange-900/5 backdrop-blur">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-bold text-orange-700">
              {isMember
                  ? t.match.memberUnlimited
                  : `${t.match.remainingLikes} ${remainingLikes} ${t.match.times}`}
            </span>
            </div>
          </div>

          {inlineNotice ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-700 shadow-sm">
                {inlineNotice}
              </div>
          ) : null}

          {pageError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-sm">
                {pageError}
              </div>
          ) : null}

          {loadingUsers ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-orange-100 bg-white/70 text-stone-500 shadow-lg shadow-orange-900/5">
                {t.match.loading}
              </div>
          ) : !currentPet ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-orange-100 bg-white/70 text-stone-500 shadow-lg shadow-orange-900/5">
                {t.match.noUsers}
              </div>
          ) : (
              <>
                <div className="relative overflow-visible">
                  <AnimatePresence mode="wait">
                    <motion.div
                        key={`${currentPet.id}-${currentIndex}`}
                        initial={{ x: direction * 300, opacity: 0, rotate: direction * 10 }}
                        animate={{ x: 0, opacity: 1, rotate: 0 }}
                        exit={{ x: swipeExitX, opacity: 0, rotate: direction * 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full"
                    >
                      <motion.div
                          className="cursor-grab active:cursor-grabbing"
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragMomentum={false}
                          style={{ x: dragX, rotate: dragRotate, touchAction: "pan-y" }}
                          onDragEnd={(_, info) => {
                            if (info.offset.x > 100) {
                              dragX.set(0)
                              handleLike()
                              return
                            }

                            if (info.offset.x < -100) {
                              dragX.set(0)
                              handleDislike()
                              return
                            }

                            animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 })
                          }}
                      >
                      <Card
                          onClick={() => setShowPetDetail(true)}
                          className="flex w-full cursor-pointer flex-col overflow-hidden rounded-[2.25rem] border border-white/80 bg-white shadow-2xl shadow-orange-900/12 ring-1 ring-orange-100/70"
                      >
                        <div className="relative m-3 h-[200px] shrink-0 overflow-hidden rounded-[1.8rem] bg-orange-100">
                          <img
                              src={imageSrc}
                              alt={displayName}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-pet.png"
                              }}
                          />

                          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                          {hasMatchScore ? (
                              <Badge className="absolute right-4 top-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-orange-600 shadow-lg backdrop-blur">
                                {matchScore}% {t.match.matchPercent}
                              </Badge>
                          ) : null}

                        </div>

<div className="px-5 py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <h2 className="min-w-0 truncate text-2xl font-black leading-tight tracking-tight text-stone-900">
                                {displayName}
                                {displayAgeText
                                    ? `, ${displayAgeText}${petGenderSymbol ? " " : ""}` : ""}
                                {petGenderSymbol ? (
                                    <span className={petGenderColor}>{petGenderSymbol}</span>
                                ) : null}
                              </h2>

                              <p className="min-w-0 truncate text-sm font-semibold leading-tight text-stone-500">{displayType}</p>
                            </div>

                            <div className="flex w-[138px] shrink-0 flex-col items-start gap-1.5">
                              {distanceDisplayText ? (
                                  <Badge
                                      variant="secondary"
                                      className={`inline-flex items-center gap-1 rounded-full border border-orange-100 bg-white px-2.5 py-1 text-xs font-semibold leading-none shadow-sm ${distanceClassName}`}
                                  >
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="leading-none">{distanceDisplayText}</span>
                                  </Badge>
                              ) : null}
                              {isSameCityLocationOff ? (
                                  <Badge
                                      variant="secondary"
                                      className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-white px-2.5 py-1 text-xs font-semibold leading-none text-stone-600 shadow-sm"
                                  >
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="leading-none">{sameCityLocationOffText}</span>
                                  </Badge>
                              ) : null}

                              <Badge
                                  variant="secondary"
                                  className="inline-flex items-center rounded-full border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1 text-xs font-bold leading-none text-orange-700 shadow-sm"
                              >
                                {t.match.similarPetAgeTag}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                </div>

<div className="mt-3 flex items-center justify-center gap-7 pb-2">
                  <Button
                      onClick={handleDislike}
                      size="icon"
                      className="h-16 w-16 rounded-full border border-rose-100 bg-white text-rose-400 shadow-xl shadow-rose-900/10 transition-all hover:-translate-y-1 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 hover:shadow-2xl"
                  >
                    <X className="h-7 w-7" />
                  </Button>

                  <Button
                      onClick={handleLike}
                      size="icon"
                      disabled={liking}
                      className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400 text-white shadow-2xl shadow-orange-500/30 transition-all hover:-translate-y-1 hover:scale-105 hover:shadow-orange-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Heart className="h-7 w-7 fill-current" />
                  </Button>
                </div>
              </>
          )}
        </div>

        {showMembershipModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-stone-900">
                    {t.match.membership.title}
                  </h2>
                  <button
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
      </>
  )
}
