import { StyleSheet, Text } from "react-native"
import { InfoCard } from "@/components/InfoCard"
import { colors } from "@/theme/colors"
import { spacing } from "@/theme/spacing"

type ScreenStateProps = {
  title: string
  message?: string
  tone?: "default" | "error"
}

export function ScreenState({ title, message, tone = "default" }: ScreenStateProps) {
  return (
    <InfoCard style={[styles.card, tone === "error" && styles.errorCard]}>
      <Text style={[styles.title, tone === "error" && styles.errorTitle]}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </InfoCard>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing["3xl"],
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#fecaca",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  errorTitle: {
    color: colors.danger,
  },
  message: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
})

