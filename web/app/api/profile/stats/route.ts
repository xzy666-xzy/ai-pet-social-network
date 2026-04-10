import { NextRequest, NextResponse } from "next/server"
import {
    getActiveMembership,
    getProfileStats,
    getSessionUser,
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

        const stats = await getProfileStats(currentUser.id)
        const membership = await getActiveMembership(currentUser.id)

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