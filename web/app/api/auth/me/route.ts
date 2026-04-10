import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/supabase-db"

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value
    const user = await getSessionUser(sessionId)

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    const message =
        error instanceof Error ? error.message : "Failed to fetch user"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}