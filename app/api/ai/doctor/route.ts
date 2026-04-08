import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const image = formData.get("image") as File | null
        const symptom = (formData.get("symptom") as string | null) || ""

        if (!image) {
            return NextResponse.json({ error: "没有图片" }, { status: 400 })
        }

        if (!image.type.startsWith("image/")) {
            return NextResponse.json({ error: "请上传图片文件" }, { status: 400 })
        }

        const bytes = await image.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString("base64")
        const mimeType = image.type || "image/jpeg"

        const prompt = `
你是一名宠物医生 AI 助手。
请根据图片和用户描述进行初步分析。

输出格式：
【图片观察】
【可能问题】
【建议处理】
【是否需要线下就医】

用户描述：
${symptom || "无"}
`

        const response = await openai.responses.create({
            model: "gpt-5.4",
            input: [
                {
                    type: "message",
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: prompt,
                        },
                        {
                            type: "input_image",
                            image_url: `data:${mimeType};base64,${base64}`,
                            detail: "auto",
                        },
                    ],
                },
            ],
        })

        return NextResponse.json({
            result: response.output_text,
        })
    } catch (error) {
        console.error("doctor api error:", error)
        return NextResponse.json({ error: "AI诊断失败" }, { status: 500 })
    }
}