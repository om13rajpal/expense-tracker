/**
 * @module inngest/sync
 * @description Daily scheduled transaction sync from Google Sheets to MongoDB.
 * Runs at 6:00 AM UTC, fetches all transactions from the configured Google Sheet,
 * persists them to the transactions collection (with deduplication), logs the run
 * to `cron_runs`, and emits a `finance/sync.completed` event to trigger downstream
 * workflows (insight generation, subscription payment detection).
 */
import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';
import { fetchTransactionsFromSheet, clearCache } from '@/lib/sheets';
import { persistTransactions } from '@/lib/persist-transactions';

const CRON_COLLECTION = 'cron_runs';

/**
 * Inngest cron function that syncs transactions from Google Sheets to MongoDB.
 *
 * @trigger Cron schedule: `0 6 * * *` (daily at 6:00 AM UTC).
 * @steps
 *   1. `sync-sheets-to-mongo` -- Clears sheet cache, fetches all transactions from
 *      Google Sheets via `fetchTransactionsFromSheet`, and persists them to MongoDB
 *      via `persistTransactions`. Skips gracefully in demo mode.
 *   2. Emits `finance/sync.completed` event with userIds and transaction count
 *      (only when transactions were actually synced).
 * @returns Object with skipped flag, transaction count, persisted count, and userIds.
 */
export const syncTransactions = inngest.createFunction(
  { id: 'sync-transactions', name: 'Sync Google Sheets Transactions' },
  { cron: '0 6 * * *' }, // Daily at 6:00 AM UTC
  async ({ step }) => {
    const startedAt = new Date();

    const result = await step.run('sync-sheets-to-mongo', async () => {
      const db = await getMongoDb();
      clearCache();

      // Single-user: get the one user from the users collection
      const userDoc = await db.collection('users').findOne({}, { projection: { _id: 1 } });
      const userId = userDoc ? userDoc._id.toString() : 'default';

      const { transactions, isDemo } = await fetchTransactionsFromSheet();

      if (isDemo) {
        await db.collection(CRON_COLLECTION).insertOne({
          job: 'sync',
          status: 'skipped',
          reason: 'Demo mode - no sheet configured',
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
        });
        return { skipped: true as const, count: 0, userIds: [] as string[] };
      }

      const persistResult = await persistTransactions(userId, transactions);

      const finishedAt = new Date();
      await db.collection(CRON_COLLECTION).insertOne({
        job: 'sync',
        status: 'success',
        results: {
          transactionCount: transactions.length,
          persisted: persistResult.total,
        },
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      });

      return { skipped: false as const, count: transactions.length, persisted: persistResult.total, userIds: [userId] };
    });

    if (!result.skipped && result.count > 0) {
      await step.sendEvent('notify-sync-completed', {
        name: 'finance/sync.completed',
        data: {
          userIds: result.userIds,
          transactionCount: result.count,
        },
      });
    }

    return result;
  }
);
