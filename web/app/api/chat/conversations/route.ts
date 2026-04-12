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

          if (!otherUser) {
            return null
          }

          return {
            id: conversation.id,
            other_user_id: otherUser.id,
            other_username: otherUser.username ?? "",
            other_pet_name: otherUser.pet_name ?? "",
            other_avatar_url: otherUser.avatar_url ?? "",
            other_user_is_ai: 0,
            last_message: null,
            last_message_time: null,
            liked_by_me: 0,
            liked_me: 0,
            is_match: 0,
            single_message_used_by_me: 0,
          }
        })
    )

    const validConversations = enriched.filter(
        (item): item is NonNullable<typeof item> => item !== null
    )

    return NextResponse.json({
      success: true,
      conversations: validConversations,
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
    const targetUserId = String(body?.targetUserId || "").trim()

    if (!targetUserId || targetUserId === "undefined" || targetUserId === "null") {
      return NextResponse.json(
          { error: "targetUserId is required" },
          { status: 400 }
      )
    }

    if (targetUserId === currentUser.id) {
      return NextResponse.json(
          { error: "You cannot create a conversation with yourself" },
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
      conversationId: conversation.id,
      conversation,
      targetUser,
    })
  } catch (error) {
    const message =
        error instanceof Error ? error.message : "Failed to create conversation"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}