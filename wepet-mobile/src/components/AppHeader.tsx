import { Pressable, StyleSheet, Text, View } from "react-native"
import { Avatar } from "@/components/Avatar"
import { useLanguage } from "@/lib/language-context"
import { colors } from "@/theme/colors"
import { layout, radii, spacing } from "@/theme/spacing"

type AppHeaderProps = {
  title: string
  subtitle?: string
  showAvatar?: boolean
}

export function AppHeader({ title, subtitle, showAvatar = true }: AppHeaderProps) {
  const { languageLabel, cycleLanguage } = useLanguage()

  return (
    <View style={styles.header}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>W</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.brand}>WePet</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable style={styles.languageButton} onPress={cycleLanguage}>
        <Text style={styles.languageText}>{languageLabel}</Text>
      </Pressable>
      {showAvatar ? <Avatar label="WePet" size={40} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: layout.headerPaddingBottom,
    paddingHorizontal: layout.pagePadding,
    paddingTop: layout.headerPaddingTop,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  brandMarkText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 1,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 13,
    marginTop: 3,
  },
  languageButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    justifyContent: "center",
    minWidth: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  languageText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
})

