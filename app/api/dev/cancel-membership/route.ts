import { NextRequest, NextResponse } from "next/server"
import { cancelActiveMembership, getSessionUser } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const sessionId = req.cookies.get("session_id")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = getSessionUser(sessionId)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    cancelActiveMembership(currentUser.id)

    return NextResponse.json({
      success: true,
      message: "Membership cancelled successfully",
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel membership"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}