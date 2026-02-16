/**
 * Budget History API
 * Stores monthly budget snapshots for historical tracking.
 *
 * GET  /api/budgets/history?months=12 - Retrieve last N months of budget history
 * POST /api/budgets/history            - Manually trigger snapshot for current month
 *
 * Auto-snapshot: On GET, if the current month has no snapshot yet, one is
 * created automatically from the user's current budget categories and
 * this month's transaction spending.
 */

import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { calculateCategoryBreakdown } from "@/lib/analytics"
import {
  getCurrentMonth,
  getMonthTransactions,
} from "@/lib/monthly-utils"
import { TransactionType } from "@/lib/types"

const HISTORY_COLLECTION = "budget_history"
const CATEGORIES_COLLECTION = "budget_categories"
const TRANSACTIONS_COLLECTION = "transactions"

interface BudgetHistoryDoc {
  userId: string
  month: number
  year: number
  categories: {
    name: string
    budget: number
    spent: number
    percentage: number
  }[]
  totals: {
    totalBudget: number
    totalSpent: number
    overallPercentage: number
  }
  snapshotDate: string
}

/**
 * Build a budget snapshot for a given month from current budget categories
 * and transaction data.
 */
async function buildSnapshot(
  userId: string,
  year: number,
  month: number
): Promise<Omit<BudgetHistoryDoc, "userId">> {
  const db = await getMongoDb()

  // Fetch budget categories
  const categoryDocs = await db
    .collection(CATEGORIES_COLLECTION)
    .find({ userId })
    .toArray()

  // Fetch transactions for the target month
  const allTransactions = await db
    .collection(TRANSACTIONS_COLLECTION)
    .find({ userId })
    .toArray()

  // Filter to the target month's expense transactions
  const monthTxns = getMonthTransactions(allTransactions as never[], year, month)
  const expenseTxns = monthTxns.filter(
    (t) => (t as { type?: string }).type === TransactionType.EXPENSE
  )

  // Calculate category breakdown from expenses
  const breakdown = calculateCategoryBreakdown(expenseTxns)
  const spendingMap = new Map<string, number>()
  for (const cb of breakdown) {
    spendingMap.set(cb.category.toLowerCase(), cb.amount)
  }

  // Build per-category snapshot
  const categories: BudgetHistoryDoc["categories"] = []
  let totalBudget = 0
  let totalSpent = 0

  for (const doc of categoryDocs) {
    const budgetAmount = doc.budgetAmount ?? 0
    // Match spending: check both the budget category name and its mapped transaction categories
    let spent = 0
    const txCats: string[] = doc.transactionCategories ?? []
    for (const tc of txCats) {
      spent += spendingMap.get(tc.toLowerCase()) ?? 0
    }
    // Also check spending keyed by the budget category name itself
    spent += spendingMap.get(doc.name.toLowerCase()) ?? 0

    const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 1000) / 10 : 0

    categories.push({
      name: doc.name,
      budget: budgetAmount,
      spent: Math.round(spent * 100) / 100,
      percentage,
    })

    totalBudget += budgetAmount
    totalSpent += spent
  }

  const overallPercentage =
    totalBudget > 0
      ? Math.round((totalSpent / totalBudget) * 1000) / 10
      : 0

  return {
    month,
    year,
    categories,
    totals: {
      totalBudget,
      totalSpent: Math.round(totalSpent * 100) / 100,
      overallPercentage,
    },
    snapshotDate: new Date().toISOString(),
  }
}

export async function OPTIONS() {
  return handleOptions()
}

/**
 * GET /api/budgets/history?months=12
 * Returns budget history for the last N months.
 * Auto-creates a snapshot for the current month if one doesn't exist.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const monthsParam = parseInt(searchParams.get("months") ?? "12", 10)
      const months = Math.min(Math.max(monthsParam, 1), 36)

      const db = await getMongoDb()
      const col = db.collection(HISTORY_COLLECTION)

      // Auto-snapshot: check if current month has a snapshot
      const { year: curYear, month: curMonth } = getCurrentMonth()
      const existingSnapshot = await col.findOne({
        userId: user.userId,
        year: curYear,
        month: curMonth,
      })

      if (!existingSnapshot) {
        // Create snapshot for current month
        const snapshot = await buildSnapshot(user.userId, curYear, curMonth)
        await col.insertOne({
          userId: user.userId,
          ...snapshot,
        })
      }

      // Calculate the cutoff date (N months ago)
      const cutoffDate = new Date(curYear, curMonth - 1 - months, 1)
      const cutoffYear = cutoffDate.getFullYear()
      const cutoffMonth = cutoffDate.getMonth() + 1

      // Query all snapshots within range, sorted newest first
      const history = await col
        .find({
          userId: user.userId,
          $or: [
            { year: { $gt: cutoffYear } },
            { year: cutoffYear, month: { $gte: cutoffMonth } },
          ],
        })
        .sort({ year: -1, month: -1 })
        .toArray()

      const result = history.map((doc) => ({
        id: doc._id.toString(),
        month: doc.month,
        year: doc.year,
        categories: doc.categories,
        totals: doc.totals,
        snapshotDate: doc.snapshotDate,
      }))

      return NextResponse.json(
        { success: true, history: result },
        { headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Error in GET /api/budgets/history:", error)
      return NextResponse.json(
        { success: false, error: "Failed to load budget history" },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/budgets/history
 * Manually trigger a snapshot for the current month.
 * If a snapshot already exists for this month, it is replaced.
 */
export async function POST(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const { year, month } = getCurrentMonth()
      const db = await getMongoDb()
      const col = db.collection(HISTORY_COLLECTION)

      const snapshot = await buildSnapshot(user.userId, year, month)

      // Upsert: replace existing snapshot for this month
      await col.updateOne(
        { userId: user.userId, year, month },
        { $set: { userId: user.userId, ...snapshot } },
        { upsert: true }
      )

      return NextResponse.json(
        {
          success: true,
          message: `Snapshot created for ${month}/${year}`,
          snapshot: { ...snapshot },
        },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Error in POST /api/budgets/history:", error)
      return NextResponse.json(
        { success: false, error: "Failed to create budget snapshot" },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}
