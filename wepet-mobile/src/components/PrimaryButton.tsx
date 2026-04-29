import type { PropsWithChildren } from "react"
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native"
import { colors, shadows } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type PrimaryButtonProps = PropsWithChildren<{
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}>

export function PrimaryButton({ children, onPress, disabled = false, loading = false, style }: PrimaryButtonProps) {
  const inactive = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, inactive && styles.textDisabled]}>
        {loading ? "Loading..." : children}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.card,
    shadowColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
  },
  text: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  textDisabled: {
    color: colors.textSubtle,
  },
})
