/**
 * Transactions CRUD API (MongoDB-backed)
 *
 * GET    /api/transactions - List transactions with filtering, sorting, pagination
 * POST   /api/transactions - Manually create a new transaction
 * PATCH  /api/transactions - Update category for one or many transactions
 * PUT    /api/transactions - Update a transaction's NWI override
 * DELETE /api/transactions - Delete by single id, bulk ids, or date range
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import {
  getCachedTransactions,
  fetchTransactionsFromSheet,
} from "@/lib/sheets"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { updateStreak, awardXP, checkBadgeUnlocks, updateChallengeProgress } from "@/lib/gamification"
import { persistTransactions } from "@/lib/persist-transactions"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}

/**
 * GET /api/transactions
 *
 * Returns transactions from MongoDB (preferred) or falls back to in-memory cache.
 * On first access after sync, data flows:  Google Sheets -> parseTransaction -> MongoDB -> API response.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const searchParams = req.nextUrl.searchParams

      const db = await getMongoDb()
      const col = db.collection("transactions")

      // Try reading from MongoDB first
      let mongoCount = await col.countDocuments({ userId: user.userId })

      // If MongoDB is empty, seed it from sheets cache (or fetch)
      if (mongoCount === 0) {
        let cached = getCachedTransactions()
        if (!cached.transactions) {
          const fetched = await fetchTransactionsFromSheet()
          cached = { transactions: fetched.transactions, lastSync: fetched.lastSync }
        }
        if (cached.transactions?.length) {
          await persistTransactions(user.userId, cached.transactions)
          mongoCount = cached.transactions.length
        }
      }

      // Build MongoDB query
      const query: Record<string, unknown> = { userId: user.userId }

      const category = searchParams.get("category")
      if (category) query.category = category

      const paymentMethod = searchParams.get("paymentMethod")
      if (paymentMethod) query.paymentMethod = paymentMethod

      const startDate = searchParams.get("startDate")
      const endDate = searchParams.get("endDate")
      if (startDate || endDate) {
        const dateFilter: Record<string, string> = {}
        if (startDate) dateFilter.$gte = new Date(startDate).toISOString()
        if (endDate) dateFilter.$lte = new Date(endDate).toISOString()
        query.date = dateFilter
      }

      const minAmount = searchParams.get("minAmount")
      const maxAmount = searchParams.get("maxAmount")
      if (minAmount || maxAmount) {
        const amountFilter: Record<string, number> = {}
        if (minAmount) amountFilter.$gte = parseFloat(minAmount)
        if (maxAmount) amountFilter.$lte = parseFloat(maxAmount)
        query.amount = amountFilter
      }

      const sortField = searchParams.get("sort") || "date"
      const sortOrder = searchParams.get("order") === "asc" ? 1 : -1
      const sortKey = sortField === "amount" ? "amount" : sortField === "category" ? "category" : "date"

      const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined
      const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0

      const total = await col.countDocuments(query)

      let cursor = col.find(query).sort({ [sortKey]: sortOrder }).skip(offset)
      if (limit) cursor = cursor.limit(limit)

      const docs = await cursor.toArray()

      // Map to Transaction-like objects for frontend compatibility
      const transactions = docs.map((doc) => ({
        id: doc.txnId || (doc._id as ObjectId).toString(),
        _id: (doc._id as ObjectId).toString(),
        date: doc.date,
        description: doc.description,
        merchant: doc.merchant,
        category: doc.category,
        amount: doc.amount,
        type: doc.type,
        paymentMethod: doc.paymentMethod,
        account: doc.account,
        status: doc.status,
        tags: doc.tags || [],
        recurring: doc.recurring || false,
        balance: doc.balance,
        sequence: doc.sequence,
      }))

      return NextResponse.json(
        {
          success: true,
          transactions,
          count: transactions.length,
          total,
          filters: {
            category: category || undefined,
            paymentMethod: paymentMethod || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            minAmount: minAmount ? parseFloat(minAmount) : undefined,
            maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
          },
          pagination: {
            limit,
            offset,
            hasMore: limit ? offset + (limit || 0) < total : false,
          },
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error("Transactions fetch error:", getErrorMessage(error))
      return NextResponse.json(
        {
          success: false,
          message: `Failed to fetch transactions: ${getErrorMessage(error)}`,
        },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * PATCH /api/transactions
 *
 * Update category for one or many transactions.
 *
 * Body options:
 *   1) Single:  { id: "abc123", category: "Investment" }
 *   2) Bulk:    { ids: ["abc123", "def456"], category: "Investment" }
 */
export async function PATCH(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const category = typeof body.category === "string" ? body.category.trim() : ""

      if (!category) {
        return NextResponse.json(
          { success: false, message: "Category is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const col = db.collection("transactions")
      const now = new Date().toISOString()

      // Single update
      if (typeof body.id === "string" && body.id.trim()) {
        const txnId = body.id.trim()
        // Try matching by _id (ObjectId) or by txnId field
        let filter: Record<string, unknown> = { userId: user.userId }
        if (/^[0-9a-fA-F]{24}$/.test(txnId)) {
          filter._id = new ObjectId(txnId)
        } else {
          filter.txnId = txnId
        }

        const result = await col.updateOne(filter, {
          $set: { category, updatedAt: now, categoryOverride: true },
        })

        return NextResponse.json(
          { success: true, modifiedCount: result.modifiedCount },
          { status: 200, headers: corsHeaders() }
        )
      }

      // Bulk update
      if (Array.isArray(body.ids) && body.ids.length > 0) {
        const ids = body.ids.filter((id: unknown) => typeof id === "string" && id.trim())
        if (!ids.length) {
          return NextResponse.json(
            { success: false, message: "No valid IDs provided." },
            { status: 400, headers: corsHeaders() }
          )
        }

        // Separate ObjectId-style ids from txnId-style ids
        const objectIds: ObjectId[] = []
        const txnIds: string[] = []
        for (const id of ids) {
          if (/^[0-9a-fA-F]{24}$/.test(id)) {
            objectIds.push(new ObjectId(id))
          } else {
            txnIds.push(id)
          }
        }

        let totalModified = 0

        if (objectIds.length) {
          const r = await col.updateMany(
            { userId: user.userId, _id: { $in: objectIds } },
            { $set: { category, updatedAt: now, categoryOverride: true } }
          )
          totalModified += r.modifiedCount
        }

        if (txnIds.length) {
          const r = await col.updateMany(
            { userId: user.userId, txnId: { $in: txnIds } },
            { $set: { category, updatedAt: now, categoryOverride: true } }
          )
          totalModified += r.modifiedCount
        }

        return NextResponse.json(
          { success: true, modifiedCount: totalModified },
          { status: 200, headers: corsHeaders() }
        )
      }

      return NextResponse.json(
        { success: false, message: "Provide id (single) or ids (array) to update." },
        { status: 400, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error("Transaction update error:", getErrorMessage(error))
      return NextResponse.json(
        { success: false, message: "Failed to update transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/transactions
 *
 * Supports three modes:
 *   1. Single delete by ID:   ?id=<ObjectId>
 *   2. Bulk delete by IDs:    ?ids=<id1>,<id2>,<id3>
 *   3. Date-range delete:     body { before: "2026-01-01" }
 *
 * Query-param modes are checked first. If neither `id` nor `ids` is present,
 * falls back to body-based `{ before }` delete.
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const searchParams = req.nextUrl.searchParams
      const singleId = searchParams.get("id")
      const bulkIds = searchParams.get("ids")

      const db = await getMongoDb()
      const col = db.collection("transactions")

      // --- Mode 1: Single delete by _id ---
      if (singleId) {
        const id = singleId.trim()
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
          return NextResponse.json(
            { success: false, message: "Invalid ObjectId format." },
            { status: 400, headers: corsHeaders() }
          )
        }

        const result = await col.deleteOne({
          _id: new ObjectId(id),
          userId: user.userId,
        })

        return NextResponse.json(
          { success: true, deletedCount: result.deletedCount },
          { status: 200, headers: corsHeaders() }
        )
      }

      // --- Mode 2: Bulk delete by _ids ---
      if (bulkIds) {
        const rawIds = bulkIds.split(",").map((s) => s.trim()).filter(Boolean)
        const validIds: ObjectId[] = []
        const invalidIds: string[] = []

        for (const id of rawIds) {
          if (/^[0-9a-fA-F]{24}$/.test(id)) {
            validIds.push(new ObjectId(id))
          } else {
            invalidIds.push(id)
          }
        }

        if (validIds.length === 0) {
          return NextResponse.json(
            { success: false, message: "No valid ObjectIds provided.", invalidIds },
            { status: 400, headers: corsHeaders() }
          )
        }

        const result = await col.deleteMany({
          _id: { $in: validIds },
          userId: user.userId,
        })

        return NextResponse.json(
          {
            success: true,
            deletedCount: result.deletedCount,
            ...(invalidIds.length > 0 ? { invalidIds } : {}),
          },
          { status: 200, headers: corsHeaders() }
        )
      }

      // --- Mode 3: Body-based date-range delete (legacy) ---
      let body: Record<string, unknown> = {}
      try {
        body = await req.json()
      } catch {
        return NextResponse.json(
          { success: false, message: "Provide ?id=, ?ids=, or body { before: \"date\" }." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const before = typeof body.before === "string" ? body.before.trim() : ""

      if (!before) {
        return NextResponse.json(
          { success: false, message: "\"before\" date is required (ISO format)." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const beforeDate = new Date(before)
      if (isNaN(beforeDate.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid date format. Use ISO format (e.g., 2026-01-01)." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const result = await col.deleteMany({
        userId: user.userId,
        date: { $lt: beforeDate.toISOString() },
      })

      return NextResponse.json(
        { success: true, deletedCount: result.deletedCount },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error("Transaction delete error:", getErrorMessage(error))
      return NextResponse.json(
        { success: false, message: "Failed to delete transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * PUT /api/transactions
 *
 * Update a single transaction's NWI override.
 * Body: { id: "abc123", nwiOverride: "needs" | "wants" | "investments" | null }
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const id = typeof body.id === "string" ? body.id.trim() : ""

      if (!id) {
        return NextResponse.json(
          { success: false, message: "Transaction id is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const validOverrides = ["needs", "wants", "investments", null]
      const nwiOverride = body.nwiOverride === undefined ? undefined : body.nwiOverride
      if (nwiOverride !== undefined && !validOverrides.includes(nwiOverride)) {
        return NextResponse.json(
          { success: false, message: "nwiOverride must be 'needs', 'wants', 'investments', or null." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const col = db.collection("transactions")
      const now = new Date().toISOString()

      const filter: Record<string, unknown> = { userId: user.userId }
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        filter._id = new ObjectId(id)
      } else {
        filter.txnId = id
      }

      const updateFields: Record<string, unknown> = { updatedAt: now }
      if (nwiOverride !== undefined) {
        if (nwiOverride === null) {
          // Remove override
          await col.updateOne(filter, {
            $set: updateFields,
            $unset: { nwiOverride: "" },
          })
        } else {
          updateFields.nwiOverride = nwiOverride
          await col.updateOne(filter, { $set: updateFields })
        }
      }

      return NextResponse.json(
        { success: true },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error("Transaction update error:", getErrorMessage(error))
      return NextResponse.json(
        { success: false, message: "Failed to update transaction." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/transactions
 *
 * Manually add a new transaction.
 * Body: { description, amount, type, date, category, paymentMethod }
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const description = typeof body.description === "string" ? body.description.trim() : ""
      const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount)
      const type = typeof body.type === "string" ? body.type.trim() : ""
      const date = typeof body.date === "string" ? body.date.trim() : ""
      const category = typeof body.category === "string" ? body.category.trim() : "Uncategorized"
      const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "Other"

      if (!description || isNaN(amount) || amount <= 0 || !type || !date) {
        return NextResponse.json(
          { success: false, message: "description, amount (>0), type, and date are required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!["income", "expense"].includes(type)) {
        return NextResponse.json(
          { success: false, message: "type must be 'income' or 'expense'." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const col = db.collection("transactions")
      const now = new Date().toISOString()
      const txnId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const doc = {
        userId: user.userId,
        txnId,
        date: new Date(date).toISOString(),
        description,
        merchant: "",
        category,
        amount,
        type,
        paymentMethod,
        account: "",
        status: "completed",
        tags: [],
        recurring: false,
        createdAt: now,
        updatedAt: now,
      }

      await col.insertOne(doc)

      // ── Gamification hooks ──
      try {
        await updateStreak(db, user.userId)
        const xpResult = await awardXP(db, user.userId, 'expense_logged', 5, `Logged: ${description}`)
        await checkBadgeUnlocks(db, user.userId, 'transaction_created')
        if (xpResult.leveledUp) {
          await checkBadgeUnlocks(db, user.userId, 'level_up')
        }
        // Update challenge progress in real-time (not just via daily cron)
        await updateChallengeProgress(db, user.userId)
        // Invalidate badge check cache so next GET reflects changes
        await db.collection('gamification_meta').updateOne(
          { userId: user.userId },
          { $set: { lastBadgeCheck: new Date(0) } },
          { upsert: true },
        )
      } catch (gamErr) {
        // Gamification should not block transaction creation
        console.error('Gamification hook error:', gamErr)
      }

      return NextResponse.json(
        { success: true, transaction: { id: txnId, ...doc } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error("Transaction create error:", getErrorMessage(error))
      return NextResponse.json(
        { success: false, message: "Failed to create transaction." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/transactions
 */
export async function OPTIONS() {
  return handleOptions()
}
