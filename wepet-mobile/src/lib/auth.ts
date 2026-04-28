import AsyncStorage from "@react-native-async-storage/async-storage"

const ACCESS_TOKEN_KEY = "wepet_access_token"

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY)
}

export async function setAccessToken(token: string) {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export async function clearAccessToken() {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY)
}
