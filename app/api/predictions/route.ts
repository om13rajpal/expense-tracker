/**
 * Predictions API
 * Provides forward-looking financial predictions including burn rates,
 * cash flow forecasts, and goal achievement timelines.
 * All computations are delegated to `@/lib/predictive` helper functions.
 *
 * Requires JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   GET /api/predictions - Compute and return all prediction data
 *
 * MongoDB collections: `transactions`, `savings_goals` (accessed via predictive lib)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import {
  computeBurnRates,
  computeCashFlowForecast,
  computeGoalPredictions,
} from '@/lib/predictive';

/**
 * OPTIONS /api/predictions
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/predictions
 * Compute burn rates, cash flow forecast, and goal predictions in parallel.
 * Delegates to three predictive functions from `@/lib/predictive`.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, burnRates: object, cashFlow: object, goalPredictions: object }`
 * @returns {500} `{ success: false, error: string }` - Computation or server error
 */
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
