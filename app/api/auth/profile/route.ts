import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, updateUserProfile } from "@/lib/db"

export async function PUT(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value
    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const currentUser = getSessionUser(sessionId)
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { pet_name, pet_breed, pet_age, pet_bio, username } = body

    const updatedUser = updateUserProfile(currentUser.id, {
      pet_name,
      pet_breed,
      pet_age,
      pet_bio,
      username,
    })

    return NextResponse.json({ user: updatedUser, success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
