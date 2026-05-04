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

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const { t } = useLanguage()

  const [step, setStep] = useState(1)

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [petName, setPetName] = useState("")
  const [petType, setPetType] = useState("")
  const [petAge, setPetAge] = useState("")
  const [description, setDescription] = useState("")


  const [petAvatarFile, setPetAvatarFile] = useState<File | null>(null)
  const [petAvatarPreview, setPetAvatarPreview] = useState<string | null>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)


  const handlePetAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setPetAvatarFile(file)
    setPetAvatarPreview(URL.createObjectURL(file))
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !username || !password || !confirmPassword) {
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



        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.08)] lg:grid-cols-2">



            <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
              <div className="w-full max-w-md">

                {step === 1 ? (
                    <form onSubmit={handleNext}>

                    </form>
                ) : (


                    <form onSubmit={handleSubmit} className="space-y-4">


                      <div className="mb-6 flex flex-col items-center">
                        <label
                            htmlFor="pet-avatar-upload"
                            className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-orange-200 bg-orange-50 shadow-sm"
                        >
                          {petAvatarPreview ? (
                              <img
                                  src={petAvatarPreview}
                                  alt="Pet avatar"
                                  className="h-full w-full object-cover"
                              />
                          ) : (
                              <span className="text-3xl">🐾</span>
                          )}
                        </label>

                        <input
                            id="pet-avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePetAvatarChange}
                        />

                        <p className="mt-2 text-sm text-gray-500">Upload pet avatar</p>
                      </div>


                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          {t.auth?.petName || "Pet name"}
                        </label>
                        <input
                            type="text"
                            value={petName}
                            onChange={(e) => setPetName(e.target.value)}
                            className="w-full rounded-2xl border p-3"
                        />
                      </div>


                      <button type="submit">
                        Create Account
                      </button>

                    </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
  )
}