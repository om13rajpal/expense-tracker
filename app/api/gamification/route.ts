/**
 * GET /api/gamification — Full gamification summary for the authenticated user.
 *
 * On every load this endpoint runs checkBadgeUnlocks() and
 * updateChallengeProgress() so that existing user data (transactions,
 * budgets, goals, etc.) is always evaluated — not just when the daily
 * Inngest cron fires.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import {
  getLevelForXP,
  BADGES,
  CHALLENGES,
  checkBadgeUnlocks,
  updateChallengeProgress,
} from '@/lib/gamification';

export const OPTIONS = handleOptions;

const BADGE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const GET = withAuth(async (_request: NextRequest, { user }) => {
  const db = await getMongoDb();
  const userId = user.userId;

  // ── Evaluate badges & challenge progress against live data ──
  // Skip if checked within the last 5 minutes to avoid 15+ queries per page load.
  // The daily cron at 7:30 PM UTC handles the comprehensive check.
  try {
    const gamDoc = await db.collection('gamification_meta').findOne({ userId });
    const lastCheck = gamDoc?.lastBadgeCheck
      ? new Date(gamDoc.lastBadgeCheck).getTime()
      : 0;
    const now = Date.now();

    if (now - lastCheck > BADGE_CHECK_INTERVAL_MS) {
      await checkBadgeUnlocks(db, userId);
      await updateChallengeProgress(db, userId);
      await db.collection('gamification_meta').updateOne(
        { userId },
        { $set: { lastBadgeCheck: new Date() } },
        { upsert: true },
      );
    }
  } catch (err) {
    // Don't block the page load if evaluation fails
    console.error('Gamification evaluation error:', err);
  }

  // ── Read fresh state after evaluation ──
  const [streakDoc, xpDoc, userBadges, activeChallenges, recentXP] = await Promise.all([
    db.collection('user_streaks').findOne({ userId }),
    db.collection('user_xp').findOne({ userId }),
    db.collection('user_badges').find({ userId }).toArray(),
    db.collection('user_challenges').find({ userId, status: { $in: ['active', 'completed'] } }).toArray(),
    db.collection('xp_events').find({ userId }).sort({ createdAt: -1 }).limit(10).toArray(),
  ]);

  const totalXP = xpDoc?.totalXP ?? 0;
  const levelInfo = getLevelForXP(totalXP);

  const badges = BADGES.map((badge) => {
    const unlocked = userBadges.find((ub) => ub.badgeId === badge.id);
    return {
      ...badge,
      unlocked: !!unlocked,
      unlockedAt: unlocked?.unlockedAt ?? null,
      notified: unlocked?.notified ?? false,
    };
  });

  const challenges = activeChallenges.map((uc) => {
    const def = CHALLENGES.find((c) => c.id === uc.challengeId);
    return {
      challengeId: uc.challengeId,
      name: def?.name ?? uc.challengeId,
      description: def?.description ?? '',
      target: def?.target ?? uc.target,
      current: uc.current ?? 0,
      progress: uc.progress ?? 0,
      status: uc.status,
      xpReward: def?.xpReward ?? 0,
    };
  });

  return NextResponse.json(
    {
      success: true,
      streak: {
        currentStreak: streakDoc?.currentStreak ?? 0,
        longestStreak: streakDoc?.longestStreak ?? 0,
        lastLogDate: streakDoc?.lastLogDate ?? null,
        freezeTokens: streakDoc?.freezeTokens ?? 0,
        streakStartDate: streakDoc?.streakStartDate ?? null,
      },
      xp: {
        totalXP,
        level: levelInfo.level,
        levelName: levelInfo.name,
        progress: levelInfo.progress,
        nextLevelXP: levelInfo.nextLevelXP,
      },
      badges,
      activeChallenges: challenges,
      recentXP: recentXP.map((e) => ({
        action: e.action,
        xp: e.xp,
        description: e.description,
        createdAt: e.createdAt,
      })),
    },
    { headers: corsHeaders() },
  );
});
