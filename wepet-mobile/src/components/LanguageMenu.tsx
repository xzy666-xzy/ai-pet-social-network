import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useLanguage, type Language } from "@/lib/language-context"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

const options: Array<{ value: Language; label: string }> = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
]

export function LanguageMenu() {
  const { language, languageLabel, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.button} onPress={() => setOpen((value) => !value)}>
        <Text style={styles.buttonText}>{languageLabel}</Text>
      </Pressable>

      {open ? (
        <View style={styles.menu}>
          {options.map((option) => {
            const active = option.value === language

            return (
              <Pressable
                key={option.value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  setLanguage(option.value)
                  setOpen(false)
                }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 20,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    justifyContent: "center",
    minWidth: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  buttonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  menu: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    minWidth: 116,
    padding: spacing.xs,
    position: "absolute",
    right: 0,
    top: 38,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  option: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionActive: {
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  optionTextActive: {
    color: colors.primaryDark,
  },
})

