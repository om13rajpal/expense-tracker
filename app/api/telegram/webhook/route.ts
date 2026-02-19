/**
 * Telegram Webhook Handler
 *
 * Public route (no auth middleware). Verifies requests using
 * the X-Telegram-Bot-Api-Secret-Token header.
 *
 * Handles: /start, /link, /unlink, /help, /summary,
 * text messages (expense entry), photos (receipt scan),
 * and callback queries (inline keyboard presses).
 */
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { formatINR } from '@/lib/format';
import {
  sendMessage,
  sendMessageWithKeyboard,
  buildCategoryKeyboard,
  buildConfirmKeyboard,
  getFileUrl,
  callTelegramAPI,
} from '@/lib/telegram';
import { parseExpenseMessage } from '@/lib/telegram-parser';
import { processReceiptImage } from '@/lib/telegram-receipt';

// ─── Helpers ────────────────────────────────────────────────────────

function verifySecret(request: NextRequest): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false;
  return request.headers.get('x-telegram-bot-api-secret-token') === secret;
}

async function getUserIdByChatId(chatId: number): Promise<string | null> {
  const db = await getMongoDb();
  const doc = await db.collection('user_settings').findOne({ telegramChatId: chatId });
  return doc ? (doc.userId as string) : null;
}

// ─── Command Handlers ───────────────────────────────────────────────

async function handleStart(chatId: number) {
  const text = [
    '*Welcome to Expense Tracker Bot!* 🎉\n',
    'I can help you track expenses, scan receipts, and send you daily summaries.\n',
    '*How to link your account:*',
    '1. Go to Settings in the app',
    '2. Click "Link Telegram"',
    '3. Send `/link <code>` here\n',
    '*Quick expense entry:*',
    'Just type something like:',
    '  `Coffee 250`',
    '  `Uber 350 transport`',
    '  `Salary 50000 income`\n',
    '*Send a receipt photo* to auto-extract expenses.\n',
    'Type /help to see all commands.',
  ].join('\n');

  await sendMessage(chatId, text);
}

async function handleLink(chatId: number, code: string, username?: string) {
  if (!code || code.length !== 6) {
    await sendMessage(chatId, 'Please provide a valid 6-digit code.\nUsage: `/link 123456`');
    return;
  }

  const db = await getMongoDb();
  const tokenDoc = await db.collection('telegram_link_tokens').findOne({ code });

  if (!tokenDoc) {
    await sendMessage(chatId, 'Invalid or expired code. Please generate a new one from Settings.');
    return;
  }

  const userId = tokenDoc.userId as string;

  // Check if this chatId is already linked to another account
  const existing = await db.collection('user_settings').findOne({
    telegramChatId: chatId,
    userId: { $ne: userId },
  });
  if (existing) {
    await sendMessage(chatId, 'This Telegram account is already linked to a different user. Unlink it first with /unlink.');
    return;
  }

  // Save chatId in user_settings
  await db.collection('user_settings').updateOne(
    { userId },
    {
      $set: {
        telegramChatId: chatId,
        telegramUsername: username || null,
        telegramLinkedAt: new Date().toISOString(),
        telegramNotifications: {
          budgetBreach: true,
          weeklyDigest: true,
          renewalAlert: true,
          aiInsights: true,
          dailySummary: true,
        },
      },
      $setOnInsert: { userId, createdAt: new Date().toISOString() },
    },
    { upsert: true }
  );

  // Delete the used token
  await db.collection('telegram_link_tokens').deleteOne({ _id: tokenDoc._id });

  await sendMessage(
    chatId,
    "Account linked successfully! You can now:\n- Send expenses like `Coffee 250`\n- Send receipt photos\n- Get daily summaries\n\nType /help to see all commands."
  );
}

async function handleUnlink(chatId: number) {
  const db = await getMongoDb();
  const result = await db.collection('user_settings').updateOne(
    { telegramChatId: chatId },
    {
      $unset: {
        telegramChatId: '',
        telegramUsername: '',
        telegramLinkedAt: '',
      },
    }
  );

  if (result.modifiedCount > 0) {
    await sendMessage(chatId, 'Account unlinked. You can link again from Settings.');
  } else {
    await sendMessage(chatId, 'No linked account found for this chat.');
  }
}

async function handleHelp(chatId: number) {
  const text = [
    '*Available Commands:*\n',
    '/start - Welcome message',
    '/link `<code>` - Link your account',
    '/unlink - Unlink your account',
    '/summary - Today\'s expense summary',
    '/help - Show this message\n',
    '*Quick Entry:*',
    '`Coffee 250` - Log an expense',
    '`250 Coffee` - Also works',
    '`Salary 50000 income` - Log income',
    '`Uber 350 transport` - With category hint\n',
    '*Receipt Scan:*',
    'Send a photo of a receipt to auto-extract expenses.',
  ].join('\n');

  await sendMessage(chatId, text);
}

async function handleSummary(chatId: number) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /link to connect your account.');
    return;
  }

  const db = await getMongoDb();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const transactions = await db
    .collection('transactions')
    .find({ userId, date: { $gte: startOfDay, $lt: endOfDay } })
    .toArray();

  if (transactions.length === 0) {
    await sendMessage(chatId, 'No transactions recorded today.');
    return;
  }

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

  const { formatDailySummaryMessage } = await import('@/lib/telegram');
  const message = formatDailySummaryMessage({
    totalIncome,
    totalExpenses,
    topCategories,
    transactionCount: transactions.length,
    date: dateStr,
  });

  await sendMessage(chatId, message);
}

// ─── Text Message Handler (Expense entry) ───────────────────────────

async function handleTextMessage(chatId: number, text: string) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /start to learn how to link your account.');
    return;
  }

  const parsed = parseExpenseMessage(text);
  if (!parsed) {
    await sendMessage(
      chatId,
      'Could not parse that message. Try formats like:\n`Coffee 250`\n`Uber 350 transport`\n`Salary 50000 income`'
    );
    return;
  }

  // Insert transaction into MongoDB
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const txnId = `tg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const doc = {
    userId,
    txnId,
    date: now,
    description: parsed.description,
    merchant: '',
    category: parsed.category || 'Uncategorized',
    amount: parsed.amount,
    type: parsed.type,
    paymentMethod: parsed.paymentMethod || 'Other',
    account: '',
    status: 'completed',
    tags: ['telegram'],
    recurring: false,
    source: 'telegram',
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('transactions').insertOne(doc);
  const insertedId = result.insertedId.toString();

  const typeEmoji = parsed.type === 'income' ? '💰' : '💸';
  const confirmText = [
    `${typeEmoji} *${parsed.type === 'income' ? 'Income' : 'Expense'} recorded!*\n`,
    `Description: ${parsed.description}`,
    `Amount: ${formatINR(parsed.amount)}`,
    `Category: ${parsed.category || 'Uncategorized'}`,
    parsed.paymentMethod ? `Payment: ${parsed.paymentMethod}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (parsed.type === 'expense') {
    await sendMessageWithKeyboard(
      chatId,
      confirmText + '\n\n_Wrong category? Tap to change:_',
      buildCategoryKeyboard(insertedId)
    );
  } else {
    await sendMessage(chatId, confirmText);
  }
}

// ─── Photo Handler (Receipt scan) ───────────────────────────────────

async function handlePhoto(chatId: number, fileId: string) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /start to learn how to link your account.');
    return;
  }

  await sendMessage(chatId, 'Scanning receipt... 🔍');

  const fileUrl = await getFileUrl(fileId);
  if (!fileUrl) {
    await sendMessage(chatId, 'Could not download the photo. Please try again.');
    return;
  }

  try {
    const receipt = await processReceiptImage(fileUrl);

    if (receipt.amount <= 0) {
      await sendMessage(chatId, 'Could not extract expense details from this receipt. Try a clearer photo or enter manually.');
      return;
    }

    // Store as a pending receipt transaction
    const db = await getMongoDb();
    const now = new Date().toISOString();
    const txnId = `tg-receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const doc = {
      userId,
      txnId,
      date: receipt.date ? new Date(receipt.date).toISOString() : now,
      description: receipt.merchant,
      merchant: receipt.merchant,
      category: receipt.category || 'Uncategorized',
      amount: receipt.amount,
      type: 'expense',
      paymentMethod: 'Other',
      account: '',
      status: 'pending_confirmation',
      tags: ['telegram', 'receipt'],
      recurring: false,
      source: 'telegram-receipt',
      receiptItems: receipt.items,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('transactions').insertOne(doc);
    const insertedId = result.insertedId.toString();

    const lines = [
      '🧾 *Receipt Scanned*\n',
      `Merchant: ${receipt.merchant}`,
      `Amount: ${formatINR(receipt.amount)}`,
      `Category: ${receipt.category || 'Uncategorized'}`,
      receipt.date ? `Date: ${receipt.date}` : '',
      receipt.items.length > 0 ? `\nItems: ${receipt.items.join(', ')}` : '',
      `\nConfidence: ${Math.round(receipt.confidence * 100)}%`,
    ]
      .filter(Boolean)
      .join('\n');

    await sendMessageWithKeyboard(
      chatId,
      lines,
      buildConfirmKeyboard(insertedId)
    );
  } catch (error) {
    console.error('Receipt processing error:', error);
    await sendMessage(chatId, 'Failed to process receipt. Please try again or enter manually.');
  }
}

// ─── Callback Query Handler ─────────────────────────────────────────

async function handleCallbackQuery(callbackQuery: {
  id: string;
  data?: string;
  message?: { chat: { id: number }; message_id: number };
}) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message?.chat.id;
  if (!data || !chatId) return;

  // Acknowledge the callback
  await callTelegramAPI('answerCallbackQuery', { callback_query_id: callbackQuery.id });

  const db = await getMongoDb();

  // Category selection: cat:<txnId>:<category>
  if (data.startsWith('cat:')) {
    const parts = data.split(':');
    const txnId = parts[1];
    const category = parts.slice(2).join(':'); // category may contain colons

    if (!ObjectId.isValid(txnId)) return;

    await db.collection('transactions').updateOne(
      { _id: new ObjectId(txnId) },
      { $set: { category, updatedAt: new Date().toISOString() } }
    );

    // Edit the original message to reflect the change
    await callTelegramAPI('editMessageText', {
      chat_id: chatId,
      message_id: callbackQuery.message!.message_id,
      text: `Category updated to *${category}*`,
      parse_mode: 'Markdown',
    });
    return;
  }

  // Receipt confirmation: receipt_confirm:<txnId>
  if (data.startsWith('receipt_confirm:')) {
    const txnId = data.replace('receipt_confirm:', '');
    if (!ObjectId.isValid(txnId)) return;

    await db.collection('transactions').updateOne(
      { _id: new ObjectId(txnId) },
      { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
    );

    await callTelegramAPI('editMessageText', {
      chat_id: chatId,
      message_id: callbackQuery.message!.message_id,
      text: 'Receipt expense confirmed and saved!',
      parse_mode: 'Markdown',
    });
    return;
  }

  // Receipt cancellation: receipt_cancel:<txnId>
  if (data.startsWith('receipt_cancel:')) {
    const txnId = data.replace('receipt_cancel:', '');
    if (!ObjectId.isValid(txnId)) return;

    await db.collection('transactions').deleteOne({ _id: new ObjectId(txnId) });

    await callTelegramAPI('editMessageText', {
      chat_id: chatId,
      message_id: callbackQuery.message!.message_id,
      text: 'Receipt expense cancelled.',
      parse_mode: 'Markdown',
    });
    return;
  }
}

// ─── Route Handlers ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update = await request.json();

    // Handle callback queries (inline keyboard presses)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId: number = message.chat.id;
    const text: string = message.text || '';
    const username: string | undefined = message.from?.username;

    // Handle commands
    if (text.startsWith('/start')) {
      await handleStart(chatId);
    } else if (text.startsWith('/link')) {
      const code = text.replace('/link', '').trim();
      await handleLink(chatId, code, username);
    } else if (text.startsWith('/unlink')) {
      await handleUnlink(chatId);
    } else if (text.startsWith('/help')) {
      await handleHelp(chatId);
    } else if (text.startsWith('/summary')) {
      await handleSummary(chatId);
    } else if (message.photo && message.photo.length > 0) {
      // Use the largest photo (last in the array)
      const fileId = message.photo[message.photo.length - 1].file_id;
      await handlePhoto(chatId, fileId);
    } else if (text && !text.startsWith('/')) {
      // Natural language expense entry
      await handleTextMessage(chatId, text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
