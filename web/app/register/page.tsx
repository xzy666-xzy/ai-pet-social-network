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
import { LanguageSwitcher } from "@/components/language-switcher"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()

  const [step, setStep] = useState(1)

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [petName, setPetName] = useState("")
  const [petType, setPetType] = useState("")
  const [petAge, setPetAge] = useState("")
  const [description, setDescription] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !username || !password || !confirmPassword) {
      setError("이메일, 사용자 이름, 비밀번호를 모두 입력해주세요.")
      return
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
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
        setError(result.error || "회원가입에 실패했습니다.")
        return
      }

      router.replace("/match")
    } catch {
      setError("회원가입 중 오류가 발생했습니다.")
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
                Back
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.08)] lg:grid-cols-2">
            <div className="relative hidden flex-col justify-between bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 p-10 text-white lg:flex">
              <div>
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/20 backdrop-blur-md">
                  <PawPrint className="h-8 w-8" />
                </div>

                <h1 className="mt-8 text-4xl font-extrabold leading-tight">
                  Welcome to
                  <br />
                  WePet
                </h1>

                <p className="mt-4 max-w-md text-base leading-7 text-white/90">
                  Create your pet profile, find new friends, and enjoy an
                  AI-powered social experience made for pet owners.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/20 bg-white/15 p-4 backdrop-blur-md">
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <Dog className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">Pet Profile</p>
                  <p className="mt-1 text-sm text-white/80">
                    Introduce your lovely pet.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/20 bg-white/15 p-4 backdrop-blur-md">
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <PawPrint className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">Smart Matching</p>
                  <p className="mt-1 text-sm text-white/80">
                    Connect with the right pet friends.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
              <div className="w-full max-w-md">
                <div className="mb-8 text-center lg:text-left">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-xl lg:mx-0">
                    <PawPrint className="h-8 w-8 text-white" />
                  </div>

                  <h2 className="text-3xl font-extrabold text-stone-900">
                    {step === 1 ? "Create account" : "Pet profile"}
                  </h2>

                  <p className="mt-2 text-sm text-stone-500 sm:text-base">
                    {step === 1
                        ? "Start your WePet journey in just a few steps."
                        : "Tell us a little about your pet."}
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
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="email"
                              placeholder="Enter your email"
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          Username
                        </label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="text"
                              placeholder="Choose a username"
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type={showPassword ? "text" : "password"}
                              placeholder="At least 6 characters"
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
                          Confirm password
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Re-enter your password"
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
                        Next
                      </button>

                      <p className="text-center text-sm text-stone-500">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-orange-500 hover:text-orange-600"
                        >
                          Log in
                        </Link>
                      </p>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          Pet name
                        </label>
                        <div className="relative">
                          <Dog className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="text"
                              placeholder="Enter your pet's name"
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={petName}
                              onChange={(e) => setPetName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          Pet type / Breed
                        </label>
                        <div className="relative">
                          <PawPrint className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="text"
                              placeholder="e.g. Poodle, Corgi, Cat"
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={petType}
                              onChange={(e) => setPetType(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          Pet age
                        </label>
                        <div className="relative">
                          <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                          <input
                              type="number"
                              placeholder="Enter age"
                              className="h-13 w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              value={petAge}
                              onChange={(e) => setPetAge(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-700">
                          Description
                        </label>
                        <div className="relative">
                          <FileText className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-stone-400" />
                          <textarea
                              placeholder="Tell us something about your pet"
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
                          Back
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:scale-[1.01] hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {loading ? "Creating..." : "Create Account"}
                        </button>
                      </div>

                      <p className="text-center text-xs text-stone-400">
                        By creating an account, you can start using WePet right away.
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
