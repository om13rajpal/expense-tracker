/**
 * OpenAI Device Code Flow polling endpoint.
 *
 * POST /api/auth/openai/poll
 *
 * The client calls this repeatedly (every 5s) after initiating the device code flow.
 * When the user completes authentication on auth.openai.com, this endpoint:
 * 1. Detects the authorization via the device token poll.
 * 2. Atomically claims the session (prevents race conditions with concurrent polls).
 * 3. Exchanges the authorization code for OAuth tokens.
 * 4. Stores the access_token directly (no RFC 8693 exchange — matching Codex CLI).
 *
 * @module app/api/auth/openai/poll/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware'
import { getMongoDb } from '@/lib/mongodb'
import {
  pollDeviceToken,
  exchangeDeviceCodeForTokens,
  parseOpenAIAuthClaims,
} from '@/lib/openai-oauth'

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()

      // Find the user's active device code session
      const session = await db.collection('openai_oauth_states').findOne({
        userId: user.userId,
        type: 'device-code',
      })

      if (!session) {
        // Session gone — could mean it expired OR the exchange already succeeded
        // on a previous poll but the response was lost. Check if already connected.
        const settings = await db.collection('user_settings').findOne({ userId: user.userId })
        if (settings?.openaiApiKey && settings?.openaiAuthMethod === 'oauth-device') {
          return NextResponse.json(
            {
              success: true,
              status: 'connected',
              email: (settings.openaiEmail as string) || null,
              planType: (settings.openaiPlanType as string) || null,
            },
            { headers: corsHeaders() }
          )
        }
        return NextResponse.json(
          { success: false, status: 'no_session', message: 'No active device code session found.' },
          { status: 404, headers: corsHeaders() }
        )
      }

      const deviceAuthId = session.deviceAuthId as string
      const userCode = session.userCode as string

      // Poll OpenAI's device token endpoint
      const result = await pollDeviceToken(deviceAuthId, userCode)

      if (result.status === 'pending') {
        return NextResponse.json(
          { success: true, status: 'pending' },
          { headers: corsHeaders() }
        )
      }

      if (result.status === 'expired') {
        // Clean up the expired session
        await db.collection('openai_oauth_states').deleteOne({ _id: session._id })
        return NextResponse.json(
          { success: false, status: 'expired', message: 'Device code expired. Please try again.' },
          { headers: corsHeaders() }
        )
      }

      // ── Authorized — exchange for tokens ────────────────────────────
      const { authorizationCode, codeVerifier } = result

      if (!authorizationCode || !codeVerifier) {
        return NextResponse.json(
          { success: false, status: 'error', message: 'Missing authorization data from OpenAI.' },
          { status: 500, headers: corsHeaders() }
        )
      }

      // ── CRITICAL: Atomically claim the session to prevent race conditions ──
      // Two concurrent polls can both see the session; findOneAndDelete ensures
      // only one request wins. The loser gets null and checks if already connected.
      const claimed = await db.collection('openai_oauth_states').findOneAndDelete({ _id: session._id })
      if (!claimed) {
        // Another poll request already claimed this session
        const settings = await db.collection('user_settings').findOne({ userId: user.userId })
        if (settings?.openaiApiKey && settings?.openaiAuthMethod === 'oauth-device') {
          return NextResponse.json(
            {
              success: true,
              status: 'connected',
              email: (settings.openaiEmail as string) || null,
              planType: (settings.openaiPlanType as string) || null,
            },
            { headers: corsHeaders() }
          )
        }
        return NextResponse.json(
          { success: true, status: 'pending' },
          { headers: corsHeaders() }
        )
      }

      try {
        // Step 1: Exchange device auth code for OAuth tokens
        console.log('[OpenAI Poll] User authorized — exchanging device code for tokens...')
        const tokens = await exchangeDeviceCodeForTokens(authorizationCode, codeVerifier)

        // Step 2: Extract claims from the nested JWT structure
        // OpenAI nests auth claims under "https://api.openai.com/auth"
        const claims = parseOpenAIAuthClaims(tokens.idToken)
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()

        // Step 3: Store access_token directly (no RFC 8693 id_token→API key exchange).
        // The device code flow doesn't produce an id_token with organization_id,
        // so the exchange would fail. The official Codex CLI also uses access_token
        // directly as a Bearer token for API calls.
        console.log('[OpenAI Poll] Got tokens, storing access_token in user settings...')
        await db.collection('user_settings').updateOne(
          { userId: user.userId },
          {
            $set: {
              openaiApiKey: tokens.accessToken,
              openaiAccessToken: tokens.accessToken,
              openaiRefreshToken: tokens.refreshToken,
              openaiIdToken: tokens.idToken,
              openaiTokenExpires: expiresAt,
              openaiAccountId: (claims.chatgpt_account_id as string) || null,
              openaiEmail: (claims.email as string) || null,
              openaiPlanType: (claims.chatgpt_plan_type as string) || null,
              openaiConnectedAt: new Date().toISOString(),
              openaiAuthMethod: 'oauth-device',
            },
            $setOnInsert: { userId: user.userId, createdAt: new Date().toISOString() },
          },
          { upsert: true }
        )

        return NextResponse.json(
          {
            success: true,
            status: 'connected',
            email: (claims.email as string) || null,
            planType: (claims.chatgpt_plan_type as string) || null,
          },
          { headers: corsHeaders() }
        )
      } catch (exchangeError) {
        // Exchange failed — session already deleted, can't retry (auth code is consumed)
        console.error('[OpenAI Poll] Exchange chain failed:', exchangeError)
        return NextResponse.json(
          {
            success: false,
            status: 'exchange_failed',
            message: exchangeError instanceof Error ? exchangeError.message : 'Token exchange failed. Please try again.',
          },
          { headers: corsHeaders() }
        )
      }
    } catch (error) {
      console.error('OpenAI device poll error:', error)
      return NextResponse.json(
        { success: false, status: 'error', message: 'Polling failed. Please try again.' },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
