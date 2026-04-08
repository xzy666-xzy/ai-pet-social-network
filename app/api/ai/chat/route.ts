import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

type ChatRole = "user" | "assistant"

interface ChatMessage {
  role: ChatRole
  content: string
}

const GENERAL_SYSTEM_PROMPT = `
You are WePet AI Assistant, a friendly pet social app assistant.
Reply in the same language as the user.
Keep responses concise and mobile-friendly.
`

const DOCTOR_CHAT_SYSTEM_PROMPT = `
你是 WePet 的 AI 宠物医生聊天助手。
要求：
1. 始终用用户当前语言回复；用户用中文就中文，韩文就韩文，英文就英文。
2. 语气温和、专业、简洁，适合手机聊天界面。
3. 你只能做“初步健康建议”，不能替代线下兽医。
4. 如果用户描述了严重症状（持续呕吐、抽搐、呼吸困难、大量出血、高烧、无法站立等），要明确建议立刻就医。
5. 回答尽量分点，方便阅读。
6. 可以继续追问：症状持续多久、有没有食欲下降、排便变化、精神状态变化、是否接种疫苗等。
`

function buildConversationInput(systemPrompt: string, history: ChatMessage[], message: string) {
  const historyText =
      history.length > 0
          ? history
              .slice(-12)
              .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
              .join("\n")
          : ""

  return `${systemPrompt}

Conversation:
${historyText}

User: ${message}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      message,
      history = [],
      mode = "chat",
    }: {
      message?: string
      history?: ChatMessage[]
      mode?: "chat" | "doctor_chat"
    } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
          { error: "OPENAI_API_KEY is missing in environment variables." },
          { status: 500 }
      )
    }

    const client = new OpenAI({ apiKey })
    const model = process.env.OPENAI_MODEL || "gpt-5.2"

    const systemPrompt =
        mode === "doctor_chat" ? DOCTOR_CHAT_SYSTEM_PROMPT : GENERAL_SYSTEM_PROMPT

    const input = buildConversationInput(systemPrompt, history, message)

    const response = await client.responses.create({
      model,
      input,
    })

    const text =
        response.output_text?.trim() || "Sorry, I couldn't generate a response."

    return NextResponse.json({
      response: text,
      mode,
    })
  } catch (error: unknown) {
    console.error("AI Chat API error:", error)

    let errorMessage = "Failed to generate response"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}