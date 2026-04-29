import type { PropsWithChildren } from "react"
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type OutlineButtonProps = PropsWithChildren<{
  onPress?: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}>

export function OutlineButton({ children, onPress, disabled = false, style }: OutlineButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        style,
      ]}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>{children}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  textDisabled: {
    color: colors.textSubtle,
  },
})

