import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native"
import { Avatar } from "@/components/Avatar"
import { LanguageMenu } from "@/components/LanguageMenu"
import { useLanguage } from "@/lib/language-context"
import { colors, shadows } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

const wepetLogo = require("../../assets/apple-icon.png")

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
  const { language } = useLanguage()
  const brandSubtitle = language === "ko" ? "위펫" : "WePet"

  return (
    <View style={styles.header}>
      <View style={styles.headerGlow} />
      <View style={styles.brandMark}>
        <Image source={wepetLogo} style={styles.brandLogo} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>WePet</Text>
        <View style={styles.subtitleRow}>
          {online ? <View style={styles.onlineDot} /> : null}
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || brandSubtitle || title}
          </Text>
        </View>
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
    gap: spacing.sm,
    minHeight: 74,
    overflow: "hidden",
    paddingBottom: spacing.md,
    paddingHorizontal: 16,
    paddingTop: spacing.md,
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
    height: 44,
    justifyContent: "center",
    width: 44,
    ...shadows.card,
  },
  brandLogo: {
    height: 26,
    width: 26,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "900",
  },
  subtitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: 2,
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
