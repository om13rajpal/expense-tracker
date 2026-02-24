/**
 * Gamification Streak API
 * Manages the user's daily login/activity streak and freeze tokens.
 * Streaks reward consistent financial tracking behavior.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   GET  /api/gamification/streak - Retrieve current streak info
 *   POST /api/gamification/streak - Use a freeze token to preserve streak
 *
 * MongoDB collection: `user_streaks`
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';

/**
 * OPTIONS /api/gamification/streak
 * CORS preflight handler. Returns allowed methods and headers.
 */
export const OPTIONS = handleOptions;

/**
 * GET /api/gamification/streak
 * Retrieve the authenticated user's current streak information including
 * current streak length, longest streak, last log date, freeze tokens, and start date.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, streak: { currentStreak, longestStreak, lastLogDate, freezeTokens, streakStartDate } }`
 */
export const GET = withAuth(async (_request: NextRequest, { user }) => {
  const db = await getMongoDb();
  const userId = user.userId;

  const streak = await db.collection('user_streaks').findOne({ userId });

  return NextResponse.json(
    {
      success: true,
      streak: {
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        lastLogDate: streak?.lastLogDate ?? null,
        freezeTokens: streak?.freezeTokens ?? 0,
        streakStartDate: streak?.streakStartDate ?? null,
      },
    },
    { headers: corsHeaders() },
  );
});

/**
 * POST /api/gamification/streak
 * Use a freeze token to preserve the user's streak for a missed day.
 * Only the "use_freeze" action is supported. Decrements the freeze token count.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} action - Must be "use_freeze"
 *
 * @returns {200} `{ success: true, message: "Freeze token used", freezeTokens: number }`
 * @returns {400} `{ success: false, message: string }` - Invalid action or no tokens available
 */
export const POST = withAuth(async (request: NextRequest, { user }) => {
  const db = await getMongoDb();
  const userId = user.userId;
  const { action } = await request.json();

  if (action !== 'use_freeze') {
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400, headers: corsHeaders() },
    );
  }

  const streak = await db.collection('user_streaks').findOne({ userId });

  if (!streak || streak.freezeTokens <= 0) {
    return NextResponse.json(
      { success: false, message: 'No freeze tokens available' },
      { status: 400, headers: corsHeaders() },
    );
  }

  await db.collection('user_streaks').updateOne(
    { userId },
    { $inc: { freezeTokens: -1 } },
  );

  return NextResponse.json(
    { success: true, message: 'Freeze token used', freezeTokens: streak.freezeTokens - 1 },
    { headers: corsHeaders() },
  );
});
