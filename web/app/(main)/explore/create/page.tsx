"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ImagePlus, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"

export default function CreateExploreEventPage() {
  const router = useRouter()
  const { user } = useAuth()
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
      alert("活动图片上传失败")
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
          lat: Number(location.lat),
          lng: Number(location.lng),
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
        <h1 className="text-2xl font-bold text-stone-900">创建活动</h1>
        <p className="mt-1 text-sm text-stone-500">填写活动信息，邀请附近的宠物朋友参加。</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="eventImageUrl" value={eventImageUrl} readOnly />
        <input type="hidden" name="lat" value={location.lat} readOnly />
        <input type="hidden" name="lng" value={location.lng} readOnly />
        <Card className="space-y-4 rounded-2xl border-stone-100 p-4 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="event-title">活动名称</Label>
            <Input
              id="event-title"
              placeholder="请输入活动名称"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-image">活动图片上传</Label>
            <label
              htmlFor="event-image"
              className="flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-orange-200 bg-orange-50 text-orange-500"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="活动图片预览" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-sm font-medium">
                  <ImagePlus className="h-7 w-7" />
                  上传活动图片
                </div>
              )}
            </label>
            <input id="event-image" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-time">活动时间</Label>
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
            <Label htmlFor="event-limit">人数限制</Label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input
                id="event-limit"
                type="number"
                min="1"
                placeholder="例如 20"
                className="pl-10"
                value={maxPeople}
                onChange={(event) => setMaxPeople(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">活动介绍</Label>
            <Textarea
              id="event-description"
              rows={5}
              placeholder="介绍活动内容、集合地点和注意事项"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-organizer">活动组织者</Label>
            <Input id="event-organizer" value={organizerName} readOnly placeholder="当前用户" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 border-orange-200 text-orange-500"
            onClick={() => setShowLocationPicker((prev) => !prev)}
          >
            <MapPin className="h-4 w-4" />
            地图定位
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
          {submitting ? "提交中..." : "提交"}
        </Button>
      </form>
    </div>
  )
}
