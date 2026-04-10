import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "").trim()
    const username = String(body.username || "").trim()
    const pet_name = String(body.pet_name || "").trim()
    const pet_type = String(body.pet_type || "").trim()
    const pet_age =
        body.pet_age !== undefined && body.pet_age !== null && body.pet_age !== ""
            ? Number(body.pet_age)
            : null
    const description = String(body.description || "").trim()

    if (!email || !password || !username || !pet_name || !pet_type) {
      return NextResponse.json(
          {
            error: "이메일, 비밀번호, 사용자 이름, 반려동물 이름, 품종은 필수입니다.",
          },
          { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
          { error: "비밀번호는 최소 6자 이상이어야 합니다." },
          { status: 400 }
      )
    }

    if (pet_age !== null && Number.isNaN(pet_age)) {
      return NextResponse.json(
          { error: "나이는 숫자여야 합니다." },
          { status: 400 }
      )
    }

    const { data: existingEmailUser, error: emailCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle()

    if (emailCheckError) {
      return NextResponse.json(
          { error: emailCheckError.message },
          { status: 500 }
      )
    }

    if (existingEmailUser) {
      return NextResponse.json(
          { error: "이미 가입된 이메일입니다." },
          { status: 409 }
      )
    }

    const { data: existingUsernameUser, error: usernameCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .maybeSingle()

    if (usernameCheckError) {
      return NextResponse.json(
          { error: usernameCheckError.message },
          { status: 500 }
      )
    }

    if (existingUsernameUser) {
      return NextResponse.json(
          { error: "이미 사용 중인 사용자 이름입니다." },
          { status: 409 }
      )
    }

    const password_hash = await bcrypt.hash(password, 10)

    const { error: insertError } = await supabase.from("users").insert({
      email,
      password_hash,
      username,
      pet_name,
      pet_type,
      pet_age,
      description,
    })

    if (insertError) {
      return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "회원가입이 완료되었습니다.",
    })
  } catch (error) {
    const message =
        error instanceof Error ? error.message : "Registration failed"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}