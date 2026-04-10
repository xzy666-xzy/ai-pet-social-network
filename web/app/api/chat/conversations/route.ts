import { NextRequest, NextResponse } from "next/server"
import {
  getOrCreateConversation,
  getSessionUser,
  getUserById,
  getUserConversations,
} from "@/lib/supabase-db"

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

    const conversations = await getUserConversations(currentUser.id)

    const enriched = await Promise.all(
        conversations.map(async (conversation) => {
          const otherUserId =
              conversation.user1_id === currentUser.id
                  ? conversation.user2_id
                  : conversation.user1_id

          const otherUser = await getUserById(otherUserId)

          return {
            ...conversation,
            otherUser,
          }
        })
    )

    return NextResponse.json({
      success: true,
      conversations: enriched,
    })
  } catch (error) {
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

    const targetUser = await getUserById(targetUserId)

    if (!targetUser) {
      return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
      )
    }

    const conversation = await getOrCreateConversation(
        currentUser.id,
        targetUserId
    )

    return NextResponse.json({
      success: true,
      conversation,
      otherUser: targetUser,
    })
  } catch (error) {
    const message =
        error instanceof Error ? error.message : "Failed to create conversation"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}