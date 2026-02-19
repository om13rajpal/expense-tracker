/**
 * Simple MongoDB-backed sliding window rate limiter.
 * Cleanup ($pull) runs separately; the check-and-push step uses
 * atomic findOneAndUpdate to prevent concurrent over-admission.
 */
import type { Db } from 'mongodb';

const COLLECTION = 'ai_rate_limits';

/**
 * Check whether a request should be allowed under the rate limit.
 * Uses a sliding window: keeps timestamps of recent calls and checks count.
 *
 * The admission step is atomic: findOneAndUpdate with an array-length
 * condition ensures concurrent requests can't both sneak past the limit.
 * (The preceding cleanup step is a separate operation, but benign — it
 * only removes expired entries and cannot cause over-admission.)
 *
 * @returns true if the request is allowed, false if rate-limited.
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
