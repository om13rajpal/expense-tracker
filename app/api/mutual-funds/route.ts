/**
 * Mutual Funds Holdings CRUD API
 * Manages the user's mutual fund portfolio in MongoDB.
 *
 * GET    /api/mutual-funds       - List all mutual fund holdings
 * POST   /api/mutual-funds       - Bulk-import funds via { items: [...] }
 * PUT    /api/mutual-funds?id=x  - Update an existing fund
 * DELETE /api/mutual-funds?id=x  - Delete a fund by ObjectId
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

/**
 * Convert a MongoDB mutual fund document to an API response object,
 * transforming the `_id` ObjectId to a string representation.
 *
 * @param doc - Raw MongoDB document from the `mutual_funds` collection
 * @returns The document with `_id` converted to a string
 */
function toFundResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

/**
 * GET /api/mutual-funds
 * List all mutual fund holdings for the authenticated user, sorted by creation date (newest first).
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, items: Array<MutualFundHolding> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const funds = await db
        .collection("mutual_funds")
        .find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .toArray()

      return NextResponse.json(
        { success: true, items: funds.map(toFundResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to load mutual funds." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/mutual-funds
 * Bulk-import mutual fund holdings. Validates each item for required fields.
 * When `replaceAll: true`, deletes all existing holdings before import.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {Array<{ schemeName, units, investedValue, currentValue, amc?, category?, subCategory?, folioNumber?, source?, returns?, xirr? }>} items - Array of fund holdings (required)
 * @body {boolean} [replaceAll] - If true, deletes all existing holdings before import
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

      if (items) {
        const replaceAll = body.replaceAll === true
        const db = await getMongoDb()

        if (replaceAll) {
          await db.collection("mutual_funds").deleteMany({ userId: user.userId })
        }

        const now = new Date().toISOString()
        const docs = [] as Record<string, unknown>[]
        const errors: Array<{ index: number; message: string }> = []

        items.forEach((item: Record<string, unknown>, index: number) => {
          const schemeName = typeof item.schemeName === "string" ? item.schemeName.trim() : ""
          const amc = typeof item.amc === "string" ? item.amc.trim() : undefined
          const category = typeof item.category === "string" ? item.category.trim() : undefined
          const subCategory = typeof item.subCategory === "string" ? item.subCategory.trim() : undefined
          const folioNumber = typeof item.folioNumber === "string" ? item.folioNumber.trim() : undefined
          const source = typeof item.source === "string" ? item.source.trim() : undefined
          const units = Number(item.units)
          const investedValue = Number(item.investedValue)
          const currentValue = Number(item.currentValue)
          const returns = Number(item.returns)
          const xirr = typeof item.xirr === "string" ? item.xirr.trim() : null

          if (!schemeName || !Number.isFinite(units) || !Number.isFinite(investedValue) || !Number.isFinite(currentValue)) {
            errors.push({ index, message: "Missing or invalid fields" })
            return
          }

          docs.push({
            userId: user.userId,
            schemeName,
            amc,
            category,
            subCategory,
            folioNumber,
            source,
            units,
            investedValue,
            currentValue,
            returns: Number.isFinite(returns) ? returns : currentValue - investedValue,
            xirr: xirr === "N/A" ? null : xirr,
            createdAt: now,
            updatedAt: now,
          })
        })

        if (!docs.length) {
          return NextResponse.json(
            { success: false, message: "No valid fund rows.", errors },
            { status: 400, headers: corsHeaders() }
          )
        }

        const result = await db.collection("mutual_funds").insertMany(docs)
        return NextResponse.json(
          { success: true, insertedCount: result.insertedCount, errors },
          { status: 201, headers: corsHeaders() }
        )
      }

      return NextResponse.json(
        { success: false, message: "Missing items payload." },
        { status: 400, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to save mutual funds." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * PUT /api/mutual-funds?id=xxx
 * Update an existing mutual fund holding. Only provided fields are modified.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - Fund holding ObjectId (required, must be valid)
 * @body {string} [schemeName] - Updated scheme name
 * @body {string} [amc] - Updated AMC name
 * @body {number} [units] - Updated units held
 * @body {number} [investedValue] - Updated invested amount
 * @body {number} [currentValue] - Updated current value
 * @body {number} [returns] - Updated returns amount
 *
 * @returns {200} `{ success: true, item: MutualFundHolding | null }`
 * @returns {400} `{ success: false, message: string }` - Invalid ID or no valid fields
 * @returns {404} `{ success: false, message: string }` - Fund not found
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get("id")
      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid fund id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const body = await req.json()
      const updates: Record<string, unknown> = {}

      if (typeof body.schemeName === "string" && body.schemeName.trim()) updates.schemeName = body.schemeName.trim()
      if (typeof body.amc === "string") updates.amc = body.amc.trim()
      if (typeof body.category === "string") updates.category = body.category.trim()
      if (typeof body.subCategory === "string") updates.subCategory = body.subCategory.trim()
      if (typeof body.folioNumber === "string") updates.folioNumber = body.folioNumber.trim()
      if (typeof body.source === "string") updates.source = body.source.trim()
      if (body.units !== undefined) {
        const units = Number(body.units)
        if (Number.isFinite(units)) updates.units = units
      }
      if (body.investedValue !== undefined) {
        const iv = Number(body.investedValue)
        if (Number.isFinite(iv)) updates.investedValue = iv
      }
      if (body.currentValue !== undefined) {
        const cv = Number(body.currentValue)
        if (Number.isFinite(cv)) updates.currentValue = cv
      }
      if (body.returns !== undefined) {
        const r = Number(body.returns)
        if (Number.isFinite(r)) updates.returns = r
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      updates.updatedAt = new Date().toISOString()

      const db = await getMongoDb()
      const result = await db.collection("mutual_funds").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "Fund not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      const updated = await db.collection("mutual_funds").findOne({ _id: new ObjectId(id) })
      return NextResponse.json(
        { success: true, item: updated ? toFundResponse(updated as Record<string, unknown>) : null },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update mutual fund." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/mutual-funds?id=xxx
 * Delete a mutual fund holding by its ObjectId.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - Fund holding ObjectId (required, must be valid)
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
          { success: false, message: "Missing or invalid fund id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("mutual_funds").deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete mutual fund." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/mutual-funds
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
