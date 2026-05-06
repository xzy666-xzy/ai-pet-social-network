"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, MapPin, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const defaultCenter = { lat: 37.3212, lng: 126.8309 }

export default function CreateEventLocationPage() {
  const router = useRouter()
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const clickListenerRef = useRef<any>(null)
  const [query, setQuery] = useState("")
  const [center, setCenter] = useState(defaultCenter)
  const [mapReady, setMapReady] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [selectedLat, setSelectedLat] = useState<number | null>(null)
  const [selectedLng, setSelectedLng] = useState<number | null>(null)

  const placeMarker = useCallback((position: { lat: number; lng: number }) => {
    if (!window.google?.maps || !mapRef.current) return

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        title: "Selected location",
      })
    } else {
      markerRef.current.setPosition(position)
      markerRef.current.setMap(mapRef.current)
    }

    setSelectedLat(position.lat)
    setSelectedLng(position.lng)
  }, [])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) return

    const initMap = () => {
      if (!mapElementRef.current || !window.google?.maps || mapRef.current) return

      mapRef.current = new window.google.maps.Map(mapElementRef.current, {
        center,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
      setMapReady(true)
    }

    if (window.google?.maps) {
      initMap()
      return
    }

    const existing = document.getElementById("google-map-script")
    if (existing) {
      existing.addEventListener("load", initMap)
      return
    }

    const script = document.createElement("script")
    script.id = "google-map-script"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = initMap
    document.head.appendChild(script)
  }, [center])

  useEffect(() => {
    if (!mapRef.current) return

    mapRef.current.setCenter(center)
  }, [center])

  useEffect(() => {
    if (!mapReady || !window.google?.maps || !mapRef.current) return

    if (clickListenerRef.current) {
      clickListenerRef.current.remove()
      clickListenerRef.current = null
    }

    if (!isMarking) return

    clickListenerRef.current = mapRef.current.addListener("click", (event: any) => {
      const location = event.latLng
      if (!location) return

      const position = {
        lat: location.lat(),
        lng: location.lng(),
      }

      placeMarker(position)
      setCenter(position)
    })

    return () => {
      clickListenerRef.current?.remove()
      clickListenerRef.current = null
    }
  }, [isMarking, mapReady, placeMarker])

  const handleSearch = useCallback(() => {
    const keyword = query.trim()

    if (!keyword) return

    if (!window.google?.maps?.Geocoder) {
      alert("地图还未加载完成")
      return
    }

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: keyword }, (results: any, status: string) => {
      const location = results?.[0]?.geometry?.location

      if (status !== "OK" || !location) {
        alert("未找到该位置")
        return
      }

      setCenter({
        lat: location.lat(),
        lng: location.lng(),
      })
    })
  }, [query])

  const handleConfirmLocation = useCallback(() => {
    if (selectedLat === null || selectedLng === null) {
      alert("请先标记位置")
      return
    }

    sessionStorage.setItem(
      "create_event_location",
      JSON.stringify({
        lat: selectedLat,
        lng: selectedLng,
      })
    )
    router.push("/explore/create")
  }, [router, selectedLat, selectedLng])

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 pb-28">
      <header className="space-y-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-stone-500"
        >
          ← 返回
        </button>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <Input
              className="h-11 rounded-xl border-stone-200 bg-white pl-9"
              placeholder="搜索位置"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleSearch()
                }
              }}
            />
          </div>
          <Button
            type="button"
            className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600"
            onClick={handleSearch}
          >
            搜索
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4">
        <div className="relative h-[58vh] overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
          <div ref={mapElementRef} className="absolute inset-0" />
          {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-stone-500">
              Google Maps API key is missing
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={isMarking ? "default" : "outline"}
            className={`h-12 rounded-xl gap-2 ${
              isMarking ? "bg-orange-500 hover:bg-orange-600" : ""
            }`}
            onClick={() => setIsMarking((prev) => !prev)}
          >
            <MapPin className="h-4 w-4" />
            标记位置
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl gap-2 bg-orange-500 hover:bg-orange-600"
            data-selected-lat={selectedLat ?? undefined}
            data-selected-lng={selectedLng ?? undefined}
            onClick={handleConfirmLocation}
          >
            <Check className="h-4 w-4" />
            确认位置
          </Button>
        </div>
      </main>
    </div>
  )
}
