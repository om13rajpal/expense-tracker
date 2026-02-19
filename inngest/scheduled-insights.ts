/**
 * Daily cron function (3:30 AM IST / 10 PM UTC) that triggers a full refresh
 * of all AI insight types for every user with transaction data.
 * @module inngest/scheduled-insights
 */
import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';
import type { AiInsightType } from '@/lib/ai-types';

const ALL_TYPES: AiInsightType[] = [
  'spending_analysis',
  'monthly_budget',
  'weekly_budget',
  'investment_insights',
  'tax_optimization',
  'planner_recommendation',
];

export const scheduledInsights = inngest.createFunction(
  { id: 'scheduled-insights', name: 'Daily Full AI Insights Refresh' },
  { cron: '0 22 * * *' }, // Daily at 10:00 PM UTC (3:30 AM IST next day)
  async ({ step }) => {
    const userIds = await step.run('discover-users', async () => {
      const db = await getMongoDb();
      const ids: string[] = await db.collection('transactions').distinct('userId');
      return ids;
    });

    if (userIds.length === 0) return { usersFound: 0 };

    const events = userIds.map((userId) => ({
      name: 'finance/insights.generate' as const,
      data: { userId, types: ALL_TYPES, trigger: 'scheduled' as const },
    }));

    await step.sendEvent('fan-out-insights', events);

    return { usersFound: userIds.length };
  }
);
