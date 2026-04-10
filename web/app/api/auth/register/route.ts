import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "").trim()
    const pet_name = String(body.pet_name || "").trim()
    const pet_type = String(body.pet_type || "").trim()
    const pet_age =
        body.pet_age !== undefined && body.pet_age !== null && body.pet_age !== ""
            ? Number(body.pet_age)
            : null
    const description = String(body.description || "").trim()

    if (!email || !password || !pet_name || !pet_type) {
      return NextResponse.json(
          {
            error: "이메일, 비밀번호, 반려동물 이름, 품종은 필수입니다.",
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

    const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle()

    if (checkError) {
      return NextResponse.json(
          { error: checkError.message },
          { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
          { error: "이미 가입된 이메일입니다." },
          { status: 409 }
      )
    }

    const password_hash = await bcrypt.hash(password, 10)

    const { error: insertError } = await supabase.from("users").insert({
      email,
      password_hash,
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