/**
 * OpenAI connection status endpoint.
 *
 * GET /api/auth/openai/status
 *
 * Returns whether the authenticated user has a connected ChatGPT account,
 * along with the associated email, plan type, and connection date.
 *
 * @module app/api/auth/openai/status/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware'
import { getMongoDb } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const settings = await db.collection('user_settings').findOne({ userId: user.userId })

      if (settings?.openaiApiKey) {
        const key = settings.openaiApiKey as string
        const masked = key.length > 12
          ? key.slice(0, 7) + '...' + key.slice(-4)
          : '••••••••'

        return NextResponse.json(
          {
            success: true,
            connected: true,
            maskedKey: masked,
            email: settings.openaiEmail || null,
            planType: settings.openaiPlanType || null,
            connectedAt: settings.openaiConnectedAt || null,
            authMethod: settings.openaiAuthMethod || 'api-key',
          },
          { headers: corsHeaders() }
        )
      }

      return NextResponse.json(
        { success: true, connected: false },
        { headers: corsHeaders() }
      )
    } catch (error) {
      console.error('OpenAI status check error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to check OpenAI status' },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
