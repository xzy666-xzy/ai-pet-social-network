import type { PropsWithChildren } from "react"
import { ScrollView, StyleSheet } from "react-native"
import { AppHeader } from "@/components/AppHeader"
import { Screen } from "@/components/Screen"
import { MobileTabs } from "@/components/MobileTabs"
import { layout } from "@/theme/spacing"

type AppScaffoldProps = PropsWithChildren<{
  title: string
  subtitle?: string
}>

export function AppScaffold({ title, subtitle, children }: AppScaffoldProps) {
  return (
    <Screen>
      <AppHeader title={title} subtitle={subtitle} />
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      <MobileTabs />
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: layout.sectionGap,
    paddingHorizontal: layout.pagePadding,
    paddingTop: layout.sectionGap,
    paddingBottom: layout.sectionGap * 2,
  },
})
