import { NextRequest, NextResponse } from "next/server"
import { createAiUser, getAllUsers } from "@/lib/db"

type AiTemplate = {
  pet_name: string
  pet_breed: string
  pet_age: string
  pet_bio: string
  avatar_url: string
}

const aiTemplates: AiTemplate[] = [
  { pet_name: "奶糖", pet_breed: "比熊", pet_age: "2", pet_bio: "黏人，喜欢被夸，爱吃零食。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "可乐", pet_breed: "柴犬", pet_age: "3", pet_bio: "有点傲娇，但熟了以后很好相处。", avatar_url: "/shiba-inu-colorful-lei.jpg" },
  { pet_name: "毛豆", pet_breed: "柯基", pet_age: "4", pet_bio: "精力旺盛，最喜欢奔跑和玩球。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "年糕", pet_breed: "萨摩耶", pet_age: "2", pet_bio: "很会撒娇，特别喜欢拍照。", avatar_url: "/samoyed-white-fluffy.jpg" },
  { pet_name: "团子", pet_breed: "博美", pet_age: "1", pet_bio: "活泼好动，对什么都很好奇。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "豆包", pet_breed: "金毛", pet_age: "5", pet_bio: "温顺亲人，喜欢晒太阳，也喜欢结交新朋友。", avatar_url: "/golden-retriever.png" },
  { pet_name: "小贝", pet_breed: "马尔济斯", pet_age: "2", pet_bio: "喜欢公园、草地和新朋友。", avatar_url: "/golden-retriever-group.jpg" },
  { pet_name: "多多", pet_breed: "拉布拉多", pet_age: "3", pet_bio: "外向，喜欢散步和交朋友。", avatar_url: "/golden-retriever.png" },
  { pet_name: "七七", pet_breed: "喜乐蒂", pet_age: "4", pet_bio: "聪明安静，喜欢陪伴主人。", avatar_url: "/shetland-sheepdog-fluffy.jpg" },
  { pet_name: "米粒", pet_breed: "泰迪", pet_age: "1", pet_bio: "喜欢慢悠悠散步，也喜欢安静待着。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "开心", pet_breed: "边牧", pet_age: "3", pet_bio: "反应很快，喜欢和熟悉的朋友一起玩。", avatar_url: "/shetland-sheepdog-fluffy.jpg" },
  { pet_name: "雪球", pet_breed: "萨摩耶", pet_age: "2", pet_bio: "毛很蓬，爱拍照，看到人就开心。", avatar_url: "/samoyed-white-fluffy.jpg" },
  { pet_name: "栗子", pet_breed: "泰迪", pet_age: "2", pet_bio: "喜欢被摸头，熟了以后特别黏人。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "阿福", pet_breed: "金毛", pet_age: "6", pet_bio: "性格稳定，很会照顾别的狗狗情绪。", avatar_url: "/golden-retriever-group.jpg" },
  { pet_name: "柚子", pet_breed: "比熊", pet_age: "2", pet_bio: "爱干净，也喜欢在咖啡店附近散步。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "糯米", pet_breed: "博美", pet_age: "1", pet_bio: "小小一只，性格很热情，喜欢新鲜事物。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "小满", pet_breed: "柯基", pet_age: "3", pet_bio: "腿短但跑得快，看到球就很兴奋。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "安安", pet_breed: "拉布拉多", pet_age: "4", pet_bio: "温和、亲人，和谁都能相处得不错。", avatar_url: "/golden-retriever.png" },
  { pet_name: "花卷", pet_breed: "柴犬", pet_age: "3", pet_bio: "有自己的节奏，不喜欢太吵，但熟了以后很热情。", avatar_url: "/shiba-inu-colorful-lei.jpg" },
  { pet_name: "豆花", pet_breed: "马尔济斯", pet_age: "2", pet_bio: "喜欢撒娇，也喜欢在窗边晒太阳。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "元宝", pet_breed: "金毛", pet_age: "4", pet_bio: "笑起来特别治愈，喜欢户外和慢跑。", avatar_url: "/golden-retriever-group.jpg" },
  { pet_name: "小芋", pet_breed: "比熊", pet_age: "1", pet_bio: "爱蹦蹦跳跳，看到零食会格外积极。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "麦冬", pet_breed: "边牧", pet_age: "3", pet_bio: "很聪明，喜欢互动和有挑战的游戏。", avatar_url: "/shetland-sheepdog-fluffy.jpg" },
  { pet_name: "小杏", pet_breed: "博美", pet_age: "2", pet_bio: "活泼，喜欢和熟人贴贴。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "果冻", pet_breed: "泰迪", pet_age: "2", pet_bio: "性格软软的，喜欢在附近慢慢逛。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "初一", pet_breed: "柯基", pet_age: "3", pet_bio: "很爱热闹，特别喜欢草地和球。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "小暑", pet_breed: "萨摩耶", pet_age: "2", pet_bio: "看起来高冷，其实很喜欢被关注。", avatar_url: "/samoyed-white-fluffy.jpg" },
  { pet_name: "旺财", pet_breed: "拉布拉多", pet_age: "5", pet_bio: "稳重可靠，散步节奏很舒服。", avatar_url: "/golden-retriever.png" },
  { pet_name: "小桃", pet_breed: "贵宾", pet_age: "2", pet_bio: "有点黏人，喜欢被夸可爱。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "阿棉", pet_breed: "比熊", pet_age: "2", pet_bio: "毛茸茸，喜欢拍照，也喜欢安静陪伴。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "露露", pet_breed: "喜乐蒂", pet_age: "4", pet_bio: "性格温和，和熟悉的人会很亲近。", avatar_url: "/shetland-sheepdog-fluffy.jpg" },
  { pet_name: "小枫", pet_breed: "柴犬", pet_age: "3", pet_bio: "外冷内热，熟了以后会主动贴近。", avatar_url: "/shiba-inu-colorful-lei.jpg" },
  { pet_name: "芝麻", pet_breed: "博美", pet_age: "1", pet_bio: "小小一只，很会撒娇。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "大福", pet_breed: "金毛", pet_age: "4", pet_bio: "喜欢晒太阳，也喜欢和别的狗一起散步。", avatar_url: "/golden-retriever-group.jpg" },
  { pet_name: "泡芙", pet_breed: "贵宾", pet_age: "2", pet_bio: "好奇心很强，喜欢认识新朋友。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "十一", pet_breed: "边牧", pet_age: "3", pet_bio: "精力好，喜欢动脑也喜欢户外。", avatar_url: "/shetland-sheepdog-fluffy.jpg" },
  { pet_name: "糯宝", pet_breed: "马尔济斯", pet_age: "2", pet_bio: "软萌安静，喜欢熟悉的环境。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "桃酥", pet_breed: "比熊", pet_age: "2", pet_bio: "很会撒娇，喜欢靠近人。", avatar_url: "/samoyed-dog-smiling.jpg" },
  { pet_name: "石榴", pet_breed: "柯基", pet_age: "3", pet_bio: "性格开朗，跑起来停不下来。", avatar_url: "/brown-poodle-dog.jpg" },
  { pet_name: "可颂", pet_breed: "泰迪", pet_age: "2", pet_bio: "喜欢被夸，也喜欢和人互动。", avatar_url: "/brown-poodle-dog.jpg" },
]

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildAiProfilePrompt(template: AiTemplate) {
  return `你叫${template.pet_name}，是一只${template.pet_age}岁的${template.pet_breed}。你的设定是：${template.pet_bio}。请用自然、简短、像真实宠物社交软件用户一样的口吻聊天，不要太机械。`
}

function safeUsername(name: string, existingUsernames: Set<string>) {
  let username = `ai_${name}`
  if (!existingUsernames.has(username)) {
    existingUsernames.add(username)
    return username
  }

  username = `ai_${name}_${Math.random().toString(36).slice(2, 6)}`
  existingUsernames.add(username)
  return username
}

function generateAiUsers(count: number) {
  const allUsers = getAllUsers()
  const existingPetNames = new Set(allUsers.map((u) => u.pet_name).filter(Boolean))
  const existingUsernames = new Set(allUsers.map((u) => u.username))

  const candidates = shuffleArray(aiTemplates).filter((item) => !existingPetNames.has(item.pet_name))
  const selected = candidates.slice(0, count)

  const createdUsers = selected.map((template) =>
    createAiUser({
      username: safeUsername(template.pet_name, existingUsernames),
      pet_name: template.pet_name,
      pet_breed: template.pet_breed,
      pet_age: template.pet_age,
      pet_bio: template.pet_bio,
      avatar_url: template.avatar_url,
      ai_profile_prompt: buildAiProfilePrompt(template),
    })
  )

  return createdUsers
}

function parseCount(value: string | null | undefined) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 6
  return Math.min(Math.max(Math.floor(num), 1), 30)
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const count = parseCount(req.nextUrl.searchParams.get("count"))
    const createdUsers = generateAiUsers(count)

    return NextResponse.json({
      success: true,
      message: createdUsers.length > 0 ? "AI users generated successfully" : "No available unique AI profiles left",
      createdCount: createdUsers.length,
      users: createdUsers,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate AI users"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    let count = 6

    try {
      const body = await req.json()
      count = parseCount(String(body?.count ?? "6"))
    } catch {
      count = 6
    }

    const createdUsers = generateAiUsers(count)

    return NextResponse.json({
      success: true,
      message: createdUsers.length > 0 ? "AI users generated successfully" : "No available unique AI profiles left",
      createdCount: createdUsers.length,
      users: createdUsers,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate AI users"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}