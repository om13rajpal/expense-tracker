/**
 * SIPs (Systematic Investment Plans) CRUD API
 * Manages the user's SIP portfolio in MongoDB.
 *
 * GET    /api/sips       - List all SIPs
 * POST   /api/sips       - Add a single SIP or bulk-import via { items: [...] }
 * PUT    /api/sips?id=x  - Update an existing SIP
 * DELETE /api/sips?id=x  - Delete a SIP by ObjectId
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

/**
 * Convert a MongoDB SIP document to an API response object,
 * transforming the `_id` ObjectId to a string representation.
 *
 * @param doc - Raw MongoDB document from the `sips` collection
 * @returns The document with `_id` converted to a string
 */
function toSipResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

/**
 * GET /api/sips
 * List all SIPs for the authenticated user, sorted by creation date (newest first).
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, items: Array<SIP> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const sips = await db
        .collection("sips")
        .find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .toArray()

      return NextResponse.json(
        { success: true, items: sips.map(toSipResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to load SIPs." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/sips
 * Add a single SIP or bulk-import multiple SIPs.
 * When `items` array is provided, performs a bulk insert.
 * When `replaceAll: true` is set with bulk import, deletes all existing SIPs first.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} name - SIP/fund name (required)
 * @body {string} provider - Fund provider/AMC name (required)
 * @body {number} monthlyAmount - Monthly SIP amount in INR (required, > 0)
 * @body {string} startDate - SIP start date ISO string (required)
 * @body {number} [expectedAnnualReturn] - Expected annual return percentage
 * @body {string} [status="active"] - One of "active", "paused", "cancelled"
 * @body {Array} [items] - Bulk import array (same fields as above per item)
 * @body {boolean} [replaceAll] - If true with items, deletes all before import
 *
 * @returns {201} `{ success: true, item: SIP }` (single) or `{ success: true, insertedCount, errors }` (bulk)
 * @returns {400} `{ success: false, message: string }` - Missing or invalid fields
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const items = Array.isArray(body.items) ? body.items : null

      if (items) {
        const replaceAll = body.replaceAll === true
        const db = await getMongoDb()

        if (replaceAll) {
          await db.collection("sips").deleteMany({ userId: user.userId })
        }

        const now = new Date().toISOString()
        const docs = [] as Record<string, unknown>[]
        const errors: Array<{ index: number; message: string }> = []

        items.forEach((item: Record<string, unknown>, index: number) => {
          const name = typeof item.name === "string" ? item.name.trim() : ""
          const provider = typeof item.provider === "string" ? item.provider.trim() : ""
          const monthlyAmount = Number(item.monthlyAmount)
          const startDate = typeof item.startDate === "string" ? item.startDate : ""
          const expectedAnnualReturn = item.expectedAnnualReturn === "" || item.expectedAnnualReturn == null
            ? undefined
            : Number(item.expectedAnnualReturn)
          const status = item.status === "paused" || item.status === "cancelled" ? item.status : "active"

          if (!name || !provider || !startDate || !Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
            errors.push({ index, message: "Missing or invalid fields" })
            return
          }

          if (expectedAnnualReturn !== undefined && !Number.isFinite(expectedAnnualReturn)) {
            errors.push({ index, message: "Expected return must be a number" })
            return
          }

          docs.push({
            userId: user.userId,
            name,
            provider,
            monthlyAmount,
            startDate,
            expectedAnnualReturn,
            status,
            createdAt: now,
            updatedAt: now,
          })
        })

        if (!docs.length) {
          return NextResponse.json(
            { success: false, message: "No valid SIP rows.", errors },
            { status: 400, headers: corsHeaders() }
          )
        }

        const result = await db.collection("sips").insertMany(docs)
        return NextResponse.json(
          { success: true, insertedCount: result.insertedCount, errors },
          { status: 201, headers: corsHeaders() }
        )
      }

      const name = typeof body.name === "string" ? body.name.trim() : ""
      const provider = typeof body.provider === "string" ? body.provider.trim() : ""
      const monthlyAmount = Number(body.monthlyAmount)
      const startDate = typeof body.startDate === "string" ? body.startDate : ""
      const expectedAnnualReturn = body.expectedAnnualReturn === "" || body.expectedAnnualReturn === null
        ? undefined
        : Number(body.expectedAnnualReturn)
      const status = body.status === "paused" || body.status === "cancelled" ? body.status : "active"

      if (!name || !provider || !startDate || !Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid SIP fields." },
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
        name,
        provider,
        monthlyAmount,
        startDate,
        expectedAnnualReturn,
        status,
        createdAt: now,
        updatedAt: now,
      }

      const db = await getMongoDb()
      const result = await db.collection("sips").insertOne(doc)

      return NextResponse.json(
        { success: true, item: { ...doc, _id: result.insertedId.toString() } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to save SIP." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * PUT /api/sips?id=xxx
 * Update an existing SIP. Only provided fields are modified.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - SIP ObjectId (required, must be valid)
 * @body {string} [name] - Updated SIP name
 * @body {string} [provider] - Updated provider
 * @body {number} [monthlyAmount] - Updated monthly amount
 * @body {string} [startDate] - Updated start date
 * @body {number|null} [expectedAnnualReturn] - Updated expected return
 * @body {string} [status] - Updated status ("active", "paused", "cancelled")
 *
 * @returns {200} `{ success: true, item: SIP | null }`
 * @returns {400} `{ success: false, message: string }` - Invalid ID or no valid fields
 * @returns {404} `{ success: false, message: string }` - SIP not found
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get("id")
      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid SIP id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const body = await req.json()
      const updates: Record<string, unknown> = {}

      if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
      if (typeof body.provider === "string" && body.provider.trim()) updates.provider = body.provider.trim()
      if (body.monthlyAmount !== undefined) {
        const amount = Number(body.monthlyAmount)
        if (Number.isFinite(amount) && amount > 0) updates.monthlyAmount = amount
      }
      if (typeof body.startDate === "string" && body.startDate) updates.startDate = body.startDate
      if (body.expectedAnnualReturn !== undefined) {
        const ear = body.expectedAnnualReturn === "" || body.expectedAnnualReturn === null
          ? undefined
          : Number(body.expectedAnnualReturn)
        if (ear === undefined || Number.isFinite(ear)) updates.expectedAnnualReturn = ear
      }
      if (body.status === "active" || body.status === "paused" || body.status === "cancelled") {
        updates.status = body.status
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      updates.updatedAt = new Date().toISOString()

      const db = await getMongoDb()
      const result = await db.collection("sips").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "SIP not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      const updated = await db.collection("sips").findOne({ _id: new ObjectId(id) })
      return NextResponse.json(
        { success: true, item: updated ? toSipResponse(updated as Record<string, unknown>) : null },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update SIP." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/sips?id=xxx
 * Delete a SIP by its ObjectId.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - SIP ObjectId (required, must be valid)
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
          { success: false, message: "Missing or invalid sip id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("sips").deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete SIP." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/sips
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
