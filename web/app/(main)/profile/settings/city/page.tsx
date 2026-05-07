"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"

type CityOption = {
  city: string
  city_lat: number
  city_lng: number
}

const cityOptions: CityOption[] = [
  { city: "Seoul", city_lat: 37.5665, city_lng: 126.978 },
  { city: "Busan", city_lat: 35.1796, city_lng: 129.0756 },
  { city: "Incheon", city_lat: 37.4563, city_lng: 126.7052 },
  { city: "Daegu", city_lat: 35.8714, city_lng: 128.6014 },
  { city: "Daejeon", city_lat: 36.3504, city_lng: 127.3845 },
  { city: "Gwangju", city_lat: 35.1595, city_lng: 126.8526 },
  { city: "Ulsan", city_lat: 35.5384, city_lng: 129.3114 },
  { city: "Sejong", city_lat: 36.4801, city_lng: 127.289 },
  { city: "Suwon", city_lat: 37.2636, city_lng: 127.0286 },
  { city: "Yongin", city_lat: 37.2411, city_lng: 127.1776 },
  { city: "Seongnam", city_lat: 37.42, city_lng: 127.1265 },
  { city: "Goyang", city_lat: 37.6584, city_lng: 126.832 },
  { city: "Ansan", city_lat: 37.3219, city_lng: 126.8309 },
  { city: "Anyang", city_lat: 37.3943, city_lng: 126.9568 },
  { city: "Bucheon", city_lat: 37.5035, city_lng: 126.766 },
  { city: "Hwaseong", city_lat: 37.1995, city_lng: 126.8312 },
  { city: "Cheongju", city_lat: 36.6424, city_lng: 127.489 },
  { city: "Jeonju", city_lat: 35.8242, city_lng: 127.148 },
  { city: "Cheonan", city_lat: 36.8151, city_lng: 127.1139 },
  { city: "Jeju", city_lat: 33.4996, city_lng: 126.5312 },
]

export default function CitySettingsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { refreshUser } = useAuth()
  const [selectedCity, setSelectedCity] = useState(cityOptions[0].city)
  const [saving, setSaving] = useState(false)

  const currentCity =
    cityOptions.find((option) => option.city === selectedCity) ?? cityOptions[0]

  const handleSave = async () => {
    if (saving) return

    try {
      setSaving(true)

      await apiRequest("/profile", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          city: currentCity.city,
          city_lat: currentCity.city_lat,
          city_lng: currentCity.city_lng,
        }),
      })

      await refreshUser()
      router.push("/settings")
    } catch (error) {
      alert(error instanceof Error ? error.message : t.profile.citySaveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4">
      <div className="mx-auto max-w-md pt-4">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm"
            aria-label={t.profile.back}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-stone-900">
            {t.profile.switchCity}
          </h1>
        </div>

        <Card className="rounded-3xl border-orange-100 bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                {t.profile.citySelectLabel}
              </label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-11 w-full rounded-xl border-orange-100 bg-white">
                  <SelectValue placeholder={t.profile.citySelectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((option) => (
                    <SelectItem key={option.city} value={option.city}>
                      {option.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                {t.profile.currentSelectedCity}
              </p>
              <p className="mt-2 text-lg font-bold text-stone-900">
                {currentCity.city}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {currentCity.city_lat.toFixed(4)}, {currentCity.city_lng.toFixed(4)}
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-11 w-full rounded-xl bg-orange-500 text-white hover:bg-orange-600"
            >
              {saving ? t.profile.savingCity : t.profile.saveCity}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
