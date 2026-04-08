import { NextRequest, NextResponse } from "next/server"
import { getAvailableMatchUsers, getSessionUser } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = getSessionUser(sessionId)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const users = getAvailableMatchUsers(currentUser.id)

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load users"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}