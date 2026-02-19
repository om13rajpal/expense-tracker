/**
 * Telegram Daily Summary — Inngest cron job
 *
 * Runs daily at 4 PM UTC (9:30 PM IST).
 * For each user with Telegram linked and dailySummary enabled,
 * fetches today's transactions and sends a summary via Telegram.
 */
import { inngest } from '@/lib/inngest';
import { getMongoDb } from '@/lib/mongodb';
import { sendMessage, formatDailySummaryMessage } from '@/lib/telegram';

export const telegramDailySummary = inngest.createFunction(
  { id: 'telegram-daily-summary', name: 'Telegram Daily Summary' },
  { cron: '0 16 * * *' },
  async ({ step }) => {
    const result = await step.run('send-daily-summaries', async () => {
      const db = await getMongoDb();

      // Find all users with Telegram linked and daily summary enabled
      const users = await db
        .collection('user_settings')
        .find({
          telegramChatId: { $exists: true, $ne: null },
          'telegramNotifications.dailySummary': true,
        })
        .toArray();

      let sent = 0;

      for (const userDoc of users) {
        const userId = userDoc.userId as string;
        const chatId = userDoc.telegramChatId as number;

        const today = new Date();
        const startOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).toISOString();
        const endOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1
        ).toISOString();

        const transactions = await db
          .collection('transactions')
          .find({ userId, date: { $gte: startOfDay, $lt: endOfDay } })
          .toArray();

        if (transactions.length === 0) continue;

        let totalIncome = 0;
        let totalExpenses = 0;
        const categorySpend: Record<string, number> = {};

        for (const txn of transactions) {
          const amount = Math.abs(txn.amount as number);
          if (txn.type === 'income') {
            totalIncome += amount;
          } else {
            totalExpenses += amount;
            const cat = (txn.category as string) || 'Uncategorized';
            categorySpend[cat] = (categorySpend[cat] || 0) + amount;
          }
        }

        const topCategories = Object.entries(categorySpend)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, amount]) => ({ name, amount }));

        const dateStr = today.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const message = formatDailySummaryMessage({
          totalIncome,
          totalExpenses,
          topCategories,
          transactionCount: transactions.length,
          date: dateStr,
        });

        try {
          await sendMessage(chatId, message);
          sent++;
        } catch (error) {
          console.error(`Failed to send daily summary to chatId ${chatId}:`, error);
        }
      }

      return { usersChecked: users.length, summariesSent: sent };
    });

    return result;
  }
);
