/**
 * Savings Goals API endpoints
 * CRUD operations for user savings goals with progress calculations.
 * Supports auto-contribution linking via linkedCategories and linkedKeywords.
 *
 * GET    - List all goals with computed progress + auto-linked contributions
 * POST   - Create a new savings goal
 * PUT    - Update an existing goal (or increment currentAmount via addAmount)
 * DELETE - Delete a goal by query param ?id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { calculateGoalProgress } from '@/lib/savings-goals';
import type { SavingsGoalConfig, LinkedTransaction, SavingsGoalProgress } from '@/lib/types';

const COLLECTION = 'savings_goals';
const TRANSACTIONS_COLLECTION = 'transactions';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Compute auto-linked contributions for a goal by scanning transactions.
 * Matches transactions where:
 *   - category is in linkedCategories, OR
 *   - description or merchant contains any keyword (case-insensitive)
 * Only considers transactions within the goal's creation date to target date.
 */
async function computeAutoLinkedContributions(
  goal: SavingsGoalConfig,
  db: Awaited<ReturnType<typeof getMongoDb>>
): Promise<{ autoLinkedAmount: number; linkedTransactions: LinkedTransaction[] }> {
  const categories = goal.linkedCategories || [];
  const keywords = goal.linkedKeywords || [];

  // If no linking config, skip the query
  if (categories.length === 0 && keywords.length === 0) {
    return { autoLinkedAmount: 0, linkedTransactions: [] };
  }

  // Build date range: from goal creation to target date (or now, whichever is earlier)
  const startDate = new Date(goal.createdAt);
  const targetDate = new Date(goal.targetDate);
  const now = new Date();
  const endDate = targetDate < now ? targetDate : now;

  // Build MongoDB query: category match OR keyword match in description/merchant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orConditions: any[] = [];

  if (categories.length > 0) {
    orConditions.push({ category: { $in: categories } });
  }

  if (keywords.length > 0) {
    // Build regex patterns for keyword matching (case-insensitive)
    const keywordPatterns = keywords.map((kw) => new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    orConditions.push({ description: { $in: keywordPatterns } });
    orConditions.push({ merchant: { $in: keywordPatterns } });
  }

  const col = db.collection(TRANSACTIONS_COLLECTION);
  const transactions = await col
    .find({
      userId: goal.userId,
      date: { $gte: startDate, $lte: endDate },
      $or: orConditions,
      // Only consider expense/transfer/investment types that represent money going out
      // towards savings -- we use amount > 0 to catch credit entries, but since savings
      // transactions are typically stored as positive amounts in their category, we
      // don't filter by type
    })
    .sort({ date: -1 })
    .limit(100) // Cap at 100 transactions to avoid huge payloads
    .toArray();

  let autoLinkedAmount = 0;
  const linkedTransactions: LinkedTransaction[] = [];

  for (const txn of transactions) {
    const amount = Math.abs(txn.amount || 0);
    if (amount === 0) continue;

    // Determine match reason
    let matchReason = '';
    const txnCategory = txn.category || '';
    const txnDesc = (txn.description || '').toLowerCase();
    const txnMerchant = (txn.merchant || '').toLowerCase();

    if (categories.includes(txnCategory)) {
      matchReason = `Category: ${txnCategory}`;
    } else {
      // Check keywords
      for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        if (txnDesc.includes(kwLower) || txnMerchant.includes(kwLower)) {
          matchReason = `Keyword: ${kw}`;
          break;
        }
      }
    }

    if (!matchReason) continue; // Safety: skip if no match (shouldn't happen)

    autoLinkedAmount += amount;
    linkedTransactions.push({
      id: txn._id.toString(),
      date: txn.date instanceof Date ? txn.date.toISOString() : String(txn.date),
      amount,
      description: txn.description || txn.merchant || 'Unknown',
      matchReason,
    });
  }

  return { autoLinkedAmount, linkedTransactions };
}

/**
 * GET /api/savings-goals
 * Retrieve all savings goals for the authenticated user, enriched with progress data
 * and auto-linked contribution amounts.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      const docs = await col.find({ userId: user.userId }).toArray();

      const goals: SavingsGoalProgress[] = await Promise.all(
        docs.map(async (doc) => {
          const goal: SavingsGoalConfig = {
            id: doc._id.toString(),
            userId: doc.userId,
            name: doc.name,
            targetAmount: doc.targetAmount,
            currentAmount: doc.currentAmount,
            targetDate: doc.targetDate,
            monthlyContribution: doc.monthlyContribution,
            autoTrack: doc.autoTrack,
            category: doc.category,
            linkedCategories: Array.isArray(doc.linkedCategories) ? doc.linkedCategories : [],
            linkedKeywords: Array.isArray(doc.linkedKeywords) ? doc.linkedKeywords : [],
            linkedTransactionIds: Array.isArray(doc.linkedTransactionIds) ? doc.linkedTransactionIds : [],
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          };

          const progress = calculateGoalProgress(goal);

          // Compute auto-linked contributions if the goal has linking config
          const hasLinks =
            (goal.linkedCategories && goal.linkedCategories.length > 0) ||
            (goal.linkedKeywords && goal.linkedKeywords.length > 0);

          if (hasLinks) {
            const { autoLinkedAmount, linkedTransactions } =
              await computeAutoLinkedContributions(goal, db);
            return {
              ...progress,
              autoLinkedAmount,
              linkedTransactions,
            };
          }

          return { ...progress, autoLinkedAmount: 0, linkedTransactions: [] };
        })
      );

      return NextResponse.json(
        { success: true, goals },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/savings-goals:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load savings goals' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * POST /api/savings-goals
 * Create a new savings goal.
 * Body: { name, targetAmount, targetDate, monthlyContribution?, currentAmount?,
 *         autoTrack?, category?, linkedCategories?, linkedKeywords? }
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const {
        name,
        targetAmount,
        targetDate,
        monthlyContribution,
        currentAmount,
        autoTrack,
        category,
        linkedCategories,
        linkedKeywords,
      } = body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Name is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Target amount must be a positive number' },
          { status: 400, headers: corsHeaders() }
        );
      }

      if (!targetDate || isNaN(Date.parse(targetDate))) {
        return NextResponse.json(
          { success: false, error: 'Target date must be a valid ISO date' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const now = new Date().toISOString();

      const doc = {
        userId: user.userId,
        name: name.trim(),
        targetAmount,
        currentAmount:
          typeof currentAmount === 'number' && currentAmount >= 0
            ? currentAmount
            : 0,
        targetDate,
        monthlyContribution:
          typeof monthlyContribution === 'number' && monthlyContribution >= 0
            ? monthlyContribution
            : 0,
        autoTrack: typeof autoTrack === 'boolean' ? autoTrack : false,
        ...(category && typeof category === 'string'
          ? { category: category.trim() }
          : {}),
        linkedCategories: Array.isArray(linkedCategories)
          ? linkedCategories.filter((c: unknown) => typeof c === 'string')
          : [],
        linkedKeywords: Array.isArray(linkedKeywords)
          ? linkedKeywords.filter((k: unknown) => typeof k === 'string' && k.trim().length > 0)
          : [],
        linkedTransactionIds: [],
        createdAt: now,
        updatedAt: now,
      };

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);
      const result = await col.insertOne(doc);

      return NextResponse.json(
        {
          success: true,
          goal: { ...doc, id: result.insertedId.toString() },
        },
        { status: 201, headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/savings-goals:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create savings goal' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * PUT /api/savings-goals
 * Update an existing savings goal.
 * Body: { id, ...fields }
 * If `addAmount` (number) is provided, currentAmount is incremented instead of replaced.
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { id, addAmount, ...fields } = body;

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Goal id is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid goal id' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateOps: Record<string, any> = {};

      // Build $set from allowed fields
      const allowedFields = [
        'name',
        'targetAmount',
        'currentAmount',
        'targetDate',
        'monthlyContribution',
        'autoTrack',
        'category',
        'linkedCategories',
        'linkedKeywords',
        'linkedTransactionIds',
      ];

      const setFields: Record<string, unknown> = { updatedAt: now };
      for (const key of allowedFields) {
        if (fields[key] !== undefined) {
          // Validate array fields
          if (key === 'linkedCategories' || key === 'linkedKeywords' || key === 'linkedTransactionIds') {
            if (Array.isArray(fields[key])) {
              setFields[key] = fields[key].filter((v: unknown) => typeof v === 'string');
            }
          } else {
            setFields[key] = fields[key];
          }
        }
      }
      updateOps.$set = setFields;

      // If addAmount is provided, increment currentAmount instead of setting it
      if (typeof addAmount === 'number' && addAmount !== 0) {
        updateOps.$inc = { currentAmount: addAmount };
        // Remove currentAmount from $set to avoid conflict
        delete setFields.currentAmount;
      }

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      const result = await col.findOneAndUpdate(
        { _id: objectId, userId: user.userId },
        updateOps,
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Savings goal not found' },
          { status: 404, headers: corsHeaders() }
        );
      }

      const goal: SavingsGoalConfig = {
        id: result._id.toString(),
        userId: result.userId,
        name: result.name,
        targetAmount: result.targetAmount,
        currentAmount: result.currentAmount,
        targetDate: result.targetDate,
        monthlyContribution: result.monthlyContribution,
        autoTrack: result.autoTrack,
        category: result.category,
        linkedCategories: Array.isArray(result.linkedCategories) ? result.linkedCategories : [],
        linkedKeywords: Array.isArray(result.linkedKeywords) ? result.linkedKeywords : [],
        linkedTransactionIds: Array.isArray(result.linkedTransactionIds) ? result.linkedTransactionIds : [],
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return NextResponse.json(
        { success: true, goal },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in PUT /api/savings-goals:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update savings goal' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * DELETE /api/savings-goals?id=xxx
 * Delete a savings goal by id (query param).
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Goal id is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid goal id' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      const result = await col.deleteOne({
        _id: objectId,
        userId: user.userId,
      });

      return NextResponse.json(
        { success: true, deletedCount: result.deletedCount },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in DELETE /api/savings-goals:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete savings goal' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
