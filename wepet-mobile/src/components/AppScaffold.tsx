import type { PropsWithChildren } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Screen } from "@/components/Screen"
import { MobileTabs } from "@/components/MobileTabs"

type AppScaffoldProps = PropsWithChildren<{
  title: string
}>

export function AppScaffold({ title, children }: AppScaffoldProps) {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      <MobileTabs />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    color: "#1c1917",
    fontSize: 28,
    fontWeight: "700",
  },
  content: {
    flexGrow: 1,
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
})
