import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import {
  computeBurnRates,
  computeCashFlowForecast,
  computeGoalPredictions,
} from '@/lib/predictive';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();

      const [burnRates, cashFlow, goalPredictions] = await Promise.all([
        computeBurnRates(db, user.userId),
        computeCashFlowForecast(db, user.userId),
        computeGoalPredictions(db, user.userId),
      ]);

      return NextResponse.json(
        { success: true, burnRates, cashFlow, goalPredictions },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/predictions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to compute predictions' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
