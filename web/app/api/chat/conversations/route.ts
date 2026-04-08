import { NextRequest, NextResponse } from "next/server"
import { getAllUsers, getOrCreateConversation, getSessionUser,getUserConversations,} from "@/lib/db"
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

    const conversations = getUserConversations(currentUser.id)

    return NextResponse.json({
      success: true,
      conversations,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load conversations"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: "You cannot chat with yourself" }, { status: 400 })
    }

    const targetUser = getAllUsers().find((user) => user.id === targetUserId)

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 })
    }

    const conversation = getOrCreateConversation(currentUser.id, targetUserId)

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      conversation,
      currentUser,
      targetUser,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create or get conversation"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}