import { StyleSheet, Text, View } from "react-native"
import { colors, shadows } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

export function SplashScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.glow} />
      <View style={styles.logo}>
        <Text style={styles.logoText}>WP</Text>
      </View>
      <Text style={styles.name}>WePet</Text>
      <Text style={styles.subtitle}>Pet friends nearby</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    backgroundColor: colors.primary,
    flex: 1,
    justifyContent: "center",
    padding: spacing["2xl"],
  },
  glow: {
    backgroundColor: "rgba(254,243,199,0.45)",
    borderRadius: 140,
    height: 280,
    position: "absolute",
    right: -80,
    top: -40,
    width: 280,
  },
  logo: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.full,
    height: 96,
    justifyContent: "center",
    width: 96,
    ...shadows.raised,
  },
  logoText: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: "900",
  },
  name: {
    color: colors.white,
    fontSize: 38,
    fontWeight: "900",
    marginTop: spacing.lg,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
})
