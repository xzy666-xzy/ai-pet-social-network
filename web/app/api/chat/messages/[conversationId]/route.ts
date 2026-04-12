import { NextRequest, NextResponse } from "next/server"
import {
  getConversationById,
  getConversationMessages,
  getSessionUser,
} from "@/lib/supabase-db"

type RouteContext = {
  params: Promise<{
    conversationId: string
  }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const sessionId = req.cookies.get("session_id")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = await getSessionUser(sessionId)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId: rawConversationId } = await context.params
    const conversationId = String(rawConversationId || "").trim()

    if (!conversationId) {
      return NextResponse.json(
          { error: "conversationId is required" },
          { status: 400 }
      )
    }

    const conversation = await getConversationById(conversationId)

    if (!conversation) {
      return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
      )
    }

    const isParticipant =
        conversation.user1_id === currentUser.id ||
        conversation.user2_id === currentUser.id

    if (!isParticipant) {
      return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
      )
    }

    const messages = await getConversationMessages(conversationId)

    return NextResponse.json({
      success: true,
      messages,
    })
  } catch (error: unknown) {
    const message =
        error instanceof Error ? error.message : "Failed to load messages"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}