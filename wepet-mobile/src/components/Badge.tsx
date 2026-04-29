import type { PropsWithChildren } from "react"
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type BadgeProps = PropsWithChildren<{
  tone?: "warm" | "dark" | "neutral"
  style?: StyleProp<ViewStyle>
}>

export function Badge({ children, tone = "neutral", style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[tone], style]}>
      <Text style={[styles.text, tone === "neutral" && styles.neutralText, tone === "dark" && styles.darkText]}>
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  warm: {
    backgroundColor: colors.primarySoft,
  },
  dark: {
    backgroundColor: colors.text,
  },
  neutral: {
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  darkText: {
    color: colors.white,
  },
  neutralText: {
    color: colors.textMuted,
  },
})
