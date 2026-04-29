import { StyleSheet, Text, View, type ImageSourcePropType } from "react-native"
import { Avatar } from "@/components/Avatar"
import { LanguageMenu } from "@/components/LanguageMenu"
import { colors, shadows } from "@/theme/colors"
import { layout, radii, spacing } from "@/theme/spacing"

type AppHeaderProps = {
  title: string
  subtitle?: string
  showAvatar?: boolean
  profileImage?: ImageSourcePropType
  profileLabel?: string
  online?: boolean
}

export function AppHeader({
  title,
  subtitle,
  showAvatar = true,
  profileImage,
  profileLabel = "WePet",
  online = false,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerGlow} />
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>WP</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.brand}>WePet</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <View style={styles.subtitleRow}>
            {online ? <View style={styles.onlineDot} /> : null}
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>
      <LanguageMenu />
      {showAvatar ? <Avatar source={profileImage} label={profileLabel} size={42} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderBottomColor: colors.borderWarm,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 104,
    overflow: "hidden",
    paddingBottom: spacing.lg,
    paddingHorizontal: layout.pagePadding,
    paddingTop: layout.headerPaddingTop + spacing.sm,
  },
  headerGlow: {
    backgroundColor: "rgba(254,243,199,0.45)",
    borderRadius: 90,
    height: 180,
    position: "absolute",
    right: -56,
    top: -48,
    width: 180,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: radii.full,
    height: 48,
    justifyContent: "center",
    width: 48,
    ...shadows.card,
  },
  brandMarkText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  title: {
    color: colors.white,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 1,
  },
  subtitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: 3,
  },
  onlineDot: {
    backgroundColor: "#22c55e",
    borderColor: colors.white,
    borderRadius: radii.full,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    flex: 1,
  },
})
