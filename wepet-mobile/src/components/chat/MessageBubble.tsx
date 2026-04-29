import { StyleSheet, Text, View } from "react-native"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type MessageBubbleProps = {
  content: string
  time: string
  isMe: boolean
}

export function MessageBubble({ content, time, isMe }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowOther]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.content, isMe && styles.contentMe]}>{content}</Text>
        <Text style={[styles.time, isMe && styles.timeMe]}>{time}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rowMe: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    borderBottomRightRadius: radii.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderBottomLeftRadius: radii.sm,
    borderWidth: 1,
  },
  content: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  contentMe: {
    color: colors.white,
  },
  time: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  timeMe: {
    color: colors.primarySoft,
  },
})

