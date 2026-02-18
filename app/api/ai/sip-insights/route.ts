/**
 * AI Investment/SIP Insights API
 *
 * POST /api/ai/sip-insights
 * Generates AI-powered investment insights covering stocks, mutual funds, and SIPs.
 * Legacy/backward-compatible endpoint; prefer /api/ai/insights for new code.
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { runAiPipeline } from '@/lib/ai-pipeline';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * POST /api/ai/sip-insights
 * Backward-compatible wrapper -- delegates to AI pipeline (investment_insights)
 */
export async function POST(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const result = await runAiPipeline(user.userId, 'investment_insights', { force: true });

      return NextResponse.json(
        {
          success: true,
          insights: result.content,
          generatedAt: result.generatedAt,
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('AI sip-insights error:', getErrorMessage(error));
      return NextResponse.json(
        { success: false, message: `AI investment insights failed: ${getErrorMessage(error)}` },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

export async function OPTIONS() {
  return handleOptions();
}
