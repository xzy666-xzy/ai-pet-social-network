"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PawPrint } from "lucide-react"

export default function SplashPage() {
  const router = useRouter()
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const start = async () => {
      try {
        // 启动画面停留时间
        await new Promise((resolve) => setTimeout(resolve, 1600))

        // 开始淡出动画
        setFadeOut(true)

        await new Promise((resolve) => setTimeout(resolve, 400))

        // 检查是否登录
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        })

        if (res.ok) {
          // 已登录
          router.replace("/explore")
        } else {
          // 未登录
          router.replace("/login")
        }
      } catch (error) {
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

          {/* Logo */}
          <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl flex items-center justify-center animate-pulse">
            <PawPrint className="w-12 h-12 text-white" />
          </div>

          {/* App name */}
          <h1 className="mt-6 text-4xl font-extrabold text-white tracking-tight">
            WePet
          </h1>

          {/* slogan */}
          <p className="mt-2 text-white/90 text-sm sm:text-base">
            AI Pet Social Network
          </p>

          {/* loading dots */}
          <div className="mt-8 flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce" />
          </div>

        </div>
      </div>
  )
}