import { NextRequest, NextResponse } from "next/server"
import {
  createLike,
  getLikeQuota,
  getOrCreateConversation,
  getSessionUser,
  getUserById,
  hasLiked,
} from "@/lib/supabase-db"

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = await getSessionUser(sessionId)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json(
          { error: "targetUserId is required" },
          { status: 400 }
      )
    }

    if (targetUserId === currentUser.id) {
      return NextResponse.json(
          { error: "You cannot like yourself" },
          { status: 400 }
      )
    }

    const targetUser = await getUserById(targetUserId)

    if (!targetUser) {
      return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
      )
    }

    const quota = await getLikeQuota(currentUser.id)

    if (!quota.unlocked && quota.remaining <= 0) {
      return NextResponse.json(
          { error: "Daily like limit reached", code: "MEMBERSHIP_REQUIRED" },
          { status: 403 }
      )
    }

    const alreadyLiked = await hasLiked(currentUser.id, targetUserId)

    const conversation = await getOrCreateConversation(
        currentUser.id,
        targetUserId
    )

    if (alreadyLiked) {
      const latestQuota = await getLikeQuota(currentUser.id)

      return NextResponse.json({
        success: true,
        alreadyLiked: true,
        isMutualMatch: false,
        conversation,
        remainingLikes: latestQuota.remaining,
      })
    }

    const result = await createLike(currentUser.id, targetUserId)

    if (!result.success) {
      return NextResponse.json(
          { error: result.error || "Failed to like user" },
          { status: 400 }
      )
    }

    const latestQuota = await getLikeQuota(currentUser.id)

    return NextResponse.json({
      success: true,
      alreadyLiked: false,
      isMutualMatch: false,
      like: result.like,
      conversation,
      remainingLikes: latestQuota.remaining,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Like failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}