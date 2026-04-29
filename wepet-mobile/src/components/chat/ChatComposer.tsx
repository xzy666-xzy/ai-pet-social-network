import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type ChatComposerProps = {
  value: string
  onChangeText: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder = "Type a message",
}: ChatComposerProps) {
  const canSend = value.trim().length > 0 && !disabled

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        editable={!disabled}
      />
      <Pressable
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!canSend}
      >
        <Text style={[styles.sendText, !canSend && styles.sendTextDisabled]}>Send</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    height: 42,
    justifyContent: "center",
    minWidth: 42,
    paddingHorizontal: spacing.md,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  sendTextDisabled: {
    color: colors.textSubtle,
  },
})

