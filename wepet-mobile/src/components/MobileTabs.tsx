import { usePathname, useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"

const tabs = [
  { label: "Match", href: "/match" },
  { label: "Chat", href: "/chat" },
  { label: "Doctor", href: "/doctor" },
  { label: "Explore", href: "/explore" },
  { label: "Profile", href: "/profile" },
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
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#fed7aa",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: "#f97316",
  },
  tabText: {
    color: "#57534e",
    fontSize: 12,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
  },
})
