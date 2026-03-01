/**
 * Spotlight Chat API
 * Provides quick, concise AI-powered answers to financial queries from the
 * spotlight search bar. Streams responses back using the Vercel AI SDK.
 *
 * Uses manual authentication (not `withAuth`) to support the streaming response
 * type from `streamText`. Authenticates via JWT extracted from the `auth-token`
 * HTTP-only cookie or Authorization header.
 *
 * The AI model receives the user's full financial context and answers
 * in 2-4 sentences max, using INR and Indian notation.
 *
 * Endpoints:
 *   POST /api/spotlight/chat - Send a quick financial question, receive a streamed answer
 *
 * AI Model: Claude Sonnet 4.5 via OpenRouter
 * Max output: 1024 tokens | Temperature: 0.4
 */

import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { NextRequest, NextResponse } from "next/server"
import { extractToken, corsHeaders, handleOptions } from "@/lib/middleware"
import { verifyToken } from "@/lib/auth"
import { getMongoDb } from "@/lib/mongodb"
import { fetchAllFinancialData, buildFinancialContext } from "@/lib/financial-context"
import { chatCompletionStream } from "@/lib/ai-client"

/**
 * POST /api/spotlight/chat
 * Stream a concise AI response to a quick financial question.
 * Uses manual JWT authentication (extracts and verifies token directly).
 * Fetches the user's complete financial data to provide context-aware answers.
 *
 * @requires Authentication - JWT via `auth-token` cookie or Authorization header
 *
 * @body {string} prompt - The user's financial question (required, non-empty)
 *
 * @returns {200} Streaming text response (text/plain with chunked transfer encoding)
 * @returns {400} `{ success: false, message: string }` - Missing prompt
 * @returns {401} `{ success: false, message: string }` - Missing or invalid authentication token
 * @returns {500} `{ success: false, message: string }` - AI service not configured or server error
 */
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

    const db = await getMongoDb()
    const financialData = await fetchAllFinancialData(db, user.userId)
    const context = buildFinancialContext(financialData)

    const systemPrompt = `You are a concise personal financial advisor in a spotlight search bar. The user asked a quick question. Answer briefly (2-4 sentences max) using their real financial data. Use INR (₹) formatted in Indian notation. Use markdown for formatting. Today is ${new Date().toISOString().slice(0, 10)}.

${context}`

    // Route through user's linked ChatGPT if available, else OpenRouter
    const { response: streamResponse, provider } = await chatCompletionStream(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      {
        maxTokens: 1024,
        temperature: 0.4,
        userId: user.userId,
      }
    )

    // Forward the SSE stream directly to the client
    return new Response(streamResponse.body, {
      headers: {
        ...corsHeaders(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    console.error("Spotlight chat error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to process request" },
      { status: 500, headers: corsHeaders() }
    )
  }
}

/**
 * OPTIONS /api/spotlight/chat
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
