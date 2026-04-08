"use client"

import { useEffect, useRef, useState } from "react"

declare global {
    interface Window {
        google: any
    }
}

export type MapPlace = {
    id: number
    name: string
    category: string
    address: string
    lat: number
    lng: number
}

type Props = {
    center: { lat: number; lng: number }
    places: MapPlace[]
    selectedPlaceId: number | null
    onSelectPlace: (id: number) => void
    userLocation?: { lat: number; lng: number } | null
}

export default function NaverMap({
                                     center,
                                     places,
                                     selectedPlaceId,
                                     onSelectPlace,
                                     userLocation,
                                 }: Props) {
    const mapElementRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<any>(null)
    const markersRef = useRef<any[]>([])
    const infoWindowRef = useRef<any>(null)
    const userMarkerRef = useRef<any>(null)

    const [mode, setMode] = useState<"loading" | "google" | "fallback">("loading")
    const [debugMessage, setDebugMessage] = useState("地图初始化中...")

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

        if (!apiKey) {
            setMode("fallback")
            setDebugMessage("缺少 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
            return
        }

        const initMap = () => {
            try {
                if (!mapElementRef.current) {
                    setMode("fallback")
                    setDebugMessage("地图容器不存在")
                    return
                }

                if (!window.google || !window.google.maps) {
                    setMode("fallback")
                    setDebugMessage("window.google.maps 不存在，脚本未加载成功")
                    return
                }

                const google = window.google
                const mapCenter = { lat: center.lat, lng: center.lng }

                if (!mapRef.current) {
                    mapRef.current = new google.maps.Map(mapElementRef.current, {
                        center: mapCenter,
                        zoom: 14,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                    })
                    infoWindowRef.current = new google.maps.InfoWindow()
                } else {
                    mapRef.current.setCenter(mapCenter)
                }

                markersRef.current.forEach((marker) => marker.setMap(null))
                markersRef.current = []

                places.forEach((place) => {
                    const isSelected = place.id === selectedPlaceId

                    const marker = new google.maps.Marker({
                        position: { lat: place.lat, lng: place.lng },
                        map: mapRef.current,
                        title: place.address,
                        animation: isSelected ? google.maps.Animation.BOUNCE : undefined,
                    })

                    marker.addListener("click", () => {
                        onSelectPlace(place.id)

                        if (infoWindowRef.current) {
                            infoWindowRef.current.setContent(`
                <div style="padding:10px;min-width:180px;font-size:13px;line-height:1.5;">
                  <strong>${place.address}</strong><br/>
                  <span>${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}</span>
                </div>
              `)

                            infoWindowRef.current.open({
                                anchor: marker,
                                map: mapRef.current,
                            })
                        }
                    })

                    markersRef.current.push(marker)
                })

                if (userMarkerRef.current) {
                    userMarkerRef.current.setMap(null)
                    userMarkerRef.current = null
                }

                if (userLocation) {
                    userMarkerRef.current = new google.maps.Marker({
                        position: userLocation,
                        map: mapRef.current,
                        title: "My Location",
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#2563eb",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                        },
                    })
                }

                setMode("google")
                setDebugMessage("Google 地图加载成功")
            } catch (error) {
                setMode("fallback")
                setDebugMessage(
                    error instanceof Error ? `地图初始化异常: ${error.message}` : "地图初始化异常"
                )
            }
        }

        if (window.google?.maps) {
            setTimeout(initMap, 200)
            return
        }

        const existing = document.getElementById("google-map-script")
        if (existing) {
            existing.addEventListener("load", () => {
                setTimeout(initMap, 300)
            })
            return
        }

        const script = document.createElement("script")
        script.id = "google-map-script"
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
        script.async = true
        script.defer = true

        script.onload = () => {
            setTimeout(initMap, 500)
        }

        script.onerror = () => {
            setMode("fallback")
            setDebugMessage("Google Maps 脚本加载失败")
        }

        document.head.appendChild(script)
    }, [center.lat, center.lng, places, selectedPlaceId, onSelectPlace, userLocation])

    useEffect(() => {
        if (mode !== "google") return
        if (!window.google?.maps || !mapRef.current || !selectedPlaceId) return

        const selected = places.find((place) => place.id === selectedPlaceId)
        if (!selected) return

        mapRef.current.setCenter({ lat: selected.lat, lng: selected.lng })
    }, [mode, selectedPlaceId, places])

    useEffect(() => {
        if (mode !== "google") return
        if (!mapRef.current || !userLocation) return

        mapRef.current.setCenter(userLocation)
        mapRef.current.setZoom(15)
    }, [mode, userLocation])

    return (
        <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-stone-200 bg-stone-50">
            <div ref={mapElementRef} className="absolute inset-0" />

            {mode !== "google" && (
                <div className="absolute inset-0 p-4 flex flex-col justify-between bg-stone-50">
                    <div className="text-sm text-stone-500 whitespace-pre-wrap">
                        {debugMessage}
                    </div>

                    <div className="flex-1 flex items-center justify-center relative">
                        <div className="absolute inset-6 rounded-2xl border border-dashed border-stone-300" />
                        <div className="flex flex-wrap gap-3 justify-center relative z-10">
                            {places.map((place) => {
                                const active = place.id === selectedPlaceId
                                return (
                                    <button
                                        key={place.id}
                                        onClick={() => onSelectPlace(place.id)}
                                        className={`px-3 py-2 rounded-full text-xs shadow ${
                                            active ? "bg-orange-500 text-white" : "bg-white text-stone-700"
                                        }`}
                                    >
                                        {place.address}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="text-xs text-stone-500">
                        Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
                    </div>
                </div>
            )}
        </div>
    )
}