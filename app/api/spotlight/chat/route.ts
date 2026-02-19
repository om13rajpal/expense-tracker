import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { NextRequest, NextResponse } from "next/server"
import { extractToken, corsHeaders, handleOptions } from "@/lib/middleware"
import { verifyToken } from "@/lib/auth"
import { getMongoDb } from "@/lib/mongodb"
import { fetchAllFinancialData, buildFinancialContext } from "@/lib/financial-context"

export async function POST(request: NextRequest) {
  // Manual auth (avoids withAuth's NextResponse type constraint)
  const token = extractToken(request)
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401, headers: corsHeaders() }
    )
  }
  const verification = verifyToken(token)
  if (!verification.valid || !verification.user) {
    return NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 401, headers: corsHeaders() }
    )
  }
  const user = verification.user

  try {
    const { prompt } = await request.json()
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, message: "Prompt is required" },
        { status: 400, headers: corsHeaders() }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "AI service not configured" },
        { status: 500, headers: corsHeaders() }
      )
    }

    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    })

    const db = await getMongoDb()
    const financialData = await fetchAllFinancialData(db, user.userId)
    const context = buildFinancialContext(financialData)

    const systemPrompt = `You are a concise personal financial advisor in a spotlight search bar. The user asked a quick question. Answer briefly (2-4 sentences max) using their real financial data. Use INR (₹) formatted in Indian notation. Use markdown for formatting. Today is ${new Date().toISOString().slice(0, 10)}.

${context}`

    const result = streamText({
      model: openrouter("anthropic/claude-sonnet-4.5"),
      system: systemPrompt,
      prompt,
      maxOutputTokens: 1024,
      temperature: 0.4,
    })

    return result.toTextStreamResponse({
      headers: corsHeaders(),
    })
  } catch (error) {
    console.error("Spotlight chat error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to process request" },
      { status: 500, headers: corsHeaders() }
    )
  }
}

export async function OPTIONS() {
  return handleOptions()
}
