import { NextRequest, NextResponse } from "next/server"
import { createUser, createSession } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, username, password, petName, petBreed, petAge, petBio } = body

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Email, username, and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const user = createUser(email, username, password, petName, petBreed, petAge, petBio)
    const sessionId = createSession(user.id)

    const response = NextResponse.json({ user, success: true }, { status: 201 })
    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Registration failed"
    if (message.includes("UNIQUE constraint failed: users.email")) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    if (message.includes("UNIQUE constraint failed: users.username")) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
