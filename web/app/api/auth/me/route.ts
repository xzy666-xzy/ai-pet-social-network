import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value
    if (!sessionId) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const user = getSessionUser(sessionId)
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error: unknown) {
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
