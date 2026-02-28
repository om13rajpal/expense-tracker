/**
 * Inngest Webhook Handler
 *
 * Serves the Inngest SDK endpoint that registers and executes all
 * event-driven background functions: transaction sync, price refresh,
 * AI insight generation, and notification workflows.
 */
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { syncTransactions } from '@/inngest/sync';
import { refreshPrices } from '@/inngest/prices';
import { scheduledInsights } from '@/inngest/scheduled-insights';
import { postSyncInsights } from '@/inngest/post-sync-insights';
import { postPricesInsights } from '@/inngest/post-prices-insights';
import { generateUserInsights } from '@/inngest/generate-insights';
import { budgetBreachCheck, renewalAlert, weeklyDigest } from '@/inngest/notifications';
import {
  dailyStreakCheck,
  dailyBadgeCheck,
  weeklyFreezeGrant,
  monthlyChallengeRotation,
} from '@/inngest/gamification';
import { telegramDailySummary } from '@/inngest/telegram-daily-summary';
import { ghostBudgetSnapshot } from '@/inngest/ghost-budget';
import { subscriptionPaymentCheck } from '@/inngest/subscription-payment-check';
import {
  telegramWeeklyDigest,
  telegramMonthlyReport,
  telegramSubscriptionReminders,
  telegramBudgetCheck,
  telegramSpendingAnomaly,
} from '@/inngest/telegram-notifications';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncTransactions,
    refreshPrices,
    scheduledInsights,
    postSyncInsights,
    postPricesInsights,
    generateUserInsights,
    budgetBreachCheck,
    renewalAlert,
    weeklyDigest,
    dailyStreakCheck,
    dailyBadgeCheck,
    weeklyFreezeGrant,
    monthlyChallengeRotation,
    telegramDailySummary,
    ghostBudgetSnapshot,
    subscriptionPaymentCheck,
    telegramWeeklyDigest,
    telegramMonthlyReport,
    telegramSubscriptionReminders,
    telegramBudgetCheck,
    telegramSpendingAnomaly,
  ],
});
