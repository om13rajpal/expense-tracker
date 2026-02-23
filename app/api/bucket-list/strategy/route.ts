/**
 * Bucket List AI Strategy API
 * Generates personalized savings strategies using OpenRouter (Claude).
 *
 * POST /api/bucket-list/strategy
 * Body: { itemId: string }
 *
 * - Fetches the bucket list item and user's financial context
 * - Generates a tailored savings strategy via chatCompletion
 * - Rate limited: 10 requests/hour/user
 * - Saves the strategy to the bucket list document
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { chatCompletion } from '@/lib/openrouter';
import { checkRateLimit } from '@/lib/rate-limit';

const BUCKET_COLLECTION = 'bucket_list';
const TRANSACTIONS_COLLECTION = 'transactions';
const RATE_LIMIT_ACTION = 'bucket_list_strategy';
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/bucket-list/strategy
 * Generate a personalized AI savings strategy for a specific bucket list item.
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { itemId } = body;

      if (!itemId || typeof itemId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'itemId is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(itemId);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid itemId' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();

      // Rate limit check
      const allowed = await checkRateLimit(
        db,
        user.userId,
        RATE_LIMIT_ACTION,
        RATE_LIMIT_MAX,
        RATE_LIMIT_WINDOW
      );
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Max 10 strategy requests per hour.' },
          { status: 429, headers: corsHeaders() }
        );
      }

      // Fetch the bucket list item
      const bucketCol = db.collection(BUCKET_COLLECTION);
      const item = await bucketCol.findOne({ _id: objectId, userId: user.userId });

      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Bucket list item not found' },
          { status: 404, headers: corsHeaders() }
        );
      }

      // Build financial context from recent transactions
      const txnCol = db.collection(TRANSACTIONS_COLLECTION);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentTxns = await txnCol
        .find({
          userId: user.userId,
          date: { $gte: threeMonthsAgo.toISOString() },
        })
        .toArray();

      let totalIncome = 0;
      let totalExpenses = 0;
      for (const txn of recentTxns) {
        const amount = Math.abs(txn.amount as number);
        if (txn.type === 'income') {
          totalIncome += amount;
        } else if (txn.type === 'expense') {
          totalExpenses += amount;
        }
      }

      const monthlyIncome = totalIncome / 3;
      const monthlyExpenses = totalExpenses / 3;
      const monthlySavings = monthlyIncome - monthlyExpenses;
      const savingsRate = monthlyIncome > 0 ? ((monthlySavings / monthlyIncome) * 100).toFixed(1) : '0';

      // Build context for the AI
      const remaining = item.targetAmount - item.savedAmount;
      const progress = item.targetAmount > 0
        ? ((item.savedAmount / item.targetAmount) * 100).toFixed(1)
        : '0';

      const financialContext = [
        `## User's Financial Profile (3-month average)`,
        `- Monthly Income: Rs.${Math.round(monthlyIncome).toLocaleString('en-IN')}`,
        `- Monthly Expenses: Rs.${Math.round(monthlyExpenses).toLocaleString('en-IN')}`,
        `- Monthly Savings: Rs.${Math.round(monthlySavings).toLocaleString('en-IN')}`,
        `- Savings Rate: ${savingsRate}%`,
        ``,
        `## Bucket List Item`,
        `- Name: ${item.name}`,
        `- Category: ${item.category}`,
        `- Priority: ${item.priority}`,
        `- Target Amount: Rs.${item.targetAmount.toLocaleString('en-IN')}`,
        `- Already Saved: Rs.${item.savedAmount.toLocaleString('en-IN')} (${progress}%)`,
        `- Remaining: Rs.${remaining.toLocaleString('en-IN')}`,
        `- Monthly Allocation: Rs.${(item.monthlyAllocation || 0).toLocaleString('en-IN')}`,
        item.targetDate ? `- Target Date: ${item.targetDate}` : '',
        item.description ? `- Description: ${item.description}` : '',
      ].filter(Boolean).join('\n');

      const strategy = await chatCompletion(
        [
          {
            role: 'system',
            content: `You are a personal finance advisor for an Indian consumer. Generate a personalized, actionable savings strategy in Markdown format.

Your strategy should include:
1. **Timeline Assessment** - Realistic timeline to reach the goal based on current savings capacity
2. **Monthly Savings Plan** - Suggested monthly allocation (considering existing finances)
3. **Smart Saving Tips** - 3-4 specific tips to save faster for this particular item/category
4. **Price Optimization** - Suggestions for getting the best deal (timing, alternatives, cashback, etc.)
5. **Risk Assessment** - Any considerations about price changes or better alternatives

Keep it concise (under 500 words), practical, and encouraging. All amounts in INR.
Do not use any greetings or sign-offs.`,
          },
          {
            role: 'user',
            content: `Create a savings strategy based on this financial profile:\n\n${financialContext}`,
          },
        ],
        { maxTokens: 1500, temperature: 0.4 }
      );

      // Save strategy to the bucket list item
      const now = new Date().toISOString();
      await bucketCol.updateOne(
        { _id: objectId, userId: user.userId },
        {
          $set: {
            aiStrategy: strategy,
            aiStrategyGeneratedAt: now,
            updatedAt: now,
          },
        }
      );

      return NextResponse.json(
        {
          success: true,
          strategy,
          generatedAt: now,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/bucket-list/strategy:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to generate savings strategy' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
