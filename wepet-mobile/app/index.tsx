import { useEffect } from "react"
import { router } from "expo-router"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Screen } from "@/components/Screen"
import { getAccessToken } from "@/lib/auth"

export default function IndexPage() {
  useEffect(() => {
    async function bootstrap() {
      const token = await getAccessToken()
      router.replace(token ? "/match" : "/login")
    }

    bootstrap()
  }, [])

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>WePet Mobile</Text>
        <ActivityIndicator color="#f97316" />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    color: "#1c1917",
    fontSize: 24,
    fontWeight: "700",
  },
})
