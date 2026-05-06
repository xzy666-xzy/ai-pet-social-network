"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api-client"

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

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [event, setEvent] = useState<ApiEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadEvent() {
      try {
        setLoading(true)
        setError("")

        const response = await apiRequest<EventDetailResponse>(`/events/${params.id}`)

        if (!cancelled) {
          setEvent(response.data || null)
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

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-24">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-stone-500"
      >
        ← 返回
      </button>

      <h1 className="text-2xl font-bold text-stone-900">编辑活动</h1>

      {loading && <p className="text-sm text-stone-500">正在加载活动...</p>}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {event && (
        <div className="space-y-4">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title || "活动图片"}
              className="aspect-[16/9] w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-400">
              暂无图片
            </div>
          )}

          <div className="space-y-2 text-sm text-stone-700">
            <p>标题：{event.title || ""}</p>
            <p>时间：{event.event_time || event.time || ""}</p>
            <p>人数限制：{event.max_people ?? ""}</p>
            <p>活动介绍：{event.description || ""}</p>
            <p>活动组织者：{event.organizer_name || ""}</p>
          </div>
        </div>
      )}
    </div>
  )
}
