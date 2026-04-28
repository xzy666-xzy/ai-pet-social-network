"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import {
  ApiError,
  apiRequest,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  type AuthSuccessResponse,
} from "@/lib/api-client"

export interface UserData {
  id: string
  email: string | null
  username: string | null
  pet_name: string | null
  pet_type: string | null
  pet_age: number | null
  description: string | null
  avatar_url: string | null
  created_at: string | null
  updated_at: string | null
  is_ai: boolean | null
}

interface AuthContextType {
  user: UserData | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

interface RegisterData {
  email: string
  username: string
  password: string
  petName?: string
  petBreed?: string
  petAge?: string
  petBio?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    const isPublicPath = pathname === "/login" || pathname === "/register"

    if (!token) {
      setUser(null)
      setLoading(false)

      if (!isPublicPath && typeof window !== "undefined") {
        window.location.replace("/login")
      }

      return
    }

    try {
      const data = await apiRequest<AuthSuccessResponse>("/auth/me", {
        method: "GET",
        auth: true,
      })
      setUser(data.user)
    } catch (error) {
      clearAccessToken()
      setUser(null)

      if (
        error instanceof ApiError &&
        error.status === 401 &&
        !isPublicPath &&
        typeof window !== "undefined"
      ) {
        window.location.replace("/login")
      }
    } finally {
      setLoading(false)
    }
  }, [pathname])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    try {
      const data = await apiRequest<AuthSuccessResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      const accessToken = data.access_token || data.token

      if (!accessToken) {
        throw new Error("Token not found in login response")
      }

      setAccessToken(accessToken)
      setUser(data.user)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      }
    }
  }

  const register = async (registerData: RegisterData) => {
    try {
      const data = await apiRequest<AuthSuccessResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: registerData.email,
          username: registerData.username,
          password: registerData.password,
          pet_name: registerData.petName || "",
          pet_type: registerData.petBreed || "",
          pet_age: registerData.petAge || "",
          description: registerData.petBio || "",
        }),
      })

      const accessToken = data.access_token || data.token

      if (!accessToken) {
        throw new Error("Token not found in register response")
      }

      setAccessToken(accessToken)
      setUser(data.user)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      }
    }
  }

  const logout = async () => {
    clearAccessToken()
    setUser(null)

    if (typeof window !== "undefined") {
      window.location.replace("/login")
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
