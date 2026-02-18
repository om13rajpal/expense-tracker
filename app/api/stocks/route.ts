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

function toStockResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

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

export async function OPTIONS() {
  return handleOptions()
}
