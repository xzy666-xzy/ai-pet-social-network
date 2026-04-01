import { NextRequest, NextResponse } from "next/server"
import { createLike, getLikeQuota, getSessionUser, getUserById, hasLiked } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = getSessionUser(sessionId)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 })
    }

    if (targetUserId === currentUser.id) {
      return NextResponse.json({ error: "You cannot like yourself" }, { status: 400 })
    }

    const targetUser = getUserById(targetUserId)

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 })
    }

    const alreadyLiked = hasLiked(currentUser.id, targetUserId)
    const quota = getLikeQuota(currentUser.id)

    if (!alreadyLiked && !quota.isMember && quota.remainingLikes <= 0) {
      return NextResponse.json(
        {
          error: "今日红心次数已用完，开通会员后可继续喜欢。",
          code: "MEMBERSHIP_REQUIRED",
        },
        { status: 403 }
      )
    }

    const result = createLike(currentUser.id, targetUserId)

    return NextResponse.json({
      success: true,
      liked: true,
      alreadyLiked: result.already_liked,
      isMutualMatch: result.is_mutual_match,
      remainingLikes: result.remaining_likes,
      conversationId: result.conversation.id,
      messageLimit: result.is_mutual_match ? null : 1,
      message: result.already_liked
        ? "你之前已经给对方点过红心，对方已在你的聊天列表中。"
        : result.is_mutual_match
          ? "你们已互相喜欢，已解锁无限聊天。"
          : "已加入聊天列表。当前仅可先发送 1 条消息，等待对方回心后可继续畅聊。",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to like user"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}