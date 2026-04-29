import { useEffect, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { Avatar } from "@/components/Avatar"
import { Badge } from "@/components/Badge"
import { InfoCard } from "@/components/InfoCard"
import { PrimaryButton } from "@/components/PrimaryButton"
import { ScreenState } from "@/components/ScreenState"
import { apiRequest } from "@/lib/api"
import { useLanguage, type Language } from "@/lib/language-context"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type MatchUser = {
  id: string
  pet_name: string | null
  username: string | null
  pet_type: string | null
  pet_age?: number | null
  description: string | null
  avatar_url?: string | null
  matchScore?: number
}

type LikeQuotaData = {
  remaining?: number | null
  remainingLikes?: number | null
  isMember?: boolean | null
  unlocked?: boolean | null
}

const copy: Record<
  Language,
  {
    title: string
    subtitle: string
    discover: string
    nearby: string
    analysis: string
    upNext: string
    like: string
    likes: string
    noUsersTitle: string
    noUsersMessage: string
    loadError: string
    likeError: string
    upgradeTitle: string
    upgradeDesc: string
    upgrade: string
    later: string
    upgrading: string
  }
> = {
  en: {
    title: "Match",
    subtitle: "Find nearby pet friends",
    discover: "Discover",
    nearby: "Pet friends nearby",
    analysis: "AI Analysis",
    upNext: "Up next",
    like: "Like",
    likes: "likes",
    noUsersTitle: "No recommendations yet",
    noUsersMessage: "Check back later for more pet friends.",
    loadError: "Failed to load match data",
    likeError: "Failed to like this pet",
    upgradeTitle: "Upgrade to Premium",
    upgradeDesc: "Get unlimited likes and more matches",
    upgrade: "Upgrade",
    later: "Maybe later",
    upgrading: "Upgrading...",
  },
  zh: {
    title: "匹配",
    subtitle: "寻找附近宠物朋友",
    discover: "发现",
    nearby: "附近的宠物朋友",
    analysis: "AI 分析",
    upNext: "下一个",
    like: "喜欢",
    likes: "次喜欢",
    noUsersTitle: "暂无推荐",
    noUsersMessage: "稍后再来看看新的宠物朋友。",
    loadError: "加载匹配数据失败",
    likeError: "喜欢失败，请稍后再试",
    upgradeTitle: "升级会员",
    upgradeDesc: "解锁更多喜欢次数和匹配机会",
    upgrade: "升级",
    later: "稍后再说",
    upgrading: "升级中...",
  },
  ko: {
    title: "매칭",
    subtitle: "근처 반려동물 친구 찾기",
    discover: "발견",
    nearby: "주변 반려동물 친구",
    analysis: "AI 분석",
    upNext: "다음 추천",
    like: "좋아요",
    likes: "좋아요",
    noUsersTitle: "아직 추천이 없어요",
    noUsersMessage: "잠시 후 새로운 반려동물 친구를 확인해 주세요.",
    loadError: "매칭 데이터를 불러오지 못했습니다",
    likeError: "좋아요에 실패했습니다",
    upgradeTitle: "프리미엄 업그레이드",
    upgradeDesc: "더 많은 좋아요와 매칭 기회를 이용하세요",
    upgrade: "업그레이드",
    later: "나중에",
    upgrading: "업그레이드 중...",
  },
}

export default function MatchPage() {
  const { language } = useLanguage()
  const t = copy[language]

  const [users, setUsers] = useState<MatchUser[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [remaining, setRemaining] = useState<number>(3)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [membershipError, setMembershipError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        setError("")
        await Promise.all([loadRecommend(), loadLikeQuota()])
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.en.loadError)
      }
    }

    load()
  }, [])

  async function loadRecommend() {
    const recommend = await apiRequest<{ success: true; data: { users: MatchUser[] } }>("/match/recommend", {
      auth: true,
    })

    setUsers(Array.isArray(recommend.data.users) ? recommend.data.users : [])
    setCurrentIndex(0)
  }

  async function loadLikeQuota() {
    const quota = await apiRequest<{ success: true; data: LikeQuotaData }>("/match/likes/today", {
      auth: true,
    })

    setRemaining(readRemainingLikes(quota.data))
  }

  async function handleSkip() {
    if (!currentPet || actionLoading) return
    setError("")
    setCurrentIndex((value) => value + 1)
  }

  async function handleLike() {
    if (!currentPet || actionLoading) return

    if (remaining <= 0) {
      setMembershipError("")
      setShowMembershipModal(true)
      return
    }

    try {
      setActionLoading(true)
      setError("")

      await apiRequest("/match/like", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          targetUserId: currentPet.id,
        }),
      })

      await Promise.all([loadRecommend(), loadLikeQuota()])
    } catch (err) {
      setError(err instanceof Error ? err.message : t.likeError)
      await loadLikeQuota().catch(() => {})
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUpgrade() {
    try {
      setMembershipLoading(true)
      setMembershipError("")

      await apiRequest("/membership/checkout", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          plan: "monthly",
        }),
      })

      setShowMembershipModal(false)
      await loadLikeQuota()
    } catch (err) {
      setMembershipError(err instanceof Error ? err.message : "Upgrade failed")
    } finally {
      setMembershipLoading(false)
    }
  }

  const currentPet = users[currentIndex] ?? null
  const displayName = currentPet?.pet_name || currentPet?.username || "Unknown Pet"
  const displayType = currentPet?.pet_type || "Unknown Type"
  const displayAge =
    currentPet?.pet_age !== null && currentPet?.pet_age !== undefined ? `${currentPet.pet_age} yrs` : ""
  const displayDescription = currentPet?.description || "No description yet."
  const matchScore = currentPet?.matchScore ?? 92

  return (
    <>
      <AppScaffold title={t.title} subtitle={t.subtitle}>
        <View style={styles.topRow}>
          <View style={styles.topCopy}>
            <Text style={styles.eyebrow}>{t.discover}</Text>
            <Text style={styles.pageTitle} numberOfLines={1}>
              {t.nearby}
            </Text>
          </View>
          <Badge tone="warm">
            {remaining} {t.likes}
          </Badge>
        </View>

        {error ? (
          <InfoCard style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </InfoCard>
        ) : null}

        {currentPet ? (
          <InfoCard style={styles.matchCard}>
            <View style={styles.photoArea}>
              <Avatar uri={currentPet.avatar_url} label={displayName} size={112} />
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{matchScore}% Match</Text>
              </View>
            </View>

            <View style={styles.profileBlock}>
              <Text style={styles.name}>
                {displayName}
                {displayAge ? `, ${displayAge}` : ""}
              </Text>
              <Text style={styles.meta}>{displayType} - 1.2km</Text>
            </View>

            <InfoCard warm style={styles.analysisCard}>
              <Text style={styles.analysisLabel}>{t.analysis}</Text>
              <Text style={styles.desc}>{displayDescription}</Text>
            </InfoCard>

            <View style={styles.badgeRow}>
              <Badge>{displayType}</Badge>
              {displayAge ? <Badge>{displayAge}</Badge> : null}
              <Badge>@{currentPet.username || "user"}</Badge>
            </View>
          </InfoCard>
        ) : (
          <ScreenState title={t.noUsersTitle} message={t.noUsersMessage} />
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.circleButton, styles.passButton, actionLoading && styles.disabledButton]}
            onPress={handleSkip}
            disabled={actionLoading || !currentPet}
            hitSlop={12}
          >
            <Text style={[styles.passText, actionLoading && styles.disabledText]}>X</Text>
          </Pressable>
          <Pressable
            style={[styles.circleButton, styles.likeButton, actionLoading && styles.disabledButton]}
            onPress={handleLike}
            disabled={actionLoading || !currentPet}
            hitSlop={12}
          >
            <Text style={[styles.likeText, actionLoading && styles.disabledText]}>
              {actionLoading ? "..." : t.like}
            </Text>
          </Pressable>
        </View>

        {users.length > currentIndex + 1 ? (
          <InfoCard style={styles.queueCard}>
            <Text style={styles.queueTitle}>{t.upNext}</Text>
            {users.slice(currentIndex + 1, currentIndex + 4).map((user) => (
              <View key={user.id} style={styles.queueItem}>
                <Avatar uri={user.avatar_url} label={user.pet_name || user.username} size={38} />
                <View style={styles.queueText}>
                  <Text style={styles.queueName}>{user.pet_name || user.username || "Unknown Pet"}</Text>
                  <Text style={styles.queueMeta}>{user.pet_type || "Unknown Type"}</Text>
                </View>
              </View>
            ))}
          </InfoCard>
        ) : null}

        <PrimaryButton disabled={!currentPet || actionLoading} loading={actionLoading} onPress={handleLike}>
          {t.like}
        </PrimaryButton>
      </AppScaffold>

      <Modal transparent visible={showMembershipModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <InfoCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.upgradeTitle}</Text>
            <Text style={styles.modalDesc}>{t.upgradeDesc}</Text>

            {membershipError ? (
              <View style={styles.membershipError}>
                <Text style={styles.errorText}>{membershipError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowMembershipModal(false)
                  setMembershipError("")
                }}
                disabled={membershipLoading}
              >
                <Text style={styles.modalSecondaryText}>{t.later}</Text>
              </Pressable>
              <PrimaryButton onPress={handleUpgrade} disabled={membershipLoading} style={styles.modalPrimaryButton}>
                {membershipLoading ? t.upgrading : t.upgrade}
              </PrimaryButton>
            </View>
          </InfoCard>
        </View>
      </Modal>
    </>
  )
}

function readRemainingLikes(data: LikeQuotaData) {
  const value =
    typeof data.remaining === "number"
      ? data.remaining
      : typeof data.remainingLikes === "number"
        ? data.remainingLikes
        : 3

  if (data.isMember || data.unlocked) return value
  if (value > 3) return 3
  return value
}

const styles = StyleSheet.create({
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  pageTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  matchCard: {
    gap: spacing.lg,
    padding: 0,
    overflow: "hidden",
  },
  photoArea: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    minHeight: 220,
    justifyContent: "center",
  },
  scorePill: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
  },
  scoreText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  profileBlock: {
    paddingHorizontal: spacing.lg,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  meta: {
    color: colors.textSubtle,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  analysisCard: {
    marginHorizontal: spacing.lg,
    shadowOpacity: 0,
  },
  analysisLabel: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#fecaca",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing["2xl"],
    justifyContent: "center",
  },
  circleButton: {
    alignItems: "center",
    borderRadius: radii.full,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  passButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  likeButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    shadowOpacity: 0,
  },
  passText: {
    color: colors.textSubtle,
    fontSize: 18,
    fontWeight: "800",
  },
  likeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  disabledText: {
    color: colors.textSubtle,
  },
  queueCard: {
    gap: spacing.md,
  },
  queueTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  queueItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  queueText: {
    flex: 1,
  },
  queueName: {
    color: colors.text,
    fontWeight: "700",
  },
  queueMeta: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    gap: spacing.md,
    width: "100%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  modalDesc: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  membershipError: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#fecaca",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalSecondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  modalSecondaryText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  modalPrimaryButton: {
    flex: 1,
  },
})
