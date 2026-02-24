/**
 * Splits Expenses API
 * Manages shared expenses within the bill-splitting feature.
 * Supports three split types: equal, exact, and percentage-based.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 * Data is scoped to the authenticated user via `userId`.
 *
 * Endpoints:
 *   GET    /api/splits/expenses          - List expenses (optionally by group)
 *   POST   /api/splits/expenses          - Create a new split expense
 *   DELETE /api/splits/expenses?id=xxx   - Delete an expense by ID
 *
 * MongoDB collection: `splits_expenses`
 */

import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

/**
 * GET /api/splits/expenses
 * Retrieve all split expenses for the authenticated user, optionally filtered by group.
 * Results are sorted by date (newest first), then by creation time.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} [groupId] - Filter expenses by group ID
 *
 * @returns {200} `{ success: true, expenses: Array<{ _id, groupId, description, amount, paidBy, splitType, splits, date, category, createdAt }> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const groupId = req.nextUrl.searchParams.get("groupId")

      const query: Record<string, unknown> = { userId: user.userId }
      if (groupId) query.groupId = groupId

      const expenses = await db
        .collection("splits_expenses")
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .toArray()

      return NextResponse.json(
        {
          success: true,
          expenses: expenses.map((e) => ({
            _id: e._id.toString(),
            groupId: e.groupId || null,
            description: e.description,
            amount: e.amount,
            paidBy: e.paidBy,
            splitType: e.splitType,
            splits: e.splits,
            date: e.date,
            category: e.category || "",
            createdAt: e.createdAt,
          })),
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits expenses GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch expenses." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/splits/expenses
 * Create a new split expense. Supports three split strategies:
 * - "equal": Divides the amount equally among all listed people (with remainder correction)
 * - "percentage": Each person's share is computed from their percentage (must sum to 100)
 * - "exact": Each person's share is specified directly (must sum to total amount)
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} description - Expense description (required, non-empty)
 * @body {number} amount - Total expense amount (required, > 0)
 * @body {string} paidBy - Name of the person who paid (required)
 * @body {string} splitType - One of "equal", "exact", or "percentage"
 * @body {Array<{ person: string, amount: number }>} splits - Split allocation per person
 * @body {string} [groupId] - Optional group ID to associate the expense with
 * @body {string} [date] - Expense date (ISO string, defaults to now)
 * @body {string} [category] - Expense category label
 *
 * @returns {201} `{ success: true, expense: { _id, ... } }`
 * @returns {400} `{ success: false, message: string }` - Validation failure
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const description = typeof body.description === "string" ? body.description.trim() : ""
      const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount)
      const paidBy = typeof body.paidBy === "string" ? body.paidBy.trim() : ""
      const splitType = body.splitType as string
      const date = typeof body.date === "string" ? body.date.trim() : new Date().toISOString()

      if (!description || isNaN(amount) || amount <= 0 || !paidBy) {
        return NextResponse.json(
          { success: false, message: "description, amount (>0), and paidBy are required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!["equal", "exact", "percentage"].includes(splitType)) {
        return NextResponse.json(
          { success: false, message: "splitType must be 'equal', 'exact', or 'percentage'." },
          { status: 400, headers: corsHeaders() }
        )
      }

      let splits: { person: string; amount: number }[] = []

      if (splitType === "equal") {
        const people: string[] = Array.isArray(body.splits)
          ? body.splits.map((s: { person: string }) => s.person)
          : []
        if (people.length === 0) {
          return NextResponse.json(
            { success: false, message: "At least one person is required in splits." },
            { status: 400, headers: corsHeaders() }
          )
        }
        const perPerson = Math.round((amount / people.length) * 100) / 100
        const remainder = Math.round((amount - perPerson * people.length) * 100) / 100
        splits = people.map((person, i) => ({
          person,
          amount: i === 0 ? perPerson + remainder : perPerson,
        }))
      } else if (splitType === "percentage") {
        if (!Array.isArray(body.splits) || body.splits.length === 0) {
          return NextResponse.json(
            { success: false, message: "Splits array is required." },
            { status: 400, headers: corsHeaders() }
          )
        }
        const totalPct = body.splits.reduce((sum: number, s: { amount: number }) => sum + (s.amount || 0), 0)
        if (Math.abs(totalPct - 100) > 0.01) {
          return NextResponse.json(
            { success: false, message: "Percentages must sum to 100." },
            { status: 400, headers: corsHeaders() }
          )
        }
        splits = body.splits.map((s: { person: string; amount: number }) => ({
          person: s.person,
          amount: Math.round((amount * s.amount) / 100 * 100) / 100,
        }))
      } else {
        // exact
        if (!Array.isArray(body.splits) || body.splits.length === 0) {
          return NextResponse.json(
            { success: false, message: "Splits array is required." },
            { status: 400, headers: corsHeaders() }
          )
        }
        const totalSplit = body.splits.reduce((sum: number, s: { amount: number }) => sum + (s.amount || 0), 0)
        if (Math.abs(totalSplit - amount) > 0.01) {
          return NextResponse.json(
            { success: false, message: `Split amounts (${totalSplit}) must equal total (${amount}).` },
            { status: 400, headers: corsHeaders() }
          )
        }
        splits = body.splits.map((s: { person: string; amount: number }) => ({
          person: s.person,
          amount: s.amount,
        }))
      }

      const db = await getMongoDb()
      const now = new Date().toISOString()

      const doc = {
        userId: user.userId,
        groupId: typeof body.groupId === "string" ? body.groupId.trim() : null,
        description,
        amount,
        paidBy,
        splitType,
        splits,
        date,
        category: typeof body.category === "string" ? body.category.trim() : "",
        createdAt: now,
      }

      const result = await db.collection("splits_expenses").insertOne(doc)

      return NextResponse.json(
        { success: true, expense: { _id: result.insertedId.toString(), ...doc } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits expenses POST error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to create split expense." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/splits/expenses?id=xxx
 * Delete a split expense by its ObjectId.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - Expense ObjectId (required, must be valid 24-char hex)
 *
 * @returns {200} `{ success: true, deletedCount: number }`
 * @returns {400} `{ success: false, message: string }` - Missing or invalid ID
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const id = req.nextUrl.searchParams.get("id") || ""
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        return NextResponse.json(
          { success: false, message: "Valid expense id is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("splits_expenses").deleteOne({
        _id: new ObjectId(id),
        userId: user.userId,
      })

      return NextResponse.json(
        { success: true, deletedCount: result.deletedCount },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits expenses DELETE error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to delete expense." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/splits/expenses
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
