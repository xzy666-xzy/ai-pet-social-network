"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PawPrint, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function LoginPage() {
  const { t } = useLanguage()
  const { login } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const result = await login(email, password)
    if (result.success) {
      router.replace("/match")
    } else {
      setError(result.error || t.auth?.loginFailed || "Login failed")
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

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-lg mb-4">
              <PawPrint className="text-white h-8 w-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900">{t.auth?.loginTitle || "Welcome Back"}</h1>
            <p className="text-stone-500">{t.auth?.loginSubtitle || "Log in to connect with pet friends"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">{t.auth?.email || "Email"}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                <Input
                  type="email"
                  placeholder={t.auth?.emailPlaceholder || "your@email.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-xl border-stone-200 bg-white focus:border-orange-400 focus:ring-orange-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">{t.auth?.password || "Password"}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth?.passwordPlaceholder || "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 rounded-xl border-stone-200 bg-white focus:border-orange-400 focus:ring-orange-400"
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-base font-semibold"
            >
              {isLoading ? (t.auth?.loggingIn || "Logging in...") : (t.auth?.loginButton || "Log In")}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-stone-500 text-sm">
              {t.auth?.noAccount || "Don't have an account?"}{" "}
              <Link href="/register" className="text-orange-500 hover:text-orange-600 font-semibold">
                {t.auth?.signUp || "Sign Up"}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
