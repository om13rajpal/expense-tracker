/**
 * Time Travel API
 * Provides historical spending comparisons for financial awareness:
 * 1. "On this day" -- shows what the user spent on this date last year (+/- 1 day)
 * 2. "Month-over-month" -- compares spending in the current month vs the same
 *    number of elapsed days in the previous month
 *
 * Requires JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   GET /api/time-travel - Retrieve historical spending comparisons
 *
 * MongoDB collection: `transactions`
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';

/**
 * OPTIONS /api/time-travel
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/time-travel
 * Returns two comparison datasets:
 * - `lastYear`: Top 10 expenses from this date last year (+/- 1 day window)
 * - `monthComparison`: This month's spending vs last month's spending over the same number of elapsed days
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, lastYear: { date, transactions, totalSpent }, monthComparison: { thisMonth, lastMonth, change, changePercent, daysCompared } }`
 * @returns {500} `{ success: false, error: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const now = new Date();

      // "On this day" last year: +/- 1 day window
      const lastYearDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const dayBefore = new Date(lastYearDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(lastYearDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const lastYearTransactions = await db
        .collection('transactions')
        .find({
          userId: user.userId,
          date: {
            $gte: dayBefore.toISOString(),
            $lte: dayAfter.toISOString(),
          },
          type: 'expense',
        })
        .sort({ amount: -1 })
        .limit(10)
        .toArray();

      const lastYearTotal = lastYearTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount as number),
        0
      );

      // Month-over-month comparison: this month vs last month (same number of days elapsed)
      const daysElapsed = now.getDate();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thisMonthCutoff = now.toISOString();

      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthCutoff = new Date(now.getFullYear(), now.getMonth() - 1, daysElapsed);

      const [thisMonthTxns, lastMonthTxns] = await Promise.all([
        db.collection('transactions').find({
          userId: user.userId,
          date: { $gte: thisMonthStart, $lte: thisMonthCutoff },
          type: 'expense',
        }).toArray(),
        db.collection('transactions').find({
          userId: user.userId,
          date: { $gte: lastMonthStart.toISOString(), $lte: lastMonthCutoff.toISOString() },
          type: 'expense',
        }).toArray(),
      ]);

      const thisMonthTotal = thisMonthTxns.reduce((s, t) => s + Math.abs(t.amount as number), 0);
      const lastMonthTotal = lastMonthTxns.reduce((s, t) => s + Math.abs(t.amount as number), 0);
      const change = thisMonthTotal - lastMonthTotal;
      const changePercent = lastMonthTotal > 0 ? (change / lastMonthTotal) * 100 : 0;

      return NextResponse.json(
        {
          success: true,
          lastYear: {
            date: lastYearDate.toISOString().split('T')[0],
            transactions: lastYearTransactions.map(t => ({
              description: t.description || t.merchant || 'Unknown',
              amount: Math.abs(t.amount as number),
              category: t.category,
              date: t.date,
            })),
            totalSpent: lastYearTotal,
          },
          monthComparison: {
            thisMonth: thisMonthTotal,
            lastMonth: lastMonthTotal,
            change,
            changePercent: Math.round(changePercent * 10) / 10,
            daysCompared: daysElapsed,
          },
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/time-travel:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load time travel data' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
