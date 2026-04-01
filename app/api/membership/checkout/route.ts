import { NextRequest, NextResponse } from "next/server"
import { activateMembership, getLikeQuota, getSessionUser } from "@/lib/db"

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

    let plan = "monthly"

    try {
      const body = await req.json()
      if (body?.plan === "yearly") {
        plan = "yearly"
      }
    } catch {}

    const days = plan === "yearly" ? 365 : 30
    const membership = activateMembership(currentUser.id, days, plan)
    const quota = getLikeQuota(currentUser.id)

    return NextResponse.json({
      success: true,
      message: "会员开通成功，今日红心已解锁。",
      membership,
      quota,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to activate membership"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}