import type { PropsWithChildren } from "react"
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type PrimaryButtonProps = PropsWithChildren<{
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle | ViewStyle[]
}>

export function PrimaryButton({ children, onPress, disabled = false, style }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
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
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 2,
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

