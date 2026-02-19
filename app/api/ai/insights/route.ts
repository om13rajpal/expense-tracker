/**
 * AI Insights API
 *
 * GET  /api/ai/insights?type=spending_analysis  - Return cached insight (never auto-generates)
 * POST /api/ai/insights  body: { type }         - Force-regenerate an insight (manual trigger)
 *
 * Generation is handled by:
 * - Daily Inngest cron (scheduled-insights) at 10 PM UTC
 * - Manual regenerate button (POST)
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { runAiPipeline, getCachedAnalysis } from '@/lib/ai-pipeline';
import type { AiInsightType } from '@/lib/ai-types';

const VALID_TYPES: AiInsightType[] = ['spending_analysis', 'monthly_budget', 'weekly_budget', 'investment_insights', 'tax_optimization', 'planner_recommendation'];

function isValidType(type: unknown): type is AiInsightType {
  return typeof type === 'string' && VALID_TYPES.includes(type as AiInsightType);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * GET /api/ai/insights?type=spending_analysis
 * Returns cached insight only. Never triggers generation.
 * Returns empty response if no cached data exists.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    const type = req.nextUrl.searchParams.get('type');

    if (!isValidType(type)) {
      return NextResponse.json(
        { success: false, message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400, headers: corsHeaders() }
      );
    }

    try {
      const cached = await getCachedAnalysis(user.userId, type);

      if (!cached) {
        return NextResponse.json(
          { success: true, content: null, sections: null, structuredData: null, generatedAt: null, dataPoints: 0, fromCache: false, stale: true },
          { status: 200, headers: corsHeaders() }
        );
      }

      return NextResponse.json(
        {
          success: true,
          content: cached.content,
          sections: cached.sections || null,
          structuredData: cached.structuredData || null,
          generatedAt: cached.generatedAt,
          dataPoints: cached.dataPoints,
          fromCache: true,
          stale: cached.stale,
          searchContext: cached.searchContext || null,
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('AI insights GET error:', getErrorMessage(error));
      return NextResponse.json(
        { success: false, message: `Failed to fetch cached insight: ${getErrorMessage(error)}` },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * POST /api/ai/insights body: {type: "spending_analysis"}
 * Force regenerate (bypass cache)
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    let type: unknown;
    try {
      const body = await req.json();
      type = body.type;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!isValidType(type)) {
      return NextResponse.json(
        { success: false, message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400, headers: corsHeaders() }
      );
    }

    try {
      const result = await runAiPipeline(user.userId, type, { force: true });

      return NextResponse.json(
        {
          success: true,
          content: result.content,
          sections: result.sections || null,
          structuredData: result.structuredData || null,
          generatedAt: result.generatedAt,
          dataPoints: result.dataPoints,
          fromCache: false,
          stale: false,
          searchContext: result.searchContext || null,
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('AI insights POST error:', getErrorMessage(error));
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
