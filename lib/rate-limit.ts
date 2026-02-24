/**
 * MongoDB-backed sliding window rate limiter for API endpoints.
 *
 * Prevents abuse of expensive operations (AI analysis, price lookups, etc.)
 * by tracking request timestamps per user per action. Uses a sliding window
 * approach where timestamps older than the window are pruned, and new requests
 * are only admitted if the window contains fewer than `maxRequests` entries.
 *
 * The admission step is atomic via `findOneAndUpdate` with an array-length
 * condition, preventing concurrent requests from exceeding the limit.
 *
 * @module lib/rate-limit
 */
import type { Db } from 'mongodb';

/** MongoDB collection name for storing rate limit state. */
const COLLECTION = 'ai_rate_limits';

/**
 * Check whether a request should be allowed under the sliding window rate limit.
 *
 * First prunes expired timestamps from the window, then atomically attempts
 * to push the current timestamp. The push only succeeds if the array has
 * fewer than `maxRequests` entries (checked via a MongoDB array-length condition).
 *
 * @param db - MongoDB database instance.
 * @param userId - The user making the request.
 * @param action - The rate-limited action name (e.g. "ai_analysis", "price_lookup").
 * @param maxRequests - Maximum number of requests allowed within the window.
 * @param windowMs - Sliding window duration in milliseconds.
 * @returns `true` if the request is allowed, `false` if the user is rate-limited.
 */
export async function checkRateLimit(
  db: Db,
  userId: string,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const col = db.collection(COLLECTION);
  const key = { userId, action };

  // First, clean up expired timestamps
  await col.updateOne(
    key,
    { $pull: { timestamps: { $lt: windowStart } } } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  );

  // Atomic check-and-push: only succeeds if array has fewer than maxRequests entries
  const result = await col.findOneAndUpdate(
    {
      ...key,
      // This condition ensures the array has fewer than maxRequests elements
      // by checking that the Nth element (0-indexed) does NOT exist
      [`timestamps.${maxRequests - 1}`]: { $exists: false },
    },
    {
      $push: { timestamps: now } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      $setOnInsert: { userId, action },
    },
    { upsert: true, returnDocument: 'after' },
  );

  // If result is null, the update didn't match (array is full = rate limited)
  return result !== null;
}
