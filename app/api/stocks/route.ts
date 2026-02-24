/**
 * Stock Holdings CRUD API
 * Manages the user's stock portfolio (symbol, shares, average cost) in MongoDB.
 *
 * GET    /api/stocks       - List all stock holdings
 * POST   /api/stocks       - Add a single stock or bulk-import via { items: [...] }
 * PUT    /api/stocks?id=x  - Update an existing holding
 * DELETE /api/stocks?id=x  - Delete a holding by ObjectId
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

/**
 * Convert a MongoDB stock document to an API response object,
 * transforming the `_id` ObjectId to a string representation.
 *
 * @param doc - Raw MongoDB document from the `stocks` collection
 * @returns The document with `_id` converted to a string
 */
function toStockResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

/**
 * GET /api/stocks
 * List all stock holdings for the authenticated user, sorted by creation date (newest first).
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, items: Array<StockHolding> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const stocks = await db
        .collection("stocks")
        .find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .toArray()

      return NextResponse.json(
        { success: true, items: stocks.map(toStockResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to load stocks." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/stocks
 * Add a new stock holding or bulk-import multiple holdings.
 * When `items` array is provided, performs a bulk insert.
 * When `replaceAll: true` is set with bulk import, deletes all existing holdings first.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} symbol - Stock ticker symbol (e.g., "RELIANCE")
 * @body {string} exchange - Exchange code (e.g., "NSE", "BSE", "NASDAQ")
 * @body {number} shares - Number of shares held (> 0)
 * @body {number} averageCost - Average purchase price per share in INR (> 0)
 * @body {number} [expectedAnnualReturn] - Expected annual return percentage
 * @body {string} [notes] - Optional notes
 * @body {Array} [items] - Bulk import array of stock objects (same fields as above)
 * @body {boolean} [replaceAll] - If true with items, deletes all existing holdings before import
 *
 * @returns {201} `{ success: true, item: StockHolding }` (single) or `{ success: true, insertedCount, errors }` (bulk)
 * @returns {400} `{ success: false, message: string }` - Missing or invalid fields
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const items = Array.isArray(body.items) ? body.items : null
      const db = await getMongoDb()

      if (items) {
        const replaceAll = body.replaceAll === true
        if (replaceAll) {
          await db.collection("stocks").deleteMany({ userId: user.userId })
        }

        const now = new Date().toISOString()
        const docs = [] as Record<string, unknown>[]
        const errors: Array<{ index: number; message: string }> = []

        items.forEach((item: Record<string, unknown>, index: number) => {
          const symbol = typeof item.symbol === "string" ? item.symbol.trim().toUpperCase() : ""
          const exchange = typeof item.exchange === "string" ? item.exchange.trim() : ""
          const shares = Number(item.shares)
          const averageCost = Number(item.averageCost)
          const expectedAnnualReturn = item.expectedAnnualReturn === "" || item.expectedAnnualReturn == null
            ? undefined
            : Number(item.expectedAnnualReturn)
          const notes = typeof item.notes === "string" ? item.notes.trim() : undefined

          if (!symbol || !exchange || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(averageCost) || averageCost <= 0) {
            errors.push({ index, message: "Missing or invalid fields" })
            return
          }

          if (expectedAnnualReturn !== undefined && !Number.isFinite(expectedAnnualReturn)) {
            errors.push({ index, message: "Expected return must be a number" })
            return
          }

          docs.push({
            userId: user.userId,
            symbol,
            exchange,
            shares,
            averageCost,
            expectedAnnualReturn,
            notes,
            createdAt: now,
            updatedAt: now,
          })
        })

        if (!docs.length) {
          return NextResponse.json(
            { success: false, message: "No valid stock rows.", errors },
            { status: 400, headers: corsHeaders() }
          )
        }

        const result = await db.collection("stocks").insertMany(docs)
        return NextResponse.json(
          { success: true, insertedCount: result.insertedCount, errors },
          { status: 201, headers: corsHeaders() }
        )
      }
      const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : ""
      const exchange = typeof body.exchange === "string" ? body.exchange.trim() : ""
      const shares = Number(body.shares)
      const averageCost = Number(body.averageCost)
      const expectedAnnualReturn = body.expectedAnnualReturn === "" || body.expectedAnnualReturn === null
        ? undefined
        : Number(body.expectedAnnualReturn)
      const notes = typeof body.notes === "string" ? body.notes.trim() : undefined

      if (!symbol || !exchange || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(averageCost) || averageCost <= 0) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid stock fields." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (expectedAnnualReturn !== undefined && !Number.isFinite(expectedAnnualReturn)) {
        return NextResponse.json(
          { success: false, message: "Expected return must be a number." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const now = new Date().toISOString()
      const doc = {
        userId: user.userId,
        symbol,
        exchange,
        shares,
        averageCost,
        expectedAnnualReturn,
        notes,
        createdAt: now,
        updatedAt: now,
      }

      const result = await db.collection("stocks").insertOne(doc)

      return NextResponse.json(
        { success: true, item: { ...doc, _id: result.insertedId.toString() } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to save stock." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * PUT /api/stocks?id=xxx
 * Update an existing stock holding. Only provided fields are modified.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - Stock holding ObjectId (required, must be valid)
 * @body {string} [symbol] - Updated ticker symbol
 * @body {string} [exchange] - Updated exchange code
 * @body {number} [shares] - Updated number of shares
 * @body {number} [averageCost] - Updated average cost per share
 * @body {number|null} [expectedAnnualReturn] - Updated expected return
 *
 * @returns {200} `{ success: true, item: StockHolding | null }`
 * @returns {400} `{ success: false, message: string }` - Invalid ID or no valid fields
 * @returns {404} `{ success: false, message: string }` - Stock not found
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get("id")
      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid stock id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const body = await req.json()
      const updates: Record<string, unknown> = {}

      if (typeof body.symbol === "string" && body.symbol.trim()) updates.symbol = body.symbol.trim().toUpperCase()
      if (typeof body.exchange === "string" && body.exchange.trim()) updates.exchange = body.exchange.trim()
      if (body.shares !== undefined) {
        const shares = Number(body.shares)
        if (Number.isFinite(shares) && shares > 0) updates.shares = shares
      }
      if (body.averageCost !== undefined) {
        const averageCost = Number(body.averageCost)
        if (Number.isFinite(averageCost) && averageCost > 0) updates.averageCost = averageCost
      }
      if (body.expectedAnnualReturn !== undefined) {
        const ear = body.expectedAnnualReturn === "" || body.expectedAnnualReturn === null
          ? undefined
          : Number(body.expectedAnnualReturn)
        if (ear === undefined || Number.isFinite(ear)) updates.expectedAnnualReturn = ear
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      updates.updatedAt = new Date().toISOString()

      const db = await getMongoDb()
      const result = await db.collection("stocks").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "Stock not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      const updated = await db.collection("stocks").findOne({ _id: new ObjectId(id) })
      return NextResponse.json(
        { success: true, item: updated ? toStockResponse(updated as Record<string, unknown>) : null },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update stock." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/stocks?id=xxx
 * Delete a stock holding by its ObjectId.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - Stock holding ObjectId (required, must be valid)
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
          { success: false, message: "Missing or invalid stock id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("stocks").deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete stock." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/stocks
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
