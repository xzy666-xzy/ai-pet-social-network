import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const image = formData.get("image") as File | null
        const symptom = String(
            formData.get("description") ||
            formData.get("prompt") ||
            formData.get("message") ||
            formData.get("symptom") ||
            ""
        ).trim()
        const uiLanguage = String(
            formData.get("uiLanguage") || formData.get("locale") || ""
        ).trim()

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
You are WePet AI Pet Doctor.
Analyze the image and the user's symptom description to provide a preliminary pet health observation.

Language rules:
Respond in the same language as the user's description.
If the description is Korean, answer in Korean.
If the description is Chinese, answer in Chinese.
If the description is English, answer in English.
If the description is another language, answer in that same language as much as possible.
If no description is provided, respond in the current UI language if available; otherwise Korean by default.
Current UI language: ${uiLanguage || "not provided"}

Medical safety rules:
This is preliminary guidance only and cannot replace an in-person veterinarian.
For severe symptoms such as breathing difficulty, repeated seizures, heavy bleeding, inability to stand, rapid worsening, or extreme pain, clearly advise offline veterinary care immediately.

Output format:
[Visual Observations]
[Possible Issues]
[Suggested Care]
[Should Visit a Vet Offline]
Keep the same four-section structure, but write the section headings and content in the response language.

User symptom description:
${symptom || "None"}
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
