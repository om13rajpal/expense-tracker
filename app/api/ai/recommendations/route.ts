import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { runAiPipeline } from '@/lib/ai-pipeline';
import type { AiInsightType } from '@/lib/ai-types';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * POST /api/ai/recommendations
 * Backward-compatible wrapper — delegates to AI pipeline (monthly_budget / weekly_budget)
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json().catch(() => ({}));
      const period = body.period || 'monthly';
      const type: AiInsightType = period === 'weekly' ? 'weekly_budget' : 'monthly_budget';

      const result = await runAiPipeline(user.userId, type, { force: true });

      return NextResponse.json(
        {
          success: true,
          recommendations: result.content,
          period,
          generatedAt: result.generatedAt,
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('AI recommendations error:', getErrorMessage(error));
      return NextResponse.json(
        { success: false, message: `AI recommendations failed: ${getErrorMessage(error)}` },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

export async function OPTIONS() {
  return handleOptions();
}
