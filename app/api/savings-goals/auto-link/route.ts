/**
 * Savings Goals Auto-Link API
 *
 * Scans recent transactions for potential goal contributions and allows
 * the user to confirm (accept) or dismiss suggested links.
 *
 * GET  /api/savings-goals/auto-link
 *   - Scans last 30 days of transactions
 *   - Matches against each active goal's linkedCategories + linkedKeywords
 *   - Also detects round-number income/transfer transactions as potential savings
 *   - Excludes already-linked transaction IDs
 *   - Returns suggestions array
 *
 * POST /api/savings-goals/auto-link
 *   - Body: { goalId, transactionId, amount }
 *   - Increments goal's currentAmount by amount
 *   - Adds transactionId to linkedTransactionIds array
 *   - Returns updated goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';

const GOALS_COLLECTION = 'savings_goals';
const TRANSACTIONS_COLLECTION = 'transactions';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * A single auto-link suggestion returned by the GET endpoint.
 */
interface AutoLinkSuggestion {
  goalId: string;
  goalName: string;
  transactionId: string;
  transactionDesc: string;
  transactionDate: string;
  amount: number;
  matchReason: string;
}

/**
 * Check if a number is "round" — likely an intentional savings amount.
 * Round numbers: divisible by 500 and at least 500.
 */
function isRoundNumber(n: number): boolean {
  return n >= 500 && n % 500 === 0;
}

/**
 * GET /api/savings-goals/auto-link
 * Scan recent transactions for potential goal contributions.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const goalsCol = db.collection(GOALS_COLLECTION);
      const txnCol = db.collection(TRANSACTIONS_COLLECTION);

      // Fetch all active savings goals for the user
      const goalDocs = await goalsCol.find({ userId: user.userId }).toArray();
      if (goalDocs.length === 0) {
        return NextResponse.json(
          { success: true, suggestions: [] },
          { headers: corsHeaders() }
        );
      }

      // Fetch recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTxns = await txnCol
        .find({
          userId: user.userId,
          date: { $gte: thirtyDaysAgo.toISOString() },
        })
        .sort({ date: -1 })
        .limit(500) // Cap to avoid huge scans
        .toArray();

      const suggestions: AutoLinkSuggestion[] = [];

      for (const doc of goalDocs) {
        // Goal is "completed" if currentAmount >= targetAmount — skip it
        if (doc.currentAmount >= doc.targetAmount) continue;

        const goalId = doc._id.toString();
        const goalName = doc.name;
        const categories: string[] = Array.isArray(doc.linkedCategories) ? doc.linkedCategories : [];
        const keywords: string[] = Array.isArray(doc.linkedKeywords) ? doc.linkedKeywords : [];
        const alreadyLinked: string[] = Array.isArray(doc.linkedTransactionIds) ? doc.linkedTransactionIds : [];
        const alreadyLinkedSet = new Set(alreadyLinked);

        // Also check if the goal has any linking config at all
        const hasLinkingConfig = categories.length > 0 || keywords.length > 0;

        for (const txn of recentTxns) {
          const txnId = txn._id.toString();

          // Skip already-linked transactions
          if (alreadyLinkedSet.has(txnId)) continue;

          const txnAmount = Math.abs(txn.amount || 0);
          if (txnAmount === 0) continue;

          const txnCategory = txn.category || '';
          const txnDesc = (txn.description || '').toLowerCase();
          const txnMerchant = (txn.merchant || '').toLowerCase();
          const txnType = (txn.type || '').toLowerCase();

          let matchReason = '';

          // Check 1: Category match
          if (categories.includes(txnCategory)) {
            matchReason = `Category: ${txnCategory}`;
          }

          // Check 2: Keyword match in description/merchant
          if (!matchReason && keywords.length > 0) {
            for (const kw of keywords) {
              const kwLower = kw.toLowerCase();
              if (txnDesc.includes(kwLower) || txnMerchant.includes(kwLower)) {
                matchReason = `Keyword: "${kw}"`;
                break;
              }
            }
          }

          // Check 3: Round-number income/transfer (potential intentional savings)
          // Only suggest this if the goal has linking config and transaction is income/transfer
          if (!matchReason && hasLinkingConfig) {
            if (
              (txnType === 'income' || txnType === 'transfer') &&
              isRoundNumber(txnAmount)
            ) {
              matchReason = `Round amount ${txnType}`;
            }
          }

          if (matchReason) {
            suggestions.push({
              goalId,
              goalName,
              transactionId: txnId,
              transactionDesc: txn.description || txn.merchant || 'Unknown',
              transactionDate: txn.date instanceof Date ? txn.date.toISOString() : String(txn.date),
              amount: txnAmount,
              matchReason,
            });
          }
        }
      }

      return NextResponse.json(
        { success: true, suggestions },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/savings-goals/auto-link:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to scan for auto-link suggestions' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * POST /api/savings-goals/auto-link
 * Confirm a suggested transaction link: increment goal's currentAmount and
 * record the transaction ID to prevent re-suggestion.
 *
 * Body: { goalId: string, transactionId: string, amount: number }
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { goalId, transactionId, amount } = body;

      // Validate inputs
      if (!goalId || typeof goalId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'goalId is required' },
          { status: 400, headers: corsHeaders() }
        );
      }
      if (!transactionId || typeof transactionId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'transactionId is required' },
          { status: 400, headers: corsHeaders() }
        );
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { success: false, error: 'amount must be a positive number' },
          { status: 400, headers: corsHeaders() }
        );
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(goalId);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid goalId' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();
      const goalsCol = db.collection(GOALS_COLLECTION);

      const now = new Date().toISOString();

      const result = await goalsCol.findOneAndUpdate(
        { _id: objectId, userId: user.userId },
        {
          $inc: { currentAmount: amount },
          $addToSet: { linkedTransactionIds: transactionId },
          $set: { updatedAt: now },
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Savings goal not found' },
          { status: 404, headers: corsHeaders() }
        );
      }

      return NextResponse.json(
        {
          success: true,
          goal: {
            id: result._id.toString(),
            name: result.name,
            currentAmount: result.currentAmount,
            targetAmount: result.targetAmount,
            linkedTransactionIds: Array.isArray(result.linkedTransactionIds)
              ? result.linkedTransactionIds
              : [],
          },
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/savings-goals/auto-link:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to confirm auto-link' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
