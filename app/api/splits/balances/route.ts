/**
 * Splits Balances API
 * Computes net balances between the authenticated user ("Me") and other people
 * based on all recorded split expenses and settlements.
 *
 * Balances are computed on-the-fly using `computeNetBalances` from `@/lib/splits-utils`.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 * Data is scoped to the authenticated user via `userId`.
 *
 * Endpoints:
 *   GET /api/splits/balances - Compute and return net balances
 *
 * MongoDB collections: `splits_expenses`, `splits_settlements`
 */

import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { computeNetBalances, type SplitExpense, type Settlement } from "@/lib/splits-utils"

/**
 * GET /api/splits/balances
 * Compute net balances for the authenticated user across all expenses and settlements.
 * Fetches expenses and settlements in parallel, then delegates to `computeNetBalances`.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} [groupId] - Filter balances by a specific group
 * @query {string} [person] - Filter results to a specific person
 *
 * @returns {200} `{ success: true, balances: Array<{ person, theyOwe, youOwe, net }>, totalOwed: number, totalOwing: number }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const groupId = req.nextUrl.searchParams.get("groupId")
      const personFilter = req.nextUrl.searchParams.get("person")

      const expenseQuery: Record<string, unknown> = { userId: user.userId }
      const settlementQuery: Record<string, unknown> = { userId: user.userId }
      if (groupId) {
        expenseQuery.groupId = groupId
        settlementQuery.groupId = groupId
      }

      const [expenseDocs, settlementDocs] = await Promise.all([
        db.collection("splits_expenses").find(expenseQuery).toArray(),
        db.collection("splits_settlements").find(settlementQuery).toArray(),
      ])

      const expenses: SplitExpense[] = expenseDocs.map((e) => ({
        _id: e._id.toString(),
        userId: e.userId,
        groupId: e.groupId,
        description: e.description,
        amount: e.amount,
        paidBy: e.paidBy,
        splitType: e.splitType,
        splits: e.splits,
        date: e.date,
        category: e.category,
        createdAt: e.createdAt,
      }))

      const settlements: Settlement[] = settlementDocs.map((s) => ({
        _id: s._id.toString(),
        userId: s.userId,
        groupId: s.groupId,
        paidBy: s.paidBy,
        paidTo: s.paidTo,
        amount: s.amount,
        date: s.date,
        notes: s.notes,
        createdAt: s.createdAt,
      }))

      let balances = computeNetBalances(expenses, settlements, "Me")

      if (personFilter) {
        balances = balances.filter((b) => b.person === personFilter)
      }

      const totalOwed = balances.reduce((sum, b) => sum + b.theyOwe, 0)
      const totalOwing = balances.reduce((sum, b) => sum + b.youOwe, 0)

      return NextResponse.json(
        {
          success: true,
          balances,
          totalOwed: Math.round(totalOwed * 100) / 100,
          totalOwing: Math.round(totalOwing * 100) / 100,
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits balances GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to compute balances." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/splits/balances
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
