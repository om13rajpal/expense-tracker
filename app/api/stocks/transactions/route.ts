/**
 * Stock Transactions API
 * Records buy/sell stock transaction history in MongoDB.
 *
 * GET    /api/stocks/transactions       - List all stock transactions
 * POST   /api/stocks/transactions       - Bulk-import transactions via { items: [...] }
 * DELETE /api/stocks/transactions?id=x  - Delete a transaction by ObjectId
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

/**
 * Convert a MongoDB stock transaction document to an API response object,
 * transforming the `_id` ObjectId to a string representation.
 *
 * @param doc - Raw MongoDB document from the `stock_transactions` collection
 * @returns The document with `_id` converted to a string
 */
function toTxnResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

/**
 * GET /api/stocks/transactions
 * List all stock transactions (buy/sell history) for the authenticated user,
 * sorted by execution date (newest first).
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, items: Array<StockTransaction> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const txns = await db
        .collection("stock_transactions")
        .find({ userId: user.userId })
        .sort({ executionDate: -1 })
        .toArray()

      return NextResponse.json(
        { success: true, items: txns.map(toTxnResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to load stock transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/stocks/transactions
 * Bulk-import stock transactions. Validates each item for required fields.
 * When `replaceAll: true`, deletes all existing transactions before import.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {Array<{ stockName?, symbol, isin?, type, quantity, value, exchange?, executionDate?, orderStatus? }>} items - Array of transactions (required)
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
        await db.collection("stock_transactions").deleteMany({ userId: user.userId })
      }

      const now = new Date().toISOString()
      const docs = [] as Record<string, unknown>[]
      const errors: Array<{ index: number; message: string }> = []

      items.forEach((item: Record<string, unknown>, index: number) => {
        const stockName = typeof item.stockName === "string" ? item.stockName.trim() : ""
        const symbol = typeof item.symbol === "string" ? item.symbol.trim().toUpperCase() : ""
        const isin = typeof item.isin === "string" ? item.isin.trim() : ""
        const type = typeof item.type === "string" ? item.type.trim().toUpperCase() : ""
        const quantity = Number(item.quantity)
        const value = Number(item.value)
        const exchange = typeof item.exchange === "string" ? item.exchange.trim() : ""
        const executionDate = typeof item.executionDate === "string" ? item.executionDate.trim() : ""
        const orderStatus = typeof item.orderStatus === "string" ? item.orderStatus.trim() : "Executed"

        if (!symbol || !type || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(value)) {
          errors.push({ index, message: "Missing or invalid fields" })
          return
        }

        if (type !== "BUY" && type !== "SELL") {
          errors.push({ index, message: "Type must be BUY or SELL" })
          return
        }

        if (value <= 0) {
          errors.push({ index, message: "Value must be greater than 0" })
          return
        }

        docs.push({
          userId: user.userId,
          stockName,
          symbol,
          isin,
          type,
          quantity,
          value,
          exchange,
          executionDate,
          orderStatus,
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

      const result = await db.collection("stock_transactions").insertMany(docs)
      return NextResponse.json(
        { success: true, insertedCount: result.insertedCount, errors },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to save stock transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/stocks/transactions?id=xxx
 * Delete a stock transaction by its ObjectId.
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
      const result = await db.collection("stock_transactions").deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete stock transaction." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/stocks/transactions
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
