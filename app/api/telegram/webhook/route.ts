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
import { NextRequest, NextResponse, after } from 'next/server';
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
  resolveCategoryIndex,
  formatBudgetStatus,
  formatAiResponse,
} from '@/lib/telegram';
import { parseExpenseMessage } from '@/lib/telegram-parser';
import { processReceiptImage } from '@/lib/telegram-receipt';
import {
  sendAiResponse,
  sendMonthlyReport,
  sendGoalsProgress,
  sendInvestmentSummary,
} from '@/lib/telegram-notifications';
import { fetchAllFinancialData, buildFinancialContext } from '@/lib/financial-context';
import { chatCompletion } from '@/lib/openrouter';

// ─── Dedup: track processed update_ids to reject Telegram retries ───

const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const processedUpdates = new Map<number, number>(); // update_id -> timestamp

function isDuplicate(updateId: number): boolean {
  if (processedUpdates.has(updateId)) return true;
  processedUpdates.set(updateId, Date.now());
  return false;
}

/** Purge stale entries older than TTL. Called on each request. */
function cleanupDedup() {
  const cutoff = Date.now() - DEDUP_TTL_MS;
  for (const [id, ts] of processedUpdates) {
    if (ts < cutoff) processedUpdates.delete(id);
  }
}

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
    '*Account:*',
    '/start - Welcome message',
    '/link `<code>` - Link your account',
    '/unlink - Unlink your account',
    '/help - Show this message\n',
    '*Finance:*',
    '/summary - Today\'s expense summary',
    '/report - Monthly financial report',
    '/budget - Budget status with progress bars',
    '/goals - Savings goals progress',
    '/investments - Portfolio summary\n',
    '*AI:*',
    '/ask `<question>` - Ask about your finances',
    '  _e.g. /ask How much did I spend on food?_\n',
    '*Settings:*',
    '/alerts `on|off` - Toggle proactive alerts\n',
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

// ─── /ask <question> — AI Financial Query ───────────────────────────

const AI_RATE_LIMIT_PER_HOUR = 10;

async function checkAiRateLimit(userId: string): Promise<boolean> {
  const db = await getMongoDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const count = await db.collection('ai_rate_limits').countDocuments({
    userId,
    createdAt: { $gte: oneHourAgo },
  });
  return count < AI_RATE_LIMIT_PER_HOUR;
}

async function recordAiQuery(userId: string): Promise<void> {
  const db = await getMongoDb();
  await db.collection('ai_rate_limits').insertOne({
    userId,
    createdAt: new Date().toISOString(),
  });
}

async function handleAsk(chatId: number, question: string) {
  if (!question.trim()) {
    await sendMessage(chatId, 'Please provide a question.\nUsage: `/ask How much did I spend on food this month?`');
    return;
  }

  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /link to connect your account.');
    return;
  }

  const allowed = await checkAiRateLimit(userId);
  if (!allowed) {
    await sendMessage(chatId, `Rate limit reached (${AI_RATE_LIMIT_PER_HOUR} AI queries/hour). Please try again later.`);
    return;
  }

  await sendMessage(chatId, 'Thinking... 🧠');

  try {
    const db = await getMongoDb();
    const financialData = await fetchAllFinancialData(db, userId);
    const context = buildFinancialContext(financialData);

    const response = await chatCompletion([
      {
        role: 'system',
        content: [
          'You are Finova AI, a personal financial advisor. The user is asking about their finances via Telegram.',
          'Answer concisely (under 2000 characters). Use INR currency. Be specific with numbers from their data.',
          'Format for Telegram Markdown: use *bold* for emphasis, `code` for numbers.',
          '',
          '--- USER FINANCIAL DATA ---',
          context,
        ].join('\n'),
      },
      {
        role: 'user',
        content: question,
      },
    ], { maxTokens: 1500 });

    await recordAiQuery(userId);
    const formatted = formatAiResponse(response);
    await sendAiResponse(chatId, question, formatted);
  } catch (error) {
    console.error('AI query error:', error);
    await sendMessage(chatId, 'Sorry, I could not process your question right now. Please try again later.');
  }
}

// ─── /report — Current Month Financial Report ───────────────────────

async function handleReport(chatId: number) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /link to connect your account.');
    return;
  }

  const db = await getMongoDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Current month transactions
  const transactions = await db
    .collection('transactions')
    .find({ userId, date: { $gte: monthStart } })
    .toArray();

  if (transactions.length === 0) {
    await sendMessage(chatId, `No transactions found for ${monthLabel}.`);
    return;
  }

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

  // Previous month for comparison
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = monthStart;

  const prevTxns = await db
    .collection('transactions')
    .find({ userId, date: { $gte: prevMonthStart, $lt: prevMonthEnd } })
    .toArray();

  let prevIncome = 0;
  let prevExpenses = 0;
  for (const txn of prevTxns) {
    const amount = Math.abs(txn.amount as number);
    if (txn.type === 'income' || txn.type === 'refund') prevIncome += amount;
    else if (txn.type === 'expense') prevExpenses += amount;
  }

  const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
  const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;

  await sendMonthlyReport(chatId, {
    month: monthLabel,
    totalIncome,
    totalExpenses,
    savingsRate,
    topCategories,
    comparedToPrevMonth: { incomeChange, expenseChange },
  });
}

// ─── /budget — Current Budget Status ────────────────────────────────

async function handleBudget(chatId: number) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /link to connect your account.');
    return;
  }

  const db = await getMongoDb();

  const budgetDocs = await db
    .collection('budget_categories')
    .find({ userId })
    .toArray();

  if (budgetDocs.length === 0) {
    await sendMessage(chatId, 'No budget categories set up. Create budgets in the app first.');
    return;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const expenses = await db
    .collection('transactions')
    .find({ userId, date: { $gte: monthStart }, type: 'expense' })
    .toArray();

  const categorySpend: Record<string, number> = {};
  for (const txn of expenses) {
    const cat = (txn.category as string) || 'Uncategorized';
    categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(txn.amount as number);
  }

  const budgets = budgetDocs
    .map((b) => {
      const cat = (b.name as string) || (b.category as string) || 'Unknown';
      const limit = Number(b.budgetAmount) || Number(b.limit) || 0;
      const spent = categorySpend[cat] || 0;
      return { category: cat, spent, limit };
    })
    .filter((b) => b.limit > 0);

  const message = formatBudgetStatus(budgets);
  await sendMessage(chatId, message);
}

// ─── /goals — Savings Goals Progress ────────────────────────────────

async function handleGoals(chatId: number) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /link to connect your account.');
    return;
  }

  const db = await getMongoDb();
  const goals = await db
    .collection('savings_goals')
    .find({ userId })
    .toArray();

  if (goals.length === 0) {
    await sendMessage(chatId, 'No savings goals found. Create goals in the app to track them here.');
    return;
  }

  const goalData = goals.map((g) => ({
    name: (g.name as string) || 'Unnamed Goal',
    current: Number(g.currentAmount) || 0,
    target: Number(g.targetAmount) || 0,
    deadline: g.targetDate
      ? new Date(g.targetDate as string).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'No deadline',
  }));

  await sendGoalsProgress(chatId, goalData);
}

// ─── /investments — Portfolio Summary ───────────────────────────────

async function handleInvestments(chatId: number) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /link to connect your account.');
    return;
  }

  const db = await getMongoDb();

  const [stocks, mutualFunds, sips] = await Promise.all([
    db.collection('stocks').find({ userId }).toArray(),
    db.collection('mutual_funds').find({ userId }).toArray(),
    db.collection('sips').find({ userId, status: 'active' }).toArray(),
  ]);

  if (stocks.length === 0 && mutualFunds.length === 0 && sips.length === 0) {
    await sendMessage(chatId, 'No investments found. Add stocks, mutual funds, or SIPs in the app.');
    return;
  }

  let totalInvested = 0;
  let totalCurrent = 0;

  const stockData = stocks.map((s) => {
    const shares = Number(s.shares) || 0;
    const avgCost = Number(s.averageCost) || 0;
    const currentPrice = Number(s.currentPrice) || avgCost;
    const invested = shares * avgCost;
    const current = shares * currentPrice;
    totalInvested += invested;
    totalCurrent += current;
    return {
      symbol: s.symbol as string,
      value: current,
      returns: current - invested,
    };
  });

  const mfData = mutualFunds.map((mf) => {
    const invested = Number(mf.totalInvested) || (Number(mf.units) || 0) * (Number(mf.averageNAV) || 0);
    const current = Number(mf.currentValue) || (Number(mf.units) || 0) * (Number(mf.currentNAV) || Number(mf.averageNAV) || 0);
    totalInvested += invested;
    totalCurrent += current;
    return {
      name: (mf.name as string) || (mf.fundName as string) || 'Unknown Fund',
      value: current,
      returns: current - invested,
    };
  });

  const sipData = sips.map((s) => ({
    name: s.name as string,
    monthly: Number(s.monthlyAmount) || 0,
  }));

  const totalReturns = totalCurrent - totalInvested;

  await sendInvestmentSummary(chatId, {
    totalInvested,
    totalCurrent,
    totalReturns,
    stocks: stockData,
    mutualFunds: mfData,
    sips: sipData,
  });
}

// ─── /alerts on|off — Toggle Proactive Alerts ───────────────────────

async function handleAlerts(chatId: number, arg: string) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /link to connect your account.');
    return;
  }

  const normalizedArg = arg.trim().toLowerCase();

  if (normalizedArg !== 'on' && normalizedArg !== 'off') {
    await sendMessage(chatId, 'Usage: `/alerts on` or `/alerts off`\n\nThis toggles all proactive notifications (budget alerts, weekly digest, renewal reminders, etc.).');
    return;
  }

  const enabled = normalizedArg === 'on';
  const db = await getMongoDb();

  await db.collection('user_settings').updateOne(
    { userId },
    {
      $set: {
        telegramNotifications: {
          budgetBreach: enabled,
          weeklyDigest: enabled,
          renewalAlert: enabled,
          aiInsights: enabled,
          dailySummary: enabled,
        },
      },
    }
  );

  const statusEmoji = enabled ? '✅' : '🔕';
  await sendMessage(
    chatId,
    `${statusEmoji} Proactive alerts have been turned *${normalizedArg}*.\n\nYou ${enabled ? 'will' : 'will not'} receive budget alerts, weekly digests, renewal reminders, and daily summaries.`
  );
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
  const txnId = `tg-${crypto.randomUUID()}`;

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

/**
 * Schedule receipt processing via next/server `after()`.
 * This keeps the work alive after the webhook response is sent,
 * even in serverless environments like Vercel.
 */
function scheduleReceiptProcessing(chatId: number, fileId: string) {
  after(async () => {
    try {
      await processReceiptInBackground(chatId, fileId);
    } catch (err) {
      console.error('Background receipt processing error:', err);
    }
  });
}

const RECEIPT_DAILY_LIMIT = 10;

async function checkReceiptRateLimit(userId: string): Promise<boolean> {
  const db = await getMongoDb();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const count = await db.collection('transactions').countDocuments({
    userId,
    source: 'telegram-receipt',
    createdAt: { $gte: startOfDay },
  });

  return count < RECEIPT_DAILY_LIMIT;
}

async function processReceiptInBackground(chatId: number, fileId: string) {
  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    await sendMessage(chatId, 'Account not linked. Use /start to learn how to link your account.');
    return;
  }

  // Rate-limit: max 10 receipt scans per day
  const allowed = await checkReceiptRateLimit(userId);
  if (!allowed) {
    await sendMessage(chatId, `Daily receipt scan limit reached (${RECEIPT_DAILY_LIMIT}/day). Try again tomorrow or enter expenses manually.`);
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
    const txnId = `tg-receipt-${crypto.randomUUID()}`;

    const doc = {
      userId,
      txnId,
      date: (() => {
        if (!receipt.date) return now;
        const parsed = new Date(receipt.date);
        return isNaN(parsed.getTime()) ? now : parsed.toISOString();
      })(),
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

  // Verify the user owns the transaction for all callback actions
  const userId = await getUserIdByChatId(chatId);
  if (!userId) return;

  // Category selection: cat:<txnId>:<categoryIndex>
  if (data.startsWith('cat:')) {
    const parts = data.split(':');
    const txnId = parts[1];
    const categoryIndex = parseInt(parts[2], 10);

    if (!ObjectId.isValid(txnId)) return;

    const category = resolveCategoryIndex(categoryIndex);
    if (!category) return;

    await db.collection('transactions').updateOne(
      { _id: new ObjectId(txnId), userId },
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
      { _id: new ObjectId(txnId), userId },
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

    await db.collection('transactions').deleteOne({ _id: new ObjectId(txnId), userId });

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

    // Dedup: reject retried updates from Telegram
    cleanupDedup();
    const updateId: number | undefined = update.update_id;
    if (updateId !== undefined && isDuplicate(updateId)) {
      return NextResponse.json({ ok: true });
    }

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
    } else if (text.startsWith('/ask')) {
      const question = text.replace(/^\/ask(@\w+)?/, '').trim();
      await handleAsk(chatId, question);
    } else if (text.startsWith('/report')) {
      await handleReport(chatId);
    } else if (text.startsWith('/budget')) {
      await handleBudget(chatId);
    } else if (text.startsWith('/goals')) {
      await handleGoals(chatId);
    } else if (text.startsWith('/investments')) {
      await handleInvestments(chatId);
    } else if (text.startsWith('/alerts')) {
      const arg = text.replace(/^\/alerts(@\w+)?/, '').trim();
      await handleAlerts(chatId, arg);
    } else if (message.photo && message.photo.length > 0) {
      // Use the largest photo (last in the array)
      // Fire-and-forget: respond 200 immediately, process receipt in background
      const fileId = message.photo[message.photo.length - 1].file_id;
      scheduleReceiptProcessing(chatId, fileId);
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

export async function GET(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
