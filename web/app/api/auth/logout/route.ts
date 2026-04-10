import { NextRequest, NextResponse } from "next/server"
import { deleteSession } from "@/lib/supabase-db"

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value

    if (sessionId) {
      await deleteSession(sessionId)
    }

    const res = NextResponse.json({ success: true })

    res.cookies.set("session_id", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires: new Date(0),
    })

    return res
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}