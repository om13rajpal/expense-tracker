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

// ─── Chat actions ───────────────────────────────────────────────────

/**
 * Send a chat action (typing indicator, etc.) to a Telegram chat.
 *
 * @param chatId - The Telegram chat ID.
 * @param action - The chat action (e.g. "typing").
 */
export async function sendChatAction(chatId: number, action: string = 'typing') {
  return callTelegramAPI('sendChatAction', { chat_id: chatId, action });
}

/**
 * Edit an existing message's text and optionally its inline keyboard.
 */
export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  options?: { parseMode?: string; replyMarkup?: object }
) {
  return callTelegramAPI('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options?.parseMode ?? 'Markdown',
    ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
  });
}

// ─── Main Menu ──────────────────────────────────────────────────────

/**
 * Build the main menu inline keyboard with all primary actions.
 */
export function buildMainMenu() {
  return {
    inline_keyboard: [
      [
        { text: '\u{1F4B8} Log Expense', callback_data: 'm:log' },
        { text: '\u{1F4B0} Log Income', callback_data: 'm:inc' },
      ],
      [
        { text: '\u{1F4CB} Today', callback_data: 'm:today' },
        { text: '\u{1F4CA} Report', callback_data: 'm:report' },
      ],
      [
        { text: '\u{1F4B0} Budget', callback_data: 'm:budget' },
        { text: '\u{1F3AF} Goals', callback_data: 'm:goals' },
      ],
      [
        { text: '\u{1F4BC} Investments', callback_data: 'm:invest' },
        { text: '\u{1F9E0} Ask AI', callback_data: 'm:ask' },
      ],
      [
        { text: '\u{2699}\u{FE0F} Settings', callback_data: 'm:settings' },
      ],
    ],
  };
}

// ─── Quick Actions ──────────────────────────────────────────────────

/**
 * Build context-aware quick action buttons appended after responses.
 *
 * @param context - The context type that determines which quick actions to show.
 */
export function buildQuickActions(context: string) {
  const contextActions: Record<string, { text: string; callback_data: string }[]> = {
    summary: [
      { text: '\u{1F4CA} Monthly Report', callback_data: 'm:report' },
      { text: '\u{1F4B0} Budget', callback_data: 'm:budget' },
    ],
    budget: [
      { text: '\u{1F4CB} Today', callback_data: 'm:today' },
      { text: '\u{1F9E0} Budget Advice', callback_data: 'm:ask' },
    ],
    report: [
      { text: '\u{1F4B0} Budget', callback_data: 'm:budget' },
      { text: '\u{1F3AF} Goals', callback_data: 'm:goals' },
    ],
    goals: [
      { text: '\u{1F4BC} Investments', callback_data: 'm:invest' },
      { text: '\u{1F4CA} Report', callback_data: 'm:report' },
    ],
    invest: [
      { text: '\u{1F3AF} Goals', callback_data: 'm:goals' },
      { text: '\u{1F4CA} Report', callback_data: 'm:report' },
    ],
    ask: [
      { text: '\u{1F4CB} Today', callback_data: 'm:today' },
      { text: '\u{1F4CA} Report', callback_data: 'm:report' },
    ],
  };

  const row1 = contextActions[context] || [
    { text: '\u{1F4CB} Today', callback_data: 'm:today' },
    { text: '\u{1F4CA} Report', callback_data: 'm:report' },
  ];

  return {
    inline_keyboard: [
      row1,
      [
        { text: '\u{1F4B8} Log Expense', callback_data: 'm:log' },
        { text: '\u{1F3E0} Menu', callback_data: 'm:menu' },
      ],
    ],
  };
}

// ─── Category Picker V2 (with emoji) ───────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  'Food & Dining': '\u{1F355}',
  'Transport': '\u{1F695}',
  'Shopping': '\u{1F6CD}\u{FE0F}',
  'Bills & Utilities': '\u{1F4F1}',
  'Entertainment': '\u{1F3AC}',
  'Healthcare': '\u{1F3E5}',
  'Education': '\u{1F4DA}',
  'Fitness': '\u{1F4AA}',
  'Travel': '\u{2708}\u{FE0F}',
  'Others': '\u{1F4E6}',
};

/**
 * Build category keyboard with emoji prefixes and a Skip option.
 * Callback: `c:<txnId>:<index>` (max ~30 bytes)
 */
export function buildCategoryKeyboardV2(txnId: string) {
  const categories = getBudgetCategories();
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    const emoji1 = CATEGORY_EMOJI[categories[i]] || '';
    const row = [
      { text: `${emoji1} ${categories[i]}`, callback_data: `c:${txnId}:${i}` },
    ];
    if (categories[i + 1]) {
      const emoji2 = CATEGORY_EMOJI[categories[i + 1]] || '';
      row.push({ text: `${emoji2} ${categories[i + 1]}`, callback_data: `c:${txnId}:${i + 1}` });
    }
    rows.push(row);
  }
  rows.push([{ text: '\u{23ED}\u{FE0F} Skip', callback_data: `c:${txnId}:skip` }]);
  return { inline_keyboard: rows };
}

// ─── Payment Method Picker ──────────────────────────────────────────

const PAYMENT_METHODS = [
  { text: '\u{1F4F2} UPI', short: 'upi', full: 'UPI' },
  { text: '\u{1F4B5} Cash', short: 'cash', full: 'Cash' },
  { text: '\u{1F4B3} Card', short: 'card', full: 'Credit Card' },
  { text: '\u{1F3E6} Net Banking', short: 'nb', full: 'Net Banking' },
  { text: '\u{1F45B} Wallet', short: 'wal', full: 'Wallet' },
];

/**
 * Resolve a short payment code back to the full payment method name.
 */
export function resolvePaymentMethod(short: string): string | null {
  const found = PAYMENT_METHODS.find(p => p.short === short);
  return found ? found.full : null;
}

/**
 * Build payment method picker keyboard.
 * Callback: `p:<txnId>:<short>`
 */
export function buildPaymentKeyboard(txnId: string) {
  return {
    inline_keyboard: [
      PAYMENT_METHODS.slice(0, 3).map(p => ({
        text: p.text,
        callback_data: `p:${txnId}:${p.short}`,
      })),
      [
        ...PAYMENT_METHODS.slice(3).map(p => ({
          text: p.text,
          callback_data: `p:${txnId}:${p.short}`,
        })),
        { text: '\u{23ED}\u{FE0F} Skip', callback_data: `p:${txnId}:skip` },
      ],
    ],
  };
}

// ─── Confirmation Card V2 ───────────────────────────────────────────

/**
 * Build confirm/cancel/edit keyboard for a transaction.
 * Callback: `tx:<txnId>:<action>` where action = ok/no/ec/ep/ea
 */
export function buildConfirmKeyboardV2(txnId: string) {
  return {
    inline_keyboard: [
      [
        { text: '\u{2705} Confirm', callback_data: `tx:${txnId}:ok` },
        { text: '\u{274C} Cancel', callback_data: `tx:${txnId}:no` },
      ],
      [
        { text: '\u{270F}\u{FE0F} Category', callback_data: `tx:${txnId}:ec` },
        { text: '\u{270F}\u{FE0F} Payment', callback_data: `tx:${txnId}:ep` },
        { text: '\u{270F}\u{FE0F} Amount', callback_data: `tx:${txnId}:ea` },
      ],
    ],
  };
}

// ─── Flow Keyboards (no txnId, session-tracked) ─────────────────────

/**
 * Build category keyboard for guided flow (no txnId needed).
 * Callback: `fc:<index>`
 */
export function buildFlowCategoryKeyboard() {
  const categories = getBudgetCategories();
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    const emoji1 = CATEGORY_EMOJI[categories[i]] || '';
    const row = [
      { text: `${emoji1} ${categories[i]}`, callback_data: `fc:${i}` },
    ];
    if (categories[i + 1]) {
      const emoji2 = CATEGORY_EMOJI[categories[i + 1]] || '';
      row.push({ text: `${emoji2} ${categories[i + 1]}`, callback_data: `fc:${i + 1}` });
    }
    rows.push(row);
  }
  rows.push([{ text: '\u{23ED}\u{FE0F} Skip', callback_data: 'fc:skip' }]);
  return { inline_keyboard: rows };
}

/**
 * Build payment keyboard for guided flow (no txnId needed).
 * Callback: `fp:<method>`
 */
export function buildFlowPaymentKeyboard() {
  return {
    inline_keyboard: [
      PAYMENT_METHODS.slice(0, 3).map(p => ({
        text: p.text,
        callback_data: `fp:${p.short}`,
      })),
      [
        ...PAYMENT_METHODS.slice(3).map(p => ({
          text: p.text,
          callback_data: `fp:${p.short}`,
        })),
        { text: '\u{23ED}\u{FE0F} Skip', callback_data: 'fp:skip' },
      ],
    ],
  };
}

// ─── Settings Menu ──────────────────────────────────────────────────

/**
 * Build the settings inline keyboard.
 */
export function buildSettingsMenu() {
  return {
    inline_keyboard: [
      [
        { text: '\u{1F514} Alerts ON', callback_data: 's:alerts:on' },
        { text: '\u{1F515} Alerts OFF', callback_data: 's:alerts:off' },
      ],
      [
        { text: '\u{1F517} Unlink Account', callback_data: 's:unlink' },
      ],
      [
        { text: '\u{1F3E0} Back to Menu', callback_data: 'm:menu' },
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

// ─── Extended formatters (for /budget, /goals, /investments, /ask) ──

/**
 * Build a Unicode progress bar string (10 segments).
 *
 * @param percent - Usage percentage (0–100+).
 * @returns Bar like "▓▓▓▓▓░░░░░ 52%".
 */
function buildProgressBar(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round(clamped / 10);
  return '\u{2593}'.repeat(filled) + '\u{2591}'.repeat(10 - filled);
}

/**
 * Format budget status with Unicode progress bars for each category.
 *
 * @param budgets - Array of budget categories with spent and limit amounts.
 * @returns Markdown-formatted budget status string.
 */
export function formatBudgetStatus(
  budgets: { category: string; spent: number; limit: number }[]
): string {
  if (budgets.length === 0) return 'No budget categories found.';

  const lines: string[] = ['💰 *Budget Status*\n'];

  for (const b of budgets) {
    const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
    const bar = buildProgressBar(pct);
    const remaining = b.limit - b.spent;
    const warn = pct >= 100 ? ' 🚨' : pct >= 80 ? ' ⚠️' : '';
    lines.push(
      `*${b.category}*`,
      `${bar} ${pct}%${warn}`,
      `${formatINR(b.spent)} / ${formatINR(b.limit)} (${formatINR(remaining)} left)`,
      ''
    );
  }

  return lines.join('\n');
}

/**
 * Format goals progress with completion percentages and deadlines.
 *
 * @param goals - Array of savings goals with current amount, target, and deadline.
 * @returns Markdown-formatted goals progress string.
 */
export function formatGoalsProgress(
  goals: { name: string; current: number; target: number; deadline: string }[]
): string {
  if (goals.length === 0) return 'No savings goals found.';

  const lines: string[] = ['🎯 *Goals Progress*\n'];

  for (const goal of goals) {
    const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
    const bar = buildProgressBar(pct);
    lines.push(
      `*${goal.name}*`,
      `${bar} ${pct}%`,
      `${formatINR(goal.current)} / ${formatINR(goal.target)} • Deadline: ${goal.deadline}`,
      ''
    );
  }

  return lines.join('\n');
}

/**
 * Format an investment portfolio overview.
 *
 * @param portfolio - Portfolio totals including invested, current value, and returns.
 * @returns Markdown-formatted portfolio summary string.
 */
export function formatInvestmentSummary(portfolio: {
  totalInvested: number;
  totalCurrent: number;
  returnsPercent: number;
}): string {
  const returns = portfolio.totalCurrent - portfolio.totalInvested;
  const emoji = returns >= 0 ? '📈' : '📉';
  return [
    '💼 *Investment Portfolio*\n',
    `Invested: ${formatINR(portfolio.totalInvested)}`,
    `Current: ${formatINR(portfolio.totalCurrent)}`,
    `${emoji} Returns: ${formatINR(returns)} (${returns >= 0 ? '+' : ''}${portfolio.returnsPercent.toFixed(1)}%)`,
  ].join('\n');
}

/**
 * Format an AI response, truncating if it exceeds Telegram's 4096 char limit.
 *
 * @param response - The AI-generated response text.
 * @returns Formatted response string safe for Telegram.
 */
export function formatAiResponse(response: string): string {
  const maxLen = 4000; // leave room for wrapper text
  if (response.length <= maxLen) return response;
  return response.slice(0, maxLen) + '\n\n_...response truncated due to length_';
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
