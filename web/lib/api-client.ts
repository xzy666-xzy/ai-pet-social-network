const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://ai-pet-social-network.onrender.com"

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "")

const ACCESS_TOKEN_KEY = "wepet_access_token"

type ApiRequestOptions = RequestInit & {
  auth?: boolean
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

function getStorage() {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage
}

export function getAccessToken() {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null
}

export function setAccessToken(token: string) {
  getStorage()?.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken() {
  getStorage()?.removeItem(ACCESS_TOKEN_KEY)
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured")
  }

  const headers = new Headers(options.headers || {})

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (options.auth) {
    const token = getAccessToken()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed with status ${response.status}`,
      response.status,
      data?.code
    )
  }

  return data as T
}

export type AuthUser = {
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

export type AuthSuccessResponse = {
  success: true
  token?: string
  access_token?: string
  user: AuthUser
}
