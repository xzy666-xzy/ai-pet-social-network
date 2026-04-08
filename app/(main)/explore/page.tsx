"use client"

import { useMemo, useRef, useState } from "react"
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
import NaverMap, { type MapPlace } from "@/components/naver-map"

type EventItem = MapPlace & {
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

const copy = {
  zh: {
    title: "探索",
    subtitle: "附近活动 + 地图交互",
    searchPlaceholder: "搜索活动、公园、聚会...",
    searchButton: "查询",
    useMyLocation: "使用我的位置",
    mapHint: "点击活动卡片或定位按钮，可联动查看位置",
    sectionTitle: "活动聚会",
    all: "全部",
    event: "活动",
    locate: "定位",
    mapLocate: "地图定位",
    join: "参加",
    joined: "已参加",
    detail: "活动详情",
    joinedText: (n: number) => `已有 ${n} 人参加`,
    countSuffix: (n: number) => `${n} 个附近活动`,
    back: "返回",
    searchNotFound: "未找到相关位置",
  },
  ko: {
    title: "탐색",
    subtitle: "근처 활동 + 지도 인터랙션",
    searchPlaceholder: "활동, 공원, 모임 검색...",
    searchButton: "검색",
    useMyLocation: "내 위치 사용",
    mapHint: "카드나 위치 버튼을 누르면 위 지도와 연동됩니다",
    sectionTitle: "활동 모임",
    all: "전체",
    event: "이벤트",
    locate: "위치",
    mapLocate: "지도 위치",
    join: "참가",
    joined: "참가 완료",
    detail: "상세 정보",
    joinedText: (n: number) => `${n}명 참가 중`,
    countSuffix: (n: number) => `주변 활동 ${n}개`,
    back: "뒤로",
    searchNotFound: "관련 위치를 찾을 수 없습니다",
  },
  en: {
    title: "Explore",
    subtitle: "Nearby events + map interaction",
    searchPlaceholder: "Search events, parks, meetups...",
    searchButton: "Search",
    useMyLocation: "Use my location",
    mapHint: "Tap event cards or locate buttons to sync the map",
    sectionTitle: "Events & Meetups",
    all: "All",
    event: "Events",
    locate: "Locate",
    mapLocate: "Map Locate",
    join: "Join",
    joined: "Joined",
    detail: "Details",
    joinedText: (n: number) => `${n} joined`,
    countSuffix: (n: number) => `${n} nearby events`,
    back: "Back",
    searchNotFound: "Location not found",
  },
} as const

export default function ExplorePage() {
  const { locale } = useLanguage()
  const c = copy[locale]

  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(eventData[0].id)
  const [joinedMap, setJoinedMap] = useState<Record<number, boolean>>({})
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [detailEventId, setDetailEventId] = useState<number | null>(null)

  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const filteredEvents = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return eventData.filter((item) => {
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
  }, [locale, query])

  const detailEvent = filteredEvents.find((item) => item.id === detailEventId) || null

  const selectedEvent =
      filteredEvents.find((item) => item.id === selectedId) ?? filteredEvents[0]

  const center = selectedEvent
      ? { lat: selectedEvent.lat, lng: selectedEvent.lng }
      : { lat: 37.3212, lng: 126.8309 }

  const handleJoin = (id: number) => {
    setJoinedMap((prev) => ({ ...prev, [id]: true }))
  }

  const handleLocate = (id: number) => {
    setSelectedId(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          alert(
              locale === "zh"
                  ? "无法获取当前位置"
                  : locale === "ko"
                      ? "현재 위치를 가져올 수 없습니다"
                      : "Unable to get current location",
          )
        },
    )
  }

  const handleSearchLocation = () => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return

    const found = eventData.find((item) => {
      return (
          item.title[locale].toLowerCase().includes(keyword) ||
          item.address.toLowerCase().includes(keyword)
      )
    })

    if (found) {
      setSelectedId(found.id)
      setDetailEventId(null)
      cardRefs.current[found.id]?.scrollIntoView({ behavior: "smooth", block: "center" })
    } else {
      alert(c.searchNotFound)
    }
  }

  if (detailEvent) {
    const joined = joinedMap[detailEvent.id]

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
                src={detailEvent.image}
                alt={detailEvent.title[locale]}
                className="w-full h-52 object-cover"
            />

            <div className="p-4">
            <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full uppercase tracking-wide">
              EVENT
            </span>

              <h1 className="text-2xl font-bold text-stone-900 mt-3">
                {detailEvent.title[locale]}
              </h1>

              <p className="text-sm text-stone-500 mt-2">{detailEvent.address}</p>
              <p className="text-sm text-stone-500 mt-1">{detailEvent.time}</p>

              <div className="mt-4 text-sm text-stone-700 leading-7">
                {detailEvent.desc[locale]}
              </div>

              <div className="mt-5 rounded-2xl bg-stone-50 border border-stone-100 p-4">
                <p className="text-sm text-stone-600">{c.joinedText(detailEvent.joined)}</p>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                    onClick={() => handleJoin(detailEvent.id)}
                    className="rounded-xl bg-orange-500 hover:bg-orange-600"
                >
                  {joined ? c.joined : c.join}
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
              </div>
            </div>
          </div>
        </div>
    )
  }

  return (
      <div className="p-4 max-w-md mx-auto space-y-6 pb-28">
        <header className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{c.title}</h1>
            <p className="text-sm text-stone-500 mt-1">{c.subtitle}</p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={c.searchPlaceholder}
                  className="pl-9 bg-white border-stone-200 rounded-xl h-11"
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
                className="rounded-xl h-11 px-4 bg-orange-500 hover:bg-orange-600"
            >
              {c.searchButton}
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Badge className="bg-stone-900 text-white px-4 py-2 rounded-full">{c.all}</Badge>
            <Badge variant="outline" className="px-4 py-2 rounded-full">
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              {c.event}
            </Badge>
          </div>
        </header>

        <section className="space-y-3">
          <div className="rounded-2xl border border-stone-100 bg-white p-3 shadow-sm">
            <NaverMap
                center={center}
                places={filteredEvents}
                selectedPlaceId={selectedId}
                onSelectPlace={(id) => {
                  setSelectedId(id)
                  cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
                }}
                userLocation={userLocation}
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-stone-500">{c.mapHint}</p>
              <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleUseMyLocation}
              >
                <Navigation className="h-4 w-4 mr-1" />
                {c.useMyLocation}
              </Button>
            </div>
          </div>

          <div className="relative rounded-2xl bg-emerald-50 border border-emerald-100 p-4 overflow-hidden">
            <div className="relative z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-800">
              {c.countSuffix(filteredEvents.length)}
            </span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-stone-800">{c.sectionTitle}</h2>

          {filteredEvents.map((item) => {
            const selected = selectedId === item.id
            const joined = joinedMap[item.id]

            return (
                <div
                    key={item.id}
                    ref={(el) => {
                      cardRefs.current[item.id] = el
                    }}
                >
                  <Card
                      className={`p-4 rounded-2xl border transition-all ${
                          selected
                              ? "border-orange-300 shadow-md bg-orange-50/40"
                              : "border-stone-100 shadow-sm bg-white"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                    <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full uppercase tracking-wide">
                      EVENT
                    </span>
                        <h3 className="font-bold text-stone-900 mt-3">{item.title[locale]}</h3>
                        <p className="text-sm text-stone-500 mt-1">{item.address}</p>
                        <p className="text-sm text-stone-500 mt-1">{item.time}</p>
                      </div>

                      <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full shrink-0"
                          onClick={() => handleLocate(item.id)}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        {c.locate}
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-stone-500 mt-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {joined ? c.joined : c.joinedText(item.joined)}
                  </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                          onClick={() => handleJoin(item.id)}
                          className="rounded-xl bg-orange-500 hover:bg-orange-600"
                      >
                        {joined ? c.joined : c.join}
                      </Button>

                      <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setDetailEventId(item.id)}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="ml-1">{c.detail}</span>
                      </Button>
                    </div>
                  </Card>
                </div>
            )
          })}
        </section>
      </div>
  )
}