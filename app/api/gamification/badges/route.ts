/**
 * GET  /api/gamification/badges — All badges with unlock status.
 * PATCH /api/gamification/badges — Mark a badge as notified.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import { BADGES } from '@/lib/gamification';

export const OPTIONS = handleOptions;

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
