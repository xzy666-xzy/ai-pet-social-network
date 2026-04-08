"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PawPrint, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Dog, Calendar, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function RegisterPage() {
  const { t } = useLanguage()
  const { register } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [petName, setPetName] = useState("")
  const [petBreed, setPetBreed] = useState("")
  const [petAge, setPetAge] = useState("")
  const [petBio, setPetBio] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleNext = () => {
    setError("")
    if (!email || !username || !password) {
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
    setIsLoading(true)

    const result = await register({
      email,
      username,
      password,
      petName,
      petBreed,
      petAge,
      petBio,
    })

    if (result.success) {
      router.push("/match")
    } else {
      setError(result.error || t.auth?.registerFailed || "Registration failed")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex flex-col">
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80 backdrop-blur-lg border-b border-orange-100">
        <Link href="/" className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-stone-600" />
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-2xl shadow-lg">
            <PawPrint className="text-white h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg text-stone-900">WePet</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-lg mb-4">
              <PawPrint className="text-white h-8 w-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900">
              {step === 1 ? (t.auth?.registerTitle || "Create Account") : (t.auth?.petInfoTitle || "Pet Information")}
            </h1>
            <p className="text-stone-500">
              {step === 1
                ? (t.auth?.registerSubtitle || "Join the pet social community")
                : (t.auth?.petInfoSubtitle || "Tell us about your pet (optional)")}
            </p>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className={`h-2 w-8 rounded-full ${step >= 1 ? "bg-orange-500" : "bg-stone-200"}`} />
              <div className={`h-2 w-8 rounded-full ${step >= 2 ? "bg-orange-500" : "bg-stone-200"}`} />
            </div>
          </div>

          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext() }} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">{t.auth?.email || "Email"} *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                    <Input
                      type="email"
                      placeholder={t.auth?.emailPlaceholder || "your@email.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">{t.auth?.username || "Username"} *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                    <Input
                      type="text"
                      placeholder={t.auth?.usernamePlaceholder || "Choose a username"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">{t.auth?.password || "Password"} *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t.auth?.passwordPlaceholder || "At least 6 characters"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 rounded-xl border-stone-200 bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">{t.auth?.confirmPassword || "Confirm Password"} *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t.auth?.confirmPasswordPlaceholder || "Confirm your password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-white"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-base font-semibold"
                >
                  {t.auth?.next || "Next"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">{t.auth?.petName || "Pet Name"}</label>
                  <div className="relative">
                    <Dog className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                    <Input
                      type="text"
                      placeholder={t.auth?.petNamePlaceholder || "Your pet's name"}
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">{t.auth?.petBreed || "Breed"}</label>
                  <div className="relative">
                    <PawPrint className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                    <Input
                      type="text"
                      placeholder={t.auth?.petBreedPlaceholder || "e.g. Golden Retriever"}
                      value={petBreed}
                      onChange={(e) => setPetBreed(e.target.value)}
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">{t.auth?.petAge || "Age"}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                    <Input
                      type="text"
                      placeholder={t.auth?.petAgePlaceholder || "e.g. 3 years"}
                      value={petAge}
                      onChange={(e) => setPetAge(e.target.value)}
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">{t.auth?.petBio || "About Your Pet"}</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                    <Input
                      type="text"
                      placeholder={t.auth?.petBioPlaceholder || "Describe your pet's personality"}
                      value={petBio}
                      onChange={(e) => setPetBio(e.target.value)}
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-stone-200 text-stone-700"
                  >
                    {t.auth?.back || "Back"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
                  >
                    {isLoading ? (t.auth?.registering || "Creating...") : (t.auth?.registerButton || "Create Account")}
                  </Button>
                </div>
              </>
            )}
          </form>

          {step === 1 && (
            <div className="text-center">
              <p className="text-stone-500 text-sm">
                {t.auth?.hasAccount || "Already have an account?"}{" "}
                <Link href="/login" className="text-orange-500 hover:text-orange-600 font-semibold">
                  {t.auth?.logIn || "Log In"}
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
