/**
 * OpenAI Device Code Flow polling endpoint.
 *
 * POST /api/auth/openai/poll
 *
 * The client calls this repeatedly (every 5s) after initiating the device code flow.
 * When the user completes authentication on auth.openai.com, this endpoint:
 * 1. Detects the authorization via the device token poll.
 * 2. Exchanges the authorization code for OAuth tokens.
 * 3. Exchanges the id_token for an OpenAI API key (RFC 8693).
 * 4. Stores the API key + metadata in MongoDB.
 *
 * @module app/api/auth/openai/poll/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware'
import { getMongoDb } from '@/lib/mongodb'
import {
  pollDeviceToken,
  exchangeDeviceCodeForTokens,
  exchangeTokenForApiKey,
  parseJWTClaims,
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

      // Step 1: Exchange device auth code for OAuth tokens
      const tokens = await exchangeDeviceCodeForTokens(authorizationCode, codeVerifier)

      // Step 2: Exchange id_token for API key
      const apiKey = await exchangeTokenForApiKey(tokens.idToken)

      // Step 3: Extract claims from id_token
      const claims = parseJWTClaims(tokens.idToken)
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()

      // Step 4: Store in user_settings
      await db.collection('user_settings').updateOne(
        { userId: user.userId },
        {
          $set: {
            openaiApiKey: apiKey,
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

      // Clean up the device code session
      await db.collection('openai_oauth_states').deleteOne({ _id: session._id })

      return NextResponse.json(
        {
          success: true,
          status: 'connected',
          email: (claims.email as string) || null,
          planType: (claims.chatgpt_plan_type as string) || null,
        },
        { headers: corsHeaders() }
      )
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
