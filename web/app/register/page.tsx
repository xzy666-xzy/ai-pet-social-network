"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  ArrowLeft,
  Calendar,
  Dog,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  PawPrint,
  User,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { supabase } from "@/lib/supabase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type RegisterCityOption = {
  city: string
  city_lat: number
  city_lng: number
  label: {
    en: string
    ko: string
    zh: string
  }
}

const registerCityOptions: RegisterCityOption[] = [
  { city: "Seoul", city_lat: 37.5665, city_lng: 126.978, label: { en: "Seoul", zh: "首尔", ko: "서울" } },
  { city: "Busan", city_lat: 35.1796, city_lng: 129.0756, label: { en: "Busan", zh: "釜山", ko: "부산" } },
  { city: "Incheon", city_lat: 37.4563, city_lng: 126.7052, label: { en: "Incheon", zh: "仁川", ko: "인천" } },
  { city: "Daegu", city_lat: 35.8714, city_lng: 128.6014, label: { en: "Daegu", zh: "大邱", ko: "대구" } },
  { city: "Daejeon", city_lat: 36.3504, city_lng: 127.3845, label: { en: "Daejeon", zh: "大田", ko: "대전" } },
  { city: "Gwangju", city_lat: 35.1595, city_lng: 126.8526, label: { en: "Gwangju", zh: "光州", ko: "광주" } },
  { city: "Ulsan", city_lat: 35.5384, city_lng: 129.3114, label: { en: "Ulsan", zh: "蔚山", ko: "울산" } },
  { city: "Sejong", city_lat: 36.4801, city_lng: 127.289, label: { en: "Sejong", zh: "世宗", ko: "세종" } },
  { city: "Suwon", city_lat: 37.2636, city_lng: 127.0286, label: { en: "Suwon", zh: "水原", ko: "수원" } },
  { city: "Yongin", city_lat: 37.2411, city_lng: 127.1776, label: { en: "Yongin", zh: "龙仁", ko: "용인" } },
  { city: "Seongnam", city_lat: 37.42, city_lng: 127.1265, label: { en: "Seongnam", zh: "城南", ko: "성남" } },
  { city: "Goyang", city_lat: 37.6584, city_lng: 126.832, label: { en: "Goyang", zh: "高阳", ko: "고양" } },
  { city: "Ansan", city_lat: 37.3219, city_lng: 126.8309, label: { en: "Ansan", zh: "安山", ko: "안산" } },
  { city: "Anyang", city_lat: 37.3943, city_lng: 126.9568, label: { en: "Anyang", zh: "安养", ko: "안양" } },
  { city: "Bucheon", city_lat: 37.5035, city_lng: 126.766, label: { en: "Bucheon", zh: "富川", ko: "부천" } },
  { city: "Hwaseong", city_lat: 37.1995, city_lng: 126.8312, label: { en: "Hwaseong", zh: "华城", ko: "화성" } },
  { city: "Cheongju", city_lat: 36.6424, city_lng: 127.489, label: { en: "Cheongju", zh: "清州", ko: "청주" } },
  { city: "Jeonju", city_lat: 35.8242, city_lng: 127.148, label: { en: "Jeonju", zh: "全州", ko: "전주" } },
  { city: "Cheonan", city_lat: 36.8151, city_lng: 127.1139, label: { en: "Cheonan", zh: "天安", ko: "천안" } },
  { city: "Jeju", city_lat: 33.4996, city_lng: 126.5312, label: { en: "Jeju", zh: "济州", ko: "제주" } },
]

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const { t, locale } = useLanguage()

  const [step, setStep] = useState(1)

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [city, setCity] = useState("")
  const [cityLat, setCityLat] = useState<number | null>(null)
  const [cityLng, setCityLng] = useState<number | null>(null)

  const [petName, setPetName] = useState("")
  const [petAvatarFile, setPetAvatarFile] = useState<File | null>(null)
  const [petAvatarPreview, setPetAvatarPreview] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [petType, setPetType] = useState("")
  const [petAge, setPetAge] = useState("")
  const [description, setDescription] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCityChange = (value: string) => {
    const selectedCity = registerCityOptions.find((option) => option.city === value)
    setCity(selectedCity?.city || "")
    setCityLat(selectedCity?.city_lat ?? null)
    setCityLng(selectedCity?.city_lng ?? null)
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !username || !password || !confirmPassword || !city || cityLat === null || cityLng === null) {
      setError(t.auth?.fillRequired || "Please fill in all required fields")
      return
    }

    if (password.length < 6) {
      setError(t.auth?.passwordTooShort || "Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError(t.auth?.passwordMismatch || "Passwords do not match")
      return
    }

    setStep(2)
  }

  const handlePetAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    setPetAvatarFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPetAvatarPreview(reader.result)
      }
    }
    reader.readAsDataURL(file)

    const filePath = `register-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file)

    if (uploadError) {
      setError(uploadError.message)
      return
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
    setAvatarUrl(data.publicUrl)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await register({
        email,
        password,
        username,
        petName,
        petBreed: petType,
        petAge,
        petBio: description,
        avatar_url: avatarUrl || null,
        city,
        city_lat: cityLat ?? undefined,
        city_lng: cityLng ?? undefined,
      })

      if (!result.success) {
        setError(result.error || t.auth?.registerFailed || "Registration failed")
        return
      }

      router.replace("/match")
    } catch {
      setError(t.auth?.registerFailed || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                <PawPrint className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-extrabold leading-none text-stone-900">
                  WePet
                </p>
                <p className="mt-1 text-xs leading-none text-stone-500">
                  AI Pet Social Network
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />

              <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.auth?.back || "Back"}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
          <div className="grid w-full max-w-xl overflow-hidden rounded-[32px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
              <div className="w-full max-w-md">
                <div className="mb-8 text-center lg:text-left">
                  <h2 className="text-3xl font-extrabold text-stone-900">
                    {step === 1
                        ? t.auth?.registerTitle || "Create account"
                        : t.auth?.petInfoTitle || "Pet profile"}
                  </h2>

                  <p className="mt-2 text-sm text-stone-500 sm:text-base">
                    {step === 1
                        ? t.auth?.registerSubtitle || "Start your WePet journey in just a few steps."
                        : t.auth?.petInfoSubtitle || "Tell us a little about your pet."}
                  </p>

                  <div className="mt-5 flex items-center justify-center gap-2 lg:justify-start">
                    <div
                        className={`h-2.5 w-12 rounded-full transition ${
                            step >= 1 ? "bg-orange-500" : "bg-stone-200"
                        }`}
                    />
                    <div
                        className={`h-2.5 w-12 rounded-full transition ${
                            step >= 2 ? "bg-orange-500" : "bg-stone-200"
                        }`}
                    />
                  </div>
                </div>

                {error && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleNext} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.email || "Email"}
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="email"
                              placeholder={t.auth?.emailPlaceholder || "Enter your email"}
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.username || "Username"}
                        </label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="text"
                              placeholder={t.auth?.usernamePlaceholder || "Choose a username"}
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.city || "City"}
                        </label>
                        <Select value={city} onValueChange={handleCityChange}>
                          <SelectTrigger className="h-13 w-full rounded-2xl border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                            <SelectValue placeholder={t.auth?.cityPlaceholder || "Select your city"} />
                          </SelectTrigger>
                          <SelectContent
                              position="item-aligned"
                              className="max-h-64 overflow-y-auto border border-stone-200 bg-white text-stone-800 shadow-xl"
                          >
                            {registerCityOptions.map((option) => (
                                <SelectItem key={option.city} value={option.city}>
                                  {option.label[locale]}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.password || "Password"}
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type={showPassword ? "text" : "password"}
                              placeholder={t.auth?.passwordPlaceholder || "At least 6 characters"}
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-12 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                          >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.confirmPassword || "Confirm password"}
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder={t.auth?.confirmPasswordPlaceholder || "Re-enter your password"}
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-12 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          <button
                              type="button"
                              onClick={() =>
                                  setShowConfirmPassword((prev) => !prev)
                              }
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                          >
                            {showConfirmPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                          type="submit"
                          className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:scale-[1.01] hover:from-orange-600 hover:to-orange-700 active:scale-[0.99]"
                      >
                        {t.auth?.next || "Next"}
                      </button>

                      <p className="text-center text-sm text-stone-500">
                        {t.auth?.hasAccount || "Already have an account?"}{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-orange-500 hover:text-orange-600"
                        >
                          {t.auth?.logIn || "Log in"}
                        </Link>
                      </p>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex justify-center">
                        <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-orange-200 bg-orange-50 transition hover:border-orange-300 hover:bg-orange-100">
                          {petAvatarPreview ? (
                              <img
                                  src={petAvatarPreview}
                                  alt={petAvatarFile?.name || "Pet avatar preview"}
                                  className="h-full w-full object-cover"
                              />
                          ) : (
                              <PawPrint className="h-10 w-10 text-orange-400" />
                          )}
                          <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handlePetAvatarChange}
                          />
                        </label>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.petName || "Pet name"}
                        </label>
                        <div className="relative">
                          <Dog className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="text"
                              placeholder={t.auth?.petNamePlaceholder || "Enter your pet's name"}
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={petName}
                              onChange={(e) => setPetName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.petBreed || "Pet type / Breed"}
                        </label>
                        <div className="relative">
                          <PawPrint className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="text"
                              placeholder={t.auth?.petBreedPlaceholder || "e.g. Poodle, Corgi, Cat"}
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={petType}
                              onChange={(e) => setPetType(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.petAge || "Pet age"}
                        </label>
                        <div className="relative">
                          <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="number"
                              placeholder={t.auth?.petAgePlaceholder || "Enter age"}
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={petAge}
                              onChange={(e) => setPetAge(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.petBio || "Description"}
                        </label>
                        <div className="relative">
                          <FileText className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-stone-400" />
                          <textarea
                              placeholder={t.auth?.petBioPlaceholder || "Tell us something about your pet"}
                              rows={4}
                              className="w-full resize-none rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                        >
                          {t.auth?.back || "Back"}
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:scale-[1.01] hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {loading
                              ? t.auth?.registering || "Creating..."
                              : t.auth?.registerButton || "Create Account"}
                        </button>
                      </div>

                      <p className="text-center text-xs text-stone-400">
                        {t.auth?.registerSubtitle ||
                            "By creating an account, you can start using WePet right away."}
                      </p>
                    </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
  )
}
