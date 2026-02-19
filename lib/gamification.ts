/**
 * Core gamification engine: XP levels, badges, streaks, and monthly challenges.
 * @module lib/gamification
 */
import type { Db } from 'mongodb';

// ─── XP Levels ─────────────────────────────────────────────────────────

export interface XPLevel {
  level: number;
  name: string;
  threshold: number;
}

export const XP_LEVELS: XPLevel[] = [
  { level: 1, name: 'Beginner', threshold: 0 },
  { level: 2, name: 'Penny Saver', threshold: 100 },
  { level: 3, name: 'Budget Apprentice', threshold: 300 },
  { level: 4, name: 'Money Manager', threshold: 600 },
  { level: 5, name: 'Finance Enthusiast', threshold: 1000 },
  { level: 6, name: 'Wealth Builder', threshold: 1500 },
  { level: 7, name: 'Investment Guru', threshold: 2200 },
  { level: 8, name: 'Financial Expert', threshold: 3000 },
  { level: 9, name: 'Money Master', threshold: 4000 },
  { level: 10, name: 'Financial Legend', threshold: 5500 },
];

export type XPAction =
  | 'expense_logged'
  | 'budget_created'
  | 'streak_7'
  | 'streak_30'
  | 'streak_100'
  | 'badge_unlocked'
  | 'challenge_completed';

export const XP_ACTIONS: Record<XPAction, number> = {
  expense_logged: 5,
  budget_created: 20,
  streak_7: 50,
  streak_30: 150,
  streak_100: 500,
  badge_unlocked: 25,
  challenge_completed: 100,
};

// ─── Badges ────────────────────────────────────────────────────────────

export type BadgeCategory = 'onboarding' | 'milestones' | 'behavioral' | 'skill';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  condition: string;
}

export const BADGES: BadgeDef[] = [
  // Onboarding
  { id: 'first_expense', name: 'First Expense', description: 'Log your first expense', icon: 'IconReceipt', category: 'onboarding', condition: 'Log 1 transaction' },
  { id: 'first_budget', name: 'First Budget', description: 'Create your first budget', icon: 'IconWallet', category: 'onboarding', condition: 'Create 1 budget' },
  { id: 'first_goal', name: 'First Goal', description: 'Set your first savings goal', icon: 'IconTarget', category: 'onboarding', condition: 'Create 1 goal' },
  { id: 'first_investment', name: 'First Investment', description: 'Add your first investment', icon: 'IconTrendingUp', category: 'onboarding', condition: 'Add 1 investment' },
  { id: 'all_set_up', name: 'All Set Up', description: 'Complete your profile and all onboarding steps', icon: 'IconCircleCheck', category: 'onboarding', condition: 'Unlock all onboarding badges' },

  // Milestones
  { id: 'century', name: 'Century', description: 'Log 100 transactions', icon: 'IconNumber100Small', category: 'milestones', condition: '100 transactions' },
  { id: 'five_hundred_club', name: '500 Club', description: 'Log 500 transactions', icon: 'IconStarFilled', category: 'milestones', condition: '500 transactions' },
  { id: 'thousand_strong', name: 'Thousand Strong', description: 'Log 1,000 transactions', icon: 'IconTrophy', category: 'milestones', condition: '1,000 transactions' },
  { id: 'one_year_anniversary', name: '1 Year Anniversary', description: 'Use the app for a full year', icon: 'IconCake', category: 'milestones', condition: 'Account age >= 1 year' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'IconFlame', category: 'milestones', condition: '7-day streak' },
  { id: 'streak_30', name: 'Monthly Maven', description: 'Maintain a 30-day streak', icon: 'IconFlame', category: 'milestones', condition: '30-day streak' },
  { id: 'streak_100', name: 'Streak Legend', description: 'Maintain a 100-day streak', icon: 'IconFlame', category: 'milestones', condition: '100-day streak' },
  { id: 'streak_365', name: 'Year-Long Flame', description: 'Maintain a 365-day streak', icon: 'IconFlame', category: 'milestones', condition: '365-day streak' },

  // Behavioral
  { id: 'perfect_month', name: 'Perfect Month', description: 'Stay within all budget categories for a month', icon: 'IconShieldCheck', category: 'behavioral', condition: 'All budgets under limit' },
  { id: 'bill_crusher', name: 'Bill Crusher', description: 'Pay all bills on time for 3 consecutive months', icon: 'IconHammer', category: 'behavioral', condition: '3 months on-time bills' },
  { id: 'safety_net', name: 'Safety Net', description: 'Build a 6-month emergency fund', icon: 'IconUmbrella', category: 'behavioral', condition: '6-month emergency fund' },
  { id: 'super_saver', name: 'Super Saver', description: 'Achieve a 30%+ savings rate in a month', icon: 'IconPigMoney', category: 'behavioral', condition: '30%+ savings rate' },
  { id: 'impulse_control', name: 'Impulse Control', description: 'No unplanned purchases over budget for 2 weeks', icon: 'IconBrain', category: 'behavioral', condition: '14 days under budget' },

  // Skill
  { id: 'categorization_expert', name: 'Categorization Expert', description: 'Manually categorize 500 transactions', icon: 'IconTags', category: 'skill', condition: '500 manual categorizations' },
  { id: 'budget_guru', name: 'Budget Guru', description: 'Stay under budget for 6 consecutive months', icon: 'IconCrown', category: 'skill', condition: '6 months under budget' },
  { id: 'health_nut', name: 'Health Nut', description: 'Achieve a 75+ financial health score', icon: 'IconHeartbeat', category: 'skill', condition: '75+ health score' },
];

// ─── Monthly Challenges ────────────────────────────────────────────────

export interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  target: number;
  metric: string;
  xpReward: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'log_30', name: 'Daily Logger', description: 'Log at least one expense every day this month', target: 30, metric: 'days_logged', xpReward: 150 },
  { id: 'save_20', name: 'Savings Sprint', description: 'Save at least 20% of your income this month', target: 20, metric: 'savings_rate', xpReward: 200 },
  { id: 'under_budget', name: 'Budget Boss', description: 'Stay within all budget categories', target: 100, metric: 'budget_compliance', xpReward: 175 },
  { id: 'no_impulse', name: 'No Impulse Week', description: 'Avoid unplanned purchases for 7 consecutive days', target: 7, metric: 'no_impulse_days', xpReward: 100 },
  { id: 'categorize_50', name: 'Tidy Books', description: 'Categorize 50 transactions this month', target: 50, metric: 'categorized', xpReward: 100 },
  { id: 'streak_15', name: 'Streak Builder', description: 'Build a 15-day logging streak', target: 15, metric: 'streak_days', xpReward: 125 },
  { id: 'invest_check', name: 'Portfolio Pulse', description: 'Review your investment portfolio 4 times this month', target: 4, metric: 'portfolio_views', xpReward: 80 },
  { id: 'reduce_dining', name: 'Home Chef', description: 'Reduce dining out expenses by 25% compared to last month', target: 25, metric: 'dining_reduction', xpReward: 150 },
];

// ─── Helper: Level calculator ──────────────────────────────────────────

export interface LevelInfo {
  level: number;
  name: string;
  currentXP: number;
  nextLevelXP: number | null;
  progress: number;
}

export function getLevelForXP(xp: number): LevelInfo {
  let currentLevel = XP_LEVELS[0];
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.threshold) {
      currentLevel = lvl;
    } else {
      break;
    }
  }

  const nextLevel = XP_LEVELS.find((l) => l.level === currentLevel.level + 1);
  const nextLevelXP = nextLevel ? nextLevel.threshold : null;
  const progress = nextLevelXP
    ? ((xp - currentLevel.threshold) / (nextLevelXP - currentLevel.threshold)) * 100
    : 100;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    currentXP: xp,
    nextLevelXP,
    progress: Math.min(Math.max(progress, 0), 100),
  };
}

// ─── Award XP ──────────────────────────────────────────────────────────

export interface AwardXPResult {
  totalXP: number;
  level: number;
  levelName: string;
  leveledUp: boolean;
}

export async function awardXP(
  db: Db,
  userId: string,
  action: string,
  xp: number,
  description: string,
): Promise<AwardXPResult> {
  // Record the event
  await db.collection('xp_events').insertOne({
    userId,
    action,
    xp,
    description,
    createdAt: new Date(),
  });

  // Get current XP doc
  const existing = await db.collection('user_xp').findOne({ userId });
  const oldXP = existing?.totalXP ?? 0;
  const oldLevel = getLevelForXP(oldXP);

  const newXP = oldXP + xp;
  const newLevel = getLevelForXP(newXP);

  await db.collection('user_xp').updateOne(
    { userId },
    { $set: { totalXP: newXP, level: newLevel.level, levelName: newLevel.name, updatedAt: new Date() } },
    { upsert: true },
  );

  return {
    totalXP: newXP,
    level: newLevel.level,
    levelName: newLevel.name,
    leveledUp: newLevel.level > oldLevel.level,
  };
}

// ─── Streaks ───────────────────────────────────────────────────────────

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  isNew: boolean;
}

export async function updateStreak(db: Db, userId: string): Promise<StreakResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const streak = await db.collection('user_streaks').findOne({ userId });

  if (!streak) {
    // First ever log
    await db.collection('user_streaks').insertOne({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastLogDate: todayStr,
      streakStartDate: todayStr,
      freezeTokens: 0,
      milestones: [],
    });
    return { currentStreak: 1, longestStreak: 1, isNew: true };
  }

  // Already logged today
  if (streak.lastLogDate === todayStr) {
    return { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, isNew: false };
  }

  const lastDate = new Date(streak.lastLogDate);
  lastDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  let newStreak: number;
  let streakStart = streak.streakStartDate;

  if (diffDays === 1) {
    // Consecutive day
    newStreak = streak.currentStreak + 1;
  } else if (diffDays === 2 && streak.freezeTokens > 0) {
    // Missed 1 day but has a freeze token
    newStreak = streak.currentStreak + 1;
    await db.collection('user_streaks').updateOne({ userId }, { $inc: { freezeTokens: -1 } });
  } else {
    // Streak broken
    newStreak = 1;
    streakStart = todayStr;
  }

  const longestStreak = Math.max(newStreak, streak.longestStreak);

  // Check streak milestones
  const milestones = streak.milestones || [];
  const milestoneThresholds = [7, 30, 100, 365];
  for (const threshold of milestoneThresholds) {
    if (newStreak >= threshold && !milestones.includes(threshold)) {
      milestones.push(threshold);
      const actionKey = `streak_${threshold}` as XPAction;
      if (XP_ACTIONS[actionKey]) {
        await awardXP(db, userId, actionKey, XP_ACTIONS[actionKey], `${threshold}-day streak reached!`);
      }
    }
  }

  await db.collection('user_streaks').updateOne(
    { userId },
    {
      $set: {
        currentStreak: newStreak,
        longestStreak,
        lastLogDate: todayStr,
        streakStartDate: streakStart,
        milestones,
      },
    },
  );

  return { currentStreak: newStreak, longestStreak, isNew: true };
}

// ─── Badge Checks ──────────────────────────────────────────────────────

export async function checkBadgeUnlocks(db: Db, userId: string, trigger?: string): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  // Fetch user data needed for badge checks
  const [txnCount, budgetCount, goalCount, investmentCount, streak, existingBadges] = await Promise.all([
    db.collection('transactions').countDocuments({ userId }),
    db.collection('budget_categories').countDocuments({ userId }),
    db.collection('goals').countDocuments({ userId }),
    db.collection('investments').countDocuments({ userId }),
    db.collection('user_streaks').findOne({ userId }),
    db.collection('user_badges').find({ userId }).toArray(),
  ]);

  const unlockedIds = new Set(existingBadges.map((b) => b.badgeId));

  async function tryUnlock(badgeId: string, condition: boolean) {
    if (condition && !unlockedIds.has(badgeId)) {
      await db.collection('user_badges').insertOne({
        userId,
        badgeId,
        unlockedAt: new Date(),
        notified: false,
      });
      newlyUnlocked.push(badgeId);
      await awardXP(db, userId, 'badge_unlocked', XP_ACTIONS.badge_unlocked, `Badge unlocked: ${badgeId}`);
    }
  }

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const maxStreak = Math.max(currentStreak, longestStreak);

  // Onboarding
  await tryUnlock('first_expense', txnCount >= 1);
  await tryUnlock('first_budget', budgetCount >= 1);
  await tryUnlock('first_goal', goalCount >= 1);
  await tryUnlock('first_investment', investmentCount >= 1);

  // Check all_set_up after other onboarding badges
  const onboardingBadges = ['first_expense', 'first_budget', 'first_goal', 'first_investment'];
  const hasAllOnboarding = onboardingBadges.every(
    (id) => unlockedIds.has(id) || newlyUnlocked.includes(id),
  );
  await tryUnlock('all_set_up', hasAllOnboarding);

  // Milestones
  await tryUnlock('century', txnCount >= 100);
  await tryUnlock('five_hundred_club', txnCount >= 500);
  await tryUnlock('thousand_strong', txnCount >= 1000);

  // Streak milestones
  await tryUnlock('streak_7', maxStreak >= 7);
  await tryUnlock('streak_30', maxStreak >= 30);
  await tryUnlock('streak_100', maxStreak >= 100);
  await tryUnlock('streak_365', maxStreak >= 365);

  // Account age
  const user = await db.collection('users').findOne({ userId });
  if (user?.createdAt) {
    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365);
    await tryUnlock('one_year_anniversary', ageYears >= 1);
  }

  // Financial health badge
  const healthDoc = await db.collection('financial_health').findOne(
    { userId },
    { sort: { createdAt: -1 } },
  );
  if (healthDoc?.overallScore) {
    await tryUnlock('health_nut', healthDoc.overallScore >= 75);
  }

  // ─── Behavioral Badges ────────────────────────────────────────────────

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const monthStartStr = monthStart.toISOString();
  const monthEndStr = monthEnd.toISOString();

  // perfect_month: All budget categories under their budget amount this month
  const budgetCategories = await db.collection('budget_categories').find({ userId }).toArray();
  if (budgetCategories.length > 0) {
    const categorySpending = await db
      .collection('transactions')
      .aggregate([
        {
          $match: {
            userId,
            type: 'expense',
            date: { $gte: monthStartStr, $lte: monthEndStr },
            category: { $in: budgetCategories.map((b) => b.name) },
          },
        },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ])
      .toArray();

    const spendingMap = new Map(categorySpending.map((s) => [s._id, s.total]));
    const allUnderBudget = budgetCategories.every(
      (b) => (spendingMap.get(b.name) ?? 0) <= b.budgetAmount,
    );
    // Only award if we're past the 25th (month nearly complete) or it's the trigger
    const dayOfMonth = now.getDate();
    await tryUnlock('perfect_month', allUnderBudget && dayOfMonth >= 25);
  }

  // super_saver: Savings rate >= 30% for current month
  const [incomeResult, expenseResult] = await Promise.all([
    db
      .collection('transactions')
      .aggregate([
        { $match: { userId, type: 'income', date: { $gte: monthStartStr, $lte: monthEndStr } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .toArray(),
    db
      .collection('transactions')
      .aggregate([
        { $match: { userId, type: 'expense', date: { $gte: monthStartStr, $lte: monthEndStr } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .toArray(),
  ]);

  const monthlyIncome = incomeResult[0]?.total ?? 0;
  const monthlyExpenses = expenseResult[0]?.total ?? 0;
  if (monthlyIncome > 0) {
    const savingsRate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
    await tryUnlock('super_saver', savingsRate >= 30);
  }

  // bill_crusher: Recurring transactions paid on time for 3 months
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recurringPaidCount = await db
    .collection('transactions')
    .aggregate([
      {
        $match: {
          userId,
          recurring: true,
          date: { $gte: threeMonthsAgo.toISOString(), $lte: monthEndStr },
        },
      },
      {
        $group: {
          _id: {
            month: { $substr: ['$date', 0, 7] },
          },
        },
      },
    ])
    .toArray();
  // If recurring transactions appear in at least 3 distinct months, bills are being paid
  await tryUnlock('bill_crusher', recurringPaidCount.length >= 3);

  // impulse_control: Stayed within budget for past 14 days
  if (budgetCategories.length > 0) {
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const recentSpending = await db
      .collection('transactions')
      .aggregate([
        {
          $match: {
            userId,
            type: 'expense',
            date: { $gte: fourteenDaysAgo.toISOString(), $lte: now.toISOString() },
            category: { $in: budgetCategories.map((b) => b.name) },
          },
        },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ])
      .toArray();

    const recentSpendMap = new Map(recentSpending.map((s) => [s._id, s.total]));
    // Pro-rate budget to 14 days (budget is monthly)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const budgetRatio = 14 / daysInMonth;
    const allUnderFor14Days = budgetCategories.every(
      (b) => (recentSpendMap.get(b.name) ?? 0) <= b.budgetAmount * budgetRatio,
    );
    await tryUnlock('impulse_control', allUnderFor14Days);
  }

  // safety_net: Savings goals with significant progress (>= 50% of target)
  const goals = await db.collection('goals').find({ userId }).toArray();
  if (goals.length > 0) {
    const hasSubstantialSavings = goals.some(
      (g) => g.targetAmount > 0 && g.currentAmount >= g.targetAmount * 0.5,
    );
    await tryUnlock('safety_net', hasSubstantialSavings);
  }

  // ─── Skill Badges ─────────────────────────────────────────────────────

  // categorization_expert: 500+ transactions with a non-null category
  const categorizedCount = await db.collection('transactions').countDocuments({
    userId,
    category: { $exists: true, $ne: null },
  });
  await tryUnlock('categorization_expert', categorizedCount >= 500);

  // budget_guru: Under budget for 6 consecutive months
  // Check the last 6 months of spending vs budget
  if (budgetCategories.length > 0) {
    let consecutiveMonthsUnderBudget = 0;
    for (let i = 1; i <= 6; i++) {
      const checkStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const checkEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthSpending = await db
        .collection('transactions')
        .aggregate([
          {
            $match: {
              userId,
              type: 'expense',
              date: { $gte: checkStart.toISOString(), $lte: checkEnd.toISOString() },
              category: { $in: budgetCategories.map((b) => b.name) },
            },
          },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
        ])
        .toArray();

      const monthSpendMap = new Map(monthSpending.map((s) => [s._id, s.total]));
      const underBudget = budgetCategories.every(
        (b) => (monthSpendMap.get(b.name) ?? 0) <= b.budgetAmount,
      );
      if (underBudget) {
        consecutiveMonthsUnderBudget++;
      } else {
        break;
      }
    }
    await tryUnlock('budget_guru', consecutiveMonthsUnderBudget >= 6);
  }

  return newlyUnlocked;
}

// ─── Challenge Progress ────────────────────────────────────────────────

export async function updateChallengeProgress(db: Db, userId: string): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const activeChallenges = await db
    .collection('user_challenges')
    .find({ userId, month: monthKey, status: 'active' })
    .toArray();

  for (const challenge of activeChallenges) {
    const def = CHALLENGES.find((c) => c.id === challenge.challengeId);
    if (!def) continue;

    let current = 0;

    // Calculate progress based on metric
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    switch (def.metric) {
      case 'days_logged': {
        const logs = await db
          .collection('transactions')
          .aggregate([
            { $match: { userId, date: { $gte: monthStart.toISOString(), $lte: monthEnd.toISOString() } } },
            { $group: { _id: { $substr: ['$date', 0, 10] } } },
          ])
          .toArray();
        current = logs.length;
        break;
      }
      case 'categorized': {
        current = await db.collection('transactions').countDocuments({
          userId,
          category: { $exists: true, $ne: null },
          date: { $gte: monthStart.toISOString(), $lte: monthEnd.toISOString() },
        });
        break;
      }
      case 'streak_days': {
        const streak = await db.collection('user_streaks').findOne({ userId });
        current = streak?.currentStreak ?? 0;
        break;
      }
      case 'savings_rate': {
        const txns = await db
          .collection('transactions')
          .find({
            userId,
            date: { $gte: monthStart.toISOString(), $lte: monthEnd.toISOString() },
          })
          .toArray();
        let income = 0;
        let expenses = 0;
        for (const t of txns) {
          if (t.type === 'income') income += Math.abs(t.amount);
          else expenses += Math.abs(t.amount);
        }
        current = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
        break;
      }
      case 'budget_compliance': {
        const budgets = await db
          .collection('budget_categories')
          .find({ userId })
          .toArray();
        if (budgets.length === 0) {
          current = 0;
          break;
        }
        const spendByCategory = await db
          .collection('transactions')
          .aggregate([
            {
              $match: {
                userId,
                type: 'expense',
                date: { $gte: monthStart.toISOString(), $lte: monthEnd.toISOString() },
              },
            },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
          ])
          .toArray();
        const spendMap = new Map(spendByCategory.map((s) => [s._id, Math.abs(s.total)]));
        let underBudget = 0;
        for (const b of budgets) {
          const spent = spendMap.get(b.name) ?? 0;
          if (spent <= b.budgetAmount) underBudget++;
        }
        current = Math.round((underBudget / budgets.length) * 100);
        break;
      }
      case 'no_impulse_days': {
        const budgetsForImpulse = await db
          .collection('budget_categories')
          .find({ userId })
          .toArray();
        const totalMonthlyBudget = budgetsForImpulse.reduce(
          (sum, b) => sum + (b.budgetAmount ?? 0),
          0,
        );
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dailyBudget = totalMonthlyBudget / daysInMonth;
        if (dailyBudget <= 0) {
          current = 0;
          break;
        }
        // Get daily expense totals for this month
        const dailySpend = await db
          .collection('transactions')
          .aggregate([
            {
              $match: {
                userId,
                type: 'expense',
                date: { $gte: monthStart.toISOString(), $lte: monthEnd.toISOString() },
              },
            },
            {
              $group: {
                _id: { $substr: ['$date', 0, 10] },
                total: { $sum: '$amount' },
              },
            },
          ])
          .toArray();
        const spendByDay = new Map(dailySpend.map((d) => [d._id, Math.abs(d.total)]));
        // Count consecutive days from today backwards where spending <= dailyBudget
        let consecutive = 0;
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        for (let d = todayDate; d >= monthStart; d = new Date(d.getTime() - 86400000)) {
          const dayStr = d.toISOString().split('T')[0];
          const spent = spendByDay.get(dayStr) ?? 0;
          if (spent <= dailyBudget) {
            consecutive++;
          } else {
            break;
          }
        }
        current = consecutive;
        break;
      }
      case 'portfolio_views': {
        // Count distinct weeks this month where investment records were updated
        const investmentDocs = await db
          .collection('investments')
          .aggregate([
            {
              $match: {
                userId,
                $or: [
                  { updatedAt: { $gte: monthStart, $lte: monthEnd } },
                  { createdAt: { $gte: monthStart, $lte: monthEnd } },
                ],
              },
            },
            {
              $project: {
                week: {
                  $isoWeek: {
                    $cond: {
                      if: { $gte: ['$updatedAt', monthStart] },
                      then: '$updatedAt',
                      else: '$createdAt',
                    },
                  },
                },
              },
            },
            { $group: { _id: '$week' } },
          ])
          .toArray();
        current = investmentDocs.length;
        break;
      }
      case 'dining_reduction': {
        const diningRegex = /dining|restaurant|food/i;
        const thisMonthDining = await db
          .collection('transactions')
          .aggregate([
            {
              $match: {
                userId,
                type: 'expense',
                category: { $regex: diningRegex },
                date: { $gte: monthStart.toISOString(), $lte: monthEnd.toISOString() },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ])
          .toArray();
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const lastMonthDining = await db
          .collection('transactions')
          .aggregate([
            {
              $match: {
                userId,
                type: 'expense',
                category: { $regex: diningRegex },
                date: { $gte: prevMonthStart.toISOString(), $lte: prevMonthEnd.toISOString() },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ])
          .toArray();
        const thisTotal = Math.abs(thisMonthDining[0]?.total ?? 0);
        const lastTotal = Math.abs(lastMonthDining[0]?.total ?? 0);
        current = lastTotal > 0 ? Math.round(((lastTotal - thisTotal) / lastTotal) * 100) : 0;
        break;
      }
      default:
        current = challenge.current ?? 0;
        break;
    }

    const completed = current >= def.target;

    await db.collection('user_challenges').updateOne(
      { _id: challenge._id },
      {
        $set: {
          current,
          progress: Math.min((current / def.target) * 100, 100),
          ...(completed ? { status: 'completed', completedAt: new Date() } : {}),
        },
      },
    );

    if (completed && challenge.status !== 'completed') {
      await awardXP(db, userId, 'challenge_completed', def.xpReward, `Challenge completed: ${def.name}`);
    }
  }
}
