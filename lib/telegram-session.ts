/**
 * MongoDB-backed conversation session state machine for Telegram bot.
 *
 * Sessions track multi-step flows (e.g. guided expense entry) and expire
 * after 10 minutes of inactivity via a MongoDB TTL index.
 *
 * @module lib/telegram-session
 */

import { getMongoDb } from '@/lib/mongodb';

export type SessionState =
  | 'IDLE'
  | 'AWAITING_AMOUNT'
  | 'AWAITING_CATEGORY'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_CONFIRM';

export interface SessionData {
  /** Transaction type being logged. */
  type?: 'expense' | 'income';
  /** Parsed amount. */
  amount?: number;
  /** Description text. */
  description?: string;
  /** Selected category. */
  category?: string;
  /** Selected payment method. */
  paymentMethod?: string;
  /** MongoDB ObjectId of the inserted transaction (if already created). */
  txnId?: string;
  /** userId for the session owner. */
  userId?: string;
}

export interface Session {
  chatId: number;
  state: SessionState;
  data: SessionData;
  updatedAt: Date;
}

/**
 * Get the active session for a chat, or null if none/expired.
 */
export async function getSession(chatId: number): Promise<Session | null> {
  const db = await getMongoDb();
  const doc = await db.collection('telegram_sessions').findOne({ chatId });
  if (!doc) return null;
  return {
    chatId: doc.chatId as number,
    state: doc.state as SessionState,
    data: (doc.data as SessionData) || {},
    updatedAt: doc.updatedAt as Date,
  };
}

/**
 * Create or update a session for a chat.
 */
export async function setSession(
  chatId: number,
  state: SessionState,
  data: SessionData = {}
): Promise<void> {
  const db = await getMongoDb();
  await db.collection('telegram_sessions').updateOne(
    { chatId },
    { $set: { chatId, state, data, updatedAt: new Date() } },
    { upsert: true }
  );
}

/**
 * Clear (delete) the session for a chat.
 */
export async function clearSession(chatId: number): Promise<void> {
  const db = await getMongoDb();
  await db.collection('telegram_sessions').deleteOne({ chatId });
}
