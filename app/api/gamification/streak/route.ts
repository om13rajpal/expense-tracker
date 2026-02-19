/**
 * GET  /api/gamification/streak — Current streak info.
 * POST /api/gamification/streak — Use a freeze token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';

export const OPTIONS = handleOptions;

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
