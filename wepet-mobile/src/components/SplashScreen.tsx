import { useEffect, useRef } from "react"
import { Animated, Easing, StyleSheet, Text, View } from "react-native"
import { colors, shadows } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

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
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.logoWrap}>
        <View style={styles.logo}>
          <Text style={styles.paw}>🐾</Text>
        </View>
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
  topGlow: {
    backgroundColor: "rgba(254,243,199,0.55)",
    borderRadius: 180,
    height: 360,
    position: "absolute",
    right: -110,
    top: -90,
    width: 360,
  },
  bottomGlow: {
    backgroundColor: "rgba(251,191,36,0.42)",
    borderRadius: 180,
    bottom: -120,
    height: 360,
    left: -120,
    position: "absolute",
    width: 360,
  },
  logoWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 30,
    height: 104,
    justifyContent: "center",
    width: 104,
  },
  logo: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.32)",
    borderRadius: 24,
    borderWidth: 1,
    height: 80,
    justifyContent: "center",
    width: 80,
    ...shadows.raised,
  },
  paw: {
    color: colors.white,
    fontSize: 36,
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
