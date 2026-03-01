/**
 * MongoDB index definitions for production query performance.
 *
 * Creates compound and unique indexes on all collections used by Finova:
 * transactions, AI analyses, rate limits, gamification (streaks, XP, badges,
 * challenges), categorization rules/cache, agent threads, user settings,
 * and bucket list items.
 *
 * Called once per process lifecycle on the first `getMongoDb()` invocation.
 * Index creation is idempotent (MongoDB silently skips existing indexes)
 * and guarded by a flag to avoid repeated calls.
 *
 * @module lib/db-indexes
 */
import type { Db } from 'mongodb';

/** Guard flag to ensure indexes are only created once per process. */
let indexesEnsured = false;

/**
 * Create all required MongoDB indexes if they don't already exist.
 *
 * Executes all `createIndex` calls in parallel via `Promise.all`.
 * On failure, logs a warning but does not throw, leaving `indexesEnsured`
 * as `false` so the next `getMongoDb()` call retries.
 *
 * @param db - The MongoDB `Db` instance to create indexes on.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;

  try {
    await Promise.all([
      // Transactions - primary lookup + dedup
      db.collection('transactions').createIndex(
        { userId: 1, txnId: 1 },
        { unique: true }
      ),
      // Transactions - date-sorted queries
      db.collection('transactions').createIndex(
        { userId: 1, date: -1 }
      ),
      // Transactions - category filtering
      db.collection('transactions').createIndex(
        { userId: 1, category: 1 }
      ),
      // Transactions - categoryOverride lookups (used by persistTransactions)
      db.collection('transactions').createIndex(
        { userId: 1, categoryOverride: 1 }
      ),
      // Transactions - receipt rate limit queries
      db.collection('transactions').createIndex(
        { userId: 1, source: 1, createdAt: -1 }
      ),

      // AI analyses - per-user type lookups sorted by date
      db.collection('ai_analyses').createIndex(
        { userId: 1, type: 1, generatedAt: -1 }
      ),

      // Rate limits
      db.collection('ai_rate_limits').createIndex(
        { userId: 1, action: 1 }
      ),

      // Gamification - streaks, XP, badges
      db.collection('user_streaks').createIndex(
        { userId: 1 },
        { unique: true }
      ),
      db.collection('user_xp').createIndex(
        { userId: 1 },
        { unique: true }
      ),
      db.collection('user_badges').createIndex(
        { userId: 1, badgeId: 1 },
        { unique: true }
      ),
      db.collection('gamification_meta').createIndex(
        { userId: 1 },
        { unique: true }
      ),
      db.collection('xp_events').createIndex(
        { userId: 1, createdAt: -1 }
      ),
      db.collection('user_challenges').createIndex(
        { userId: 1, month: 1, status: 1 }
      ),

      // Categorization
      db.collection('categorization_ai_cache').createIndex(
        { cacheKey: 1, userId: 1 },
        { unique: true }
      ),
      db.collection('categorization_rules').createIndex(
        { userId: 1, pattern: 1 }
      ),

      // Agent threads
      db.collection('agent_threads').createIndex(
        { userId: 1, threadId: 1 }
      ),

      // User settings
      db.collection('user_settings').createIndex(
        { userId: 1 },
        { unique: true }
      ),

      // Bucket List
      db.collection('bucket_list').createIndex(
        { userId: 1, status: 1, sortOrder: 1 }
      ),
      db.collection('bucket_list').createIndex(
        { userId: 1, createdAt: -1 }
      ),
      // Bucket List price cache - TTL collection
      db.collection('bucket_list_price_cache').createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      ),

      // Telegram sessions - TTL (10 min inactivity expiry)
      db.collection('telegram_sessions').createIndex(
        { updatedAt: 1 },
        { expireAfterSeconds: 600 }
      ),
      // Telegram sessions - one session per chat
      db.collection('telegram_sessions').createIndex(
        { chatId: 1 },
        { unique: true }
      ),
    ]);

    indexesEnsured = true;
  } catch (err) {
    // Log but don't crash — indexes may already exist or be building.
    // Flag stays false so we retry on next getMongoDb() call.
    console.error('ensureIndexes warning:', err);
  }
}
