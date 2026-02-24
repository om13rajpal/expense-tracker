/**
 * Inngest function that generates AI insights for a single user.
 * Triggered by the `finance/insights.generate` event and iterates over the
 * requested insight types, running each through the AI pipeline.
 * Concurrency is limited to 3 globally and 1 per user.
 * @module inngest/generate-insights
 */
import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';
import { runAiPipeline } from '@/lib/ai-pipeline';
import type { AiInsightType } from '@/lib/ai-types';

const CRON_COLLECTION = 'cron_runs';

/**
 * Inngest function that generates AI insights for a single user.
 *
 * @trigger `finance/insights.generate` event with `{ userId, types, trigger }` payload.
 * @steps
 *   1. For each requested insight type, runs the AI pipeline (`runAiPipeline`).
 *      Investment insights include web search for market context.
 *   2. Logs the generation results (success/failure per type) to the `cron_runs` collection.
 * @concurrency Global limit of 3, per-user limit of 1.
 * @retries Up to 2 retries on failure.
 * @returns Object containing the userId and per-type results with status.
 */
export const generateUserInsights = inngest.createFunction(
  {
    id: 'generate-user-insights',
    name: 'Generate AI Insights for User',
    concurrency: [
      { limit: 3 },
      { limit: 1, key: 'event.data.userId' },
    ],
    retries: 2,
  },
  { event: 'finance/insights.generate' },
  async ({ event, step }) => {
    const { userId, types, trigger } = event.data;
    const startedAt = new Date();
    const results: Record<string, { status: string; error?: string }> = {};

    for (const type of types) {
      const stepResult = await step.run(`generate-${type}`, async () => {
        try {
          const includeSearch = type === 'investment_insights';
          await runAiPipeline(userId, type as AiInsightType, {
            force: true,
            includeSearch,
          });
          return { status: 'success' as const };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { status: 'failed' as const, error: message };
        }
      });
      results[type] = stepResult;
    }

    await step.run('log-generation', async () => {
      const db = await getMongoDb();
      const finishedAt = new Date();
      await db.collection(CRON_COLLECTION).insertOne({
        job: 'insights-generation',
        trigger,
        userId,
        status: 'success',
        results,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      });
    });

    return { userId, results };
  }
);
