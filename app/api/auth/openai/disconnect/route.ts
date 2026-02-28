/**
 * OpenAI disconnect endpoint.
 *
 * POST /api/auth/openai/disconnect
 *
 * Removes all OpenAI-related credentials from the user's settings,
 * effectively disconnecting their ChatGPT account from Finova.
 *
 * @module app/api/auth/openai/disconnect/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware'
import { getMongoDb } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      await db.collection('user_settings').updateOne(
        { userId: user.userId },
        {
          $unset: {
            openaiApiKey: '',
            openaiRefreshToken: '',
            openaiIdToken: '',
            openaiTokenExpires: '',
            openaiAccountId: '',
            openaiEmail: '',
            openaiPlanType: '',
            openaiConnectedAt: '',
            openaiModels: '',
            openaiAuthMethod: '',
          },
        }
      )

      return NextResponse.json(
        { success: true },
        { headers: corsHeaders() }
      )
    } catch (error) {
      console.error('OpenAI disconnect error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to disconnect OpenAI' },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
