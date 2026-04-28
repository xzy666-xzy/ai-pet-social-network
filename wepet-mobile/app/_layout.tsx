import { Stack } from "expo-router"

export default function RootLayout() {
  return (
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
  )
}
