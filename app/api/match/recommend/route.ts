import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, getAllUsers } from "@/lib/db"

export async function GET(req: NextRequest) {
    try {
        const sessionId = req.cookies.get("session_id")?.value

        if (!sessionId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const currentUser: any = getSessionUser(sessionId)

        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const allUsers: any[] = getAllUsers()
        const candidates = allUsers.filter((u) => u.id !== currentUser.id)

        const payload = {
            currentUser: {
                id: currentUser.id,
                petType: currentUser.pet_breed ?? null,
                petAge: currentUser.pet_age ? Number(currentUser.pet_age) : null,
                activityLevel: 3,
                personalityTags: [],
                interests: [],
                location: null,
            },
            candidates: candidates.map((u: any) => ({
                id: u.id,
                petType: u.pet_breed ?? null,
                petAge: u.pet_age ? Number(u.pet_age) : null,
                activityLevel: 3,
                personalityTags: [],
                interests: [],
                location: null,
            })),
        }

        let aiRes: Response

        try {
            aiRes = await fetch("http://127.0.0.1:8000/recommend", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            })
        } catch {
            return NextResponse.json(
                { error: "推荐服务未启动，请先启动 Python 服务（127.0.0.1:8000）" },
                { status: 500 }
            )
        }

        const rawText = await aiRes.text()

        if (!aiRes.ok) {
            return NextResponse.json(
                {
                    error: `推荐服务返回错误：${aiRes.status} ${aiRes.statusText}`,
                    detail: rawText || "空响应",
                },
                { status: 500 }
            )
        }

        if (!rawText) {
            return NextResponse.json(
                { error: "推荐服务返回了空内容" },
                { status: 500 }
            )
        }

        let aiData: any

        try {
            aiData = JSON.parse(rawText)
        } catch {
            return NextResponse.json(
                {
                    error: "推荐服务返回的不是合法 JSON",
                    detail: rawText,
                },
                { status: 500 }
            )
        }

        const scoreMap = new Map(
            (aiData.recommendations || []).map((r: any) => [r.id, r.score])
        )

        const reasonMap = new Map(
            (aiData.recommendations || []).map((r: any) => [r.id, r.reasons || []])
        )

        const users = candidates
            .map((u) => ({
                ...u,
                matchScore: scoreMap.get(u.id) ?? 0,
                matchReasons: reasonMap.get(u.id) ?? [],
            }))
            .sort((a, b) => b.matchScore - a.matchScore)

        return NextResponse.json({
            success: true,
            users,
        })
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Recommendation failed"

        return NextResponse.json({ error: message }, { status: 500 })
    }
}