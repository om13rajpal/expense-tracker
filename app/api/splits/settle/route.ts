/**
 * Splits Settlements API
 * Records payments made between people to settle split expense debts.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 * Data is scoped to the authenticated user via `userId`.
 *
 * Endpoints:
 *   GET  /api/splits/settle  - List all settlements (optionally by group)
 *   POST /api/splits/settle  - Record a new settlement payment
 *
 * MongoDB collection: `splits_settlements`
 */

import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

/**
 * GET /api/splits/settle
 * Retrieve all settlement records for the authenticated user, optionally filtered by group.
 * Results are sorted by date (newest first), then by creation time.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} [groupId] - Filter settlements by group ID
 *
 * @returns {200} `{ success: true, settlements: Array<{ _id, groupId, paidBy, paidTo, amount, date, notes, createdAt }> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const groupId = req.nextUrl.searchParams.get("groupId")

      const query: Record<string, unknown> = { userId: user.userId }
      if (groupId) query.groupId = groupId

      const settlements = await db
        .collection("splits_settlements")
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .toArray()

      return NextResponse.json(
        {
          success: true,
          settlements: settlements.map((s) => ({
            _id: s._id.toString(),
            groupId: s.groupId || null,
            paidBy: s.paidBy,
            paidTo: s.paidTo,
            amount: s.amount,
            date: s.date,
            notes: s.notes || "",
            createdAt: s.createdAt,
          })),
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits settlements GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch settlements." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/splits/settle
 * Record a new settlement payment between two people.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} paidBy - Name of the person making the payment (required)
 * @body {string} paidTo - Name of the person receiving the payment (required)
 * @body {number} amount - Settlement amount in INR (required, > 0)
 * @body {string} [groupId] - Optional group ID to associate the settlement with
 * @body {string} [date] - Settlement date (ISO string, defaults to now)
 * @body {string} [notes] - Optional notes about the settlement
 *
 * @returns {201} `{ success: true, settlement: { _id, groupId, paidBy, paidTo, amount, date, notes, createdAt } }`
 * @returns {400} `{ success: false, message: string }` - Missing required fields or invalid amount
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const paidBy = typeof body.paidBy === "string" ? body.paidBy.trim() : ""
      const paidTo = typeof body.paidTo === "string" ? body.paidTo.trim() : ""
      const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount)
      const date = typeof body.date === "string" ? body.date.trim() : new Date().toISOString()

      if (!paidBy || !paidTo || isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, message: "paidBy, paidTo, and amount (>0) are required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const now = new Date().toISOString()

      const doc = {
        userId: user.userId,
        groupId: typeof body.groupId === "string" ? body.groupId.trim() : null,
        paidBy,
        paidTo,
        amount,
        date,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
        createdAt: now,
      }

      const result = await db.collection("splits_settlements").insertOne(doc)

      return NextResponse.json(
        { success: true, settlement: { _id: result.insertedId.toString(), ...doc } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits settlements POST error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to record settlement." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/splits/settle
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
