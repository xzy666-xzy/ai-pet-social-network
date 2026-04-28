"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Heart, Sparkles, Info } from "lucide-react"
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
  pet_age: number | null
  description: string | null
  avatar_url: string | null
  is_ai?: boolean | null
  created_at?: string | null
  matchScore?: number
  matchReasons?: string[]
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
  }
}

export default function MatchPage() {
  const { t } = useLanguage()
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
  const hasToken = Boolean(getAccessToken())

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

        const loadedUsers: MatchUser[] = Array.isArray(data.data.users) ? data.data.users : []
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

  const handleDislike = () => {
    if (!currentPet) return
    setInlineNotice("")
    setPageError("")
    handleSwipe(-1)
  }

  const handleCheckoutMembership = async () => {
    try {
      setCheckingOut(true)
      setMembershipError("")

      const res = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "monthly",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to activate membership")
      }

      setIsMember(true)
      setRemainingLikes(
          typeof data?.quota?.remainingLikes === "number" ? data.quota.remainingLikes : 9999
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
          targetUserId: currentPet.id,
        }),
      })

      if (typeof data.data.remainingLikes === "number") {
        setRemainingLikes(data.data.remainingLikes)
      } else {
        await loadLikeQuota()
      }

      if (data.data.alreadyLiked) {
        setInlineNotice(t.match.notices.alreadyLiked)
      } else if (data.data.isMutualMatch) {
        setInlineNotice(t.match.notices.mutualMatch)
      } else {
        setInlineNotice(t.match.notices.introOnly)
      }

      handleSwipe(1)
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

  const distanceList = ["1.2km", "0.5km", "0.8km", "1.5km", "2.1km", "0.9km", "1.8km", "2.4km"]
  const distance = distanceList[currentIndex % distanceList.length]

  const matchScore = currentPet?.matchScore ?? [98, 85, 92, 88, 95, 84, 90, 87][currentIndex % 8]

  const displayName =
      currentPet?.pet_name?.trim() ||
      currentPet?.username?.trim() ||
      "Unknown Pet"

  const displayAge =
      currentPet?.pet_age !== null && currentPet?.pet_age !== undefined
          ? `${currentPet.pet_age}${t.match.ageUnit}`
          : ""

  const displayType = currentPet?.pet_type?.trim() || t.match.unknownBreed

  const displayDescription =
      currentPet?.description?.trim() || t.match.noBio

  const displayUsername =
      currentPet?.username?.trim() || "user"

  const imageSrc =
      currentPet?.avatar_url && currentPet.avatar_url.trim() !== ""
          ? currentPet.avatar_url
          : "/placeholder-pet.png"

  return (
      <>
        <div className="p-4 max-w-md mx-auto h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-stone-800">{t.match.title}</h1>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700">
              {isMember
                  ? t.match.memberUnlimited
                  : `${t.match.remainingLikes} ${remainingLikes} ${t.match.times}`}
            </span>
            </div>
          </div>

          {inlineNotice ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {inlineNotice}
              </div>
          ) : null}

          {pageError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {pageError}
              </div>
          ) : null}

          {loadingUsers ? (
              <div className="flex-1 flex items-center justify-center text-stone-500">
                {t.match.loading}
              </div>
          ) : !currentPet ? (
              <div className="flex-1 flex items-center justify-center text-stone-500">
                {t.match.noUsers}
              </div>
          ) : (
              <>
                <div className="relative flex-1 min-h-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                        key={`${currentPet.id}-${currentIndex}`}
                        initial={{ x: direction * 300, opacity: 0, rotate: direction * 10 }}
                        animate={{ x: 0, opacity: 1, rotate: 0 }}
                        exit={{ x: direction * -300, opacity: 0, rotate: direction * -10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute inset-0"
                    >
                      <Card className="h-full overflow-hidden border-0 shadow-xl bg-white">
                        <div className="relative h-[55%]">
                          <img
                              src={imageSrc}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-pet.png"
                              }}
                          />

                          <div className="absolute top-4 right-4">
                            <Badge className="bg-white/90 text-stone-700 border-0 shadow-lg">
                              {matchScore}% {t.match.matchPercent}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-5 space-y-4">
                          <div>
                            <h2 className="text-2xl font-bold text-stone-800">
                              {displayName}
                              {displayAge ? `, ${displayAge}` : ""}
                            </h2>

                            <p className="text-stone-500 mt-1">
                              {displayType} • {distance}
                            </p>
                          </div>

                          {currentPet.matchReasons && currentPet.matchReasons.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {currentPet.matchReasons.map((reason) => (
                                    <Badge key={reason} variant="secondary" className="rounded-full">
                                      {reason}
                                    </Badge>
                                ))}
                              </div>
                          ) : null}

                          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Info className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-semibold text-orange-700">
                            {currentPet.is_ai ? t.match.roleIntro : t.match.aiAnalysis}
                          </span>
                            </div>

                            <p className="text-sm text-stone-700 leading-relaxed">
                              {displayDescription}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {displayType ? (
                                <Badge variant="secondary" className="rounded-full">
                                  {displayType}
                                </Badge>
                            ) : null}

                            {displayAge ? (
                                <Badge variant="secondary" className="rounded-full">
                                  {displayAge}
                                </Badge>
                            ) : null}

                            <Badge variant="secondary" className="rounded-full">
                              @{displayUsername}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-center gap-6 mt-6 pb-2">
                  <Button
                      onClick={handleDislike}
                      size="icon"
                      className="h-14 w-14 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-rose-500 hover:border-rose-200 shadow-sm hover:shadow-md transition-all"
                  >
                    <X className="h-6 w-6" />
                  </Button>

                  <Button
                      onClick={handleLike}
                      size="icon"
                      disabled={liking}
                      className="h-14 w-14 rounded-full bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Heart className="h-6 w-6" />
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

                <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
                  <div className="text-sm text-stone-600">{t.match.membership.monthlyPlan}</div>
                  <div className="mt-2 text-3xl font-bold text-stone-900">
                    ¥19.9
                    <span className="ml-1 text-sm font-normal text-stone-500">
                  {t.match.membership.duration}
                </span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-stone-700">
                    <div>• {t.match.membership.benefit1}</div>
                    <div>• {t.match.membership.benefit2}</div>
                    <div>• {t.match.membership.benefit3}</div>
                  </div>
                </div>

                {membershipError ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {membershipError}
                    </div>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button
                      variant="outline"
                      onClick={() => {
                        setShowMembershipModal(false)
                        setMembershipError("")
                      }}
                      className="rounded-full"
                  >
                    {t.match.membership.later}
                  </Button>
                  <Button
                      onClick={handleCheckoutMembership}
                      disabled={checkingOut}
                      className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                  >
                    {checkingOut
                        ? t.match.membership.processing
                        : t.match.membership.checkout}
                  </Button>
                </div>
              </div>
            </div>
        ) : null}
      </>
  )
}
