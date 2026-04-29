import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { Avatar } from "@/components/Avatar"
import { Badge } from "@/components/Badge"
import { InfoCard } from "@/components/InfoCard"
import { PrimaryButton } from "@/components/PrimaryButton"
import { ScreenState } from "@/components/ScreenState"
import { apiRequest } from "@/lib/api"
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

export default function MatchPage() {
  const [users, setUsers] = useState<MatchUser[]>([])
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const recommend = await apiRequest<{ success: true; data: { users: MatchUser[] } }>("/match/recommend", {
          auth: true,
        })
        const quota = await apiRequest<{ success: true; data: { remaining: number; remainingLikes: number } }>(
          "/match/likes/today",
          { auth: true }
        )

        setUsers(recommend.data.users)
        setRemaining(quota.data.remaining ?? quota.data.remainingLikes)
      } catch {}
    }

    load()
  }, [])

  const currentPet = users[0] ?? null
  const displayName = currentPet?.pet_name || currentPet?.username || "Unknown Pet"
  const displayType = currentPet?.pet_type || "Unknown Type"
  const displayAge =
    currentPet?.pet_age !== null && currentPet?.pet_age !== undefined ? `${currentPet.pet_age} yrs` : ""
  const displayDescription = currentPet?.description || "No description yet."
  const matchScore = currentPet?.matchScore ?? 92

  return (
    <AppScaffold title="Match" subtitle="Find nearby pet friends">
      <View style={styles.topRow}>
        <View>
          <Text style={styles.eyebrow}>Discover</Text>
          <Text style={styles.pageTitle}>Pet friends nearby</Text>
        </View>
        <Badge tone="warm">{remaining ?? "-"} likes</Badge>
      </View>

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
            <Text style={styles.analysisLabel}>AI Analysis</Text>
            <Text style={styles.desc}>{displayDescription}</Text>
          </InfoCard>

          <View style={styles.badgeRow}>
            <Badge>{displayType}</Badge>
            {displayAge ? <Badge>{displayAge}</Badge> : null}
            <Badge>@{currentPet.username || "user"}</Badge>
          </View>
        </InfoCard>
      ) : (
        <ScreenState
          title="No recommendations yet"
          message="Check back later for more pet friends."
        />
      )}

      <View style={styles.actionRow}>
        <Pressable style={[styles.circleButton, styles.passButton]}>
          <Text style={styles.passText}>X</Text>
        </Pressable>
        <Pressable style={[styles.circleButton, styles.likeButton]}>
          <Text style={styles.likeText}>Heart</Text>
        </Pressable>
      </View>

      {users.length > 1 ? (
        <InfoCard style={styles.queueCard}>
          <Text style={styles.queueTitle}>Up next</Text>
          {users.slice(1, 4).map((user) => (
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

      <PrimaryButton disabled={!currentPet}>Like</PrimaryButton>
    </AppScaffold>
  )
}

const styles = StyleSheet.create({
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
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
  passText: {
    color: colors.textSubtle,
    fontSize: 18,
    fontWeight: "800",
  },
  likeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
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
})
