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

    const {
      username,
      pet_name,
      pet_type,
      pet_age,
      description,
      avatar_url,
    } = body

    const updatedUser = await updateUserProfile(currentUser.id, {
      username:
          username !== undefined ? String(username).trim() || null : undefined,

      pet_name:
          pet_name !== undefined ? String(pet_name).trim() || null : undefined,

      pet_type:
          pet_type !== undefined ? String(pet_type).trim() || null : undefined,

      pet_age:
          pet_age !== undefined && pet_age !== null && String(pet_age).trim() !== ""
              ? Number(pet_age)
              : pet_age === ""
                  ? null
                  : undefined,

      description:
          description !== undefined
              ? String(description).trim() || null
              : undefined,

      avatar_url:
          avatar_url !== undefined ? String(avatar_url).trim() || null : undefined,
    })

    const safeUser = {
      id: updatedUser.id,
      email: updatedUser.email ?? null,
      username: updatedUser.username ?? null,
      pet_name: updatedUser.pet_name ?? null,
      pet_type: updatedUser.pet_type ?? null,
      pet_age: updatedUser.pet_age ?? null,
      description: updatedUser.description ?? null,
      avatar_url: updatedUser.avatar_url ?? null,
      is_ai: updatedUser.is_ai ?? false,
      created_at: updatedUser.created_at ?? null,
      updated_at: updatedUser.updated_at ?? null,
    }

    return NextResponse.json(
        {
          success: true,
          user: safeUser,
        },
        { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}