import { NextRequest, NextResponse } from "next/server"
import { authenticateUser, createSession } from "@/lib/supabase-db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "").trim()

    if (!email || !password) {
      return NextResponse.json(
          { error: "이메일과 비밀번호를 입력해주세요." },
          { status: 400 }
      )
    }

    const user = await authenticateUser(email, password)

    if (!user) {
      return NextResponse.json(
          { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
          { status: 401 }
      )
    }

    const session = await createSession(user.id)

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        pet_name: user.pet_name,
        pet_type: user.pet_type,
      },
    })

    res.cookies.set("session_id", session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires: new Date(session.expires_at),
    })

    return res
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}