import { useEffect, useState } from "react"
import { Stack } from "expo-router"
import { SplashScreen } from "@/components/SplashScreen"
import { LanguageProvider } from "@/lib/language-context"

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <LanguageProvider>
      {showSplash ? (
        <SplashScreen />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="match" />
          <Stack.Screen name="chat/index" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="doctor" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="profile" />
        </Stack>
      )}
    </LanguageProvider>
  )
}
