import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, getAllUsers } from "@/lib/db"

type RecommendItem = {
    id: string
    score: number
    reasons?: string[]
}

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
                id: String(currentUser.id),
                petType: currentUser.pet_breed ?? null,
                petAge: currentUser.pet_age ? Number(currentUser.pet_age) : null,
                activityLevel: currentUser.activity_level
                    ? Number(currentUser.activity_level)
                    : 3,
                personalityTags: Array.isArray(currentUser.personality_tags)
                    ? currentUser.personality_tags
                    : [],
                interests: Array.isArray(currentUser.interests)
                    ? currentUser.interests
                    : [],
                location:
                    currentUser.latitude && currentUser.longitude
                        ? {
                            lat: Number(currentUser.latitude),
                            lng: Number(currentUser.longitude),
                        }
                        : null,
            },
            candidates: candidates.map((u: any) => ({
                id: String(u.id),
                petType: u.pet_breed ?? null,
                petAge: u.pet_age ? Number(u.pet_age) : null,
                activityLevel: u.activity_level ? Number(u.activity_level) : 3,
                personalityTags: Array.isArray(u.personality_tags)
                    ? u.personality_tags
                    : [],
                interests: Array.isArray(u.interests) ? u.interests : [],
                location:
                    u.latitude && u.longitude
                        ? {
                            lat: Number(u.latitude),
                            lng: Number(u.longitude),
                        }
                        : null,
            })),
        }

        const aiBaseUrl =
            process.env.AI_SERVICE_URL?.trim() || "http://127.0.0.1:8000"

        let aiRes: Response

        try {
            aiRes = await fetch(`${aiBaseUrl}/recommend`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                cache: "no-store",
            })
        } catch (fetchError) {
            const message =
                fetchError instanceof Error ? fetchError.message : "Unknown fetch error"

            return NextResponse.json(
                {
                    error: "AI 推荐服务未连接成功",
                    detail: message,
                    aiBaseUrl,
                },
                { status: 500 }
            )
        }

        const rawText = await aiRes.text()

        if (!aiRes.ok) {
            return NextResponse.json(
                {
                    error: `推荐服务返回错误：${aiRes.status} ${aiRes.statusText}`,
                    detail: rawText || "空响应",
                    aiBaseUrl,
                },
                { status: 500 }
            )
        }

        if (!rawText) {
            return NextResponse.json(
                {
                    error: "推荐服务返回了空内容",
                    aiBaseUrl,
                },
                { status: 500 }
            )
        }

        let aiData: { recommendations?: RecommendItem[] }

        try {
            aiData = JSON.parse(rawText)
        } catch {
            return NextResponse.json(
                {
                    error: "推荐服务返回的不是合法 JSON",
                    detail: rawText,
                    aiBaseUrl,
                },
                { status: 500 }
            )
        }

        const recommendations = Array.isArray(aiData.recommendations)
            ? aiData.recommendations
            : []

        const scoreMap = new Map<string, number>(
            recommendations.map((r) => [String(r.id), Number(r.score) || 0])
        )

        const reasonMap = new Map<string, string[]>(
            recommendations.map((r) => [
                String(r.id),
                Array.isArray(r.reasons) ? r.reasons : [],
            ])
        )

        const users = candidates
            .map((u: any) => ({
                ...u,
                matchScore: scoreMap.get(String(u.id)) ?? 0,
                matchReasons: reasonMap.get(String(u.id)) ?? [],
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