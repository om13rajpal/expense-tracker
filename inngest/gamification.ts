/**
 * Gamification Inngest cron functions: streak checks, badge checks,
 * freeze token grants, and monthly challenge rotation.
 * @module inngest/gamification
 */
import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';
import { checkBadgeUnlocks, updateChallengeProgress, CHALLENGES } from '@/lib/gamification';

/**
 * Inngest cron function for daily transaction logging streak checks.
 *
 * @trigger Cron schedule: `0 18 * * *` (daily at 6:00 PM UTC).
 * @steps
 *   1. `check-streaks` -- Finds all users whose last log date is not today and have
 *      an active streak. For users who missed 2+ days:
 *      - If freeze tokens are available, consumes one to preserve the streak.
 *      - Otherwise, resets the streak to 0.
 * @returns Object with checked, broken, and frozen counts.
 */
export const dailyStreakCheck = inngest.createFunction(
  { id: 'daily-streak-check', name: 'Daily Streak Check' },
  { cron: '0 18 * * *' },
  async ({ step }) => {
    const result = await step.run('check-streaks', async () => {
      const db = await getMongoDb();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const streaks = await db.collection('user_streaks').find({
        lastLogDate: { $ne: todayStr },
        currentStreak: { $gt: 0 },
      }).toArray();

      let broken = 0;
      let frozen = 0;

      for (const streak of streaks) {
        const lastDate = new Date(streak.lastLogDate);
        lastDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays >= 2) {
          if (streak.freezeTokens > 0) {
            // Use a freeze token to preserve the streak
            await db.collection('user_streaks').updateOne(
              { _id: streak._id },
              { $inc: { freezeTokens: -1 }, $set: { lastLogDate: todayStr } },
            );
            frozen++;
          } else {
            // Break the streak
            await db.collection('user_streaks').updateOne(
              { _id: streak._id },
              { $set: { currentStreak: 0, streakStartDate: null } },
            );
            broken++;
          }
        }
      }

      return { checked: streaks.length, broken, frozen };
    });
    return result;
  },
);

/**
 * Inngest cron function for daily badge unlock evaluation.
 *
 * @trigger Cron schedule: `30 19 * * *` (daily at 7:30 PM UTC).
 * @steps
 *   1. `check-badges` -- Iterates all users, evaluates badge unlock conditions
 *      via `checkBadgeUnlocks`, creates success notifications for newly earned badges,
 *      and updates monthly challenge progress via `updateChallengeProgress`.
 * @returns Object with usersChecked and badgesUnlocked counts.
 */
export const dailyBadgeCheck = inngest.createFunction(
  { id: 'daily-badge-check', name: 'Daily Badge Check' },
  { cron: '30 19 * * *' },
  async ({ step }) => {
    const result = await step.run('check-badges', async () => {
      const db = await getMongoDb();
      const users = await db.collection('users').find({}).project({ userId: 1 }).toArray();

      let totalUnlocked = 0;

      for (const user of users) {
        const uid = user.userId || user._id.toString();
        const newBadges = await checkBadgeUnlocks(db, uid);

        for (const badgeId of newBadges) {
          await db.collection('notifications').insertOne({
            userId: uid,
            type: 'badge',
            title: 'Badge Unlocked!',
            message: `You earned the "${badgeId}" badge!`,
            severity: 'success',
            read: false,
            createdAt: new Date(),
          });
          totalUnlocked++;
        }

        // Also update challenge progress
        await updateChallengeProgress(db, uid);
      }

      return { usersChecked: users.length, badgesUnlocked: totalUnlocked };
    });
    return result;
  },
);

/**
 * Inngest cron function for weekly streak freeze token grants.
 *
 * @trigger Cron schedule: `0 0 * * 1` (every Monday at midnight UTC).
 * @steps
 *   1. `grant-freeze-tokens` -- Grants 1 freeze token to all users who have fewer
 *      than the maximum of 2 tokens. Uses a bulk MongoDB updateMany operation.
 * @returns Object with the number of tokens granted.
 */
export const weeklyFreezeGrant = inngest.createFunction(
  { id: 'weekly-freeze-grant', name: 'Weekly Freeze Token Grant' },
  { cron: '0 0 * * 1' },
  async ({ step }) => {
    const result = await step.run('grant-freeze-tokens', async () => {
      const db = await getMongoDb();
      const res = await db.collection('user_streaks').updateMany(
        { freezeTokens: { $lt: 2 } },
        { $inc: { freezeTokens: 1 } },
      );
      return { granted: res.modifiedCount };
    });
    return result;
  },
);

/**
 * Inngest cron function for monthly challenge rotation.
 *
 * @trigger Cron schedule: `0 23 1 * *` (1st of each month at 11:00 PM UTC).
 * @steps
 *   1. `rotate-challenges` -- Closes the previous month's active challenges as expired,
 *      then creates a new `available_challenges` document for the current month with
 *      the full challenge catalogue from the CHALLENGES config.
 * @returns Object with closedChallenges count and the new month key.
 */
export const monthlyChallengeRotation = inngest.createFunction(
  { id: 'monthly-challenge-rotation', name: 'Monthly Challenge Rotation' },
  { cron: '0 23 1 * *' },
  async ({ step }) => {
    const result = await step.run('rotate-challenges', async () => {
      const db = await getMongoDb();
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

      // Close previous month's active challenges as expired
      const closed = await db.collection('user_challenges').updateMany(
        { month: prevMonthKey, status: 'active' },
        { $set: { status: 'expired', expiredAt: new Date() } },
      );

      // Prepare the new month's challenge catalogue
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await db.collection('available_challenges').updateOne(
        { month: currentMonthKey },
        {
          $set: {
            month: currentMonthKey,
            challenges: CHALLENGES.map((c) => c.id),
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      return { closedChallenges: closed.modifiedCount, newMonth: currentMonthKey };
    });
    return result;
  },
);
