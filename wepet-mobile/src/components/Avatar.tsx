import { Image, StyleSheet, Text, View } from "react-native"
import { colors } from "@/theme/colors"

type AvatarProps = {
  uri?: string | null
  label?: string | null
  size?: number
}

export function Avatar({ uri, label, size = 48 }: AvatarProps) {
  const initial = label?.trim()?.charAt(0)?.toUpperCase() || "W"
  const dimension = { height: size, width: size, borderRadius: size / 2 }

  if (uri) {
    return <Image source={{ uri }} style={[styles.avatarBase, styles.image, dimension]} />
  }

  return (
    <View style={[styles.avatarBase, styles.fallback, dimension]}>
      <Text style={[styles.initial, { fontSize: Math.max(14, size * 0.36) }]}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatarBase: {
    borderColor: colors.white,
    borderWidth: 2,
  },
  image: {
    backgroundColor: colors.border,
  },
  fallback: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    justifyContent: "center",
  },
  initial: {
    color: colors.white,
    fontWeight: "800",
  },
})
