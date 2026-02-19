/**
 * Shared transaction persistence logic for syncing Google Sheets data into MongoDB.
 *
 * Used by:
 *  - GET /api/transactions (initial seed from sheets cache)
 *  - GET /api/cron/sync (periodic cron sync)
 *  - GET /api/sheets/sync (manual sheet sync)
 *  - inngest/sync.ts (daily scheduled sync)
 *
 * Handles:
 *  - Upserting transactions using txnId as dedup key
 *  - Preserving categories of ALL existing transactions (not just overrides)
 *  - Applying user categorization rules + budget category mapping for NEW transactions only
 *  - To re-apply rules to existing transactions, use POST /api/transactions/recategorize
 */
import { getMongoDb } from '@/lib/mongodb';
import { buildReverseCategoryMap, mapToBudgetCategory } from '@/lib/budget-mapping';
import type { Transaction, TransactionCategory } from '@/lib/types';

export interface PersistResult {
  upsertedCount: number;
  modifiedCount: number;
  total: number;
}

/**
 * Persist an array of parsed transactions into MongoDB for a given user.
 *
 * Category handling:
 *  - Existing transactions: category is NEVER changed (whether override or not).
 *    Use /api/transactions/recategorize to re-apply rules.
 *  - New transactions: user rules applied, then mapped to budget category names.
 *  - Uses bulkWrite with unordered ops for performance.
 */
export async function persistTransactions(
  userId: string,
  transactions: Transaction[]
): Promise<PersistResult> {
  if (!transactions.length) {
    return { upsertedCount: 0, modifiedCount: 0, total: 0 };
  }

  const db = await getMongoDb();
  const col = db.collection('transactions');

  // Load user categorization rules for NEW transactions
  const rules = await db
    .collection('categorization_rules')
    .find({ userId, enabled: true })
    .toArray();

  // Load budget categories for mapping raw categories to budget names
  const budgetDocs = await db
    .collection('budget_categories')
    .find({ userId })
    .toArray();

  const reverseMap = buildReverseCategoryMap(
    budgetDocs.map(d => ({
      name: d.name as string,
      transactionCategories: (d.transactionCategories || []) as string[],
    }))
  );
  const budgetNames = new Set(budgetDocs.map(d => d.name as string));

  // Check which incoming txnIds already exist (avoids loading entire table)
  const incomingIds = transactions.map((t) => t.id);
  const existingDocs = await col
    .find({ userId, txnId: { $in: incomingIds } }, { projection: { txnId: 1 } })
    .toArray();
  const existingIds = new Set(existingDocs.map((d) => d.txnId as string));

  const ops = transactions.map((txn) => {
    const dateStr =
      txn.date instanceof Date ? txn.date.toISOString() : String(txn.date);
    const now = new Date().toISOString();

    const baseFields: Record<string, unknown> = {
      date: dateStr,
      description: txn.description,
      merchant: txn.merchant,
      amount: txn.amount,
      type: txn.type,
      paymentMethod: txn.paymentMethod,
      account: txn.account,
      status: txn.status,
      tags: txn.tags,
      recurring: txn.recurring,
      balance: txn.balance,
      sequence: txn.sequence,
      updatedAt: now,
    };

    // EXISTING transaction — never touch the category (whether override or not)
    if (existingIds.has(txn.id)) {
      return {
        updateOne: {
          filter: { userId, txnId: txn.id },
          update: { $set: baseFields },
          upsert: false,
        },
      };
    }

    // NEW transaction — apply user rules, then map to budget category
    let category: string = txn.category;
    for (const rule of rules) {
      const pattern = rule.pattern as string;
      const matchField = rule.matchField as string;
      const caseSensitive = rule.caseSensitive === true;

      let text = '';
      if (matchField === 'merchant') text = txn.merchant || '';
      else if (matchField === 'description') text = txn.description || '';
      else text = `${txn.merchant || ''} ${txn.description || ''}`;

      const haystack = caseSensitive ? text : text.toLowerCase();
      const needle = caseSensitive ? pattern : pattern.toLowerCase();

      if (haystack.includes(needle)) {
        category = rule.category as string;
        break;
      }
    }

    // Map raw category to budget category name (e.g., "Dining" -> "Food & Dining")
    if (budgetDocs.length > 0) {
      category = mapToBudgetCategory(category, reverseMap, budgetNames);
    }

    return {
      updateOne: {
        filter: { userId, txnId: txn.id },
        update: {
          $set: {
            userId,
            txnId: txn.id,
            ...baseFields,
            category,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await col.bulkWrite(ops, { ordered: false });
  return {
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
    total: result.upsertedCount + result.modifiedCount,
  };
}
