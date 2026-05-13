"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiRequest, getAccessToken } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { supabase } from "@/lib/supabase"

export default function ProfileEditPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)
  const [form, setForm] = useState({
    petName: "",
    petAge: "",
    petType: "",
    petGender: "",
    tagline: "",
    about: "",
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    if (!user) return
    if (initialized.current) return

    initialized.current = true
    setForm({
      petName: user.pet_name ?? "",
      petAge: user.pet_age?.toString() ?? "",
      petType: user.pet_type ?? "",
      petGender: user.pet_gender ?? "",
      tagline: user.tagline ?? "",
      about: user.description ?? "",
    })
  }, [user])

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarFile(file)

    // 预览
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result)
      }
    }
    reader.readAsDataURL(file)

    // 上传到 Supabase
    const safeExtension = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
    const filePath = safeExtension ? `avatar-${Date.now()}.${safeExtension}` : `avatar-${Date.now()}`
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file)

    if (uploadError) {
      alert(`${t.profile.editPage.uploadFailedPrefix}${uploadError.message}`)
      return
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
    setAvatarUrl(data.publicUrl)
  }

  const handleSave = async () => {
    const token = getAccessToken()

    if (!token) {
      alert(t.profile.editPage.loginRequired)
      router.push("/login")
      return
    }

    try {
      await apiRequest("/profile", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          pet_name: form.petName,
          pet_age: form.petAge,
          pet_type: form.petType,
          pet_gender: form.petGender || null,
          description: form.about,
          tagline: form.tagline,
          avatar_url: avatarUrl || undefined,
        }),
      })

      alert(t.profile.editPage.saveSuccess)
      await refreshUser()
      router.push("/profile")
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : t.profile.editPage.saveFailed)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-orange-50 to-white p-4">
      <div className="mx-auto max-w-md space-y-5 pt-4">
        <Card className="rounded-3xl border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm"
              aria-label={t.profile.back}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div>
              <p className="text-sm font-semibold text-orange-500">{t.profile.editPage.brand}</p>
              <h1 className="mt-2 text-2xl font-bold text-stone-900">{t.profile.editPage.title}</h1>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                {t.profile.editPage.petNameLabel}
              </label>
              <Input
                value={form.petName}
                onChange={(event) => updateField("petName", event.target.value)}
                placeholder={t.profile.editPage.petNamePlaceholder}
                className="rounded-2xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                {t.profile.editPage.petAgeLabel}
              </label>
              <Input
                value={form.petAge}
                onChange={(event) => updateField("petAge", event.target.value)}
                placeholder={t.profile.editPage.petAgePlaceholder}
                className="rounded-2xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                {t.profile.editPage.petTypeLabel}
              </label>
              <Input
                value={form.petType}
                onChange={(event) => updateField("petType", event.target.value)}
                placeholder={t.profile.editPage.petTypePlaceholder}
                className="rounded-2xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">宠物性别</label>
              <select
                value={form.petGender}
                onChange={(event) => updateField("petGender", event.target.value)}
                className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">请选择宠物性别</option>
                <option value="male">男 ♂</option>
                <option value="female">女 ♀</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                {t.profile.editPage.taglineLabel}
              </label>
              <Input
                value={form.tagline}
                onChange={(event) => updateField("tagline", event.target.value)}
                placeholder={t.profile.editPage.taglinePlaceholder}
                className="rounded-2xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                {t.profile.editPage.aboutLabel}
              </label>
              <Textarea
                value={form.about}
                onChange={(event) => updateField("about", event.target.value)}
                placeholder={t.profile.editPage.aboutPlaceholder}
                className="min-h-28 rounded-2xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                {t.profile.editPage.avatarLabel}
              </label>
              {avatarPreview && (
                <img src={avatarPreview} alt={t.profile.editPage.avatarPreviewAlt} className="mb-2 h-20 w-20 rounded-full object-cover" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-orange-500 px-4 text-white hover:bg-orange-600"
              >
                {avatarFile ? t.profile.editPage.avatarSelectedRechoose : t.profile.editPage.changeAvatar}
              </Button>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSave}
            className="mt-6 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600"
          >
            {t.profile.editPage.saveButton}
          </Button>
        </Card>
      </div>
    </div>
  )
}
