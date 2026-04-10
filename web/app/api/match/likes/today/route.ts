import { NextRequest, NextResponse } from "next/server"
import { getLikeQuota, getSessionUser } from "@/lib/supabase-db"

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = await getSessionUser(sessionId)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const quota = await getLikeQuota(currentUser.id)

    return NextResponse.json({
      success: true,
      isMember: quota.isMember,
      dailyLimit: quota.dailyLimit,
      usedLikes: quota.usedLikes,
      remainingLikes: quota.remainingLikes,
      memberExpiresAt: quota.memberExpiresAt,
    })
  } catch (error: unknown) {
    const message =
        error instanceof Error ? error.message : "Failed to load like quota"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}