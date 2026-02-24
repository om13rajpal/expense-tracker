/**
 * Monthly Ghost Budget snapshot cron job.
 * Runs on the 1st of every month at 11 PM UTC to compute
 * how much each user's "ghost self" (perfect budgeter) would have saved.
 * @module inngest/ghost-budget
 */
import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';

/**
 * Inngest cron function that computes monthly ghost budget snapshots.
 *
 * @trigger Cron schedule: `0 23 1 * *` (1st of each month at 11:00 PM UTC).
 * @steps
 *   1. `compute-ghost-budgets` -- For each user with ghost budget enabled:
 *      - Loads their budget categories and previous month's expenses.
 *      - Computes per-category overspend (actual - budgeted when over).
 *      - Calculates cumulative savings gap across all historical snapshots.
 *      - Stores the snapshot in `ghost_budget_snapshots` collection.
 *      - Skips if snapshot already exists for the month (idempotent).
 * @returns Object with the number of users processed.
 */
export const ghostBudgetSnapshot = inngest.createFunction(
  { id: 'ghost-budget-snapshot', name: 'Monthly Ghost Budget Snapshot' },
  { cron: '0 23 1 * *' },
  async ({ step }) => {
    const result = await step.run('compute-ghost-budgets', async () => {
      const db = await getMongoDb();

      // Get all distinct user IDs
      const userIds: string[] = await db
        .collection('budget_categories')
        .distinct('userId');

      let processed = 0;

      for (const userId of userIds) {
        // Check if user has ghost budget enabled
        const settings = await db.collection('user_settings').findOne({ userId });
        if (!settings?.ghostBudgetEnabled) continue;

        // Previous month range
        const now = new Date();
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const monthKey = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, '0')}`;

        // Check if snapshot already exists for this month
        const existing = await db.collection('ghost_budget_snapshots').findOne({
          userId,
          month: monthKey,
        });
        if (existing) continue;

        // Load budgets
        const budgetDocs = await db
          .collection('budget_categories')
          .find({ userId })
          .toArray();

        // Build reverse map
        const reverseMap: Record<string, string> = {};
        for (const doc of budgetDocs) {
          const cats = doc.transactionCategories as string[] | undefined;
          if (Array.isArray(cats)) {
            for (const cat of cats) {
              reverseMap[cat] = doc.name as string;
            }
          }
        }

        // Load previous month expenses
        const transactions = await db
          .collection('transactions')
          .find({
            userId,
            date: { $gte: prevMonthStart.toISOString(), $lte: prevMonthEnd.toISOString() },
            type: 'expense',
          })
          .toArray();

        // Aggregate spend per budget category
        const spendByBudget: Record<string, number> = {};
        for (const txn of transactions) {
          const raw = txn.category as string;
          const budgetName = reverseMap[raw] || raw;
          spendByBudget[budgetName] = (spendByBudget[budgetName] || 0) + Math.abs(txn.amount as number);
        }

        // Compute ghost savings
        let totalActual = 0;
        let totalBudgeted = 0;
        let ghostSavings = 0;
        const categoryBreakdown: Array<{
          category: string;
          actual: number;
          budgeted: number;
          gap: number;
        }> = [];

        for (const doc of budgetDocs) {
          const budgeted = doc.budgetAmount as number;
          if (!budgeted || budgeted <= 0) continue;

          const category = doc.name as string;
          const actual = spendByBudget[category] || 0;
          const gap = actual > budgeted ? actual - budgeted : 0;

          totalActual += actual;
          totalBudgeted += budgeted;
          ghostSavings += gap;

          categoryBreakdown.push({ category, actual, budgeted, gap });
        }

        // Compute cumulative gap from all previous snapshots
        const prevSnapshots = await db
          .collection('ghost_budget_snapshots')
          .find({ userId })
          .sort({ month: 1 })
          .toArray();

        const previousCumulative = prevSnapshots.length > 0
          ? (prevSnapshots[prevSnapshots.length - 1].cumulativeGap as number) || 0
          : 0;
        const cumulativeGap = previousCumulative + ghostSavings;

        await db.collection('ghost_budget_snapshots').insertOne({
          userId,
          month: monthKey,
          actualSpend: totalActual,
          budgetedSpend: totalBudgeted,
          ghostSavings,
          cumulativeGap,
          categoryBreakdown,
          createdAt: new Date().toISOString(),
        });

        processed++;
      }

      return { processed };
    });

    return result;
  }
);
