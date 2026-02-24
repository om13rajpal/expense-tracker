/**
 * Event-driven function triggered after a successful Google Sheets sync.
 * Fans out `finance/insights.generate` events for spending and budget insights
 * to each synced user.
 * @module inngest/post-sync-insights
 */
import { inngest } from '@/lib/inngest';
import type { AiInsightType } from '@/lib/ai-types';

const POST_SYNC_TYPES: AiInsightType[] = [
  'spending_analysis',
  'monthly_budget',
  'weekly_budget',
];

/**
 * Inngest function that fans out AI insight generation after a transaction sync.
 *
 * @trigger `finance/sync.completed` event with `{ userIds }` payload.
 * @steps
 *   1. For each synced user, emits a `finance/insights.generate` event requesting
 *      spending_analysis, monthly_budget, and weekly_budget insights.
 * @returns Object with the number of users found and events dispatched.
 */
export const postSyncInsights = inngest.createFunction(
  { id: 'post-sync-insights', name: 'Generate Insights After Sync' },
  { event: 'finance/sync.completed' },
  async ({ event, step }) => {
    const { userIds } = event.data;

    if (userIds.length === 0) return { usersFound: 0 };

    const events = userIds.map((userId) => ({
      name: 'finance/insights.generate' as const,
      data: { userId, types: POST_SYNC_TYPES, trigger: 'post-sync' as const },
    }));

    await step.sendEvent('fan-out-post-sync', events);

    return { usersFound: userIds.length };
  }
);
