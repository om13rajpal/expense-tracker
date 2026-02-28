/**
 * Telegram notification formatters and senders.
 *
 * Each function accepts structured data, formats a Markdown message,
 * and sends it via the Telegram bot API. Used by both on-demand
 * commands (/report, /goals, etc.) and scheduled Inngest cron jobs.
 *
 * All currency values are formatted in INR using the shared formatINR utility.
 * Messages are kept under Telegram's 4096-character limit.
 *
 * @module lib/telegram-notifications
 */

import { sendMessage } from './telegram';
import { formatINR } from './format';

const TELEGRAM_MAX_LENGTH = 4096;

/** Truncate a message to fit Telegram's character limit. */
function truncate(text: string): string {
  if (text.length <= TELEGRAM_MAX_LENGTH) return text;
  return text.slice(0, TELEGRAM_MAX_LENGTH - 50) + '\n\n_...message truncated_';
}

/**
 * Send a budget breach alert when spending exceeds 80% or 100% of a category budget.
 */
export async function sendBudgetBreachAlert(
  chatId: number,
  category: string,
  spent: number,
  limit: number,
  severity: 'warning' | 'critical'
) {
  const ratio = Math.round((spent / limit) * 100);
  const emoji = severity === 'critical' ? '\u{1F6A8}' : '\u{26A0}\u{FE0F}';
  const label = severity === 'critical' ? 'EXCEEDED' : 'WARNING';

  const text = [
    `${emoji} *Budget ${label}: ${category}*\n`,
    `Spent: ${formatINR(spent)} / ${formatINR(limit)}`,
    `Usage: ${ratio}%`,
    '',
    severity === 'critical'
      ? `You've exceeded your ${category} budget by ${formatINR(spent - limit)}.`
      : `You've used ${ratio}% of your ${category} budget. ${formatINR(limit - spent)} remaining.`,
  ].join('\n');

  await sendMessage(chatId, truncate(text));
}

/**
 * Send a weekly financial digest with income, expenses, savings rate, and top categories.
 */
export async function sendWeeklyDigest(
  chatId: number,
  weekData: {
    totalIncome: number;
    totalExpenses: number;
    savingsRate: number;
    topCategories: { name: string; amount: number }[];
    budgetStatus: { category: string; spent: number; limit: number }[];
    transactionCount: number;
  }
) {
  const lines: string[] = [
    '\u{1F4CA} *Weekly Financial Digest*\n',
    `\u{1F4B0} Income: ${formatINR(weekData.totalIncome)}`,
    `\u{1F4B8} Expenses: ${formatINR(weekData.totalExpenses)}`,
    `\u{1F4C8} Savings Rate: ${weekData.savingsRate.toFixed(1)}%`,
    `\u{1F522} Transactions: ${weekData.transactionCount}`,
  ];

  if (weekData.topCategories.length > 0) {
    lines.push('\n*Top Spending Categories:*');
    for (const cat of weekData.topCategories.slice(0, 5)) {
      lines.push(`  \u{2022} ${cat.name}: ${formatINR(cat.amount)}`);
    }
  }

  if (weekData.budgetStatus.length > 0) {
    lines.push('\n*Budget Status:*');
    for (const b of weekData.budgetStatus) {
      const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      const bar = buildProgressBar(pct);
      const warn = pct >= 100 ? ' \u{1F6A8}' : pct >= 80 ? ' \u{26A0}\u{FE0F}' : '';
      lines.push(`  ${b.category}: ${bar} ${pct}%${warn}`);
    }
  }

  await sendMessage(chatId, truncate(lines.join('\n')));
}

/**
 * Send a comprehensive monthly report with comparison to previous month.
 */
export async function sendMonthlyReport(
  chatId: number,
  monthData: {
    month: string;
    totalIncome: number;
    totalExpenses: number;
    savingsRate: number;
    topCategories: { name: string; amount: number }[];
    comparedToPrevMonth: { incomeChange: number; expenseChange: number };
    aiInsight?: string;
  }
) {
  const lines: string[] = [
    `\u{1F4C5} *Monthly Report \u{2014} ${monthData.month}*\n`,
    `\u{1F4B0} Income: ${formatINR(monthData.totalIncome)}`,
    `\u{1F4B8} Expenses: ${formatINR(monthData.totalExpenses)}`,
    `\u{1F4B5} Net: ${formatINR(monthData.totalIncome - monthData.totalExpenses)}`,
    `\u{1F4C8} Savings Rate: ${monthData.savingsRate.toFixed(1)}%`,
  ];

  const incSign = monthData.comparedToPrevMonth.incomeChange >= 0 ? '+' : '';
  const expSign = monthData.comparedToPrevMonth.expenseChange >= 0 ? '+' : '';
  lines.push(
    `\n*vs Previous Month:*`,
    `  Income: ${incSign}${monthData.comparedToPrevMonth.incomeChange.toFixed(1)}%`,
    `  Expenses: ${expSign}${monthData.comparedToPrevMonth.expenseChange.toFixed(1)}%`
  );

  if (monthData.topCategories.length > 0) {
    lines.push('\n*Top Categories:*');
    for (const cat of monthData.topCategories.slice(0, 5)) {
      lines.push(`  \u{2022} ${cat.name}: ${formatINR(cat.amount)}`);
    }
  }

  if (monthData.aiInsight) {
    lines.push(`\n\u{1F9E0} *AI Insight:*\n${monthData.aiInsight}`);
  }

  await sendMessage(chatId, truncate(lines.join('\n')));
}

/**
 * Send a subscription renewal reminder (typically 2 days before).
 */
export async function sendSubscriptionReminder(
  chatId: number,
  subscription: {
    name: string;
    amount: number;
    frequency: string;
    nextExpected: string;
  }
) {
  const daysUntil = Math.ceil(
    (new Date(subscription.nextExpected).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const dayLabel = daysUntil <= 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;

  const text = [
    `\u{1F514} *Subscription Reminder*\n`,
    `*${subscription.name}* renews ${dayLabel}`,
    `Amount: ${formatINR(subscription.amount)} / ${subscription.frequency}`,
    `Date: ${subscription.nextExpected}`,
  ].join('\n');

  await sendMessage(chatId, truncate(text));
}

/**
 * Send an overspending alert when daily spending exceeds 2x daily average.
 */
export async function sendOverspendingAlert(
  chatId: number,
  todaySpent: number,
  dailyAverage: number
) {
  const multiplier = dailyAverage > 0 ? (todaySpent / dailyAverage).toFixed(1) : 'N/A';

  const text = [
    `\u{1F4A5} *Overspending Alert*\n`,
    `Today's spending: ${formatINR(todaySpent)}`,
    `Daily average (30d): ${formatINR(dailyAverage)}`,
    `That's *${multiplier}x* your daily average.`,
    '',
    `Consider reviewing today's expenses to stay on track.`,
  ].join('\n');

  await sendMessage(chatId, truncate(text));
}

/**
 * Send a spending anomaly alert for a single transaction exceeding 3x category average.
 */
export async function sendSpendingAnomaly(
  chatId: number,
  transaction: {
    description: string;
    amount: number;
    category: string;
  },
  categoryAverage: number
) {
  const multiplier = categoryAverage > 0 ? (transaction.amount / categoryAverage).toFixed(1) : 'N/A';

  const text = [
    `\u{1F50D} *Unusual Transaction Detected*\n`,
    `*${transaction.description}*`,
    `Amount: ${formatINR(transaction.amount)}`,
    `Category: ${transaction.category}`,
    `Category average: ${formatINR(categoryAverage)}`,
    `This is *${multiplier}x* the average for ${transaction.category}.`,
  ].join('\n');

  await sendMessage(chatId, truncate(text));
}

/**
 * Send a goals progress summary.
 */
export async function sendGoalsProgress(
  chatId: number,
  goals: {
    name: string;
    current: number;
    target: number;
    deadline: string;
  }[]
) {
  if (goals.length === 0) {
    await sendMessage(chatId, 'No savings goals found. Create goals in the app to track progress here.');
    return;
  }

  const lines: string[] = ['\u{1F3AF} *Goals Progress*\n'];

  for (const goal of goals) {
    const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
    const bar = buildProgressBar(pct);
    const remaining = goal.target - goal.current;

    // Check if on track
    const deadlineDate = new Date(goal.deadline);
    const now = new Date();
    const monthsLeft = Math.max(
      0,
      (deadlineDate.getFullYear() - now.getFullYear()) * 12 +
        (deadlineDate.getMonth() - now.getMonth())
    );
    const requiredMonthly = monthsLeft > 0 ? remaining / monthsLeft : remaining;
    const status =
      pct >= 100
        ? '\u{2705} Complete'
        : monthsLeft <= 0
          ? '\u{274C} Overdue'
          : `${formatINR(requiredMonthly)}/mo needed`;

    lines.push(
      `*${goal.name}*`,
      `${bar} ${pct}%`,
      `${formatINR(goal.current)} / ${formatINR(goal.target)} \u{2022} Deadline: ${goal.deadline}`,
      `Status: ${status}`,
      ''
    );
  }

  await sendMessage(chatId, truncate(lines.join('\n')));
}

/**
 * Send an investment portfolio summary.
 */
export async function sendInvestmentSummary(
  chatId: number,
  portfolio: {
    totalInvested: number;
    totalCurrent: number;
    totalReturns: number;
    stocks: { symbol: string; value: number; returns: number }[];
    mutualFunds: { name: string; value: number; returns: number }[];
    sips: { name: string; monthly: number }[];
  }
) {
  const returnsPct =
    portfolio.totalInvested > 0
      ? ((portfolio.totalReturns / portfolio.totalInvested) * 100).toFixed(1)
      : '0.0';
  const returnsEmoji = portfolio.totalReturns >= 0 ? '\u{1F4C8}' : '\u{1F4C9}';

  const lines: string[] = [
    `\u{1F4BC} *Investment Portfolio*\n`,
    `Invested: ${formatINR(portfolio.totalInvested)}`,
    `Current: ${formatINR(portfolio.totalCurrent)}`,
    `${returnsEmoji} Returns: ${formatINR(portfolio.totalReturns)} (${returnsPct}%)`,
  ];

  if (portfolio.stocks.length > 0) {
    lines.push('\n*Stocks:*');
    for (const s of portfolio.stocks.slice(0, 10)) {
      const sign = s.returns >= 0 ? '+' : '';
      lines.push(`  ${s.symbol}: ${formatINR(s.value)} (${sign}${formatINR(s.returns)})`);
    }
    if (portfolio.stocks.length > 10) {
      lines.push(`  _...and ${portfolio.stocks.length - 10} more_`);
    }
  }

  if (portfolio.mutualFunds.length > 0) {
    lines.push('\n*Mutual Funds:*');
    for (const mf of portfolio.mutualFunds.slice(0, 10)) {
      const sign = mf.returns >= 0 ? '+' : '';
      lines.push(`  ${mf.name}: ${formatINR(mf.value)} (${sign}${formatINR(mf.returns)})`);
    }
    if (portfolio.mutualFunds.length > 10) {
      lines.push(`  _...and ${portfolio.mutualFunds.length - 10} more_`);
    }
  }

  if (portfolio.sips.length > 0) {
    const totalSip = portfolio.sips.reduce((s, sip) => s + sip.monthly, 0);
    lines.push(`\n*Active SIPs:* ${portfolio.sips.length} (${formatINR(totalSip)}/month)`);
    for (const sip of portfolio.sips.slice(0, 5)) {
      lines.push(`  ${sip.name}: ${formatINR(sip.monthly)}/mo`);
    }
    if (portfolio.sips.length > 5) {
      lines.push(`  _...and ${portfolio.sips.length - 5} more_`);
    }
  }

  await sendMessage(chatId, truncate(lines.join('\n')));
}

/**
 * Send a formatted AI response for the /ask command.
 */
export async function sendAiResponse(
  chatId: number,
  question: string,
  response: string
) {
  const text = [
    `\u{1F9E0} *AI Financial Advisor*\n`,
    `*Q:* ${question}\n`,
    response,
  ].join('\n');

  await sendMessage(chatId, truncate(text));
}

// ---- Helpers ----

/**
 * Build a Unicode progress bar (10 segments).
 * Filled segments use \u2593 (dark shade), empty use \u2591 (light shade).
 */
function buildProgressBar(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round(clamped / 10);
  return '\u{2593}'.repeat(filled) + '\u{2591}'.repeat(10 - filled) + ` ${clamped}%`;
}
