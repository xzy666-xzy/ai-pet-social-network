import { useEffect, useRef } from "react"
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native"
import { colors, shadows } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

const wepetLogo = require("../../assets/wetpet商标.png")

export function SplashScreen() {
  const dotScales = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current

  useEffect(() => {
    const animations = dotScales.map((value, index) =>
      Animated.sequence([
        Animated.delay(index * 160),
        Animated.timing(value, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 320,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    )

    const loop = Animated.loop(Animated.stagger(80, animations))
    loop.start()

    return () => loop.stop()
  }, [dotScales])

  return (
    <View style={styles.root}>
      <View style={styles.logo}>
        <Image source={wepetLogo} style={styles.logoImage} />
      </View>

      <Text style={styles.name}>WePet</Text>
      <Text style={styles.subtitle}>AI Pet Social Network</Text>

      <View style={styles.dots}>
        {dotScales.map((value, index) => {
          const opacity = value.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
          })
          const scale = value.interpolate({
            inputRange: [0, 1],
            outputRange: [0.82, 1.28],
          })

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity,
                  transform: [{ scale }],
                },
              ]}
            />
          )
        })}
      </View>
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
  logo: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.32)",
    borderRadius: 24,
    borderWidth: 1,
    height: 86,
    justifyContent: "center",
    width: 86,
    ...shadows.raised,
  },
  logoImage: {
    height: 58,
    width: 58,
  },
  name: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "900",
    marginTop: spacing.xl,
  },
  subtitle: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  dots: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing["2xl"],
  },
  dot: {
    backgroundColor: colors.white,
    borderRadius: radii.full,
    height: 8,
    width: 8,
  },
})
