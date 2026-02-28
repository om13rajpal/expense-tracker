/**
 * OpenAI Codex OAuth callback endpoint.
 *
 * GET /api/auth/openai/callback?code=...&state=...
 *
 * Handles the OAuth redirect from auth.openai.com:
 * 1. Validates the state parameter against the stored PKCE session.
 * 2. Exchanges the authorization code for OAuth tokens (access_token, id_token, refresh_token).
 * 3. Exchanges the id_token for an OpenAI API key (RFC 8693 token-exchange).
 * 4. Extracts user claims (email, plan, account ID) from the id_token JWT.
 * 5. Stores everything in the user's settings document in MongoDB.
 * 6. Redirects back to the Settings page with a success/error query param.
 *
 * @module app/api/auth/openai/callback/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import {
  exchangeCodeForTokens,
  exchangeTokenForApiKey,
  parseJWTClaims,
} from '@/lib/openai-oauth'
import { extractToken } from '@/lib/middleware'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const settingsUrl = new URL('/settings', request.nextUrl.origin)

  // ── Handle OpenAI error redirect ──────────────────────────────────
  if (error) {
    settingsUrl.searchParams.set('openai_error', error)
    return NextResponse.redirect(settingsUrl)
  }

  if (!code || !state) {
    settingsUrl.searchParams.set('openai_error', 'missing_params')
    return NextResponse.redirect(settingsUrl)
  }

  try {
    // ── Authenticate the user from their cookie ─────────────────────
    const token = extractToken(request)
    if (!token) {
      settingsUrl.searchParams.set('openai_error', 'not_authenticated')
      return NextResponse.redirect(settingsUrl)
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) throw new Error('JWT_SECRET is not configured')

    const decoded = jwt.verify(token, jwtSecret) as { userId: string }

    // ── Look up the PKCE session ────────────────────────────────────
    const db = await getMongoDb()
    const oauthState = await db.collection('openai_oauth_states').findOneAndDelete({ state })

    if (!oauthState) {
      settingsUrl.searchParams.set('openai_error', 'invalid_state')
      return NextResponse.redirect(settingsUrl)
    }

    // Verify the user matches
    if (oauthState.userId !== decoded.userId) {
      settingsUrl.searchParams.set('openai_error', 'user_mismatch')
      return NextResponse.redirect(settingsUrl)
    }

    const codeVerifier = oauthState.codeVerifier as string
    const redirectUri = oauthState.redirectUri as string

    // ── Step 1: Exchange code for tokens ─────────────────────────────
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri)

    // ── Step 2: Exchange id_token for API key ────────────────────────
    const apiKey = await exchangeTokenForApiKey(tokens.idToken)

    // ── Step 3: Extract claims from id_token ─────────────────────────
    const claims = parseJWTClaims(tokens.idToken)

    // ── Step 4: Store everything in user_settings ────────────────────
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()

    await db.collection('user_settings').updateOne(
      { userId: decoded.userId },
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
          openaiAuthMethod: 'oauth',
        },
        $setOnInsert: { userId: decoded.userId, createdAt: new Date().toISOString() },
      },
      { upsert: true }
    )

    // ── Redirect back to Settings with success ───────────────────────
    settingsUrl.searchParams.set('openai_connected', 'true')
    return NextResponse.redirect(settingsUrl)
  } catch (err) {
    console.error('OpenAI OAuth callback error:', err)
    settingsUrl.searchParams.set(
      'openai_error',
      err instanceof Error ? err.message.slice(0, 100) : 'callback_failed'
    )
    return NextResponse.redirect(settingsUrl)
  }
}
