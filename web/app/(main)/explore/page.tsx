"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronRight,
  MapPin,
  Navigation,
  Search,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/i18n/language-context"
import GoogleMap, { type MapPlace } from "@/components/google-map"
import { ApiError, apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"

type EventItem = MapPlace & {
  event_id?: string
  city?: string | null
  city_lat?: number | null
  city_lng?: number | null
  image: string
  title: {
    zh: string
    ko: string
    en: string
  }
  desc: {
    zh: string
    ko: string
    en: string
  }
  time: string
  joined: number
  max_people?: number | null
  current_people?: number | null
  organizer_id?: string | null
  organizer_name?: string | null
}

type EventParticipationResponse = {
  success: true
  data?: {
    current_people?: number | null
    joined?: boolean
    is_joined?: boolean
  }
}

type ApiEvent = {
  id: string
  title: string | null
  image_url: string | null
  time: string | null
  event_time?: string | null
  max_people: number | null
  current_people: number | null
  description: string | null
  organizer_id: string | null
  organizer_name: string | null
  lat: number | null
  lng: number | null
  city?: string | null
  city_lat?: number | string | null
  city_lng?: number | string | null
}

type EventsResponse = {
  success: true
  data?: ApiEvent[]
}

type EventDetailResponse = {
  success: true
  data?: ApiEvent
}

function getEventTimeValue(value?: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const time = Date.parse(value)
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function formatListEventTime(value?: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${partMap.year}/${partMap.month}/${partMap.day} ${partMap.hour}:${partMap.minute}`
}

function sortApiEventsByTime(events: ApiEvent[]) {
  return [...events].sort((a, b) => {
    return getEventTimeValue(a.event_time || a.time) - getEventTimeValue(b.event_time || b.time)
  })
}

function sortEventItemsByTime(events: EventItem[]) {
  return [...events].sort((a, b) => getEventTimeValue(a.time) - getEventTimeValue(b.time))
}

function toFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function isValidLatitude(value: number | null) {
  return value !== null && value >= -90 && value <= 90
}

function isValidLongitude(value: number | null) {
  return value !== null && value >= -180 && value <= 180
}

function isValidCoordinatePair(lat: number | null, lng: number | null) {
  return isValidLatitude(lat) && isValidLongitude(lng)
}

function calculateDistanceKm(fromLat: unknown, fromLng: unknown, toLat: unknown, toLng: unknown) {
  const lat1 = toFiniteNumber(fromLat)
  const lng1 = toFiniteNumber(fromLng)
  const lat2 = toFiniteNumber(toLat)
  const lng2 = toFiniteNumber(toLng)

  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(earthRadiusKm * c * 10) / 10
}

function sortEventItemsForUserCity(
  events: EventItem[],
  userCity?: string | null,
  userLocation?: { lat: number; lng: number } | null,
) {
  const normalizedCity = userCity?.trim().toLowerCase()
  const sortedByTime = sortEventItemsByTime(events)

  if (!normalizedCity && !userLocation) {
    return sortedByTime
  }

  return sortedByTime.sort((a, b) => {
    const aSameCity = a.city?.trim().toLowerCase() === normalizedCity
    const bSameCity = b.city?.trim().toLowerCase() === normalizedCity

    if (aSameCity !== bSameCity) {
      return aSameCity ? -1 : 1
    }

    if (aSameCity && bSameCity) {
      return 0
    }

    const aDistance = userLocation ? calculateDistanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng) : null
    const bDistance = userLocation ? calculateDistanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng) : null

    if (aDistance === null && bDistance === null) {
      return 0
    }

    if (aDistance === null) return 1
    if (bDistance === null) return -1

    return aDistance - bDistance
  })
}

const eventData: EventItem[] = [
  {
    id: 1,
    name: "event-1",
    category: "event",
    address: "Ansan Central Park",
    lat: 37.3212,
    lng: 126.8309,
    image: "/event-dog-park.jpg",
    title: {
      zh: "周末狗狗公园聚会",
      ko: "주말 강아지 공원 모임",
      en: "Weekend Dog Park Meetup",
    },
    desc: {
      zh: "适合周末带宠物一起散步、社交和认识附近新朋友。",
      ko: "주말에 반려동물과 함께 산책하고 주변 친구들을 만나는 모임입니다.",
      en: "A casual weekend meetup for walking, socializing, and meeting nearby pet friends.",
    },
    time: "Sat 3:00 PM",
    joined: 12,
  },
  {
    id: 2,
    name: "event-2",
    category: "event",
    address: "Gojan-dong Pet Street",
    lat: 37.3186,
    lng: 126.8348,
    image: "/event-pet-cafe.jpg",
    title: {
      zh: "宠物咖啡馆社交日",
      ko: "펫 카페 소셜 데이",
      en: "Pet Cafe Social Day",
    },
    desc: {
      zh: "在宠物咖啡馆轻松交流，适合第一次见面的主人和宠物。",
      ko: "펫 카페에서 편하게 이야기하고 처음 만나는 반려인에게 잘 맞는 모임입니다.",
      en: "A relaxed cafe meetup for pet owners and pets meeting for the first time.",
    },
    time: "Sun 2:00 PM",
    joined: 8,
  },
  {
    id: 3,
    name: "event-3",
    category: "event",
    address: "Lake Park Plaza",
    lat: 37.3159,
    lng: 126.8322,
    image: "/event-evening-walk.jpg",
    title: {
      zh: "晚间散步小组",
      ko: "저녁 산책 그룹",
      en: "Evening Walking Group",
    },
    desc: {
      zh: "适合下班后轻松散步，帮助宠物释放精力。",
      ko: "퇴근 후 가볍게 산책하며 반려동물의 에너지를 풀어주는 모임입니다.",
      en: "An easy after-work walking group to help pets release energy.",
    },
    time: "Fri 7:30 PM",
    joined: 6,
  },
]

const DEFAULT_MAP_CENTER = { lat: 37.3219, lng: 126.8353 }

function toEventItem(event: ApiEvent, index: number): EventItem {
  const title = event.title || "Untitled event"
  const description = event.description || ""
  const lat = Number(event.lat)
  const lng = Number(event.lng)
  const cityLat = Number(event.city_lat)
  const cityLng = Number(event.city_lng)

  return {
    id: index + 1000,
    event_id: event.id,
    name: `event-${event.id}`,
    category: "event",
    address: event.organizer_name || "Event location",
    lat: Number.isFinite(lat) ? lat : 37.3212,
    lng: Number.isFinite(lng) ? lng : 126.8309,
    city: event.city || null,
    city_lat: Number.isFinite(cityLat) ? cityLat : null,
    city_lng: Number.isFinite(cityLng) ? cityLng : null,
    image: event.image_url || "",
    title: {
      zh: title,
      ko: title,
      en: title,
    },
    desc: {
      zh: description,
      ko: description,
      en: description,
    },
    time: event.time || "",
    joined: Number(event.current_people || 0),
    max_people: event.max_people,
    current_people: event.current_people,
    organizer_id: event.organizer_id,
    organizer_name: event.organizer_name,
  }
}

const copy = {
  zh: {
    title: "探索",
    subtitle: "附近活动 + 地图交互",
    searchPlaceholder: "搜索宠物公园、医院...",
    searchButton: "查询",
    useMyLocation: "使用我的位置",
    mapHint: "点击活动卡片或定位按钮，可联动查看位置",
    sectionTitle: "活动聚会",
    createEvent: "创建活动",
    all: "全部",
    event: "活动",
    locate: "定位",
    mapLocate: "地图定位",
    join: "参加",
    joined: "已参加",
    cancel: "取消",
    detail: "活动详情",
    edit: "编辑",
    joinedText: (n: number) => `已有 ${n} 人参加`,
    countSuffix: (n: number) => `${n} 个附近活动`,
    back: "返回",
    searchNotFound: "未找到相关位置",
  },
  ko: {
    title: "탐색",
    subtitle: "근처 활동 + 지도 인터랙션",
    searchPlaceholder: "반려동물 공원, 병원 검색...",
    searchButton: "검색",
    useMyLocation: "내 위치 사용",
    mapHint: "카드나 위치 버튼을 누르면 위 지도와 연동됩니다",
    sectionTitle: "활동 모임",
    createEvent: "활동 만들기",
    all: "전체",
    event: "이벤트",
    locate: "위치",
    mapLocate: "지도 위치",
    join: "참가",
    joined: "참가 완료",
    cancel: "취소",
    detail: "상세 정보",
    edit: "편집",
    joinedText: (n: number) => `${n}명 참가 중`,
    countSuffix: (n: number) => `주변 활동 ${n}개`,
    back: "뒤로",
    searchNotFound: "관련 위치를 찾을 수 없습니다",
  },
  en: {
    title: "Explore",
    subtitle: "Nearby events + map interaction",
    searchPlaceholder: "Search pet parks or vets...",
    searchButton: "Search",
    useMyLocation: "Use my location",
    mapHint: "Tap event cards or locate buttons to sync the map",
    sectionTitle: "Events & Meetups",
    createEvent: "Create Event",
    all: "All",
    event: "Events",
    locate: "Locate",
    mapLocate: "Map Locate",
    join: "Join",
    joined: "Joined",
    cancel: "Cancel",
    detail: "Details",
    edit: "Edit",
    joinedText: (n: number) => `${n} joined`,
    countSuffix: (n: number) => `${n} nearby events`,
    back: "Back",
    searchNotFound: "Location not found",
  },
} as const

export default function ExplorePage() {
  const { locale } = useLanguage()
  const router = useRouter()
  const { user } = useAuth()
  const c = copy[locale]
  const userCity = (user as { city?: string | null } | null)?.city ?? null
  const userCurrentLat = toFiniteNumber((user as { current_lat?: number | string | null } | null)?.current_lat)
  const userCurrentLng = toFiniteNumber((user as { current_lng?: number | string | null } | null)?.current_lng)
  const userCityLat = toFiniteNumber((user as { city_lat?: number | string | null } | null)?.city_lat)
  const userCityLng = toFiniteNumber((user as { city_lng?: number | string | null } | null)?.city_lng)
  const userCurrentCenter =
    isValidCoordinatePair(userCurrentLat, userCurrentLng)
      ? { lat: userCurrentLat, lng: userCurrentLng }
      : null
  const userCityCenter =
    isValidCoordinatePair(userCityLat, userCityLng)
      ? { lat: userCityLat, lng: userCityLng }
      : null

  const [events, setEvents] = useState<EventItem[]>(sortEventItemsByTime(eventData))
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [joinedMap, setJoinedMap] = useState<Record<number, boolean>>({})
  const [joiningMap, setJoiningMap] = useState<Record<number, boolean>>({})
  const [peopleMap, setPeopleMap] = useState<Record<number, number>>({})
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [detailEventId, setDetailEventId] = useState<number | null>(null)
  const [detailApiEvent, setDetailApiEvent] = useState<ApiEvent | null>(null)
  const userPreferredCenter = userLocation || userCurrentCenter || userCityCenter

  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const carouselRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      try {
        const response = await apiRequest<EventsResponse>("/events")
        const items = sortApiEventsByTime(response.data || []).map(toEventItem)

        if (!cancelled && items.length > 0) {
          setEvents(items)
          setSelectedId(null)
        }
      } catch (error) {
        console.error("Failed to load events", error)
      }
    }

    loadEvents()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredEvents = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return sortEventItemsForUserCity(events, userCity, userPreferredCenter).filter((item) => {
      const title = item.title[locale].toLowerCase()
      const desc = item.desc[locale].toLowerCase()

      return (
          !keyword ||
          title.includes(keyword) ||
          desc.includes(keyword) ||
          item.address.toLowerCase().includes(keyword) ||
          item.time.toLowerCase().includes(keyword)
      )
    })
  }, [events, locale, query, userCity, userPreferredCenter])

  const detailEvent = filteredEvents.find((item) => item.id === detailEventId) || null

  useEffect(() => {
    let cancelled = false

    async function loadEventDetail(eventId: string) {
      try {
        const response = await apiRequest<EventDetailResponse>(`/events/${encodeURIComponent(eventId)}`)

        if (!cancelled) {
          setDetailApiEvent(response.data || null)
        }
      } catch (error) {
        console.error("Failed to load event detail", error)

        if (!cancelled) {
          setDetailApiEvent(null)
        }
      }
    }

    setDetailApiEvent(null)

    if (detailEvent?.event_id) {
      loadEventDetail(detailEvent.event_id)
    }

    return () => {
      cancelled = true
    }
  }, [detailEvent?.event_id])

  const selectedEvent =
      filteredEvents.find((item) => item.id === selectedId) ?? null

  const center =
    userLocation ||
    (selectedEvent
      ? { lat: selectedEvent.lat, lng: selectedEvent.lng }
      : userCurrentCenter || userCityCenter || DEFAULT_MAP_CENTER)

  const handleJoinToggle = async (eventItem: EventItem, fallbackPeople: number) => {
    const id = eventItem.id
    if (joiningMap[id]) return

    const joined = joinedMap[id]
    const eventId = eventItem.event_id || String(eventItem.id)
    setJoiningMap((prev) => ({ ...prev, [id]: true }))

    try {
      const response = await apiRequest<EventParticipationResponse>(joined ? "/events/leave" : "/events/join", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          event_id: eventId,
        }),
      })

      const nextJoined = response.data?.joined ?? response.data?.is_joined ?? !joined
      const nextPeople = response.data?.current_people
      const currentPeople = peopleMap[id] ?? fallbackPeople
      const maxPeople = eventItem.max_people
      const nextCount = typeof nextPeople === "number"
        ? Math.max(0, nextPeople)
        : nextJoined
          ? Math.min(
              Number.isFinite(maxPeople) ? Number(maxPeople) : Number.POSITIVE_INFINITY,
              currentPeople + 1
            )
          : Math.max(0, currentPeople - 1)

      setJoinedMap((prev) => ({ ...prev, [id]: nextJoined }))
      setPeopleMap((prev) => ({
        ...prev,
        [id]: nextCount,
      }))
      setEvents((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                joined: nextCount,
                current_people: nextCount,
              }
            : item
        )
      )
      setDetailApiEvent((prev) =>
        prev && prev.id === eventId
          ? {
              ...prev,
              current_people: nextCount,
            }
          : prev
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      console.error("Failed to toggle event participation", {
        error,
        status: error instanceof ApiError ? error.status : undefined,
        message,
        code: error instanceof ApiError ? error.code : undefined,
        data: error instanceof ApiError ? error.data : undefined,
      })
      alert(message)
    } finally {
      setJoiningMap((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleLocate = (id: number) => {
    setSelectedId(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current
    if (!carousel || filteredEvents.length === 0) return

    const index = Math.round(carousel.scrollLeft / carousel.clientWidth)
    const event = filteredEvents[Math.max(0, Math.min(index, filteredEvents.length - 1))]

    if (event && event.id !== selectedId) {
      setSelectedId(event.id)
    }
  }

  const handleUseMyLocation = async () => {
    const saveCurrentLocation = (lat: number, lng: number) => {
      void apiRequest("/profile/location", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          current_lat: lat,
          current_lng: lng,
        }),
      }).catch((error) => {
        console.error("Failed to save current location", error)
      })
    }

    const applyPosition = (lat: number, lng: number) => {
      setUserLocation({ lat, lng })
      saveCurrentLocation(lat, lng)
    }

    const getBrowserPosition = () =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Browser geolocation is unavailable"))
          return
        }

        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

    try {
      if (typeof window !== "undefined") {
        const importModule = new Function("specifier", "return import(specifier)") as (
          specifier: string,
        ) => Promise<any>

        let capacitorCore: any = null
        let capacitorGeo: any = null

        try {
          ;[capacitorCore, capacitorGeo] = await Promise.all([
            importModule("@capacitor/core"),
            importModule("@capacitor/geolocation"),
          ])
        } catch (importError) {
          console.warn("Capacitor geolocation unavailable, fallback to web geolocation", importError)
        }

        const nativeCapacitor = (window as any).Capacitor
        const capacitor = capacitorCore?.Capacitor ?? nativeCapacitor
        const geolocation = capacitorGeo?.Geolocation ?? nativeCapacitor?.Plugins?.Geolocation

        if (capacitor?.isNativePlatform?.() && geolocation) {
          const permission = await geolocation.requestPermissions()
          const granted = permission.location === "granted" || permission.coarseLocation === "granted"

          if (!granted) {
            throw new Error("Location permission denied")
          }

          const position = await geolocation.getCurrentPosition()
          applyPosition(position.coords.latitude, position.coords.longitude)
          return
        }
      }

      const position = await getBrowserPosition()
      applyPosition(position.coords.latitude, position.coords.longitude)
    } catch (error) {
      try {
        const position = await getBrowserPosition()
        applyPosition(position.coords.latitude, position.coords.longitude)
      } catch (fallbackError) {
        console.warn("Failed to get current location, keeping existing map center", { error, fallbackError })
      }
    }
  }

  const handleSearchLocation = () => {
    const searchQuery = query.trim()
    if (!searchQuery) return

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (detailEvent) {
    const joined = joinedMap[detailEvent.id]
    const joinedCount = peopleMap[detailEvent.id] ?? detailEvent.joined
    const canEdit = user?.id && detailEvent.organizer_id === user.id
    const detailTitle = detailApiEvent?.title || detailEvent.title[locale]
    const detailImage = detailApiEvent?.image_url || detailEvent.image
    const detailTime = detailApiEvent?.time || detailEvent.time
    const detailDescription = detailApiEvent?.description || detailEvent.desc[locale]
    const detailOrganizer = detailApiEvent?.organizer_name || detailEvent.organizer_name || detailEvent.address
    const maxPeople = detailApiEvent?.max_people ?? detailEvent.max_people
    const detailPeople = detailApiEvent?.current_people ?? joinedCount

    return (
        <div className="p-4 max-w-md mx-auto space-y-4 pb-24">
          <button
              onClick={() => setDetailEventId(null)}
              className="text-sm text-stone-500"
          >
            ← {c.back}
          </button>

          <div className="rounded-3xl overflow-hidden bg-white border border-stone-100 shadow-sm">
            <img
                src={detailImage}
                alt={detailTitle}
                className="w-full h-52 object-cover"
            />

            <div className="p-4">
            <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full uppercase tracking-wide">
              EVENT
            </span>

              <h1 className="text-2xl font-bold text-stone-900 mt-3">
                {detailTitle}
              </h1>

              <p className="text-sm text-stone-500 mt-2">{detailEvent.address}</p>
              <p className="text-sm text-stone-500 mt-1">活动时间：{formatListEventTime(detailTime)}</p>
              <p className="text-sm text-stone-500 mt-1">
                人数限制：{detailPeople} / {maxPeople ?? "∞"}
              </p>
              <p className="text-sm text-stone-500 mt-1">活动组织者：{detailOrganizer}</p>

              <div className="mt-4 text-sm text-stone-700 leading-7">
                活动介绍：{detailDescription}
              </div>

              <div className="mt-5 rounded-2xl bg-stone-50 border border-stone-100 p-4">
                <p className="text-sm text-stone-600">{c.joinedText(detailPeople)}</p>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                    onClick={() => handleJoinToggle(detailEvent, joinedCount)}
                    disabled={joiningMap[detailEvent.id]}
                    className={`rounded-xl ${
                        joined
                            ? "bg-stone-500 hover:bg-stone-600"
                            : "bg-orange-500 hover:bg-orange-600"
                    }`}
                >
                  {joined ? c.cancel : c.join}
                </Button>

                <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      handleLocate(detailEvent.id)
                      setDetailEventId(null)
                    }}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  {c.mapLocate}
                </Button>

                {canEdit && (
                  <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        if (!detailEvent.event_id) {
                          console.warn("Missing event_id for edit route, falling back to local id", detailEvent)
                        }

                        router.push(`/explore/${detailEvent.event_id || detailEvent.id}/edit`)
                      }}
                  >
                    {c.edit}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
    )
  }

  return (
      <div className="mx-auto max-w-md space-y-6 bg-gradient-to-b from-orange-50 via-stone-50 to-white px-5 py-4 pb-28">
        <header className="space-y-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.12)]" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">WePet Map</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-stone-900">{c.title}</h1>
            <p className="mt-1 text-sm font-medium text-stone-500">{c.subtitle}</p>
          </div>

          <div className="flex gap-2 rounded-[1.55rem] border border-orange-100 bg-white/95 p-2 shadow-lg shadow-orange-900/5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-orange-400" />
              <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={c.searchPlaceholder}
                  className="h-11 rounded-[1.1rem] border-0 bg-stone-50 pl-10 pr-3 text-sm shadow-inner placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-orange-200"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearchLocation()
                    }
                  }}
              />
            </div>

            <Button
                onClick={handleSearchLocation}
                className="h-11 rounded-[1.1rem] bg-gradient-to-br from-orange-500 to-amber-400 px-4 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:shadow-orange-500/30"
            >
              {c.searchButton}
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Badge className="rounded-full bg-stone-900 px-4 py-2 text-white shadow-sm">{c.all}</Badge>
            <Badge variant="outline" className="rounded-full border-orange-100 bg-white px-4 py-2 text-stone-600 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              {c.event}
            </Badge>
          </div>
        </header>

        <section className="space-y-3">
          <div className="overflow-hidden rounded-[2rem] border border-orange-100/80 bg-white p-3 shadow-2xl shadow-orange-900/10 ring-1 ring-white/70">
            <div className="overflow-hidden rounded-[1.5rem] bg-stone-100">
              <GoogleMap
                  center={center}
                  places={filteredEvents}
                  selectedPlaceId={selectedId}
                  onSelectPlace={(id) => {
                    setSelectedId(id)
                    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }}
                  userLocation={userLocation}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 px-1">
              <p className="text-xs font-medium leading-relaxed text-stone-500">{c.mapHint}</p>
              <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full border-orange-100 bg-white px-3 font-bold text-orange-600 shadow-md shadow-orange-900/5 transition hover:-translate-y-0.5 hover:bg-orange-50"
                  onClick={handleUseMyLocation}
              >
                <Navigation className="h-4 w-4 mr-1" />
                {c.useMyLocation}
              </Button>
            </div>
          </div>

        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-stone-900">{c.sectionTitle}</h2>
              <p className="mt-0.5 text-xs font-medium text-stone-500">{c.countSuffix(filteredEvents.length)}</p>
            </div>
            <Button
                onClick={() => router.push("/explore/create")}
                className="shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 px-4 font-bold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:shadow-orange-500/35"
            >
              {c.createEvent}
            </Button>
          </div>

          <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
          >
            {filteredEvents.map((item) => {
              const selected = selectedId === item.id
              const joined = joinedMap[item.id]
              const joinedCount = peopleMap[item.id] ?? item.joined

              return (
                  <div
                      key={item.id}
                      ref={(el) => {
                        cardRefs.current[item.id] = el
                      }}
                      className="w-full shrink-0 snap-center"
                  >
                    <Card
                        className={`flex min-h-[430px] flex-col overflow-hidden rounded-[2rem] border transition-all duration-200 ${
                            selected
                                ? "border-orange-300 bg-orange-50/60 shadow-2xl shadow-orange-500/15"
                                : "border-orange-100/80 bg-white shadow-xl shadow-orange-900/8"
                        }`}
                    >
                      <div className="h-52 w-full shrink-0 overflow-hidden bg-stone-100">
                        {item.image ? (
                            <img
                                src={item.image}
                                alt={item.title[locale]}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm text-stone-400">
                              No image
                            </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-orange-600 ring-1 ring-orange-100">
                            EVENT
                          </span>

                          <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 rounded-full border-orange-100 bg-white font-bold text-orange-600 shadow-sm hover:bg-orange-50"
                              onClick={() => handleLocate(item.id)}
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            {c.locate}
                          </Button>
                        </div>

                        <h3 className="mt-3 line-clamp-2 min-h-[3rem] text-lg font-black leading-6 tracking-tight text-stone-900">{item.title[locale]}</h3>
                        <p className="mt-1 text-sm font-medium text-stone-500">{formatListEventTime(item.time)}</p>

                        <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-stone-500">
                          <span className="flex items-center gap-1 rounded-full bg-stone-50 px-3 py-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {joined ? c.joined : c.joinedText(joinedCount)}
                          </span>
                        </div>

                        <div className="mt-auto flex gap-2 pt-4">
                          <Button
                              onClick={() => handleJoinToggle(item, joinedCount)}
                              disabled={joiningMap[item.id]}
                              className="rounded-full bg-gradient-to-br from-orange-500 to-amber-400 px-5 font-bold text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                          >
                            {joined ? c.cancel : c.join}
                          </Button>

                          <Button
                              variant="outline"
                              className="rounded-full border-orange-100 bg-white px-4 font-bold text-stone-700 shadow-sm hover:bg-orange-50"
                              onClick={() => setDetailEventId(item.id)}
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="ml-1">{c.detail}</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
              )
            })}
          </div>

          <div className="flex justify-center gap-2">
            {filteredEvents.map((item) => (
                <span
                    key={item.id}
                    className={`h-2 rounded-full transition-all ${
                        selectedId === item.id ? "w-5 bg-orange-500" : "w-2 bg-stone-300"
                    }`}
                />
            ))}
          </div>
        </section>
      </div>
  )
}
