import { NextRequest, NextResponse } from "next/server"
import {
    getActiveMembership,
    getLikesReceivedByUser,
    getLikesSentByUser,
    getSessionUser,
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

        const [likesSent, likesReceived, conversations, membership] =
            await Promise.all([
                getLikesSentByUser(currentUser.id),
                getLikesReceivedByUser(currentUser.id),
                getUserConversations(currentUser.id),
                getActiveMembership(currentUser.id),
            ])

        const stats = {
            likesSent: likesSent.length,
            likesReceived: likesReceived.length,
            conversations: conversations.length,
        }

        return NextResponse.json({
            success: true,
            stats,
            membership: membership
                ? {
                    isActive: true,
                    planName: membership.plan_type ?? null,
                    expiresAt: membership.end_at ?? null,
                    startedAt: membership.start_at ?? null,
                }
                : {
                    isActive: false,
                    planName: null,
                    expiresAt: null,
                    startedAt: null,
                },
        })
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Failed to load profile stats"

        return NextResponse.json({ error: message }, { status: 500 })
    }
}