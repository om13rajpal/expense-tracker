/**
 * Roundup Savings API
 * Calculates hypothetical "roundup" savings for the current month by rounding
 * each expense transaction up to the nearest Rs.100 and summing the differences.
 * This shows how much the user could save with a roundup savings strategy.
 *
 * Requires JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   GET /api/roundup-savings - Compute roundup savings for the current month
 *
 * MongoDB collection: `transactions`
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';

/**
 * OPTIONS /api/roundup-savings
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/roundup-savings
 * Compute roundup savings potential for the current month. Each expense is rounded
 * up to the nearest Rs.100, and the difference is the "roundup" amount.
 * Returns the total, average per transaction, and top 5 largest roundups.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, totalRoundup: number, transactionCount: number, averageRoundup: number, topRoundups: Array<{ description, amount, roundup }> }`
 * @returns {500} `{ success: false, error: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const transactions = await db
        .collection('transactions')
        .find({
          userId: user.userId,
          date: { $gte: monthStart },
          type: 'expense',
        })
        .toArray();

      let totalRoundup = 0;
      const roundups: Array<{ description: string; amount: number; roundup: number }> = [];

      for (const txn of transactions) {
        const amount = Math.abs(txn.amount as number);
        const rounded = Math.ceil(amount / 100) * 100;
        const diff = rounded - amount;

        if (diff > 0) {
          totalRoundup += diff;
          roundups.push({
            description: (txn.description || txn.merchant || 'Unknown') as string,
            amount,
            roundup: diff,
          });
        }
      }

      // Sort by biggest roundup
      roundups.sort((a, b) => b.roundup - a.roundup);
      const topRoundups = roundups.slice(0, 5);
      const averageRoundup = roundups.length > 0 ? totalRoundup / roundups.length : 0;

      return NextResponse.json(
        {
          success: true,
          totalRoundup,
          transactionCount: roundups.length,
          averageRoundup: Math.round(averageRoundup),
          topRoundups,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/roundup-savings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to compute roundup savings' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
