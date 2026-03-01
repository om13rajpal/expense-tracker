/**
 * Guided multi-step expense/income flows for Telegram bot.
 *
 * Handles menu-initiated transaction entry where users walk through
 * prompted steps: amount → category → payment → confirm.
 *
 * @module lib/telegram-flows
 */

import { getMongoDb } from '@/lib/mongodb';
import { formatINR } from '@/lib/format';
import {
  sendMessage,
  sendMessageWithKeyboard,
  buildFlowCategoryKeyboard,
  buildFlowPaymentKeyboard,
  buildQuickActions,
  resolveCategoryIndex,
  resolvePaymentMethod,
} from '@/lib/telegram';
import { parseExpenseMessage } from '@/lib/telegram-parser';
import { getSession, setSession, clearSession } from '@/lib/telegram-session';
import type { SessionData } from '@/lib/telegram-session';
import { classifyIntent } from '@/lib/telegram-intent';

// ─── Flow entry points ──────────────────────────────────────────────

/**
 * Start a guided expense or income flow from the main menu.
 * Sets session to AWAITING_AMOUNT and prompts the user.
 */
export async function startFlow(
  chatId: number,
  type: 'expense' | 'income',
  userId: string,
  messageId?: number
): Promise<void> {
  await setSession(chatId, 'AWAITING_AMOUNT', { type, userId });

  const typeLabel = type === 'income' ? 'income' : 'expense';
  const prompt = [
    `Type the amount or description with amount:`,
    '',
    '`500` or `coffee 250`',
  ].join('\n');

  if (messageId) {
    // Edit the menu message to show the prompt
    const { editMessageText } = await import('@/lib/telegram');
    await editMessageText(chatId, messageId, `\u{270F}\u{FE0F} *Log ${typeLabel}*\n\n${prompt}`);
  } else {
    await sendMessage(chatId, `\u{270F}\u{FE0F} *Log ${typeLabel}*\n\n${prompt}`);
  }
}

// ─── Flow input handler ─────────────────────────────────────────────

/**
 * Handle text input during an active guided flow.
 * Returns true if the input was consumed by the flow, false if the flow
 * should be aborted in favor of a competing intent.
 */
export async function handleFlowInput(
  chatId: number,
  text: string,
  userId: string
): Promise<boolean> {
  const session = await getSession(chatId);
  if (!session || session.state === 'IDLE') return false;

  // Check for competing intent — if strong, abort flow
  const { intent, confidence } = classifyIntent(text);
  if (confidence >= 0.8 && intent !== 'UNKNOWN' && intent !== 'LOG_EXPENSE' && intent !== 'LOG_INCOME') {
    await clearSession(chatId);
    return false; // Let the main router handle it
  }

  switch (session.state) {
    case 'AWAITING_AMOUNT':
      return await handleAmountInput(chatId, text, session.data);

    case 'AWAITING_CATEGORY':
      // User typed a category name instead of tapping a button
      await sendMessage(chatId, 'Please tap a category button above, or type a new amount to start over.');
      return true;

    case 'AWAITING_PAYMENT':
      // User typed instead of tapping
      await sendMessage(chatId, 'Please tap a payment method button above.');
      return true;

    case 'AWAITING_CONFIRM':
      await sendMessage(chatId, 'Please tap Confirm or Cancel above.');
      return true;

    default:
      return false;
  }
}

/**
 * Handle amount input during AWAITING_AMOUNT state.
 */
async function handleAmountInput(
  chatId: number,
  text: string,
  data: SessionData
): Promise<boolean> {
  const parsed = parseExpenseMessage(text);

  // Check for bare number
  const bareAmount = text.trim().match(/^[\d,]+(?:\.\d{1,2})?$/);

  if (bareAmount) {
    const amount = parseFloat(bareAmount[0].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0 || amount > 1_000_000) {
      await sendMessage(chatId, 'Please enter a valid amount (1 - 10,00,000).');
      return true;
    }

    // Just a number — ask for category next
    await setSession(chatId, 'AWAITING_CATEGORY', {
      ...data,
      amount,
      description: data.type === 'income' ? 'Income' : 'Expense',
    });

    await sendMessageWithKeyboard(
      chatId,
      `Amount: *${formatINR(amount)}*\n\nPick a category:`,
      buildFlowCategoryKeyboard()
    );
    return true;
  }

  if (parsed) {
    // Full parse with description — if we got a confident category, skip to payment
    const newData: SessionData = {
      ...data,
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category,
      paymentMethod: parsed.paymentMethod,
    };

    if (parsed.category && parsed.confidence >= 0.8) {
      // High-confidence category — skip to payment
      await setSession(chatId, 'AWAITING_PAYMENT', newData);
      await sendMessageWithKeyboard(
        chatId,
        [
          `*${parsed.description}* — ${formatINR(parsed.amount)}`,
          `Category: ${parsed.category}`,
          '',
          'Pick a payment method:',
        ].join('\n'),
        buildFlowPaymentKeyboard()
      );
    } else {
      // No confident category — ask for it
      await setSession(chatId, 'AWAITING_CATEGORY', newData);
      await sendMessageWithKeyboard(
        chatId,
        `*${parsed.description}* — ${formatINR(parsed.amount)}\n\nPick a category:`,
        buildFlowCategoryKeyboard()
      );
    }
    return true;
  }

  // Could not parse
  await sendMessage(chatId, 'Could not parse that. Please enter an amount like `500` or `coffee 250`.');
  return true;
}

// ─── Flow callback handlers ─────────────────────────────────────────

/**
 * Handle flow category selection (fc:<index> callback).
 */
export async function handleFlowCategoryCallback(
  chatId: number,
  indexStr: string,
  messageId: number
): Promise<void> {
  const session = await getSession(chatId);
  if (!session || session.state !== 'AWAITING_CATEGORY') {
    return;
  }

  let category = 'Uncategorized';
  if (indexStr !== 'skip') {
    const idx = parseInt(indexStr, 10);
    const resolved = resolveCategoryIndex(idx);
    if (resolved) category = resolved;
  }

  const newData: SessionData = { ...session.data, category };
  await setSession(chatId, 'AWAITING_PAYMENT', newData);

  const { editMessageText } = await import('@/lib/telegram');
  await editMessageText(
    chatId,
    messageId,
    [
      `*${newData.description || 'Transaction'}* — ${formatINR(newData.amount || 0)}`,
      `Category: ${category}`,
      '',
      'Pick a payment method:',
    ].join('\n'),
    { replyMarkup: buildFlowPaymentKeyboard() }
  );
}

/**
 * Handle flow payment selection (fp:<method> callback).
 * Inserts the transaction and shows confirmation.
 */
export async function handleFlowPaymentCallback(
  chatId: number,
  methodStr: string,
  messageId: number
): Promise<void> {
  const session = await getSession(chatId);
  if (!session || session.state !== 'AWAITING_PAYMENT') {
    return;
  }

  let paymentMethod = 'Other';
  if (methodStr !== 'skip') {
    const resolved = resolvePaymentMethod(methodStr);
    if (resolved) paymentMethod = resolved;
  }

  const data = session.data;
  const userId = data.userId;
  if (!userId) return;

  // Insert transaction
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const txnId = `tg-${crypto.randomUUID()}`;

  const doc = {
    userId,
    txnId,
    date: now,
    description: data.description || (data.type === 'income' ? 'Income' : 'Expense'),
    merchant: '',
    category: data.category || 'Uncategorized',
    amount: data.amount || 0,
    type: data.type || 'expense',
    paymentMethod,
    account: '',
    status: 'completed',
    tags: ['telegram'],
    recurring: false,
    source: 'telegram',
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('transactions').insertOne(doc);

  // Clear the session
  await clearSession(chatId);

  const typeEmoji = data.type === 'income' ? '\u{1F4B0}' : '\u{1F4B8}';
  const typeLabel = data.type === 'income' ? 'Income' : 'Expense';

  const confirmText = [
    `${typeEmoji} *${typeLabel} saved!*\n`,
    `Description: ${data.description || typeLabel}`,
    `Amount: ${formatINR(data.amount || 0)}`,
    `Category: ${data.category || 'Uncategorized'}`,
    `Payment: ${paymentMethod}`,
  ].join('\n');

  const { editMessageText } = await import('@/lib/telegram');
  await editMessageText(chatId, messageId, confirmText, {
    replyMarkup: buildQuickActions('summary'),
  });
}
