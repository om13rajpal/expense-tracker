/**
 * AI Agent Chat API Route
 *
 * POST /api/agent/chat
 * Streams an AI-powered financial advisor response using the user's complete
 * financial data as context. Fetches all relevant MongoDB collections and builds
 * a comprehensive context for the LLM on each request.
 *
 * Request body:
 *   { message: string, threadId?: string, history?: { role: "user"|"assistant", content: string }[] }
 *
 * When threadId is provided, conversation history is loaded from MongoDB instead
 * of using the client-supplied history array. The response includes an X-Thread-Id
 * header with the thread identifier (existing or newly created).
 *
 * Response: Streaming text (chunked transfer encoding)
 */

import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware'
import { getMongoDb } from '@/lib/mongodb'
import { fetchAllFinancialData, buildFinancialContext } from '@/lib/financial-context'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-sonnet-4.5'
const MAX_TOKENS = 4096
const TEMPERATURE = 0.4

const SYSTEM_PROMPT = `You are a personal financial advisor AI assistant for the user's Finance Tracker app. You have complete access to their financial data including transactions, investments, budgets, and goals.

Guidelines:
- Always use INR (Rs.) for currency values, formatted in Indian notation (lakhs, crores)
- Be specific and reference actual data when answering questions
- Provide actionable advice based on their real financial situation
- If asked about concepts, explain them simply with examples from their data
- Be encouraging but honest about areas needing improvement
- Use markdown formatting for clear, readable responses
- When doing calculations, show your work
- If you don't have enough data to answer something, say so clearly
- Today's date is ${new Date().toISOString().slice(0, 10)}

You have access to the following financial data:
`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

// ---------------------------------------------------------------------------
// SSE stream parser — reads OpenRouter streaming response, forwards text,
// and collects the full response for thread persistence.
// ---------------------------------------------------------------------------

interface StreamResult {
  stream: ReadableStream<Uint8Array>
  /** Resolves with the complete assistant response text once the stream ends. */
  fullText: Promise<string>
}

function createStreamingResponse(openRouterResponse: Response): StreamResult {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let fullTextResolve: (value: string) => void
  const fullText = new Promise<string>((resolve) => {
    fullTextResolve = resolve
  })

  let collectedText = ''

  const stream = new ReadableStream({
    async start(controller) {
      const reader = openRouterResponse.body?.getReader()
      if (!reader) {
        controller.enqueue(encoder.encode('Error: No response body from AI service.'))
        controller.close()
        fullTextResolve('')
        return
      }

      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE lines
          const lines = buffer.split('\n')
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith(':')) continue

            // SSE data lines
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6)

              // Stream end signal
              if (jsonStr === '[DONE]') continue

              try {
                const parsed = JSON.parse(jsonStr)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  collectedText += content
                  controller.enqueue(encoder.encode(content))
                }
              } catch {
                // Malformed JSON chunk — skip it
              }
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          const trimmed = buffer.trim()
          if (trimmed.startsWith('data: ') && trimmed.slice(6) !== '[DONE]') {
            try {
              const parsed = JSON.parse(trimmed.slice(6))
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                collectedText += content
                controller.enqueue(encoder.encode(content))
              }
            } catch {
              // Ignore
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
      } finally {
        controller.close()
        reader.releaseLock()
        fullTextResolve(collectedText)
      }
    },
  })

  return { stream, fullText }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      // 1. Parse and validate request body
      const body = await req.json()
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      const incomingThreadId = typeof body.threadId === 'string' ? body.threadId : null
      const history: { role: string; content: string }[] = Array.isArray(body.history) ? body.history : []

      if (!message) {
        return NextResponse.json(
          { success: false, message: 'Message is required.' },
          { status: 400, headers: corsHeaders() }
        )
      }

      // 2. Validate OpenRouter API key
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { success: false, message: 'AI service not configured.' },
          { status: 500, headers: corsHeaders() }
        )
      }

      // 3. Fetch all financial data from MongoDB
      const db = await getMongoDb()
      const financialData = await fetchAllFinancialData(db, user.userId)

      // 4. Build the comprehensive context
      const financialContext = buildFinancialContext(financialData)

      // 5. Construct messages array
      const messages: { role: string; content: string }[] = [
        { role: 'system', content: SYSTEM_PROMPT + '\n' + financialContext },
      ]

      // If a threadId is provided, load conversation history from MongoDB
      // instead of using the client-supplied history array.
      const validRoles = new Set(['user', 'assistant'])
      let threadHistory: { role: string; content: string }[] = []

      if (incomingThreadId) {
        const col = db.collection('agent_threads')
        const existingThread = await col.findOne({
          userId: user.userId,
          threadId: incomingThreadId,
        })
        if (existingThread && Array.isArray(existingThread.messages)) {
          threadHistory = existingThread.messages
            .filter(
              (m: { role: string; content: string }) =>
                validRoles.has(m.role) && typeof m.content === 'string' && m.content.trim()
            )
            .slice(-20)
            .map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content.trim(),
            }))
        }
      } else {
        // Fallback: use client-supplied history (for backward compatibility)
        threadHistory = history
          .filter((h) => validRoles.has(h.role) && typeof h.content === 'string' && h.content.trim())
          .slice(-20)
          .map((h) => ({ role: h.role, content: h.content.trim() }))
      }

      messages.push(...threadHistory)

      // Add the current user message
      messages.push({ role: 'user', content: message })

      // 6. Call OpenRouter with streaming enabled
      const openRouterResponse = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://finance-tracker.local',
          'X-Title': 'Finance Tracker AI Agent',
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          stream: true,
        }),
      })

      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text()
        console.error('OpenRouter API error:', openRouterResponse.status, errorText)
        return NextResponse.json(
          { success: false, message: `AI service error (${openRouterResponse.status}). Please try again.` },
          { status: 500, headers: corsHeaders() }
        )
      }

      // 7. Stream the response back to the client and collect full text
      const { stream, fullText } = createStreamingResponse(openRouterResponse)

      // Determine the threadId — reuse existing or create new
      const threadId =
        incomingThreadId || `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      // 8. After the stream finishes, persist messages to MongoDB (fire-and-forget)
      fullText.then(async (assistantContent) => {
        try {
          const col = db.collection('agent_threads')
          const now = new Date().toISOString()

          const userMessage = {
            role: 'user' as const,
            content: message,
            timestamp: now,
          }
          const assistantMessage = {
            role: 'assistant' as const,
            content: assistantContent,
            timestamp: now,
          }

          if (incomingThreadId) {
            // Append to existing thread
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await col.updateOne(
              { userId: user.userId, threadId: incomingThreadId },
              {
                $push: {
                  messages: { $each: [userMessage, assistantMessage] },
                },
                $set: { updatedAt: now },
              } as any
            )
          } else {
            // Create a new thread
            const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
            await col.insertOne({
              userId: user.userId,
              threadId,
              title,
              messages: [userMessage, assistantMessage],
              createdAt: now,
              updatedAt: now,
            })
          }
        } catch (err) {
          console.error('Failed to persist thread:', err)
        }
      })

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Thread-Id': threadId,
          'Access-Control-Expose-Headers': 'X-Thread-Id',
          ...corsHeaders(),
        },
      })
    } catch (error: unknown) {
      console.error('Agent chat error:', getErrorMessage(error))
      return NextResponse.json(
        { success: false, message: 'Failed to process chat request.' },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

// ---------------------------------------------------------------------------
// OPTIONS handler (CORS preflight)
// ---------------------------------------------------------------------------

export async function OPTIONS() {
  return handleOptions()
}
