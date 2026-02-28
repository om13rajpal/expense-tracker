/**
 * OpenAI Codex OAuth initiation endpoint.
 *
 * POST /api/auth/openai
 *
 * Two modes:
 * - `{ mode: "oauth" | "device-code" }` — Initiates the device code flow.
 *   Returns a user code and verification URL for the user to authorize.
 * - `{ apiKey: "sk-..." }` — Manual API key entry (fallback). Validates the key
 *   and stores it directly.
 *
 * @module app/api/auth/openai/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware'
import { getMongoDb } from '@/lib/mongodb'
import {
  validateOpenAIKey,
  requestDeviceCode,
} from '@/lib/openai-oauth'

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()

      // ── Device Code Flow (preferred — works with any redirect) ─────
      if (body.mode === 'oauth' || body.mode === 'device-code') {
        const deviceCode = await requestDeviceCode()

        // Store device auth session in MongoDB (TTL: matches code expiry)
        const db = await getMongoDb()
        await db.collection('openai_oauth_states').insertOne({
          type: 'device-code',
          deviceAuthId: deviceCode.deviceAuthId,
          userCode: deviceCode.userCode,
          userId: user.userId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + deviceCode.expiresIn * 1000),
        })

        // Ensure TTL index exists
        await db.collection('openai_oauth_states').createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0 }
        ).catch(() => {}) // ignore if already exists

        return NextResponse.json(
          {
            success: true,
            flow: 'device-code',
            userCode: deviceCode.userCode,
            verificationUrl: deviceCode.verificationUrl,
            expiresIn: deviceCode.expiresIn,
          },
          { headers: corsHeaders() }
        )
      }

      // ── Manual API key mode (fallback) ──────────────────────────────
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''

      if (!apiKey) {
        return NextResponse.json(
          { success: false, message: 'API key is required.' },
          { status: 400, headers: corsHeaders() }
        )
      }

      const validation = await validateOpenAIKey(apiKey)

      if (!validation.valid) {
        return NextResponse.json(
          { success: false, message: validation.error || 'Invalid API key' },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      await db.collection('user_settings').updateOne(
        { userId: user.userId },
        {
          $set: {
            openaiApiKey: apiKey,
            openaiConnectedAt: new Date().toISOString(),
            openaiModels: validation.models || [],
            openaiAuthMethod: 'api-key',
          },
          $setOnInsert: { userId: user.userId, createdAt: new Date().toISOString() },
        },
        { upsert: true }
      )

      return NextResponse.json(
        { success: true, message: 'OpenAI API key connected successfully.' },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error('OpenAI connect error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to connect OpenAI.' },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
