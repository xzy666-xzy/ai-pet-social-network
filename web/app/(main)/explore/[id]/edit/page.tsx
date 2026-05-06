"use client"

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api-client"
import { useLanguage } from "@/lib/i18n/language-context"
import { supabase } from "@/lib/supabase"

type ApiEvent = {
  title: string | null
  image_url: string | null
  time: string | null
  event_time?: string | null
  max_people: number | null
  description: string | null
  organizer_name?: string | null
}

type EventDetailResponse = {
  success: true
  data?: ApiEvent
}

type EventUpdateResponse = {
  success: true
  data?: ApiEvent
}

function toDatetimeLocalValue(value?: string | null) {
  return value ? value.slice(0, 16) : ""
}

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { t } = useLanguage()
  const copy = t.explore.editEvent
  const [event, setEvent] = useState<ApiEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [title, setTitle] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imagePreviewUrl, setImagePreviewUrl] = useState("")
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [time, setTime] = useState("")
  const [maxPeople, setMaxPeople] = useState("")
  const [description, setDescription] = useState("")
  const [organizerName, setOrganizerName] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadEvent() {
      try {
        setLoading(true)
        setError("")

        const response = await apiRequest<EventDetailResponse>(`/events/${params.id}`)
        const eventData = response.data || null

        if (!cancelled) {
          setEvent(eventData)
          setTitle(eventData?.title || "")
          setImageUrl(eventData?.image_url || "")
          setImagePreviewUrl(eventData?.image_url || "")
          setTime(toDatetimeLocalValue(eventData?.event_time || eventData?.time))
          setMaxPeople(eventData?.max_people == null ? "" : String(eventData.max_people))
          setDescription(eventData?.description || "")
          setOrganizerName(eventData?.organizer_name || "")
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (!cancelled) {
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (params.id) {
      loadEvent()
    }

    return () => {
      cancelled = true
    }
  }, [params.id])

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()

    try {
      setSaving(true)
      setError("")
      let nextImageUrl = imageUrl

      if (selectedImageFile) {
        const filePath = `event-${Date.now()}-${selectedImageFile.name}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, selectedImageFile)

        if (uploadError) {
          throw uploadError
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
        nextImageUrl = data.publicUrl
        setImageUrl(nextImageUrl)
      }

      await apiRequest<EventUpdateResponse>(`/events/${params.id}`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          title,
          image_url: nextImageUrl,
          time,
          max_people: maxPeople ? Number(maxPeople) : null,
          description,
          organizer_name: organizerName,
        }),
      })

      router.push("/explore")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  function handleImageChange(changeEvent: ChangeEvent<HTMLInputElement>) {
    const file = changeEvent.target.files?.[0]

    if (!file) {
      return
    }

    setImagePreviewUrl(URL.createObjectURL(file))
    setSelectedImageFile(file)
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-24">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-stone-500"
      >
        ← {copy.back}
      </button>

      <h1 className="text-2xl font-bold text-stone-900">{copy.title}</h1>

      {loading && <p className="text-sm text-stone-500">{copy.loading}</p>}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {event && (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block cursor-pointer">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt={title || copy.imageAlt}
                className="aspect-[16/9] w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-400">
                {copy.noImage}
              </div>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
          </label>

          <div className="space-y-3">
            <label className="block space-y-1 text-sm font-medium text-stone-700">
              <span>{copy.eventTitle}</span>
              <input
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="block space-y-1 text-sm font-medium text-stone-700">
              <span>{copy.imageUrl}</span>
              <input
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
            </label>

            <label className="block space-y-1 text-sm font-medium text-stone-700">
              <span>{copy.eventTime}</span>
              <input
                type="datetime-local"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>

            <label className="block space-y-1 text-sm font-medium text-stone-700">
              <span>{copy.maxPeople}</span>
              <input
                type="number"
                min="1"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                value={maxPeople}
                onChange={(event) => setMaxPeople(event.target.value)}
              />
            </label>

            <label className="block space-y-1 text-sm font-medium text-stone-700">
              <span>{copy.description}</span>
              <textarea
                rows={5}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label className="block space-y-1 text-sm font-medium text-stone-700">
              <span>{copy.organizer}</span>
              <input
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                value={organizerName}
                onChange={(event) => setOrganizerName(event.target.value)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-xl bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-600"
          >
            {saving ? `${copy.save}...` : copy.save}
          </button>
        </form>
      )}
    </div>
  )
}
