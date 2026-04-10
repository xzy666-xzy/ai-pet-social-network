import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { supabase } from "@/lib/supabase"
import { createSession } from "@/lib/supabase-db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const email = String(body.email ?? "")
        .trim()
        .toLowerCase()

    const password = String(body.password ?? "").trim()

    if (!email || !password) {
      return NextResponse.json(
          { error: "이메일과 비밀번호를 입력해주세요." },
          { status: 400 }
      )
    }

    const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle()

    if (userError) {
      return NextResponse.json(
          { error: userError.message || "사용자 조회 중 오류가 발생했습니다." },
          { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
          { error: "존재하지 않는 이메일입니다." },
          { status: 401 }
      )
    }

    if (!user.password_hash) {
      return NextResponse.json(
          { error: "비밀번호 정보가 올바르지 않습니다." },
          { status: 500 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json(
          { error: "비밀번호가 올바르지 않습니다." },
          { status: 401 }
      )
    }

    const sessionId = crypto.randomUUID()

    const sessionResult = await createSession(sessionId, user.id)

    if (!sessionResult.success) {
      return NextResponse.json(
          { error: sessionResult.error || "세션 생성에 실패했습니다." },
          { status: 500 }
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
      created_at: user.created_at ?? null,
      updated_at: user.updated_at ?? null,
      is_ai: user.is_ai ?? false,
    }

    const response = NextResponse.json(
        {
          success: true,
          message: "로그인 성공",
          user: safeUser,
        },
        { status: 200 }
    )

    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    const message =
        error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}