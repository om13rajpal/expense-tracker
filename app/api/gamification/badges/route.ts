/**
 * Gamification Badges API
 * Manages badge display and notification state for the gamification system.
 * Badges are defined in `@/lib/gamification` and unlocked based on user actions.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   GET   /api/gamification/badges - List all badges with unlock status
 *   PATCH /api/gamification/badges - Mark a badge as notified (dismiss new badge toast)
 *
 * MongoDB collection: `user_badges`
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import { BADGES } from '@/lib/gamification';

/**
 * OPTIONS /api/gamification/badges
 * CORS preflight handler. Returns allowed methods and headers.
 */
export const OPTIONS = handleOptions;

/**
 * GET /api/gamification/badges
 * Retrieve all available badges merged with the user's unlock status.
 * Returns the full badge catalog from BADGES constant, annotated with
 * `unlocked`, `unlockedAt`, and `notified` fields from the user's records.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, badges: Array<{ id, name, description, icon, unlocked, unlockedAt, notified }> }`
 */
export const GET = withAuth(async (_request: NextRequest, { user }) => {
  const db = await getMongoDb();
  const userId = user.userId;

  const userBadges = await db.collection('user_badges').find({ userId }).toArray();
  const unlockedMap = new Map(userBadges.map((b) => [b.badgeId, b]));

  const badges = BADGES.map((badge) => {
    const ub = unlockedMap.get(badge.id);
    return {
      ...badge,
      unlocked: !!ub,
      unlockedAt: ub?.unlockedAt ?? null,
      notified: ub?.notified ?? false,
    };
  });

  return NextResponse.json({ success: true, badges }, { headers: corsHeaders() });
});

/**
 * PATCH /api/gamification/badges
 * Mark a specific badge as notified so it no longer shows as a new unlock.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} badgeId - The badge ID to mark as notified
 *
 * @returns {200} `{ success: true }`
 * @returns {404} `{ success: false, message: string }` - Badge not found or not unlocked
 */
export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  const db = await getMongoDb();
  const userId = user.userId;
  const { badgeId } = await request.json();

  const result = await db.collection('user_badges').updateOne(
    { userId, badgeId },
    { $set: { notified: true } },
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json(
      { success: false, message: 'Badge not found' },
      { status: 404, headers: corsHeaders() },
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders() });
});
