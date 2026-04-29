import type { PropsWithChildren } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { colors, shadows } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type InfoCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>
  warm?: boolean
}>

export function InfoCard({ children, style, warm = false }: InfoCardProps) {
  return <View style={[styles.card, warm && styles.warm, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.card,
  },
  warm: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderWarm,
  },
})
