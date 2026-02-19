import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();

      // Check if ghost budget is enabled
      const settings = await db.collection('user_settings').findOne({ userId: user.userId });
      if (!settings?.ghostBudgetEnabled) {
        return NextResponse.json(
          { success: true, enabled: false },
          { headers: corsHeaders() }
        );
      }

      // Get historical snapshots
      const snapshots = await db
        .collection('ghost_budget_snapshots')
        .find({ userId: user.userId })
        .sort({ month: -1 })
        .toArray();

      // If no snapshots, compute on the fly for current month
      if (snapshots.length === 0) {
        const currentData = await computeCurrentMonth(db, user.userId);
        return NextResponse.json(
          {
            success: true,
            enabled: true,
            currentMonth: currentData,
            cumulativeGap: currentData.gap,
            history: [],
            categoryBreakdown: currentData.categoryBreakdown,
          },
          { headers: corsHeaders() }
        );
      }

      // Get current month on-the-fly data
      const currentData = await computeCurrentMonth(db, user.userId);
      const latestSnapshot = snapshots[0];
      const cumulativeFromHistory = (latestSnapshot.cumulativeGap as number) || 0;

      return NextResponse.json(
        {
          success: true,
          enabled: true,
          currentMonth: {
            actual: currentData.actual,
            budgeted: currentData.budgeted,
            gap: currentData.gap,
          },
          cumulativeGap: cumulativeFromHistory + currentData.gap,
          history: snapshots.slice(0, 12).map(s => ({
            month: s.month,
            ghostSavings: s.ghostSavings,
            cumulativeGap: s.cumulativeGap,
          })),
          categoryBreakdown: currentData.categoryBreakdown,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/ghost-budget:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load ghost budget' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

async function computeCurrentMonth(db: Awaited<ReturnType<typeof getMongoDb>>, userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const budgetDocs = await db
    .collection('budget_categories')
    .find({ userId })
    .toArray();

  const reverseMap: Record<string, string> = {};
  for (const doc of budgetDocs) {
    const cats = doc.transactionCategories as string[] | undefined;
    if (Array.isArray(cats)) {
      for (const cat of cats) {
        reverseMap[cat] = doc.name as string;
      }
    }
  }

  const transactions = await db
    .collection('transactions')
    .find({ userId, date: { $gte: monthStart }, type: 'expense' })
    .toArray();

  const spendByBudget: Record<string, number> = {};
  for (const txn of transactions) {
    const raw = txn.category as string;
    const budgetName = reverseMap[raw] || raw;
    spendByBudget[budgetName] = (spendByBudget[budgetName] || 0) + Math.abs(txn.amount as number);
  }

  let totalActual = 0;
  let totalBudgeted = 0;
  let gap = 0;
  const categoryBreakdown: Array<{ category: string; actual: number; budgeted: number; gap: number }> = [];

  for (const doc of budgetDocs) {
    const budgeted = doc.budgetAmount as number;
    if (!budgeted || budgeted <= 0) continue;

    const category = doc.name as string;
    const actual = spendByBudget[category] || 0;
    const catGap = actual > budgeted ? actual - budgeted : 0;

    totalActual += actual;
    totalBudgeted += budgeted;
    gap += catGap;

    categoryBreakdown.push({ category, actual, budgeted, gap: catGap });
  }

  return { actual: totalActual, budgeted: totalBudgeted, gap, categoryBreakdown };
}
