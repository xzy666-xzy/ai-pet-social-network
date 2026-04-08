import { NextRequest, NextResponse } from "next/server"
import { deleteSession } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value
    if (sessionId) {
      deleteSession(sessionId)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set("session_id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Logout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
