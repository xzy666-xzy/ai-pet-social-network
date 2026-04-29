export const colors = {
  background: "#fafaf9",
  backgroundWarm: "#fff7ed",
  surface: "#ffffff",
  surfaceMuted: "#f5f5f4",
  surfaceWarm: "#fff7ed",
  primary: "#f97316",
  primaryDark: "#ea580c",
  primarySoft: "#ffedd5",
  amberSoft: "#fef3c7",
  text: "#1c1917",
  textMuted: "#57534e",
  textSubtle: "#78716c",
  border: "#e7e5e4",
  borderWarm: "#fed7aa",
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  success: "#22c55e",
  successSoft: "#dcfce7",
  shadow: "#000000",
  white: "#ffffff",
} as const

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  raised: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
} as const
