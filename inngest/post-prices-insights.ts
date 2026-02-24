/**
 * Event-driven function triggered after stock/MF price refresh.
 * Discovers all users with investment holdings and fans out
 * `finance/insights.generate` events for investment insights.
 * @module inngest/post-prices-insights
 */
import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';
import type { AiInsightType } from '@/lib/ai-types';

const POST_PRICES_TYPES: AiInsightType[] = ['investment_insights'];

/**
 * Inngest function that fans out investment insight generation after price refresh.
 *
 * @trigger `finance/prices.updated` event (emitted by the prices cron).
 * @steps
 *   1. `discover-investment-users` -- Finds all distinct userIds from stocks and
 *      mutual_funds collections.
 *   2. Emits `finance/insights.generate` events for each user requesting
 *      investment_insights type.
 * @returns Object with the number of investment users found.
 */
export const postPricesInsights = inngest.createFunction(
  { id: 'post-prices-insights', name: 'Generate Investment Insights After Price Refresh' },
  { event: 'finance/prices.updated' },
  async ({ step }) => {
    const userIds = await step.run('discover-investment-users', async () => {
      const db = await getMongoDb();
      const stockUsers: string[] = await db.collection('stocks').distinct('userId');
      const mfUsers: string[] = await db.collection('mutual_funds').distinct('userId');
      return Array.from(new Set([...stockUsers, ...mfUsers]));
    });

    if (userIds.length === 0) return { usersFound: 0 };

    const events = userIds.map((userId) => ({
      name: 'finance/insights.generate' as const,
      data: { userId, types: POST_PRICES_TYPES, trigger: 'post-prices' as const },
    }));

    await step.sendEvent('fan-out-post-prices', events);

    return { usersFound: userIds.length };
  }
);
