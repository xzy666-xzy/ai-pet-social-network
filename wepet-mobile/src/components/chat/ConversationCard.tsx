import { Pressable, StyleSheet, Text, View } from "react-native"
import { Avatar } from "@/components/Avatar"
import { Badge } from "@/components/Badge"
import { InfoCard } from "@/components/InfoCard"
import { colors } from "@/theme/colors"
import { spacing } from "@/theme/spacing"

type ConversationCardProps = {
  title: string
  message: string
  time?: string
  avatarUrl?: string | null
  status: string
  onPress: () => void
}

export function ConversationCard({
  title,
  message,
  time,
  avatarUrl,
  status,
  onPress,
}: ConversationCardProps) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <InfoCard style={[styles.card, pressed ? styles.pressed : undefined]}>
          <Avatar uri={avatarUrl} label={title} size={52} />
          <View style={styles.body}>
            <View style={styles.topRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {time ? <Text style={styles.time}>{time}</Text> : null}
            </View>
            <View style={styles.statusRow}>
              <Badge tone="warm" style={styles.badge}>
                {status}
              </Badge>
            </View>
            <Text style={styles.message} numberOfLines={1}>
              {message}
            </Text>
          </View>
        </InfoCard>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  time: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  statusRow: {
    marginTop: 5,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 7,
  },
})
