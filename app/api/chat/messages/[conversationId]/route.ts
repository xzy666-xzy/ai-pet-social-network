import { NextRequest, NextResponse } from "next/server"
import {
  getConversationMessages,
  getSessionUser,
  getUserConversations,
} from "@/lib/db"

type RouteContext = {
  params: Promise<{
    conversationId: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const sessionId = req.cookies.get("session_id")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = getSessionUser(sessionId)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId } = await params

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }

    const userConversations = getUserConversations(currentUser.id)
    const conversation = userConversations.find((item: any) => item.id === conversationId)

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const messages = getConversationMessages(conversationId)

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