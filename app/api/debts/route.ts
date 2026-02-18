/**
 * Debts CRUD API
 * Manages user debt entries (home loans, car loans, credit cards, etc.) in MongoDB.
 *
 * GET    /api/debts       - List all debts for the user
 * POST   /api/debts       - Create a new debt entry
 * PATCH  /api/debts       - Update an existing debt (body includes id)
 * DELETE /api/debts?id=x  - Delete a debt by ObjectId
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

/** Valid debt types for validation. */
const VALID_DEBT_TYPES = [
  "home_loan",
  "car_loan",
  "personal_loan",
  "education_loan",
  "credit_card",
  "other",
] as const

type DebtType = (typeof VALID_DEBT_TYPES)[number]

/** Valid status values for debts. */
const VALID_STATUSES = ["active", "closed"] as const

type DebtStatus = (typeof VALID_STATUSES)[number]

/**
 * Convert a MongoDB document to an API response object,
 * mapping _id to id and removing the raw _id field.
 */
function toDebtResponse(doc: Record<string, unknown>) {
  return {
    id: (doc._id as ObjectId)?.toString?.() || doc._id,
    ...doc,
    _id: undefined,
  }
}

/**
 * Validate that a string is a recognized debt type.
 */
function isValidDebtType(type: string): type is DebtType {
  return (VALID_DEBT_TYPES as readonly string[]).includes(type)
}

/**
 * Validate that a string is a recognized debt status.
 */
function isValidStatus(status: string): status is DebtStatus {
  return (VALID_STATUSES as readonly string[]).includes(status)
}

/**
 * GET /api/debts
 * List all debts for the authenticated user, sorted by startDate descending.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const debts = await db
        .collection("debts")
        .find({ userId: user.userId })
        .sort({ startDate: -1 })
        .toArray()

      const mapped = debts.map((d) =>
        toDebtResponse(d as Record<string, unknown>)
      )

      return NextResponse.json(
        { success: true, debts: mapped },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch debts" },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/debts
 * Create a new debt entry for the authenticated user.
 * Required fields: name, type, principal, interestRate, emiAmount, tenure, startDate
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()

      // Validate required string fields
      const name = typeof body.name === "string" ? body.name.trim() : ""
      const type = typeof body.type === "string" ? body.type.trim() : ""
      const startDate = typeof body.startDate === "string" ? body.startDate.trim() : ""

      if (!name) {
        return NextResponse.json(
          { success: false, message: "Name is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!type || !isValidDebtType(type)) {
        return NextResponse.json(
          { success: false, message: "Invalid or missing debt type." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!startDate) {
        return NextResponse.json(
          { success: false, message: "Start date is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      // Validate required numeric fields
      const principal = Number(body.principal)
      const interestRate = Number(body.interestRate)
      const emiAmount = Number(body.emiAmount)
      const tenure = Number(body.tenure)

      if (!Number.isFinite(principal) || principal <= 0) {
        return NextResponse.json(
          { success: false, message: "Principal must be a positive number." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!Number.isFinite(interestRate) || interestRate < 0) {
        return NextResponse.json(
          { success: false, message: "Interest rate must be a non-negative number." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!Number.isFinite(emiAmount) || emiAmount <= 0) {
        return NextResponse.json(
          { success: false, message: "EMI amount must be a positive number." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!Number.isFinite(tenure) || tenure <= 0 || !Number.isInteger(tenure)) {
        return NextResponse.json(
          { success: false, message: "Tenure must be a positive integer (months)." },
          { status: 400, headers: corsHeaders() }
        )
      }

      // Optional fields
      const paidEMIs = body.paidEMIs !== undefined ? Number(body.paidEMIs) : 0
      const remainingBalance = body.remainingBalance !== undefined
        ? Number(body.remainingBalance)
        : principal
      const status: DebtStatus = body.status === "closed" ? "closed" : "active"
      const notes = typeof body.notes === "string" ? body.notes.trim() || undefined : undefined

      if (!Number.isFinite(paidEMIs) || paidEMIs < 0) {
        return NextResponse.json(
          { success: false, message: "Paid EMIs must be a non-negative number." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!Number.isFinite(remainingBalance) || remainingBalance < 0) {
        return NextResponse.json(
          { success: false, message: "Remaining balance must be a non-negative number." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const now = new Date().toISOString()
      const doc = {
        userId: user.userId,
        name,
        type,
        principal,
        interestRate,
        emiAmount,
        tenure,
        startDate,
        paidEMIs,
        remainingBalance,
        status,
        notes,
        createdAt: now,
        updatedAt: now,
      }

      const db = await getMongoDb()
      const result = await db.collection("debts").insertOne(doc)

      return NextResponse.json(
        {
          success: true,
          debt: { id: result.insertedId.toString(), ...doc, _id: undefined },
        },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to create debt." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * PATCH /api/debts
 * Update an existing debt entry. Body must include { id, ...fields }.
 * Only provided fields are updated.
 */
export async function PATCH(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const id = typeof body.id === "string" ? body.id.trim() : ""

      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid debt id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const updates: Record<string, unknown> = {}

      // String fields
      if (typeof body.name === "string" && body.name.trim()) {
        updates.name = body.name.trim()
      }
      if (typeof body.type === "string" && isValidDebtType(body.type)) {
        updates.type = body.type
      }
      if (typeof body.startDate === "string" && body.startDate.trim()) {
        updates.startDate = body.startDate.trim()
      }
      if (typeof body.status === "string" && isValidStatus(body.status)) {
        updates.status = body.status
      }
      if (body.notes !== undefined) {
        updates.notes = typeof body.notes === "string" ? body.notes.trim() || undefined : undefined
      }

      // Numeric fields
      if (body.principal !== undefined) {
        const v = Number(body.principal)
        if (Number.isFinite(v) && v > 0) updates.principal = v
      }
      if (body.interestRate !== undefined) {
        const v = Number(body.interestRate)
        if (Number.isFinite(v) && v >= 0) updates.interestRate = v
      }
      if (body.emiAmount !== undefined) {
        const v = Number(body.emiAmount)
        if (Number.isFinite(v) && v > 0) updates.emiAmount = v
      }
      if (body.tenure !== undefined) {
        const v = Number(body.tenure)
        if (Number.isFinite(v) && v > 0 && Number.isInteger(v)) updates.tenure = v
      }
      if (body.paidEMIs !== undefined) {
        const v = Number(body.paidEMIs)
        if (Number.isFinite(v) && v >= 0) updates.paidEMIs = v
      }
      if (body.remainingBalance !== undefined) {
        const v = Number(body.remainingBalance)
        if (Number.isFinite(v) && v >= 0) updates.remainingBalance = v
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      updates.updatedAt = new Date().toISOString()

      const db = await getMongoDb()
      const result = await db.collection("debts").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "Debt not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      const updated = await db
        .collection("debts")
        .findOne({ _id: new ObjectId(id) })

      return NextResponse.json(
        {
          success: true,
          debt: updated
            ? toDebtResponse(updated as Record<string, unknown>)
            : null,
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update debt." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/debts?id=xxx
 * Delete a debt entry by its ObjectId.
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get("id")

      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid debt id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db
        .collection("debts")
        .deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete debt." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/debts
 * CORS preflight handler.
 */
export async function OPTIONS() {
  return handleOptions()
}
