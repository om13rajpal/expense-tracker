/**
 * Notification generator functions.
 *
 * Inspects MongoDB data and creates notification documents in the
 * `notifications` collection when financial thresholds are crossed.
 * Invoked by Inngest cron workflows. Includes:
 * - Budget breach alerts (80% warning, 100% critical)
 * - Subscription renewal reminders (3-day lookahead)
 * - Weekly financial digest summaries
 * - Telegram dispatch for linked accounts
 *
 * All generators include 24-hour deduplication to prevent alert spam.
 *
 * @module lib/notifications
 */

import type { Db } from 'mongodb';
import {
  buildReverseCategoryMap,
  type BudgetCategoryDoc,
} from './budget-mapping';
import {
  sendMessage,
  formatBudgetBreachMessage,
  formatRenewalAlertMessage,
} from './telegram';

// ─── Types ───────────────────────────────────────────────────────────

/** Discriminated union of notification categories. */
export type NotificationType =
  | 'budget_breach'
  | 'goal_milestone'
  | 'weekly_digest'
  | 'renewal_alert'
  | 'insight'
  | 'badge_unlock'
  | 'bucket_complete';

/** Severity levels controlling visual styling and sort priority. */
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

/** MongoDB document shape for a notification. */
export interface NotificationDoc {
  /** Owner user identifier. */
  userId: string;
  /** Notification category. */
  type: NotificationType;
  /** Short headline (e.g. "Food & Dining budget exceeded"). */
  title: string;
  /** Detailed notification body. */
  message: string;
  /** Visual severity level. */
  severity: NotificationSeverity;
  /** Whether the user has seen/acknowledged the notification. */
  read: boolean;
  /** Optional deep-link URL (e.g. "/budget"). */
  actionUrl?: string;
  /** Extra key used for deduplication (e.g. "budget:Food & Dining:critical"). */
  dedupKey?: string;
  /** ISO timestamp of creation. */
  createdAt: string;
}

const COLLECTION = 'notifications';

// ─── Helpers ─────────────────────────────────────────────────────────

function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatINR(amount: number): string {
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(0);
}

async function isDuplicate(
  db: Db,
  userId: string,
  type: NotificationType,
  dedupKey: string,
  windowHours = 24
): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const existing = await db.collection(COLLECTION).findOne({
    userId,
    type,
    dedupKey,
    createdAt: { $gte: cutoff },
  });
  return !!existing;
}

// ─── Telegram Dispatch ──────────────────────────────────────────────

/**
 * Dispatch a notification to the user's linked Telegram account.
 * Silently fails if Telegram is not linked or the notification type is disabled.
 */
export async function dispatchToTelegram(
  db: Db,
  userId: string,
  notification: NotificationDoc
): Promise<void> {
  try {
    const settings = await db.collection('user_settings').findOne({ userId });
    if (!settings?.telegramChatId) return;

    const prefs = settings.telegramNotifications || {};
    const chatId = settings.telegramChatId as number;

    let text: string | null = null;

    switch (notification.type) {
      case 'budget_breach':
        if (prefs.budgetBreach === false) return;
        text = formatBudgetBreachMessage(notification.title, notification.message, notification.severity);
        break;
      case 'renewal_alert':
        if (prefs.renewalAlert === false) return;
        text = formatRenewalAlertMessage(notification.title, notification.message);
        break;
      case 'weekly_digest':
        if (prefs.weeklyDigest === false) return;
        // Weekly digest message is pre-formatted as a string; send directly
        text = `📊 *Weekly Digest*\n\n${notification.message}`;
        break;
      case 'insight':
        if (prefs.aiInsights === false) return;
        text = `🧠 *AI Insight*\n\n${notification.title}\n${notification.message}`;
        break;
      default:
        text = `📋 ${notification.title}\n${notification.message}`;
    }

    if (text) {
      await sendMessage(chatId, text, { parseMode: 'Markdown' });
    }
  } catch (error) {
    // Silently fail — Telegram dispatch should not break notification flow
    console.error('Telegram dispatch failed:', error);
  }
}

// ─── Budget Breach Check ─────────────────────────────────────────────

/**
 * Compare current-month spend against budget per category.
 * Creates a notification when spend exceeds 80% (warning) or 100% (critical).
 * Deduplicates: skips if the same type+category was notified in the last 24 h.
 */
export async function checkBudgetBreaches(db: Db): Promise<void> {
  const userId = 'default';

  // 1. Load budget categories from MongoDB
  const budgetDocs: BudgetCategoryDoc[] = (await db
    .collection('budget_categories')
    .find({ userId })
    .toArray()) as unknown as BudgetCategoryDoc[];

  if (budgetDocs.length === 0) return;

  // 2. Build reverse map: transaction category -> budget category name
  const reverseMap = buildReverseCategoryMap(budgetDocs);

  // 3. Get current month expense transactions
  const monthStart = startOfMonth();
  const transactions = await db
    .collection('transactions')
    .find({
      userId,
      date: { $gte: monthStart },
      type: 'expense',
    })
    .toArray();

  // 4. Aggregate spend per budget category
  const spendByBudget: Record<string, number> = {};
  for (const txn of transactions) {
    const raw = txn.category as string;
    const budgetName = reverseMap[raw] || raw;
    spendByBudget[budgetName] = (spendByBudget[budgetName] || 0) + Math.abs(txn.amount as number);
  }

  // 5. Compare against budgets and create notifications
  const now = new Date().toISOString();

  for (const doc of budgetDocs) {
    const budget = doc.budgetAmount;
    if (!budget || budget <= 0) continue;

    const spent = spendByBudget[doc.name] || 0;
    const ratio = spent / budget;

    if (ratio < 0.8) continue;

    const dedupKey = `budget:${doc.name}:${ratio >= 1 ? 'critical' : 'warning'}`;
    if (await isDuplicate(db, userId, 'budget_breach', dedupKey)) continue;

    const severity: NotificationSeverity = ratio >= 1 ? 'critical' : 'warning';
    const title =
      ratio >= 1
        ? `${doc.name} budget exceeded`
        : `${doc.name} budget nearing limit`;
    const message =
      ratio >= 1
        ? `You've spent ₹${formatINR(spent)} on ${doc.name} vs ₹${formatINR(budget)} budget (${Math.round(ratio * 100)}%)`
        : `You've used ${Math.round(ratio * 100)}% of your ${doc.name} budget (₹${formatINR(spent)} / ₹${formatINR(budget)})`;

    await db.collection(COLLECTION).insertOne({
      userId,
      type: 'budget_breach',
      title,
      message,
      severity,
      read: false,
      actionUrl: '/budget',
      dedupKey,
      createdAt: now,
    } satisfies NotificationDoc);
  }
}

// ─── Subscription Renewal Alert ──────────────────────────────────────

/**
 * Check subscriptions renewing within the next 3 days
 * and create reminder notifications.
 */
export async function checkSubscriptionRenewals(db: Db): Promise<void> {
  const userId = 'default';

  const today = new Date().toISOString().split('T')[0];
  const threeDaysOut = daysFromNow(3);

  const subs = await db
    .collection('subscriptions')
    .find({
      userId,
      status: 'active',
      nextExpected: { $gte: today, $lte: threeDaysOut },
    })
    .toArray();

  const now = new Date().toISOString();

  for (const sub of subs) {
    const dedupKey = `renewal:${(sub._id).toString()}`;
    if (await isDuplicate(db, userId, 'renewal_alert', dedupKey)) continue;

    const name = sub.name as string;
    const amount = sub.amount as number;
    const next = sub.nextExpected as string;

    const daysUntil = Math.ceil(
      (new Date(next).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const dayLabel = daysUntil <= 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;

    await db.collection(COLLECTION).insertOne({
      userId,
      type: 'renewal_alert',
      title: `${name} renewing ${dayLabel}`,
      message: `Your ${name} subscription (₹${formatINR(amount)}/${sub.frequency}) renews ${dayLabel}`,
      severity: 'info',
      read: false,
      actionUrl: '/subscriptions',
      dedupKey,
      createdAt: now,
    } satisfies NotificationDoc);
  }
}

// ─── Weekly Digest ───────────────────────────────────────────────────

/**
 * Summarises the past week: total spend, top categories, savings rate,
 * and portfolio change. Creates one digest notification.
 */
export async function generateWeeklyDigest(db: Db): Promise<void> {
  const userId = 'default';

  // Deduplicate: only one digest per 6 days
  if (await isDuplicate(db, userId, 'weekly_digest', 'weekly', 144)) return;

  const weekStart = startOfWeek();
  const now = new Date().toISOString();

  // -- Weekly transactions --
  const transactions = await db
    .collection('transactions')
    .find({ userId, date: { $gte: weekStart } })
    .toArray();

  let totalSpent = 0;
  let totalIncome = 0;
  const categorySpend: Record<string, number> = {};

  for (const txn of transactions) {
    const amount = Math.abs(txn.amount as number);
    if (txn.type === 'expense') {
      totalSpent += amount;
      const cat = (txn.category as string) || 'Uncategorized';
      categorySpend[cat] = (categorySpend[cat] || 0) + amount;
    } else if (txn.type === 'income') {
      totalIncome += amount;
    }
  }

  // Top 3 categories
  const topCategories = Object.entries(categorySpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => `${name} (₹${formatINR(amount)})`)
    .join(', ');

  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100)
      : 0;

  // -- Portfolio snapshot --
  const [stocks, funds] = await Promise.all([
    db.collection('stocks').find({ userId }).toArray(),
    db.collection('mutual_funds').find({ userId }).toArray(),
  ]);

  let portfolioValue = 0;
  let portfolioInvested = 0;

  for (const s of stocks) {
    portfolioValue += (s.currentValue as number) || 0;
    portfolioInvested += ((s.shares as number) || 0) * ((s.averageCost as number) || 0);
  }
  for (const f of funds) {
    portfolioValue += (f.currentValue as number) || 0;
    portfolioInvested += (f.investedValue as number) || 0;
  }

  const portfolioChange = portfolioInvested > 0
    ? ((portfolioValue - portfolioInvested) / portfolioInvested) * 100
    : 0;

  // -- Build message --
  const lines: string[] = [];
  lines.push(`Total spent this week: ₹${formatINR(totalSpent)}`);
  if (topCategories) lines.push(`Top categories: ${topCategories}`);
  if (totalIncome > 0) lines.push(`Savings rate: ${savingsRate}%`);
  if (portfolioValue > 0) {
    const sign = portfolioChange >= 0 ? '+' : '';
    lines.push(`Portfolio: ₹${formatINR(portfolioValue)} (${sign}${portfolioChange.toFixed(1)}%)`);
  }

  await db.collection(COLLECTION).insertOne({
    userId,
    type: 'weekly_digest',
    title: 'Your weekly financial digest',
    message: lines.join(' \u2022 '),
    severity: 'info',
    read: false,
    actionUrl: '/dashboard',
    dedupKey: 'weekly',
    createdAt: now,
  } satisfies NotificationDoc);
}

// ─── Goal Milestone Check ─────────────────────────────────────────

/**
 * Check savings goals for milestone crossings (25%, 50%, 75%, 100%).
 * Creates a 'success' notification for each newly crossed milestone.
 * Deduplicates by goal ID + milestone percentage.
 */
export async function checkGoalMilestones(db: Db): Promise<void> {
  const userId = 'default';
  const now = new Date().toISOString();

  const goals = await db.collection('goals').find({ userId }).toArray();

  const milestones = [0.25, 0.5, 0.75, 1.0];

  for (const goal of goals) {
    const target = (goal.targetAmount as number) || 0;
    const current = (goal.currentAmount as number) || 0;
    if (target <= 0) continue;

    const ratio = current / target;

    for (const milestone of milestones) {
      if (ratio < milestone) continue;

      const pctLabel = Math.round(milestone * 100);
      const dedupKey = `goal:${(goal._id).toString()}:${pctLabel}%`;
      if (await isDuplicate(db, userId, 'goal_milestone', dedupKey, 24 * 365)) continue;

      const title = milestone >= 1.0
        ? `${goal.name} goal reached!`
        : `${goal.name} is ${pctLabel}% complete`;
      const message = milestone >= 1.0
        ? `Congratulations! You've fully funded your "${goal.name}" goal (${formatINR(current)} / ${formatINR(target)}).`
        : `Your "${goal.name}" goal has crossed the ${pctLabel}% mark (${formatINR(current)} / ${formatINR(target)}).`;

      await db.collection(COLLECTION).insertOne({
        userId,
        type: 'goal_milestone',
        title,
        message,
        severity: 'success',
        read: false,
        actionUrl: '/goals',
        dedupKey,
        createdAt: now,
      } satisfies NotificationDoc);
    }
  }
}

// ─── Bucket List Progress Check ──────────────────────────────────

/**
 * Check bucket list items for full funding.
 * Creates a 'success' notification when savedAmount >= targetPrice.
 * Deduplicates by item ID.
 */
export async function checkBucketListProgress(db: Db): Promise<void> {
  const userId = 'default';
  const now = new Date().toISOString();

  const items = await db.collection('bucket_list').find({
    userId,
    status: { $ne: 'completed' },
  }).toArray();

  for (const item of items) {
    const saved = (item.savedAmount as number) || 0;
    const target = (item.targetPrice as number) || 0;
    if (target <= 0 || saved < target) continue;

    const dedupKey = `bucket:${(item._id).toString()}:complete`;
    if (await isDuplicate(db, userId, 'bucket_complete', dedupKey, 24 * 365)) continue;

    await db.collection(COLLECTION).insertOne({
      userId,
      type: 'bucket_complete',
      title: `${item.name} fully funded!`,
      message: `Your bucket list item "${item.name}" is fully funded at ${formatINR(saved)}. Time to make it happen!`,
      severity: 'success',
      read: false,
      actionUrl: '/bucket-list',
      dedupKey,
      createdAt: now,
    } satisfies NotificationDoc);
  }
}

// ─── Badge Notification Check ────────────────────────────────────

/**
 * Check for newly unlocked badges that haven't been notified yet.
 * Creates an 'info' notification for each and marks them as notified.
 * Deduplicates by badge ID.
 */
export async function checkBadgeNotifications(db: Db): Promise<void> {
  const userId = 'default';
  const now = new Date().toISOString();

  const unnotifiedBadges = await db.collection('user_badges').find({
    userId,
    notified: false,
  }).toArray();

  for (const badge of unnotifiedBadges) {
    const dedupKey = `badge:${(badge._id).toString()}`;
    if (await isDuplicate(db, userId, 'badge_unlock', dedupKey, 24 * 365)) {
      // Still mark as notified to prevent re-checking
      await db.collection('user_badges').updateOne(
        { _id: badge._id },
        { $set: { notified: true } },
      );
      continue;
    }

    const badgeName = (badge.badgeName as string) || (badge.badgeId as string) || 'Unknown';

    await db.collection(COLLECTION).insertOne({
      userId,
      type: 'badge_unlock',
      title: `Badge unlocked: ${badgeName}`,
      message: `You've earned the "${badgeName}" badge! Check your achievements to see all your badges.`,
      severity: 'info',
      read: false,
      actionUrl: '/gamification',
      dedupKey,
      createdAt: now,
    } satisfies NotificationDoc);

    await db.collection('user_badges').updateOne(
      { _id: badge._id },
      { $set: { notified: true } },
    );
  }
}
