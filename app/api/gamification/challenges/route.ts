/**
 * POST /api/gamification/challenges — Join a challenge.
 * PATCH /api/gamification/challenges — Skip/abandon a challenge.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import { CHALLENGES } from '@/lib/gamification';

export const OPTIONS = handleOptions;

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
