/**
 * Inngest functions for scheduled Telegram notifications.
 *
 * Provides cron-triggered and event-triggered notification workflows:
 * - Weekly digest (Sundays 9AM UTC)
 * - Monthly report (1st of each month 9AM UTC)
 * - Subscription reminders (daily 9AM UTC)
 * - Budget breach checks (every 6 hours)
 * - Spending anomaly detection (after transaction sync)
 *
 * Each function iterates over users with Telegram linked and the
 * relevant notification preference enabled, sends formatted messages
 * via the telegram-notifications module, and handles errors gracefully
 * so one user's failure doesn't block the batch.
 *
 * @module inngest/telegram-notifications
 */

import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';
import {
  sendWeeklyDigest,
  sendMonthlyReport,
  sendSubscriptionReminder,
  sendBudgetBreachAlert,
  sendOverspendingAlert,
  sendSpendingAnomaly,
} from '@/lib/telegram-notifications';

// ─── Helpers ────────────────────────────────────────────────────────

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString();
}

function startOfMonth(date?: Date): string {
  const d = date || new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfPrevMonth(): { start: string; end: string; label: string } {
  const d = new Date();
  const prevMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const start = prevMonth.toISOString();
  const end = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  const label = prevMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ─── Weekly Digest (Sundays 9AM UTC) ────────────────────────────────

export const telegramWeeklyDigest = inngest.createFunction(
  { id: 'telegram-weekly-digest', name: 'Telegram Weekly Digest' },
  { cron: '0 9 * * 0' },
  async ({ step }) => {
    const result = await step.run('find-telegram-users', async () => {
      const db = await getMongoDb();
      const users = await db
        .collection('user_settings')
        .find({
          telegramChatId: { $exists: true, $ne: null },
          'telegramNotifications.weeklyDigest': { $ne: false },
        })
        .toArray();
      return users.map((u) => ({
        userId: u.userId as string,
        chatId: u.telegramChatId as number,
      }));
    });

    let sent = 0;

    for (const user of result) {
      await step.run(`weekly-digest-${user.userId}`, async () => {
        try {
          const db = await getMongoDb();
          const weekStart = startOfWeek();

          const transactions = await db
            .collection('transactions')
            .find({ userId: user.userId, date: { $gte: weekStart } })
            .toArray();

          if (transactions.length === 0) return;

          let totalIncome = 0;
          let totalExpenses = 0;
          const categorySpend: Record<string, number> = {};

          for (const txn of transactions) {
            const amount = Math.abs(txn.amount as number);
            if (txn.type === 'income' || txn.type === 'refund') {
              totalIncome += amount;
            } else if (txn.type === 'expense') {
              totalExpenses += amount;
              const cat = (txn.category as string) || 'Uncategorized';
              categorySpend[cat] = (categorySpend[cat] || 0) + amount;
            }
          }

          const savingsRate = totalIncome > 0
            ? ((totalIncome - totalExpenses) / totalIncome) * 100
            : 0;

          const topCategories = Object.entries(categorySpend)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount }));

          // Budget status
          const budgetDocs = await db
            .collection('budget_categories')
            .find({ userId: user.userId })
            .toArray();

          const monthStart = startOfMonth();
          const monthExpenses = await db
            .collection('transactions')
            .find({
              userId: user.userId,
              date: { $gte: monthStart },
              type: 'expense',
            })
            .toArray();

          const monthCategorySpend: Record<string, number> = {};
          for (const txn of monthExpenses) {
            const cat = (txn.category as string) || 'Uncategorized';
            monthCategorySpend[cat] = (monthCategorySpend[cat] || 0) + Math.abs(txn.amount as number);
          }

          const budgetStatus = budgetDocs
            .map((b) => {
              const cat = (b.name as string) || (b.category as string) || 'Unknown';
              const limit = Number(b.budgetAmount) || Number(b.limit) || 0;
              const spent = monthCategorySpend[cat] || 0;
              return { category: cat, spent, limit };
            })
            .filter((b) => b.limit > 0);

          await sendWeeklyDigest(user.chatId, {
            totalIncome,
            totalExpenses,
            savingsRate,
            topCategories,
            budgetStatus,
            transactionCount: transactions.length,
          });

          sent++;
        } catch (error) {
          console.error(`Weekly digest failed for chatId ${user.chatId}:`, error);
        }
      });
    }

    return { usersChecked: result.length, sent };
  }
);

// ─── Monthly Report (1st of month 9AM UTC) ──────────────────────────

export const telegramMonthlyReport = inngest.createFunction(
  { id: 'telegram-monthly-report', name: 'Telegram Monthly Report' },
  { cron: '0 9 1 * *' },
  async ({ step }) => {
    const result = await step.run('find-telegram-users', async () => {
      const db = await getMongoDb();
      const users = await db
        .collection('user_settings')
        .find({
          telegramChatId: { $exists: true, $ne: null },
          'telegramNotifications.weeklyDigest': { $ne: false },
        })
        .toArray();
      return users.map((u) => ({
        userId: u.userId as string,
        chatId: u.telegramChatId as number,
      }));
    });

    let sent = 0;

    for (const user of result) {
      await step.run(`monthly-report-${user.userId}`, async () => {
        try {
          const db = await getMongoDb();
          const prev = startOfPrevMonth();

          // Previous month transactions
          const transactions = await db
            .collection('transactions')
            .find({ userId: user.userId, date: { $gte: prev.start, $lt: prev.end } })
            .toArray();

          if (transactions.length === 0) return;

          let totalIncome = 0;
          let totalExpenses = 0;
          const categorySpend: Record<string, number> = {};

          for (const txn of transactions) {
            const amount = Math.abs(txn.amount as number);
            if (txn.type === 'income' || txn.type === 'refund') {
              totalIncome += amount;
            } else if (txn.type === 'expense') {
              totalExpenses += amount;
              const cat = (txn.category as string) || 'Uncategorized';
              categorySpend[cat] = (categorySpend[cat] || 0) + amount;
            }
          }

          const savingsRate = totalIncome > 0
            ? ((totalIncome - totalExpenses) / totalIncome) * 100
            : 0;

          const topCategories = Object.entries(categorySpend)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount }));

          // Month before previous for comparison
          const d = new Date();
          const twoMonthsAgo = new Date(d.getFullYear(), d.getMonth() - 2, 1);
          const twoMonthsAgoEnd = new Date(d.getFullYear(), d.getMonth() - 1, 1);

          const prevPrevTxns = await db
            .collection('transactions')
            .find({
              userId: user.userId,
              date: { $gte: twoMonthsAgo.toISOString(), $lt: twoMonthsAgoEnd.toISOString() },
            })
            .toArray();

          let prevIncome = 0;
          let prevExpenses = 0;
          for (const txn of prevPrevTxns) {
            const amount = Math.abs(txn.amount as number);
            if (txn.type === 'income' || txn.type === 'refund') prevIncome += amount;
            else if (txn.type === 'expense') prevExpenses += amount;
          }

          const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
          const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;

          // Check for AI insight
          let aiInsight: string | undefined;
          const latestAnalysis = await db
            .collection('ai_analyses')
            .findOne({ userId: user.userId }, { sort: { createdAt: -1 } });
          if (latestAnalysis) {
            aiInsight = ((latestAnalysis.summary as string) || (latestAnalysis.content as string) || '').slice(0, 300);
            if (aiInsight.length === 300) aiInsight += '...';
          }

          await sendMonthlyReport(user.chatId, {
            month: prev.label,
            totalIncome,
            totalExpenses,
            savingsRate,
            topCategories,
            comparedToPrevMonth: { incomeChange, expenseChange },
            aiInsight: aiInsight || undefined,
          });

          sent++;
        } catch (error) {
          console.error(`Monthly report failed for chatId ${user.chatId}:`, error);
        }
      });
    }

    return { usersChecked: result.length, sent };
  }
);

// ─── Subscription Reminders (Daily 9AM UTC) ─────────────────────────

export const telegramSubscriptionReminders = inngest.createFunction(
  { id: 'telegram-subscription-reminders', name: 'Telegram Subscription Reminders' },
  { cron: '0 9 * * *' },
  async ({ step }) => {
    const result = await step.run('check-upcoming-renewals', async () => {
      const db = await getMongoDb();

      const today = new Date().toISOString().split('T')[0];
      const twoDaysOut = daysFromNow(2);

      // Find all subscriptions renewing within 2 days
      const subs = await db
        .collection('subscriptions')
        .find({
          status: 'active',
          nextExpected: { $gte: today, $lte: twoDaysOut },
        })
        .toArray();

      if (subs.length === 0) return { sent: 0, checked: 0 };

      // Group by userId
      const userSubsMap = new Map<string, typeof subs>();
      for (const sub of subs) {
        const userId = sub.userId as string;
        if (!userSubsMap.has(userId)) userSubsMap.set(userId, []);
        userSubsMap.get(userId)!.push(sub);
      }

      let sent = 0;
      let checked = 0;

      for (const [userId, userSubs] of userSubsMap) {
        checked++;
        const settings = await db.collection('user_settings').findOne({ userId });
        if (!settings?.telegramChatId) continue;

        const prefs = (settings.telegramNotifications as Record<string, boolean>) || {};
        if (prefs.renewalAlert === false) continue;

        const chatId = settings.telegramChatId as number;

        for (const sub of userSubs) {
          try {
            await sendSubscriptionReminder(chatId, {
              name: sub.name as string,
              amount: Number(sub.amount) || 0,
              frequency: (sub.frequency as string) || 'monthly',
              nextExpected: sub.nextExpected as string,
            });
            sent++;
          } catch (error) {
            console.error(`Subscription reminder failed for chatId ${chatId}:`, error);
          }
        }
      }

      return { sent, checked };
    });

    return result;
  }
);

// ─── Budget Breach Check (Every 6 hours) ────────────────────────────

export const telegramBudgetCheck = inngest.createFunction(
  { id: 'telegram-budget-check', name: 'Telegram Budget Check' },
  { cron: '0 */6 * * *' },
  async ({ step }) => {
    const users = await step.run('find-budget-users', async () => {
      const db = await getMongoDb();
      const docs = await db
        .collection('user_settings')
        .find({
          telegramChatId: { $exists: true, $ne: null },
          'telegramNotifications.budgetBreach': { $ne: false },
        })
        .toArray();
      return docs.map((u) => ({
        userId: u.userId as string,
        chatId: u.telegramChatId as number,
      }));
    });

    let totalBreaches = 0;

    for (const user of users) {
      await step.run(`budget-check-${user.userId}`, async () => {
        try {
          const db = await getMongoDb();

          const budgetDocs = await db
            .collection('budget_categories')
            .find({ userId: user.userId })
            .toArray();

          if (budgetDocs.length === 0) return;

          const monthStart = startOfMonth();
          const expenses = await db
            .collection('transactions')
            .find({
              userId: user.userId,
              date: { $gte: monthStart },
              type: 'expense',
            })
            .toArray();

          const categorySpend: Record<string, number> = {};
          for (const txn of expenses) {
            const cat = (txn.category as string) || 'Uncategorized';
            categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(txn.amount as number);
          }

          // Check which breaches have already been notified (dedup via collection)
          const now = new Date();
          const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

          for (const doc of budgetDocs) {
            const category = (doc.name as string) || (doc.category as string) || 'Unknown';
            const limit = Number(doc.budgetAmount) || Number(doc.limit) || 0;
            if (limit <= 0) continue;

            const spent = categorySpend[category] || 0;
            const ratio = spent / limit;

            if (ratio < 0.8) continue;

            const severity: 'warning' | 'critical' = ratio >= 1 ? 'critical' : 'warning';
            const dedupKey = `tg-budget:${user.userId}:${category}:${severity}`;

            // Check if already notified in the last 6 hours
            const existing = await db.collection('telegram_notification_log').findOne({
              dedupKey,
              sentAt: { $gte: sixHoursAgo },
            });

            if (existing) continue;

            await sendBudgetBreachAlert(user.chatId, category, spent, limit, severity);

            // Log the notification
            await db.collection('telegram_notification_log').insertOne({
              dedupKey,
              userId: user.userId,
              chatId: user.chatId,
              type: 'budget_breach',
              sentAt: now.toISOString(),
            });

            totalBreaches++;
          }
        } catch (error) {
          console.error(`Budget check failed for userId ${user.userId}:`, error);
        }
      });
    }

    return { usersChecked: users.length, breachesNotified: totalBreaches };
  }
);

// ─── Spending Anomaly (Triggered after sync) ────────────────────────

export const telegramSpendingAnomaly = inngest.createFunction(
  { id: 'telegram-spending-anomaly', name: 'Telegram Spending Anomaly Check' },
  { event: 'finance/sync.completed' },
  async ({ event, step }) => {
    const userIds: string[] = event.data.userIds;

    let anomaliesFound = 0;

    for (const userId of userIds) {
      await step.run(`anomaly-check-${userId}`, async () => {
        try {
          const db = await getMongoDb();

          // Check user has Telegram linked
          const settings = await db.collection('user_settings').findOne({ userId });
          if (!settings?.telegramChatId) return;
          const prefs = (settings.telegramNotifications as Record<string, boolean>) || {};
          if (prefs.budgetBreach === false) return;

          const chatId = settings.telegramChatId as number;

          // Get today's transactions
          const today = new Date();
          const startOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          ).toISOString();

          const todayTxns = await db
            .collection('transactions')
            .find({
              userId,
              date: { $gte: startOfDay },
              type: 'expense',
            })
            .toArray();

          if (todayTxns.length === 0) return;

          // Calculate daily average from last 30 days
          const thirtyDaysAgo = new Date(
            today.getTime() - 30 * 24 * 60 * 60 * 1000
          ).toISOString();

          const last30Txns = await db
            .collection('transactions')
            .find({
              userId,
              date: { $gte: thirtyDaysAgo, $lt: startOfDay },
              type: 'expense',
            })
            .toArray();

          const totalLast30 = last30Txns.reduce(
            (s, t) => s + Math.abs(t.amount as number),
            0
          );
          const dailyAverage = totalLast30 / 30;

          const todayTotal = todayTxns.reduce(
            (s, t) => s + Math.abs(t.amount as number),
            0
          );

          // Overspending alert: today > 2x daily average
          if (dailyAverage > 0 && todayTotal > 2 * dailyAverage) {
            const dedupKey = `tg-overspend:${userId}:${startOfDay}`;
            const existing = await db.collection('telegram_notification_log').findOne({ dedupKey });
            if (!existing) {
              await sendOverspendingAlert(chatId, todayTotal, dailyAverage);
              await db.collection('telegram_notification_log').insertOne({
                dedupKey,
                userId,
                chatId,
                type: 'overspending',
                sentAt: new Date().toISOString(),
              });
              anomaliesFound++;
            }
          }

          // Per-transaction anomaly: amount > 3x category average
          const categoryTotals: Record<string, { total: number; count: number }> = {};
          for (const txn of last30Txns) {
            const cat = (txn.category as string) || 'Uncategorized';
            if (!categoryTotals[cat]) categoryTotals[cat] = { total: 0, count: 0 };
            categoryTotals[cat].total += Math.abs(txn.amount as number);
            categoryTotals[cat].count++;
          }

          for (const txn of todayTxns) {
            const cat = (txn.category as string) || 'Uncategorized';
            const amount = Math.abs(txn.amount as number);
            const catData = categoryTotals[cat];

            if (!catData || catData.count < 3) continue; // Need enough data
            const catAvg = catData.total / catData.count;

            if (catAvg > 0 && amount > 3 * catAvg) {
              const txnId = (txn._id || txn.txnId || '').toString();
              const dedupKey = `tg-anomaly:${userId}:${txnId}`;
              const existing = await db.collection('telegram_notification_log').findOne({ dedupKey });
              if (!existing) {
                await sendSpendingAnomaly(
                  chatId,
                  {
                    description: (txn.description as string) || 'Unknown',
                    amount,
                    category: cat,
                  },
                  catAvg
                );
                await db.collection('telegram_notification_log').insertOne({
                  dedupKey,
                  userId,
                  chatId,
                  type: 'spending_anomaly',
                  sentAt: new Date().toISOString(),
                });
                anomaliesFound++;
              }
            }
          }
        } catch (error) {
          console.error(`Anomaly check failed for userId ${userId}:`, error);
        }
      });
    }

    return { usersChecked: userIds.length, anomaliesFound };
  }
);
