/**
 * AI-Powered Transaction Categorization API
 *
 * POST /api/transactions/ai-categorize
 *   Body: { transactionIds?: string[] }
 *   - If transactionIds provided, categorize those specific transactions
 *   - If not provided, find all Uncategorized/Miscellaneous transactions for the user
 *   - Sends batches to Claude AI for categorization
 *   - Caches results in categorization_ai_cache collection
 *   - Returns summary of changes
 */
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getMongoDb } from '@/lib/mongodb';
import { TransactionCategory } from '@/lib/types';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { aiCategorizeBatch, cleanBankText } from '@/lib/categorizer';

const BATCH_SIZE = 50;
const CONFIDENCE_THRESHOLD = 70;
const RULE_CREATION_THRESHOLD = 85;
const VALID_CATEGORIES = Object.values(TransactionCategory);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Build a normalized cache key from merchant + description.
 * Used to avoid repeat AI calls for the same merchant pattern.
 */
function buildCacheKey(merchant: string, description: string): string {
  const normalizedMerchant = cleanBankText(merchant);
  const normalizedDesc = cleanBankText(description);
  return `${normalizedMerchant}::${normalizedDesc}`;
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    let transactionIds: string[] | undefined;

    try {
      const body = await req.json();
      transactionIds = body.transactionIds;
      if (transactionIds !== undefined && !Array.isArray(transactionIds)) {
        return NextResponse.json(
          { success: false, message: 'transactionIds must be an array of strings' },
          { status: 400, headers: corsHeaders() }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400, headers: corsHeaders() }
      );
    }

    try {
      const db = await getMongoDb();
      const txnCollection = db.collection('transactions');
      const cacheCollection = db.collection('categorization_ai_cache');
      const rulesCollection = db.collection('categorization_rules');

      // Find transactions to categorize
      let filter: Record<string, unknown>;
      if (transactionIds && transactionIds.length > 0) {
        const objectIds = transactionIds
          .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
          .map((id) => new ObjectId(id));
        filter = {
          userId: user.userId,
          $or: [
            ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
            { txnId: { $in: transactionIds } },
          ],
        };
      } else {
        filter = {
          userId: user.userId,
          category: { $in: ['Uncategorized', 'Miscellaneous'] },
        };
      }

      const txnDocs = await txnCollection
        .find(filter)
        .sort({ date: -1 })
        .limit(500)
        .toArray();

      if (txnDocs.length === 0) {
        return NextResponse.json(
          { success: true, categorized: 0, results: [], message: 'No transactions to categorize' },
          { status: 200, headers: corsHeaders() }
        );
      }

      // Build cache keys for all transactions and batch-lookup cache
      const txnWithKeys = txnDocs.map((doc) => {
        const merchant = (doc.merchant as string) || '';
        const description = (doc.description as string) || '';
        return {
          doc,
          merchant,
          description,
          cacheKey: buildCacheKey(merchant, description),
          txnId: (doc.txnId as string) || doc._id.toString(),
        };
      });

      const allCacheKeys = [...new Set(txnWithKeys.map((t) => t.cacheKey))];
      const cachedDocs = await cacheCollection
        .find({ cacheKey: { $in: allCacheKeys }, userId: user.userId })
        .toArray();
      const cacheMap = new Map(cachedDocs.map((c) => [c.cacheKey as string, c]));

      // Split into cached vs needs-AI
      const txnsToProcess: Array<{
        _id: string;
        txnId: string;
        merchant: string;
        description: string;
        amount: number;
        type: string;
        date: string;
        oldCategory: string;
        cacheKey: string;
      }> = [];
      const cachedResults: Array<{ id: string; oldCategory: string; newCategory: string; fromCache: boolean }> = [];
      const cachedBulkOps: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown> } }> = [];

      for (const { doc, merchant, description, cacheKey, txnId } of txnWithKeys) {
        const cached = cacheMap.get(cacheKey);
        if (cached && typeof cached.category === 'string' && cached.category !== 'Uncategorized') {
          const oldCategory = (doc.category as string) || 'Uncategorized';
          cachedResults.push({ id: txnId, oldCategory, newCategory: cached.category as string, fromCache: true });
          cachedBulkOps.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { category: cached.category, categoryOverride: false } },
            },
          });
        } else {
          txnsToProcess.push({
            _id: doc._id.toString(),
            txnId,
            merchant,
            description,
            amount: (doc.amount as number) || 0,
            type: (doc.type as string) || 'expense',
            date: doc.date ? new Date(doc.date as string).toISOString().split('T')[0] : '',
            oldCategory: (doc.category as string) || 'Uncategorized',
            cacheKey,
          });
        }
      }

      // Apply cached results in bulk
      if (cachedBulkOps.length > 0) {
        await txnCollection.bulkWrite(cachedBulkOps, { ordered: false });
      }

      // Process remaining transactions in batches via AI
      const aiResults: Array<{ id: string; oldCategory: string; newCategory: string; fromCache: boolean }> = [];

      for (let i = 0; i < txnsToProcess.length; i += BATCH_SIZE) {
        const batch = txnsToProcess.slice(i, i + BATCH_SIZE);

        const aiInput = batch.map((t) => ({
          id: t.txnId,
          merchant: t.merchant,
          description: t.description,
          amount: t.amount,
          type: t.type,
          date: t.date,
        }));

        const batchResults = await aiCategorizeBatch(aiInput, VALID_CATEGORIES, user.userId);
        const resultMap = new Map(batchResults.map((r) => [r.id, r]));

        const txnBulkOps: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown> } }> = [];
        const cacheBulkOps: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert: boolean } }> = [];
        const rulesToCreate: Array<{ pattern: string; category: string; merchant: string }> = [];

        for (const txn of batch) {
          const aiResult = resultMap.get(txn.txnId);
          if (!aiResult || aiResult.category === 'Uncategorized') continue;

          // Skip low-confidence results
          if (aiResult.confidence < CONFIDENCE_THRESHOLD) continue;

          txnBulkOps.push({
            updateOne: {
              filter: { _id: new ObjectId(txn._id) },
              update: { $set: { category: aiResult.category, categoryOverride: false } },
            },
          });

          cacheBulkOps.push({
            updateOne: {
              filter: { cacheKey: txn.cacheKey, userId: user.userId },
              update: {
                $set: {
                  cacheKey: txn.cacheKey,
                  userId: user.userId,
                  category: aiResult.category,
                  confidence: aiResult.confidence,
                  merchant: txn.merchant,
                  description: txn.description,
                  updatedAt: new Date().toISOString(),
                },
                $setOnInsert: { createdAt: new Date().toISOString() },
              },
              upsert: true,
            },
          });

          // Auto-create categorization rule for high-confidence results
          if (aiResult.confidence >= RULE_CREATION_THRESHOLD && txn.merchant.trim()) {
            rulesToCreate.push({
              pattern: cleanBankText(txn.merchant),
              category: aiResult.category,
              merchant: txn.merchant,
            });
          }

          aiResults.push({
            id: txn.txnId,
            oldCategory: txn.oldCategory,
            newCategory: aiResult.category,
            fromCache: false,
          });
        }

        // Execute batch writes
        if (txnBulkOps.length > 0) {
          await txnCollection.bulkWrite(txnBulkOps, { ordered: false });
        }
        if (cacheBulkOps.length > 0) {
          await cacheCollection.bulkWrite(cacheBulkOps, { ordered: false });
        }

        // Create rules (deduped — skip if pattern already exists for this user)
        if (rulesToCreate.length > 0) {
          const existingRules = await rulesCollection
            .find({
              userId: user.userId,
              pattern: { $in: rulesToCreate.map((r) => r.pattern) },
            })
            .toArray();
          const existingPatterns = new Set(existingRules.map((r) => (r.pattern as string).toLowerCase()));

          const newRules = rulesToCreate
            .filter((r) => !existingPatterns.has(r.pattern.toLowerCase()))
            .reduce<Array<{ pattern: string; category: string }>>((acc, r) => {
              // Deduplicate within the batch itself
              if (!acc.some((a) => a.pattern.toLowerCase() === r.pattern.toLowerCase())) {
                acc.push(r);
              }
              return acc;
            }, []);

          if (newRules.length > 0) {
            await rulesCollection.insertMany(
              newRules.map((r) => ({
                userId: user.userId,
                pattern: r.pattern,
                matchField: 'merchant' as const,
                category: r.category,
                caseSensitive: false,
                enabled: true,
                source: 'ai-auto',
                createdAt: new Date().toISOString(),
              }))
            );
          }
        }
      }

      const allResults = [...cachedResults, ...aiResults];

      return NextResponse.json(
        {
          success: true,
          categorized: allResults.length,
          results: allResults,
          total: txnDocs.length,
          fromCache: cachedResults.length,
          fromAi: aiResults.length,
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('AI categorization error:', getErrorMessage(error));
      return NextResponse.json(
        { success: false, message: `AI categorization failed: ${getErrorMessage(error)}` },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

export async function OPTIONS() {
  return handleOptions();
}
