import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/supabase-db"

export async function GET(req: NextRequest) {
    try {
        const sessionId = req.cookies.get("session_id")?.value

        if (!sessionId) {
            return NextResponse.json(
                {
                    user: null,
                    authenticated: false,
                    error: "No session found",
                },
                { status: 401 }
            )
        }

        const user = await getSessionUser(sessionId)

        if (!user) {
            return NextResponse.json(
                {
                    user: null,
                    authenticated: false,
                    error: "Unauthorized",
                },
                { status: 401 }
            )
        }

        const safeUser = {
            id: user.id,
            email: user.email ?? null,
            username: user.username ?? null,
            pet_name: user.pet_name ?? null,
            pet_type: user.pet_type ?? null,
            pet_age: user.pet_age ?? null,
            description: user.description ?? null,
            avatar_url: user.avatar_url ?? null,
            is_ai: user.is_ai ?? false,
            created_at: user.created_at ?? null,
            updated_at: user.updated_at ?? null,
        }

        return NextResponse.json(
            {
                success: true,
                authenticated: true,
                user: safeUser,
            },
            { status: 200 }
        )
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to fetch user"

        return NextResponse.json(
            {
                success: false,
                authenticated: false,
                user: null,
                error: message,
            },
            { status: 500 }
        )
    }
}