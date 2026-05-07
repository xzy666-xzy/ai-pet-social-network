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

function isValidPosition(position?: { lat: number; lng: number } | null) {
  return (
    Boolean(position) &&
    Number.isFinite(position?.lat) &&
    Number.isFinite(position?.lng)
  )
}

export default function GoogleMap({
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
  const onSelectPlaceRef = useRef(onSelectPlace)

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace
  }, [onSelectPlace])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setLoadState("error")
      setErrorMessage("Google Maps API key is missing")
      return
    }

    const initMap = () => {
      if (!mapElementRef.current || !window.google?.maps || mapRef.current) return

      const mapOptions: any = {
        center: isValidPosition(center) ? center : { lat: 37.3219, lng: 126.8353 },
        zoom: 14,
        mapTypeId: "roadmap",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      }

      if (window.google.maps.RenderingType?.RASTER) {
        mapOptions.renderingType = window.google.maps.RenderingType.RASTER
      }

      mapRef.current = new window.google.maps.Map(mapElementRef.current, mapOptions)
      infoWindowRef.current = new window.google.maps.InfoWindow()
      setLoadState("ready")

      window.requestAnimationFrame(() => {
        if (!mapRef.current || !window.google?.maps) return
        window.google.maps.event.trigger(mapRef.current, "resize")
        mapRef.current.setCenter(mapOptions.center)
      })
    }

    if (window.google?.maps) {
      initMap()
      return
    }

    const existing = document.getElementById("google-map-script")
    if (existing) {
      existing.addEventListener("load", initMap, { once: true })
      return
    }

    const script = document.createElement("script")
    script.id = "google-map-script"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = initMap
    script.onerror = () => {
      setLoadState("error")
      setErrorMessage("Google Maps script failed to load")
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (loadState !== "ready" || !mapRef.current) return
    if (!isValidPosition(center)) return

    mapRef.current.setCenter(center)
  }, [center, loadState])

  useEffect(() => {
    if (loadState !== "ready" || !window.google?.maps || !mapRef.current) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    places.filter(isValidPosition).forEach((place) => {
      const isSelected = place.id === selectedPlaceId
      const marker = new window.google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: mapRef.current,
        title: place.address,
        animation: isSelected ? window.google.maps.Animation.BOUNCE : undefined,
      })

      marker.addListener("click", () => {
        onSelectPlaceRef.current(place.id)

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
  }, [loadState, places, selectedPlaceId])

  useEffect(() => {
    if (loadState !== "ready" || !window.google?.maps || !mapRef.current) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null)
      userMarkerRef.current = null
    }

    if (!isValidPosition(userLocation)) return

    userMarkerRef.current = new window.google.maps.Marker({
      position: userLocation,
      map: mapRef.current,
      title: "My Location",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    })
    mapRef.current.setCenter(userLocation)
    mapRef.current.setZoom(15)
  }, [loadState, userLocation])

  useEffect(() => {
    if (loadState !== "ready" || !mapRef.current || !selectedPlaceId) return

    const selected = places.find((place) => place.id === selectedPlaceId)
    if (!selected) return

    mapRef.current.setCenter({ lat: selected.lat, lng: selected.lng })
  }, [loadState, places, selectedPlaceId])

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
      <div ref={mapElementRef} className="google-map-surface absolute inset-0" />
      <style>{`.google-map-surface img { max-width: none !important; }`}</style>

      {loadState === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-sm text-stone-500">
          Loading Google Map...
        </div>
      ) : null}

      {loadState === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-50 p-4 text-center">
          <p className="text-sm font-medium text-stone-700">Unable to load Google Map</p>
          <p className="text-xs text-stone-500">{errorMessage}</p>
        </div>
      ) : null}
    </div>
  )
}
