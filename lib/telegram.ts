/**
 * Telegram Bot API wrapper and notification formatters.
 * Uses raw fetch calls -- no npm package required.
 */

import { formatINR } from '@/lib/format';
import { getBudgetCategories } from '@/lib/budget-mapping';

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;

// ─── Generic API caller ─────────────────────────────────────────────

const MAX_RETRIES = 3;

export async function callTelegramAPI(method: string, body: object) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    // Retry on 429 (rate-limited) with exponential backoff
    // Telegram returns retry_after in the JSON body, not HTTP headers
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = data?.parameters?.retry_after || 1;
      const backoff = Math.max(retryAfter, 2 ** attempt) * 1000;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    if (!data.ok) {
      console.error(`Telegram API error [${method}]:`, data.description);
    }
    return data;
  }
  // Should not reach here, but return an error shape if it does
  return { ok: false, description: 'Max retries exceeded' };
}

// ─── Send helpers ───────────────────────────────────────────────────

export async function sendMessage(
  chatId: number,
  text: string,
  options?: { parseMode?: string; replyMarkup?: object }
) {
  return callTelegramAPI('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? 'Markdown',
    ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
  });
}

export async function sendMessageWithKeyboard(
  chatId: number,
  text: string,
  keyboard: object
) {
  return sendMessage(chatId, text, { replyMarkup: keyboard });
}

// ─── Inline keyboards ──────────────────────────────────────────────

/**
 * Build category selection keyboard.
 * Uses category index instead of full name in callback_data
 * to stay within Telegram's 64-byte callback_data limit.
 * Format: cat:<txnId>:<index>
 */
export function buildCategoryKeyboard(txnId: string) {
  const categories = getBudgetCategories();
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = [
      { text: categories[i], callback_data: `cat:${txnId}:${i}` },
    ];
    if (categories[i + 1]) {
      row.push({ text: categories[i + 1], callback_data: `cat:${txnId}:${i + 1}` });
    }
    rows.push(row);
  }
  return { inline_keyboard: rows };
}

/** Resolve a category index back to the category name */
export function resolveCategoryIndex(index: number): string | null {
  const categories = getBudgetCategories();
  return index >= 0 && index < categories.length ? categories[index] : null;
}

export function buildConfirmKeyboard(txnId: string) {
  return {
    inline_keyboard: [
      [
        { text: 'Confirm', callback_data: `receipt_confirm:${txnId}` },
        { text: 'Cancel', callback_data: `receipt_cancel:${txnId}` },
      ],
    ],
  };
}

// ─── Notification formatters ────────────────────────────────────────

export function formatBudgetBreachMessage(
  title: string,
  message: string,
  severity: string
) {
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  return `${emoji} *${title}*\n\n${message}`;
}

export function formatWeeklyDigestMessage(data: {
  totalSpent: number;
  totalIncome: number;
  topCategories: { name: string; amount: number }[];
  savingsRate: number;
  transactionCount: number;
}) {
  const lines: string[] = [
    '📊 *Weekly Financial Digest*\n',
    `💰 Income: ${formatINR(data.totalIncome)}`,
    `💸 Spent: ${formatINR(data.totalSpent)}`,
    `📈 Savings rate: ${data.savingsRate}%`,
    `🔢 Transactions: ${data.transactionCount}`,
  ];

  if (data.topCategories.length > 0) {
    lines.push('\n*Top categories:*');
    for (const cat of data.topCategories) {
      lines.push(`  - ${cat.name}: ${formatINR(cat.amount)}`);
    }
  }

  return lines.join('\n');
}

export function formatRenewalAlertMessage(title: string, message: string) {
  return `🔔 *${title}*\n\n${message}`;
}

export function formatDailySummaryMessage(data: {
  totalIncome: number;
  totalExpenses: number;
  topCategories: { name: string; amount: number }[];
  transactionCount: number;
  date: string;
}) {
  const net = data.totalIncome - data.totalExpenses;
  const lines: string[] = [
    `📋 *Daily Summary — ${data.date}*\n`,
    `💰 Income: ${formatINR(data.totalIncome)}`,
    `💸 Expenses: ${formatINR(data.totalExpenses)}`,
    `${net >= 0 ? '✅' : '❌'} Net: ${formatINR(net)}`,
    `🔢 Transactions: ${data.transactionCount}`,
  ];

  if (data.topCategories.length > 0) {
    lines.push('\n*Top categories:*');
    for (const cat of data.topCategories) {
      lines.push(`  - ${cat.name}: ${formatINR(cat.amount)}`);
    }
  }

  return lines.join('\n');
}

// ─── File download helper (for receipt photos) ──────────────────────

export async function getFileUrl(fileId: string): Promise<string | null> {
  const res = await callTelegramAPI('getFile', { file_id: fileId });
  if (!res.ok) return null;
  const filePath = res.result.file_path;
  return `https://api.telegram.org/file/bot${BOT_TOKEN()}/${filePath}`;
}
