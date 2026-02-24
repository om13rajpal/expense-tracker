/**
 * Scheduled notification functions: budget breach checks, subscription renewal alerts,
 * and the weekly financial digest.
 * @module inngest/notifications
 */
import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';
import {
  checkBudgetBreaches,
  checkSubscriptionRenewals,
  generateWeeklyDigest,
} from '@/lib/notifications';

/**
 * Inngest cron function for daily budget breach detection.
 *
 * @trigger Cron schedule: `0 20 * * *` (daily at 8:00 PM UTC).
 * @steps
 *   1. `check-budgets` -- Compares current-month spend against each budget category
 *      for all users. Creates warning (80% threshold) and critical (100% threshold)
 *      notifications when spending limits are approached or exceeded.
 * @returns Object indicating the check was completed.
 */
export const budgetBreachCheck = inngest.createFunction(
  { id: 'budget-breach-check', name: 'Daily Budget Breach Check' },
  { cron: '0 20 * * *' },
  async ({ step }) => {
    const result = await step.run('check-budgets', async () => {
      const db = await getMongoDb();
      await checkBudgetBreaches(db);
      return { checked: true };
    });
    return result;
  }
);

/**
 * Inngest cron function for daily subscription renewal alerts.
 *
 * @trigger Cron schedule: `0 9 * * *` (daily at 9:00 AM UTC).
 * @steps
 *   1. `check-renewals` -- Scans all active subscriptions for those renewing within
 *      the next 3 days. Creates reminder notifications for upcoming charges.
 * @returns Object indicating the check was completed.
 */
export const renewalAlert = inngest.createFunction(
  { id: 'renewal-alert', name: 'Daily Subscription Renewal Alert' },
  { cron: '0 9 * * *' },
  async ({ step }) => {
    const result = await step.run('check-renewals', async () => {
      const db = await getMongoDb();
      await checkSubscriptionRenewals(db);
      return { checked: true };
    });
    return result;
  }
);

/**
 * Inngest cron function for the weekly financial digest.
 *
 * @trigger Cron schedule: `0 9 * * 0` (every Sunday at 9:00 AM UTC).
 * @steps
 *   1. `generate-digest` -- Compiles a weekly summary for all users including:
 *      total spent, top spending categories, savings rate, and portfolio value change.
 *      Creates a digest notification for each user.
 * @returns Object indicating the digest was generated.
 */
export const weeklyDigest = inngest.createFunction(
  { id: 'weekly-digest', name: 'Weekly Financial Digest' },
  { cron: '0 9 * * 0' },
  async ({ step }) => {
    const result = await step.run('generate-digest', async () => {
      const db = await getMongoDb();
      await generateWeeklyDigest(db);
      return { generated: true };
    });
    return result;
  }
);
