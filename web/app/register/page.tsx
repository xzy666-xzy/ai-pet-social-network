"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [petName, setPetName] = useState("")
  const [petType, setPetType] = useState("")
  const [petAge, setPetAge] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim() || !petName.trim() || !petType.trim()) {
      setError("이메일, 비밀번호, 반려동물 이름, 품종을 입력해주세요.")
      return
    }

    if (password.trim().length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          pet_name: petName,
          pet_type: petType,
          pet_age: petAge,
          description,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Registration failed")
      }

      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm border">
          <h1 className="text-2xl font-bold mb-6 text-center">회원가입</h1>

          {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                {error}
              </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
                className="w-full rounded-xl border px-4 py-3"
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <input
                className="w-full rounded-xl border px-4 py-3"
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <input
                className="w-full rounded-xl border px-4 py-3"
                type="text"
                placeholder="반려동물 이름"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
            />

            <input
                className="w-full rounded-xl border px-4 py-3"
                type="text"
                placeholder="품종"
                value={petType}
                onChange={(e) => setPetType(e.target.value)}
            />

            <input
                className="w-full rounded-xl border px-4 py-3"
                type="number"
                placeholder="나이"
                value={petAge}
                onChange={(e) => setPetAge(e.target.value)}
            />

            <textarea
                className="w-full rounded-xl border px-4 py-3"
                placeholder="반려동물 소개"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "등록 중..." : "계정 만들기"}
            </button>
          </form>
        </div>
      </div>
  )
}