import { usePathname, useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useLanguage, type Language } from "@/lib/language-context"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

const tabs: Array<{
  href: string
  icon: string
  label: Record<Language, string>
}> = [
  { href: "/match", icon: "M", label: { en: "Match", zh: "匹配", ko: "매칭" } },
  { href: "/chat", icon: "C", label: { en: "Chat", zh: "聊天", ko: "채팅" } },
  { href: "/doctor", icon: "AI", label: { en: "AI Doctor", zh: "AI医生", ko: "AI의사" } },
  { href: "/explore", icon: "E", label: { en: "Explore", zh: "探索", ko: "탐색" } },
  { href: "/profile", icon: "P", label: { en: "Profile", zh: "个人资料", ko: "프로필" } },
]

export function MobileTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const { language } = useLanguage()

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
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {tab.label[language]}
            </Text>
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
    paddingBottom: spacing.sm,
    minHeight: 72,
  },
  tab: {
    alignItems: "center",
    borderRadius: radii.full,
    flex: 1,
    gap: 2,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
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
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.primary,
  },
})
