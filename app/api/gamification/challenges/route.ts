/**
 * Gamification Challenges API
 * Manages monthly savings challenges in the gamification system.
 * Challenge definitions are in `@/lib/gamification`. Users can join one
 * instance per challenge per month.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   POST  /api/gamification/challenges - Join a challenge for the current month
 *   PATCH /api/gamification/challenges - Skip/abandon an active challenge
 *
 * MongoDB collection: `user_challenges`
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import { CHALLENGES } from '@/lib/gamification';

/**
 * OPTIONS /api/gamification/challenges
 * CORS preflight handler. Returns allowed methods and headers.
 */
export const OPTIONS = handleOptions;

/**
 * POST /api/gamification/challenges
 * Join a challenge for the current month. Validates the challenge ID against
 * the CHALLENGES catalog and prevents duplicate joins for the same month.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} challengeId - The challenge ID to join
 *
 * @returns {200} `{ success: true, message: "Challenge joined" }`
 * @returns {400} `{ success: false, message: string }` - Invalid challenge ID
 * @returns {409} `{ success: false, message: string }` - Already joined this month
 */
export const POST = withAuth(async (request: NextRequest, { user }) => {
  const db = await getMongoDb();
  const userId = user.userId;
  const { challengeId } = await request.json();

  const def = CHALLENGES.find((c) => c.id === challengeId);
  if (!def) {
    return NextResponse.json(
      { success: false, message: 'Invalid challenge ID' },
      { status: 400, headers: corsHeaders() },
    );
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Check if already joined
  const existing = await db.collection('user_challenges').findOne({ userId, challengeId, month });
  if (existing) {
    return NextResponse.json(
      { success: false, message: 'Already joined this challenge' },
      { status: 409, headers: corsHeaders() },
    );
  }

  await db.collection('user_challenges').insertOne({
    userId,
    challengeId,
    month,
    status: 'active',
    progress: 0,
    target: def.target,
    current: 0,
    joinedAt: new Date(),
  });

  return NextResponse.json({ success: true, message: 'Challenge joined' }, { headers: corsHeaders() });
});

/**
 * PATCH /api/gamification/challenges
 * Skip or abandon an active challenge for the current month.
 * Only active challenges can be skipped.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} challengeId - The challenge ID to skip
 *
 * @returns {200} `{ success: true, message: "Challenge skipped" }`
 * @returns {404} `{ success: false, message: string }` - Challenge not found or not active
 */
export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  const db = await getMongoDb();
  const userId = user.userId;
  const { challengeId } = await request.json();

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const result = await db.collection('user_challenges').updateOne(
    { userId, challengeId, month, status: 'active' },
    { $set: { status: 'skipped', skippedAt: new Date() } },
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json(
      { success: false, message: 'Challenge not found or not active' },
      { status: 404, headers: corsHeaders() },
    );
  }

  return NextResponse.json({ success: true, message: 'Challenge skipped' }, { headers: corsHeaders() });
});
