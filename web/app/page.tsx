"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PawPrint } from "lucide-react"
import { apiRequest, getAccessToken, type AuthSuccessResponse } from "@/lib/api-client"

export default function SplashPage() {
  const router = useRouter()
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const start = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1600))
        setFadeOut(true)
        await new Promise((resolve) => setTimeout(resolve, 400))

        const token = getAccessToken()

        if (!token) {
          router.replace("/login")
          return
        }

        await apiRequest<AuthSuccessResponse>("/auth/me", {
          method: "GET",
          auth: true,
        })

        router.replace("/explore")
      } catch {
        router.replace("/login")
      }
    }

    start()
  }, [router])

  return (
      <div
          className={`min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 flex items-center justify-center transition-opacity duration-500 ${
              fadeOut ? "opacity-0" : "opacity-100"
          }`}
      >
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl flex items-center justify-center animate-pulse">
            <PawPrint className="w-12 h-12 text-white" />
          </div>

          <h1 className="mt-6 text-4xl font-extrabold text-white tracking-tight">
            WePet
          </h1>

          <p className="mt-2 text-white/90 text-sm sm:text-base">
            AI Pet Social Network
          </p>

          <div className="mt-8 flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce" />
          </div>
        </div>
      </div>
  )
}
