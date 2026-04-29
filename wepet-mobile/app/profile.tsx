import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { AppScaffold } from "@/components/AppScaffold"
import { Avatar } from "@/components/Avatar"
import { Badge } from "@/components/Badge"
import { InfoCard } from "@/components/InfoCard"
import { PrimaryButton } from "@/components/PrimaryButton"
import { apiRequest } from "@/lib/api"
import { clearAccessToken } from "@/lib/auth"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type ProfileUser = {
  id: string
  email: string | null
  username: string | null
  pet_name: string | null
  pet_type: string | null
  pet_age: number | null
  description: string | null
  avatar_url: string | null
  created_at: string | null
}

type MeResponse = {
  success: true
  user: ProfileUser
}

type ProfileStats = {
  success: true
  data: {
    stats: {
      likesSent: number
      likesReceived: number
      conversations: number
    }
    membership?: {
      isActive: boolean
      planName: string | null
      expiresAt: string | null
      startedAt: string | null
    }
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null)
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError("")

        const [meData, statsData] = await Promise.all([
          apiRequest<MeResponse>("/auth/me", { auth: true }),
          apiRequest<ProfileStats>("/profile/stats", { auth: true }),
        ])

        setUser(meData.user)
        setStats(statsData.data.stats)

        if (statsData.data.membership) {
          setMembership(statsData.data.membership)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  async function logout() {
    await clearAccessToken()
    router.replace("/login")
  }

  const displayName =
    user?.username?.trim() || user?.pet_name?.trim() || user?.email?.split("@")[0] || "WePet User"
  const petName = user?.pet_name?.trim() || "No pet name yet"
  const petType = user?.pet_type?.trim() || "No pet type yet"
  const petAge =
    user?.pet_age !== null && user?.pet_age !== undefined ? `${user.pet_age} yrs` : "Age not set"
  const description = user?.description?.trim() || "No description yet. Add your pet profile info."

  return (
    <AppScaffold title="Profile" subtitle="Your pet profile and activity">
      <InfoCard warm style={styles.heroCard}>
        <Avatar uri={user?.avatar_url} label={displayName} size={64} />
        <View style={styles.heroText}>
          <Text style={styles.displayName} numberOfLines={1}>
            {loading ? "Loading profile..." : displayName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user?.email || "Email not available"}
          </Text>
        </View>
        <Badge tone={membership.isActive ? "warm" : "neutral"}>
          {membership.isActive ? "Member" : "Free"}
        </Badge>
      </InfoCard>

      {error ? (
        <InfoCard style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </InfoCard>
      ) : null}

      <InfoCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pet Profile</Text>
        <InfoRow label="Pet Name" value={petName} />
        <InfoRow label="Pet Type" value={petType} />
        <InfoRow label="Pet Age" value={petAge} />
        <InfoRow label="Description" value={description} multiline />
      </InfoCard>

      <InfoCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        <InfoRow label="Username" value={user?.username || "Not set"} />
        <InfoRow label="Email" value={user?.email || "Not available"} />
        <InfoRow label="Created At" value={formatDate(user?.created_at) || "Unknown"} />
      </InfoCard>

      <InfoCard style={styles.sectionCard}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Activity Stats</Text>
          <Badge tone="warm">Live</Badge>
        </View>
        <View style={styles.statsGrid}>
          <StatTile label="Likes Sent" value={stats.likesSent} />
          <StatTile label="Likes Received" value={stats.likesReceived} />
          <StatTile label="Conversations" value={stats.conversations} />
        </View>
      </InfoCard>

      <InfoCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Membership</Text>
        <InfoRow label="Status" value={membership.isActive ? "Active" : "Inactive"} />
        <InfoRow label="Plan" value={membership.planName || "No active plan"} />
        <InfoRow label="Started At" value={formatDate(membership.startedAt) || "Not started"} />
        <InfoRow label="Expires At" value={formatDate(membership.expiresAt) || "No expiry"} />
      </InfoCard>

      <PrimaryButton onPress={logout} style={styles.logoutButton}>
        Logout
      </PrimaryButton>
    </AppScaffold>
  )
}

function InfoRow({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]}>{value}</Text>
    </View>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function formatDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString()
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  email: {
    color: colors.textSubtle,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#fecaca",
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    gap: spacing.md,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  infoRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  infoLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  infoValueMultiline: {
    color: colors.textMuted,
    fontWeight: "500",
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statTile: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderWarm,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 92,
    justifyContent: "center",
    padding: spacing.md,
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: spacing.xs,
  },
  logoutButton: {
    backgroundColor: colors.text,
    shadowColor: colors.shadow,
  },
})
