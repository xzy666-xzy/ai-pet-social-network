"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ImagePlus, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { supabase } from "@/lib/supabase"

const CREATE_EVENT_DRAFT_KEY = "create_event_draft"
const CREATE_EVENT_LOCATION_KEY = "create_event_location"

export default function CreateExploreEventPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useLanguage()
  const createEventText = t.explore.createEvent
  const [title, setTitle] = useState("")
  const [time, setTime] = useState("")
  const [maxPeople, setMaxPeople] = useState("")
  const [description, setDescription] = useState("")
  const [imagePreview, setImagePreview] = useState("")
  const [eventImageUrl, setEventImageUrl] = useState("")
  const [location, setLocation] = useState({ lat: "", lng: "" })
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const organizerName = user?.pet_name || user?.username || user?.email || ""

  useEffect(() => {
    const savedDraft = sessionStorage.getItem(CREATE_EVENT_DRAFT_KEY)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)

        setTitle(String(parsed?.title || ""))
        setEventImageUrl(String(parsed?.image_url || ""))
        setImagePreview(String(parsed?.image_preview_url || ""))
        setTime(String(parsed?.time || ""))
        setMaxPeople(String(parsed?.max_people || ""))
        setDescription(String(parsed?.description || ""))
        setLocation({
          lat: String(parsed?.lat || ""),
          lng: String(parsed?.lng || ""),
        })
      } catch {
        sessionStorage.removeItem(CREATE_EVENT_DRAFT_KEY)
      }
    }

    const savedLocation = sessionStorage.getItem(CREATE_EVENT_LOCATION_KEY)
    if (!savedLocation) return

    try {
      const parsed = JSON.parse(savedLocation)
      const lat = Number(parsed?.lat)
      const lng = Number(parsed?.lng)

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLocation({
          lat: String(lat),
          lng: String(lng),
        })
        setShowLocationPicker(true)
      }
    } catch {
      sessionStorage.removeItem(CREATE_EVENT_LOCATION_KEY)
    }
  }, [])

  const saveDraft = () => {
    sessionStorage.setItem(
      CREATE_EVENT_DRAFT_KEY,
      JSON.stringify({
        title,
        image_url: eventImageUrl,
        image_preview_url: imagePreview,
        time,
        max_people: maxPeople,
        description,
        organizer_name: organizerName,
        lat: location.lat,
        lng: location.lng,
      })
    )
  }

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    setImagePreview(URL.createObjectURL(file))

    const filePath = `event-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file)

    if (uploadError) {
      console.error(uploadError)
      alert(createEventText.imageUploadFailed)
      return
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
    setEventImageUrl(data.publicUrl)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id || submitting) return

    setSubmitting(true)

    try {
      const selectedLat = location.lat.trim() ? Number(location.lat) : null
      const selectedLng = location.lng.trim() ? Number(location.lng) : null

      await apiRequest("/events", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          title,
          image_url: eventImageUrl,
          time,
          max_people: Number(maxPeople),
          description,
          organizer_id: user.id,
          city: user.city || null,
          lat: Number.isFinite(selectedLat) ? selectedLat : null,
          lng: Number.isFinite(selectedLng) ? selectedLng : null,
        }),
      })

      router.push("/explore")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      console.error("Failed to create event", {
        error,
        status: error instanceof ApiError ? error.status : undefined,
        message,
        code: error instanceof ApiError ? error.code : undefined,
        data: error instanceof ApiError ? error.data : undefined,
      })
      alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-4 pb-28">
      <header>
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 text-sm text-stone-500"
        >
          ← {createEventText.back}
        </button>
        <h1 className="text-2xl font-bold text-stone-900">{createEventText.title}</h1>
        <p className="mt-1 text-sm text-stone-500">{createEventText.subtitle}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="eventImageUrl" value={eventImageUrl} readOnly />
        <input type="hidden" name="lat" value={location.lat} readOnly />
        <input type="hidden" name="lng" value={location.lng} readOnly />
        <Card className="space-y-4 rounded-2xl border-stone-100 p-4 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="event-title">{createEventText.eventName}</Label>
            <Input
              id="event-title"
              placeholder={createEventText.eventNamePlaceholder}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-image">{createEventText.imageUpload}</Label>
            <label
              htmlFor="event-image"
              className="flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-orange-200 bg-orange-50 text-orange-500"
            >
              {imagePreview ? (
                <img src={imagePreview} alt={createEventText.imagePreviewAlt} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-sm font-medium">
                  <ImagePlus className="h-7 w-7" />
                  {createEventText.uploadImage}
                </div>
              )}
            </label>
            <input id="event-image" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-time">{createEventText.eventTime}</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input
                id="event-time"
                type="datetime-local"
                className="pl-10"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-limit">{createEventText.peopleLimit}</Label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input
                id="event-limit"
                type="number"
                min="1"
                placeholder={createEventText.peopleLimitPlaceholder}
                className="pl-10"
                value={maxPeople}
                onChange={(event) => setMaxPeople(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">{createEventText.description}</Label>
            <Textarea
              id="event-description"
              rows={5}
              placeholder={createEventText.descriptionPlaceholder}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-organizer">{createEventText.organizer}</Label>
            <Input id="event-organizer" value={organizerName} readOnly placeholder={createEventText.currentUser} />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 border-orange-200 text-orange-500"
            onClick={() => {
              saveDraft()
              router.push("/explore/create/location")
            }}
          >
            <MapPin className="h-4 w-4" />
            {createEventText.mapLocation}
          </Button>

          {showLocationPicker && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-3">
              <div className="space-y-2">
                <Label htmlFor="event-lat">lat</Label>
                <Input
                  id="event-lat"
                  inputMode="decimal"
                  placeholder="37.3212"
                  value={location.lat}
                  onChange={(event) => setLocation((prev) => ({ ...prev, lat: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-lng">lng</Label>
                <Input
                  id="event-lng"
                  inputMode="decimal"
                  placeholder="126.8309"
                  value={location.lng}
                  onChange={(event) => setLocation((prev) => ({ ...prev, lng: event.target.value }))}
                />
              </div>
            </div>
          )}
        </Card>

        <Button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
        >
          {submitting ? createEventText.submitting : createEventText.submit}
        </Button>
      </form>
    </div>
  )
}
