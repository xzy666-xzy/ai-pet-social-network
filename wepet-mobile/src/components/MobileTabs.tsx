import { usePathname, useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

const tabs = [
  { label: "Match", href: "/match", icon: "M" },
  { label: "Chat", href: "/chat", icon: "C" },
  { label: "AI Pet Doctor", href: "/doctor", icon: "AI" },
  { label: "Explore", href: "/explore", icon: "E" },
  { label: "Profile", href: "/profile", icon: "P" },
]

export function MobileTabs() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <View style={styles.wrapper}>
      {tabs.map((tab) => {
        const active =
          pathname === tab.href || (tab.href === "/chat" && pathname.startsWith("/chat"))

        return (
          <Pressable
            key={tab.href}
            onPress={() => router.push(tab.href as never)}
            style={[styles.tab, active ? styles.tabActive : undefined]}
          >
            <Text style={[styles.tabIcon, active ? styles.tabTextActive : undefined]}>{tab.icon}</Text>
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  tab: {
    alignItems: "center",
    borderRadius: radii.full,
    flex: 1,
    gap: 2,
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
  },
  tabIcon: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: "900",
  },
  tabText: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.primary,
  },
})
