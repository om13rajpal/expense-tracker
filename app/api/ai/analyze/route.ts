/**
 * AI Spending Analysis API
 *
 * POST /api/ai/analyze
 * Triggers a forced spending analysis via the AI pipeline.
 * Legacy/backward-compatible endpoint; prefer /api/ai/insights for new code.
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { runAiPipeline } from '@/lib/ai-pipeline';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * POST /api/ai/analyze
 * Backward-compatible wrapper -- delegates to AI pipeline (spending_analysis)
 */
export async function POST(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const result = await runAiPipeline(user.userId, 'spending_analysis', { force: true });

      return NextResponse.json(
        {
          success: true,
          analysis: result.content,
          generatedAt: result.generatedAt,
          dataPoints: result.dataPoints,
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('AI analyze error:', getErrorMessage(error));
      return NextResponse.json(
        { success: false, message: `AI analysis failed: ${getErrorMessage(error)}` },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

export async function OPTIONS() {
  return handleOptions();
}
