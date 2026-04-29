import { usePathname, useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

const tabs = [
  { label: "Match", href: "/match", icon: "M" },
  { label: "Chat", href: "/chat", icon: "C" },
  { label: "Doctor", href: "/doctor", icon: "D" },
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tab: {
    alignItems: "center",
    borderRadius: radii.lg,
    flex: 1,
    gap: 2,
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
  },
  tabIcon: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: "900",
  },
  tabText: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: "800",
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
})
