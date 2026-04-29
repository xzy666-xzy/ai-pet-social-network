import { useEffect, useMemo, useState } from "react"
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppScaffold } from "@/components/AppScaffold"
import { Badge } from "@/components/Badge"
import { InfoCard } from "@/components/InfoCard"
import { PrimaryButton } from "@/components/PrimaryButton"
import { ScreenState } from "@/components/ScreenState"
import { apiRequest } from "@/lib/api"
import { colors } from "@/theme/colors"
import { radii, spacing } from "@/theme/spacing"

type MeResponse = {
  success: true
  user: {
    id: string
    username: string | null
  }
}

type EventItem = {
  id: number
  title: string
  address: string
  time: string
  joined: number
  desc: string
  lat?: number
  lng?: number
}

const events: EventItem[] = [
  {
    id: 1,
    title: "Weekend Dog Park Meetup",
    address: "Ansan Central Park",
    time: "Sat 3:00 PM",
    joined: 12,
    desc: "A casual weekend meetup for walking, socializing, and meeting nearby pet friends.",
    lat: 37.3212,
    lng: 126.8309,
  },
  {
    id: 2,
    title: "Pet Cafe Social Day",
    address: "Gojan-dong Pet Street",
    time: "Sun 2:00 PM",
    joined: 8,
    desc: "A relaxed cafe meetup for pet owners and pets meeting for the first time.",
    lat: 37.3186,
    lng: 126.8348,
  },
  {
    id: 3,
    title: "Evening Walking Group",
    address: "Lake Park Plaza",
    time: "Fri 7:30 PM",
    joined: 6,
    desc: "An easy after-work walking group to help pets release energy.",
    lat: 37.3159,
    lng: 126.8322,
  },
]

function formatLocationPreview(event: EventItem) {
  if (Number.isFinite(event.lat) && Number.isFinite(event.lng)) {
    return `${event.lat?.toFixed(4)}, ${event.lng?.toFixed(4)}`
  }

  return "Open map search"
}

export default function ExplorePage() {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<number>(events[0].id)
  const [joinedMap, setJoinedMap] = useState<Record<number, boolean>>({})
  const [detailId, setDetailId] = useState<number | null>(null)
  const [status, setStatus] = useState("Loading...")
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        setError("")
        const data = await apiRequest<MeResponse>("/auth/me", { auth: true })
        setStatus(`Connected as ${data.user?.username || data.user?.id || "user"}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed"
        setStatus("Offline fallback")
        setError(message)
      }
    }

    load()
  }, [])

  const filteredEvents = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return events

    return events.filter((item) => {
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.address.toLowerCase().includes(keyword) ||
        item.time.toLowerCase().includes(keyword) ||
        item.desc.toLowerCase().includes(keyword)
      )
    })
  }, [query])

  const selectedEvent = filteredEvents.find((item) => item.id === selectedId) ?? filteredEvents[0]
  const detailEvent = filteredEvents.find((item) => item.id === detailId) ?? null

  function handleJoin(id: number) {
    setJoinedMap((prev) => ({ ...prev, [id]: true }))
  }

  async function handleLocate(event: EventItem) {
    setSelectedId(event.id)

    const hasCoordinates = Number.isFinite(event.lat) && Number.isFinite(event.lng)
    const query = hasCoordinates
      ? `${event.lat},${event.lng}`
      : encodeURIComponent(event.address || event.title)
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`

    try {
      setError("")
      await Linking.openURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open map.")
    }
  }

  if (detailEvent) {
    const joined = joinedMap[detailEvent.id]

    return (
      <AppScaffold title="Explore">
        <Pressable onPress={() => setDetailId(null)}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <InfoCard style={styles.detailCard}>
          <View style={styles.detailImage}>
            <Text style={styles.detailImageText}>EVENT</Text>
          </View>

          <Badge tone="warm">EVENT</Badge>
          <Text style={styles.detailTitle}>{detailEvent.title}</Text>
          <Text style={styles.detailMeta}>{detailEvent.address}</Text>
          <Text style={styles.detailMeta}>{detailEvent.time}</Text>
          <Text style={styles.detailDesc}>{detailEvent.desc}</Text>

          <InfoCard style={styles.joinedBox}>
            <Text style={styles.joinedText}>{detailEvent.joined} joined</Text>
          </InfoCard>

          <View style={styles.buttonRow}>
            <PrimaryButton onPress={() => handleJoin(detailEvent.id)} style={styles.flexButton}>
              {joined ? "Joined" : "Join"}
            </PrimaryButton>
            <Pressable
              style={styles.outlineButton}
              onPress={() => handleLocate(detailEvent)}
            >
              <Text style={styles.outlineButtonText}>Locate</Text>
            </Pressable>
          </View>
        </InfoCard>
      </AppScaffold>
    )
  }

  return (
    <AppScaffold title="Explore" subtitle="Nearby events + map interaction">
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>Search</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search events, parks, meetups..."
            placeholderTextColor={colors.textSubtle}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Badge tone="dark">All</Badge>
        <Badge tone="neutral">Events</Badge>
        <Badge tone="neutral">Meetups</Badge>
      </ScrollView>

      {error ? (
        <InfoCard style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubText}>Showing local fallback events.</Text>
        </InfoCard>
      ) : null}

      <InfoCard style={styles.mapCard}>
        <View style={styles.mapFallback}>
          <Text style={styles.mapTitle}>Map Preview</Text>
          <Text style={styles.mapText}>
            {selectedEvent
              ? `${selectedEvent.address}\n${formatLocationPreview(selectedEvent)}`
              : "Select an event to preview its location."}
          </Text>
          <View style={styles.mapPins}>
            {filteredEvents.map((item) => {
              const active = item.id === selectedId
              return (
                <Pressable
                  key={item.id}
                  style={[styles.mapPin, active && styles.mapPinActive]}
                  onPress={() => setSelectedId(item.id)}
                >
                  <Text style={[styles.mapPinText, active && styles.mapPinTextActive]}>
                    {item.address}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <Text style={styles.mapHint}>Tap event cards or locate buttons to sync the map.</Text>
      </InfoCard>

      <InfoCard warm style={styles.countCard}>
        <Text style={styles.countText}>{filteredEvents.length} nearby events</Text>
        <Text style={styles.statusText}>{status}</Text>
      </InfoCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Events & Meetups</Text>
      </View>

      {filteredEvents.length === 0 ? (
        <ScreenState title="No events found" message="Try another search keyword." />
      ) : (
        <View style={styles.eventList}>
          {filteredEvents.map((item) => {
            const selected = selectedId === item.id
            const joined = joinedMap[item.id]

            return (
              <InfoCard key={item.id} style={[styles.eventCard, selected && styles.eventCardSelected]}>
                <View style={styles.eventTopRow}>
                  <View style={styles.eventContent}>
                    <Badge tone="warm">EVENT</Badge>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventMeta}>{item.address}</Text>
                    <Text style={styles.eventMeta}>{item.time}</Text>
                  </View>
                  <Pressable style={styles.locateButton} onPress={() => handleLocate(item)}>
                    <Text style={styles.locateText}>Locate</Text>
                  </Pressable>
                </View>

                <Text style={styles.peopleText}>{joined ? "Joined" : `${item.joined} joined`}</Text>

                <View style={styles.buttonRow}>
                  <PrimaryButton onPress={() => handleJoin(item.id)} style={styles.flexButton}>
                    {joined ? "Joined" : "Join"}
                  </PrimaryButton>
                  <Pressable style={styles.outlineButton} onPress={() => setDetailId(item.id)}>
                    <Text style={styles.outlineButtonText}>Detail</Text>
                  </Pressable>
                </View>
              </InfoCard>
            )
          })}
        </View>
      )}
    </AppScaffold>
  )
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "800",
    marginRight: spacing.sm,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
  },
  chipRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#fecaca",
    gap: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  errorSubText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  mapCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  mapFallback: {
    backgroundColor: "#f5f5f4",
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderStyle: "dashed",
    borderWidth: 1,
    minHeight: 260,
    padding: spacing.lg,
  },
  mapTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  mapText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  mapPins: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  mapPin: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  mapPinActive: {
    backgroundColor: colors.primary,
  },
  mapPinText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  mapPinTextActive: {
    color: colors.white,
  },
  mapHint: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
  },
  countCard: {
    gap: spacing.xs,
  },
  countText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900",
  },
  statusText: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  sectionHeader: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  eventList: {
    gap: spacing.md,
  },
  eventCard: {
    gap: spacing.md,
  },
  eventCardSelected: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderWarm,
  },
  eventTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  eventContent: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  eventMeta: {
    color: colors.textSubtle,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  locateButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locateText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  peopleText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
    minHeight: 42,
  },
  outlineButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  outlineButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  backText: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: "800",
  },
  detailCard: {
    gap: spacing.md,
    overflow: "hidden",
    padding: 0,
  },
  detailImage: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    minHeight: 210,
    justifyContent: "center",
  },
  detailImageText: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "900",
  },
  detailTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    paddingHorizontal: spacing.lg,
  },
  detailMeta: {
    color: colors.textSubtle,
    fontSize: 14,
    paddingHorizontal: spacing.lg,
  },
  detailDesc: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  joinedBox: {
    marginHorizontal: spacing.lg,
    shadowOpacity: 0,
  },
  joinedText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
})
