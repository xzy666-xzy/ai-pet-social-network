import { NextRequest, NextResponse } from "next/server"
import { getAllUsers } from "@/lib/supabase-db"

type AiTemplate = {
  pet_name: string
  pet_breed: string
  pet_age: string
  pet_bio: string
  avatar_url: string
}

const aiTemplates: AiTemplate[] = [
  {
    pet_name: "奶糖",
    pet_breed: "比熊",
    pet_age: "2",
    pet_bio: "粘人小天使，喜欢被抱抱",
    avatar_url: "/pets/bichon.png",
  },
  {
    pet_name: "可乐",
    pet_breed: "柴犬",
    pet_age: "3",
    pet_bio: "有点傲娇，但很可爱",
    avatar_url: "/pets/shiba.png",
  },
  {
    pet_name: "毛豆",
    pet_breed: "柯基",
    pet_age: "4",
    pet_bio: "精力旺盛的小短腿",
    avatar_url: "/pets/corgi.png",
  },
  {
    pet_name: "年糕",
    pet_breed: "萨摩耶",
    pet_age: "2",
    pet_bio: "微笑天使，非常友好",
    avatar_url: "/pets/samoyed.png",
  },
  {
    pet_name: "团子",
    pet_breed: "博美",
    pet_age: "1",
    pet_bio: "小小一只，声音很大",
    avatar_url: "/pets/pomeranian.png",
  },
  {
    pet_name: "豆包",
    pet_breed: "金毛",
    pet_age: "5",
    pet_bio: "温顺的大暖男",
    avatar_url: "/pets/golden.png",
  },
]

async function seedAiUsers() {
  const users = await getAllUsers()
  const aiUsers = users.filter((u: any) => u.is_ai)

  return {
    success: true,
    message:
        aiUsers.length > 0
            ? "AI users already exist"
            : "AI user creation is disabled because createAiUser is not implemented",
    users: aiUsers,
    templates: aiUsers.length > 0 ? [] : aiTemplates,
  }
}

export async function GET() {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const result = await seedAiUsers()
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message =
        error instanceof Error ? error.message : "Failed to seed AI users"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(_req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const result = await seedAiUsers()
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message =
        error instanceof Error ? error.message : "Failed to seed AI users"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}