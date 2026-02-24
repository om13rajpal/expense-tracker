/**
 * Cron: Weekly AI spending analysis generation
 * GET /api/cron/analyze
 *
 * Uses the AI pipeline to generate analysis for all users with transaction data
 * and stores the results in MongoDB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import { runAiPipeline } from '@/lib/ai-pipeline';

/** @constant MongoDB collection for logging cron job runs and their results. */
const CRON_COLLECTION = 'cron_runs';

/**
 * GET /api/cron/analyze
 * Weekly cron job that generates AI spending analyses for all users with transaction data.
 * Runs the AI pipeline for six insight types: spending_analysis, monthly_budget,
 * weekly_budget, investment_insights, tax_optimization, and planner_recommendation.
 * Logs each run to the `cron_runs` collection.
 *
 * @requires Authentication - Cron secret via `Authorization` header or `CRON_SECRET` env var
 *
 * @returns {200} `{ success: true, usersProcessed: number, usersFailed: number }`
 * @returns {500} `{ success: false, message: string }` - Error during analysis
 */
export async function GET(request: NextRequest) {
  return withCronAuth(async () => {
    const startedAt = new Date();
    let usersProcessed = 0;
    let usersFailed = 0;

    try {
      const db = await getMongoDb();
      const userIds = await db.collection('transactions').distinct('userId');

      const insightTypes = [
        'spending_analysis',
        'monthly_budget',
        'weekly_budget',
        'investment_insights',
        'tax_optimization',
        'planner_recommendation',
      ] as const;

      for (const userId of userIds) {
        try {
          for (const type of insightTypes) {
            await runAiPipeline(userId, type, { force: true, includeSearch: false });
          }
          usersProcessed++;
        } catch {
          usersFailed++;
        }
      }

      const finishedAt = new Date();
      await db.collection(CRON_COLLECTION).insertOne({
        job: 'analyze',
        status: 'success',
        results: { usersProcessed, usersFailed },
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      });

      return NextResponse.json({ success: true, usersProcessed, usersFailed });
    } catch (error) {
      const db = await getMongoDb();
      await db.collection(CRON_COLLECTION).insertOne({
        job: 'analyze',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      });
      return NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })(request);
}
