/**
 * Cron: Periodic Google Sheets transaction sync
 * GET /api/cron/sync
 *
 * Fetches transactions from Google Sheets and persists to MongoDB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import { fetchTransactionsFromSheet, clearCache } from '@/lib/sheets';
import { persistTransactions } from '@/lib/persist-transactions';

/** @constant MongoDB collection for logging cron job runs and their results. */
const CRON_COLLECTION = 'cron_runs';

/**
 * GET /api/cron/sync
 * Periodic cron job that syncs transactions from a configured Google Sheet.
 * Clears the in-memory cache first to force a fresh fetch, then persists
 * the transactions to MongoDB. Skips gracefully if no sheet is configured (demo mode).
 * Logs each run to the `cron_runs` collection.
 *
 * @requires Authentication - Cron secret via `Authorization` header or `CRON_SECRET` env var
 *
 * @returns {200} `{ success: true, message, count, persisted }`
 * @returns {500} `{ success: false, message: string }` - Error during sync
 */
export async function GET(request: NextRequest) {
  return withCronAuth(async () => {
    const startedAt = new Date();

    try {
      const db = await getMongoDb();

      // Clear in-memory cache to force fresh fetch
      clearCache();

      // Single-user: get the one user from the users collection
      const userDoc = await db.collection('users').findOne({}, { projection: { _id: 1 } });
      const userId = userDoc ? userDoc._id.toString() : 'default';

      const { transactions, isDemo } = await fetchTransactionsFromSheet();

      let totalPersisted = 0;
      const totalTransactions = transactions.length;

      if (isDemo) {
        await db.collection(CRON_COLLECTION).insertOne({
          job: 'sync',
          status: 'skipped',
          reason: 'Demo mode - no sheet configured',
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
        });
        return NextResponse.json({
          success: true,
          message: 'Skipped - no sheet configured',
          count: 0,
        });
      }

      const result = await persistTransactions(userId, transactions);
      totalPersisted = result.total;

      const finishedAt = new Date();
      await db.collection(CRON_COLLECTION).insertOne({
        job: 'sync',
        status: 'success',
        results: {
          transactionCount: totalTransactions,
          persisted: totalPersisted,
        },
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      });

      return NextResponse.json({
        success: true,
        message: 'Sync complete',
        count: totalTransactions,
        persisted: totalPersisted,
      });
    } catch (error) {
      const db = await getMongoDb();
      await db.collection(CRON_COLLECTION).insertOne({
        job: 'sync',
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
