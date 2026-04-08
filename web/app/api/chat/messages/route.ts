import { NextRequest, NextResponse } from "next/server"
import {
  createMessage,
  getConversationAccess,
  getConversationById,
  getSessionUser,
  markSingleMessageUsed,
} from "@/lib/db"

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
    const { conversationId, content } = body

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    const conversation = getConversationById(conversationId)

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    if (
      conversation.user1_id !== currentUser.id &&
      conversation.user2_id !== currentUser.id
    ) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const access = getConversationAccess(conversationId, currentUser.id)

    if (!access) {
      return NextResponse.json({ error: "Conversation access not found" }, { status: 404 })
    }

    if (!access.liked_by_me) {
      return NextResponse.json(
        {
          error: "你还没有给对方点红心，暂时不能发消息。",
          code: "LIKE_REQUIRED",
        },
        { status: 403 }
      )
    }

    if (!access.can_send_message) {
      if (access.single_message_used_by_me && !access.is_match) {
        return NextResponse.json(
          {
            error:
              "当前还未双向匹配，你只能先发送 1 条消息。请等待对方也给你点红心后继续聊天。",
            code: "INTRO_MESSAGE_LIMIT_REACHED",
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        {
          error: "当前无法发送消息。",
          code: "MESSAGE_NOT_ALLOWED",
        },
        { status: 403 }
      )
    }

    const message = createMessage(conversationId, currentUser.id, content.trim())

    if (!access.is_match && access.can_send_one_intro_message) {
      markSingleMessageUsed(conversationId, currentUser.id)
    }

    return NextResponse.json({
      success: true,
      message,
      access: {
        likedByMe: access.liked_by_me,
        likedMe: access.liked_me,
        isMatch: access.is_match,
        canSendUnlimited: access.can_send_unlimited,
        singleMessageUsedByMe: !access.is_match
          ? true
          : access.single_message_used_by_me,
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send message"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}