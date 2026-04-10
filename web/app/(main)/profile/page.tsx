"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
          <div className="mx-auto max-w-md pt-10 text-center text-stone-500">
            Loading profile...
          </div>
        </div>
    )
  }

  if (!user) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
          <div className="mx-auto max-w-md pt-10 text-center">
            <p className="text-stone-600 mb-4">Please log in first.</p>
            <Button onClick={() => (window.location.href = "/login")}>
              Go to Login
            </Button>
          </div>
        </div>
    )
  }

  const displayName =
      user.username?.trim() ||
      user.pet_name?.trim() ||
      user.email?.split("@")[0] ||
      "User"

  const displayInitial =
      user.username?.trim()?.charAt(0)?.toUpperCase() ||
      user.pet_name?.trim()?.charAt(0)?.toUpperCase() ||
      user.email?.trim()?.charAt(0)?.toUpperCase() ||
      "U"

  const petName = user.pet_name || "No pet name yet"
  const petType = user.pet_type || "No pet type yet"
  const petAge =
      user.pet_age !== null && user.pet_age !== undefined
          ? `${user.pet_age} yrs`
          : "Age not set"

  const bio =
      user.description || "No description yet. Add your pet profile info."

  return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
        <div className="mx-auto max-w-md space-y-4 pt-4">
          <Card className="p-4 rounded-2xl border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                  <img
                      src={user.avatar_url}
                      alt={displayName}
                      className="h-12 w-12 rounded-full object-cover border"
                  />
              ) : (
                  <div className="h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {displayInitial}
                  </div>
              )}

              <div className="min-w-0">
                <p className="font-bold text-stone-900 truncate">{displayName}</p>
                <p className="text-xs text-stone-500 truncate">{user.email}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl">
            <h2 className="text-lg font-bold text-stone-900 mb-3">Pet Profile</h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-stone-500">Pet Name</p>
                <p className="font-medium text-stone-900">{petName}</p>
              </div>

              <div>
                <p className="text-stone-500">Pet Type</p>
                <p className="font-medium text-stone-900">{petType}</p>
              </div>

              <div>
                <p className="text-stone-500">Pet Age</p>
                <p className="font-medium text-stone-900">{petAge}</p>
              </div>

              <div>
                <p className="text-stone-500">Description</p>
                <p className="font-medium text-stone-900">{bio}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl">
            <h2 className="text-lg font-bold text-stone-900 mb-3">Account Info</h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-stone-500">Username</p>
                <p className="font-medium text-stone-900">
                  {user.username || "Not set"}
                </p>
              </div>

              <div>
                <p className="text-stone-500">Created At</p>
                <p className="font-medium text-stone-900">
                  {user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : "Unknown"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
  )
}