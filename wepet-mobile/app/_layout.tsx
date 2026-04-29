import { Stack } from "expo-router"
import { LanguageProvider } from "@/lib/language-context"

export default function RootLayout() {
  return (
    <LanguageProvider>
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
    </LanguageProvider>
  )
}
