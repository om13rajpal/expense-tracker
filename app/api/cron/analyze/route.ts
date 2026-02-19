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

const CRON_COLLECTION = 'cron_runs';

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
