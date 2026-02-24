/**
 * Telegram Bot API wrapper and notification message formatters.
 *
 * Provides low-level API communication with the Telegram Bot API using raw
 * `fetch` calls (no npm package required). Includes retry logic with exponential
 * backoff for 429 rate limits, inline keyboard builders for category selection
 * and receipt confirmation, and formatters for budget alerts, weekly digests,
 * renewal reminders, and daily summaries.
 *
 * @module lib/telegram
 */

import { formatINR } from '@/lib/format';
import { getBudgetCategories } from '@/lib/budget-mapping';

/** Lazy accessor for the Telegram bot token from environment variables. */
const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;

// ─── Generic API caller ─────────────────────────────────────────────

/** Maximum number of retry attempts for rate-limited (429) requests. */
const MAX_RETRIES = 3;

/**
 * Call a Telegram Bot API method with automatic retry on rate limiting (HTTP 429).
 *
 * Uses exponential backoff with Telegram's `retry_after` hint. Retries up to
 * 3 times before giving up. Logs errors but does not throw on API failures.
 *
 * @param method - The Telegram Bot API method name (e.g. "sendMessage", "getFile").
 * @param body - The JSON request body matching the method's parameters.
 * @returns The parsed JSON response from Telegram, or an error shape on max retries.
 */
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

/**
 * Send a text message to a Telegram chat.
 *
 * @param chatId - The Telegram chat ID to send the message to.
 * @param text - The message text (Markdown supported by default).
 * @param options - Optional formatting and keyboard configuration.
 * @param options.parseMode - Message parse mode (default: "Markdown").
 * @param options.replyMarkup - Inline keyboard or reply keyboard markup.
 * @returns The Telegram API response.
 */
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

/**
 * Send a text message with an inline keyboard attached.
 *
 * @param chatId - The Telegram chat ID.
 * @param text - The message text.
 * @param keyboard - The inline keyboard markup object.
 * @returns The Telegram API response.
 */
export async function sendMessageWithKeyboard(
  chatId: number,
  text: string,
  keyboard: object
) {
  return sendMessage(chatId, text, { replyMarkup: keyboard });
}

// ─── Inline keyboards ──────────────────────────────────────────────

/**
 * Build an inline keyboard for category selection on a transaction.
 *
 * Categories are laid out in a 2-column grid. Uses category index instead
 * of full name in `callback_data` to stay within Telegram's 64-byte limit.
 * Callback data format: `cat:<txnId>:<index>`.
 *
 * @param txnId - The transaction ID to associate with the category selection.
 * @returns An inline keyboard markup object for Telegram.
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

/**
 * Resolve a category index (from callback_data) back to the category name.
 *
 * @param index - The zero-based category index.
 * @returns The category name, or null if the index is out of bounds.
 */
export function resolveCategoryIndex(index: number): string | null {
  const categories = getBudgetCategories();
  return index >= 0 && index < categories.length ? categories[index] : null;
}

/**
 * Build a Confirm/Cancel inline keyboard for receipt transaction confirmation.
 *
 * @param txnId - The transaction ID to confirm or cancel.
 * @returns An inline keyboard markup with two buttons.
 */
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

/**
 * Format a budget breach notification message with severity emoji.
 *
 * @param title - Alert title (e.g. "Budget Exceeded: Dining").
 * @param message - Detailed alert message body.
 * @param severity - "critical" or "warning" to determine the emoji prefix.
 * @returns Markdown-formatted message string.
 */
export function formatBudgetBreachMessage(
  title: string,
  message: string,
  severity: string
) {
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  return `${emoji} *${title}*\n\n${message}`;
}

/**
 * Format a weekly financial digest notification message.
 *
 * @param data - Aggregated weekly metrics including income, expenses, savings rate, and top categories.
 * @returns Markdown-formatted weekly digest string.
 */
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

/**
 * Format a subscription renewal reminder notification.
 *
 * @param title - Alert title (e.g. "Netflix Renewal").
 * @param message - Renewal details.
 * @returns Markdown-formatted renewal alert string.
 */
export function formatRenewalAlertMessage(title: string, message: string) {
  return `🔔 *${title}*\n\n${message}`;
}

/**
 * Format a daily financial summary notification message.
 *
 * @param data - Daily metrics including income, expenses, top categories, and transaction count.
 * @returns Markdown-formatted daily summary string.
 */
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

/**
 * Get a downloadable URL for a Telegram file (e.g. receipt photo).
 *
 * Calls the `getFile` API method to obtain the file path, then constructs
 * the full download URL using the bot token.
 *
 * @param fileId - The Telegram file ID (from a message attachment).
 * @returns The full download URL, or null if the file could not be retrieved.
 */
export async function getFileUrl(fileId: string): Promise<string | null> {
  const res = await callTelegramAPI('getFile', { file_id: fileId });
  if (!res.ok) return null;
  const filePath = res.result.file_path;
  return `https://api.telegram.org/file/bot${BOT_TOKEN()}/${filePath}`;
}
