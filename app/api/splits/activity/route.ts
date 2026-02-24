/**
 * Splits Activity Feed API
 * Returns a combined, chronologically sorted feed of expenses and settlements
 * for the authenticated user, optionally filtered by group.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 * Data is scoped to the authenticated user via `userId`.
 *
 * Endpoints:
 *   GET /api/splits/activity - Retrieve the activity feed
 *
 * MongoDB collections: `splits_expenses`, `splits_settlements`
 */

import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

/**
 * GET /api/splits/activity
 * Fetch a combined activity feed of expenses and settlements, sorted by date (newest first).
 * Both collections are queried in parallel for performance.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} [groupId] - Filter activity by group ID
 * @query {string} [limit="20"] - Maximum number of activity items to return (default: 20)
 *
 * @returns {200} `{ success: true, activity: Array<{ _id, type: "expense"|"settlement", description, amount, ... }> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const groupId = req.nextUrl.searchParams.get("groupId")
      const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20")

      const query: Record<string, unknown> = { userId: user.userId }
      if (groupId) query.groupId = groupId

      const [expenses, settlements] = await Promise.all([
        db.collection("splits_expenses").find(query).sort({ date: -1 }).toArray(),
        db.collection("splits_settlements").find(query).sort({ date: -1 }).toArray(),
      ])

      const activity = [
        ...expenses.map((e) => ({
          _id: e._id.toString(),
          type: "expense" as const,
          description: e.description,
          amount: e.amount,
          paidBy: e.paidBy,
          splits: e.splits,
          splitType: e.splitType,
          groupId: e.groupId || null,
          date: e.date,
          createdAt: e.createdAt,
        })),
        ...settlements.map((s) => ({
          _id: s._id.toString(),
          type: "settlement" as const,
          description: `${s.paidBy} paid ${s.paidTo}`,
          amount: s.amount,
          paidBy: s.paidBy,
          paidTo: s.paidTo,
          groupId: s.groupId || null,
          date: s.date,
          notes: s.notes || "",
          createdAt: s.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)

      return NextResponse.json(
        { success: true, activity },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits activity GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch activity." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/splits/activity
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
