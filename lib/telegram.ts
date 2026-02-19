/**
 * Telegram Bot API wrapper and notification formatters.
 * Uses raw fetch calls -- no npm package required.
 */

import { formatINR } from '@/lib/format';
import { getBudgetCategories } from '@/lib/budget-mapping';

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;

// ─── Generic API caller ─────────────────────────────────────────────

export async function callTelegramAPI(method: string, body: object) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API error [${method}]:`, data.description);
  }
  return data;
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

export function buildCategoryKeyboard(txnId: string) {
  const categories = getBudgetCategories();
  // 2 buttons per row
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = [
      { text: categories[i], callback_data: `cat:${txnId}:${categories[i]}` },
    ];
    if (categories[i + 1]) {
      row.push({ text: categories[i + 1], callback_data: `cat:${txnId}:${categories[i + 1]}` });
    }
    rows.push(row);
  }
  return { inline_keyboard: rows };
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
