/**
 * Mutual Fund Transactions API
 * Records purchase/redemption transaction history for mutual funds.
 *
 * GET    /api/mutual-funds/transactions       - List all MF transactions
 * POST   /api/mutual-funds/transactions       - Bulk-import via { items: [...] }
 * DELETE /api/mutual-funds/transactions?id=x  - Delete a transaction by ObjectId
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

/**
 * Convert a MongoDB mutual fund transaction document to an API response object,
 * transforming the `_id` ObjectId to a string representation.
 *
 * @param doc - Raw MongoDB document from the `mutual_fund_transactions` collection
 * @returns The document with `_id` converted to a string
 */
function toTxnResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

/**
 * GET /api/mutual-funds/transactions
 * List all mutual fund transactions for the authenticated user, sorted by date (newest first).
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, items: Array<MFTransaction> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const txns = await db
        .collection("mutual_fund_transactions")
        .find({ userId: user.userId })
        .sort({ date: -1 })
        .toArray()

      return NextResponse.json(
        { success: true, items: txns.map(toTxnResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to load mutual fund transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/mutual-funds/transactions
 * Bulk-import mutual fund transactions. Validates each item for required fields.
 * When `replaceAll: true`, deletes all existing transactions before import.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {Array<{ schemeName, transactionType, amount, date, units?, nav? }>} items - Transaction array (required)
 * @body {boolean} [replaceAll] - If true, deletes all existing transactions before import
 *
 * @returns {201} `{ success: true, insertedCount: number, errors: Array<{ index, message }> }`
 * @returns {400} `{ success: false, message: string }` - Missing items or no valid rows
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const items = Array.isArray(body.items) ? body.items : null

      if (!items) {
        return NextResponse.json(
          { success: false, message: "Missing items payload." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()

      const replaceAll = body.replaceAll === true
      if (replaceAll) {
        await db.collection("mutual_fund_transactions").deleteMany({ userId: user.userId })
      }

      const now = new Date().toISOString()
      const docs = [] as Record<string, unknown>[]
      const errors: Array<{ index: number; message: string }> = []

      items.forEach((item: Record<string, unknown>, index: number) => {
        const schemeName = typeof item.schemeName === "string" ? item.schemeName.trim() : ""
        const transactionType = typeof item.transactionType === "string" ? item.transactionType.trim() : ""
        const units = Number(item.units)
        const nav = Number(item.nav)
        const amount = Number(item.amount)
        const date = typeof item.date === "string" ? item.date.trim() : ""

        if (!schemeName || !transactionType || !date || !Number.isFinite(amount)) {
          errors.push({ index, message: "Missing or invalid fields" })
          return
        }

        docs.push({
          userId: user.userId,
          schemeName,
          transactionType,
          units: Number.isFinite(units) ? units : 0,
          nav: Number.isFinite(nav) ? nav : 0,
          amount,
          date,
          createdAt: now,
          updatedAt: now,
        })
      })

      if (!docs.length) {
        return NextResponse.json(
          { success: false, message: "No valid transaction rows.", errors },
          { status: 400, headers: corsHeaders() }
        )
      }

      const result = await db.collection("mutual_fund_transactions").insertMany(docs)
      return NextResponse.json(
        { success: true, insertedCount: result.insertedCount, errors },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to save mutual fund transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/mutual-funds/transactions?id=xxx
 * Delete a mutual fund transaction by its ObjectId.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - Transaction ObjectId (required, must be valid)
 *
 * @returns {200} `{ success: true, deleted: boolean }`
 * @returns {400} `{ success: false, message: string }` - Missing or invalid ID
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get("id")
      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid transaction id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("mutual_fund_transactions").deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete mutual fund transaction." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/mutual-funds/transactions
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
