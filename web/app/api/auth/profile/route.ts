import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, updateUserProfile } from "@/lib/supabase-db"

export async function PUT(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const currentUser = await getSessionUser(sessionId)

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { pet_name, pet_breed, pet_age, pet_bio } = body

    const updatedUser = await updateUserProfile(currentUser.id, {
      pet_name: pet_name ? String(pet_name).trim() : undefined,
      pet_type: pet_breed ? String(pet_breed).trim() : undefined,
      pet_age:
          pet_age !== undefined && pet_age !== null && pet_age !== ""
              ? Number(pet_age)
              : undefined,
      description: pet_bio ? String(pet_bio).trim() : undefined,
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}