/**
 * Unified AI client that routes requests through either OpenAI (user's ChatGPT
 * OAuth key or manual API key) or OpenRouter (Claude), depending on the user's
 * connection status.
 *
 * If a `userId` is provided in options and that user has stored an OpenAI API
 * key (from Codex OAuth or manual entry), requests are sent to the OpenAI API.
 * If the OAuth token is expired, it's automatically refreshed.
 * Otherwise, falls back to the existing OpenRouter client (Claude Sonnet 4.5).
 *
 * @module lib/ai-client
 */

import { getMongoDb } from './mongodb'
import {
  refreshOAuthTokens,
  exchangeTokenForApiKey,
} from './openai-oauth'
import {
  chatCompletion as openRouterChatCompletion,
  buildFinancialContext,
  buildInvestmentContext,
} from './openrouter'
import type { OpenRouterMessage, OpenRouterResponse } from './openrouter'

// Re-export everything consumers need
export { buildFinancialContext, buildInvestmentContext }
export type { OpenRouterMessage, OpenRouterResponse }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** OpenAI Chat Completions API endpoint. */
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

/** Default model used when routing through OpenAI. */
const OPENAI_MODEL = 'gpt-4o'

// ---------------------------------------------------------------------------
// Internal: resolve the user's OpenAI credentials (with auto-refresh)
// ---------------------------------------------------------------------------

interface OpenAICredentials {
  apiKey: string
  model: string
}

/**
 * Look up the user's OpenAI API key from MongoDB.
 * If the user connected via OAuth and the token is expired, refreshes it
 * automatically and stores the new credentials.
 *
 * @returns Credentials object, or null if the user has no OpenAI key stored.
 */
async function resolveOpenAICredentials(userId: string): Promise<OpenAICredentials | null> {
  const db = await getMongoDb()
  const settings = await db.collection('user_settings').findOne({ userId })

  if (!settings?.openaiApiKey) {
    return null
  }

  // If connected via OAuth, check if token needs refresh
  if (settings.openaiAuthMethod === 'oauth' && settings.openaiRefreshToken) {
    const expiresAt = settings.openaiTokenExpires
      ? new Date(settings.openaiTokenExpires as string).getTime()
      : 0

    // Refresh if within 5 minutes of expiry
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      try {
        const newTokens = await refreshOAuthTokens(settings.openaiRefreshToken as string)
        const newApiKey = await exchangeTokenForApiKey(newTokens.idToken)
        const newExpires = new Date(Date.now() + newTokens.expiresIn * 1000).toISOString()

        await db.collection('user_settings').updateOne(
          { userId },
          {
            $set: {
              openaiApiKey: newApiKey,
              openaiRefreshToken: newTokens.refreshToken,
              openaiIdToken: newTokens.idToken,
              openaiTokenExpires: newExpires,
            },
          }
        )

        return { apiKey: newApiKey, model: OPENAI_MODEL }
      } catch (err) {
        console.error('OpenAI token refresh failed:', err)
        // Try the existing key anyway — it might still work
      }
    }
  }

  return { apiKey: settings.openaiApiKey as string, model: OPENAI_MODEL }
}

// ---------------------------------------------------------------------------
// Chat completion (non-streaming) — drop-in replacement for openrouter.ts
// ---------------------------------------------------------------------------

/**
 * Send a chat completion request, routing to OpenAI or OpenRouter.
 */
export async function chatCompletion(
  messages: OpenRouterMessage[],
  options?: {
    model?: string
    maxTokens?: number
    temperature?: number
    userId?: string
  }
): Promise<string> {
  // Try OpenAI if userId is provided
  if (options?.userId) {
    const creds = await resolveOpenAICredentials(options.userId)
    if (creds) {
      return callOpenAI(creds.apiKey, messages, {
        model: options.model || creds.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      })
    }
  }

  // Fall back to OpenRouter
  return openRouterChatCompletion(messages, {
    model: options?.model,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
  })
}

/**
 * Direct call to the OpenAI Chat Completions API (non-streaming).
 */
async function callOpenAI(
  apiKey: string,
  messages: OpenRouterMessage[],
  options: { model: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  let response: Response
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        max_tokens: options.maxTokens || 3000,
        temperature: options.temperature ?? 0.3,
      }),
      signal: controller.signal,
    })
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI analysis timed out. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
  }

  const data: OpenRouterResponse = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenAI')
  }

  return data.choices[0].message.content
}

// ---------------------------------------------------------------------------
// Streaming chat completion — used by the agent/chat endpoint
// ---------------------------------------------------------------------------

/**
 * Send a streaming chat completion request, routing to OpenAI or OpenRouter.
 */
export async function chatCompletionStream(
  messages: { role: string; content: string }[],
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
    userId?: string
  }
): Promise<{ response: Response; provider: 'openai' | 'openrouter' }> {
  // Try OpenAI if userId is provided
  if (options.userId) {
    const creds = await resolveOpenAICredentials(options.userId)
    if (creds) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)

      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${creds.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model || creds.model,
            messages,
            max_tokens: options.maxTokens || 4096,
            temperature: options.temperature ?? 0.4,
            stream: true,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
        }

        return { response, provider: 'openai' }
      } catch (err: unknown) {
        clearTimeout(timeout)
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new Error('AI analysis timed out. Please try again.')
        }
        // If OpenAI fails, fall through to OpenRouter
        console.error('OpenAI streaming failed, falling back to OpenRouter:', err)
      }
    }
  }

  // Fall back to OpenRouter
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://finova.local',
        'X-Title': 'Finova AI Agent',
      },
      body: JSON.stringify({
        model: options.model || 'anthropic/claude-sonnet-4.5',
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.4,
        stream: true,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
    }

    return { response, provider: 'openrouter' }
  } catch (err: unknown) {
    clearTimeout(timeout)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI analysis timed out. Please try again.')
    }
    throw err
  }
}
