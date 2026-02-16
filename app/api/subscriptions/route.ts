import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

function toResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

/**
 * Compute the next expected date from a given date and frequency.
 */
function computeNextExpected(from: string, frequency: string): string {
  const d = new Date(from)
  if (isNaN(d.getTime())) return from
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7)
      break
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      break
    case "yearly":
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().split("T")[0]
}

const VALID_FREQUENCIES = ["monthly", "yearly", "weekly"]
const VALID_STATUSES = ["active", "cancelled", "paused"]

// ─── GET: list all subscriptions for the authenticated user ───

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const subscriptions = await db
        .collection("subscriptions")
        .find({ userId: user.userId })
        .sort({ nextExpected: 1 })
        .toArray()

      return NextResponse.json(
        { success: true, subscriptions: subscriptions.map(toResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("GET /api/subscriptions error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to load subscriptions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

// ─── POST: create a new subscription ───

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()

      const name = typeof body.name === "string" ? body.name.trim() : ""
      const amount = Number(body.amount)
      const frequency = VALID_FREQUENCIES.includes(body.frequency) ? body.frequency : null
      const category = typeof body.category === "string" ? body.category.trim() : "Subscription"
      const nextExpected = typeof body.nextExpected === "string" ? body.nextExpected : ""
      const lastCharged = typeof body.lastCharged === "string" ? body.lastCharged : ""
      const status = VALID_STATUSES.includes(body.status) ? body.status : "active"
      const autoDetected = body.autoDetected === true
      const merchantPattern = typeof body.merchantPattern === "string" ? body.merchantPattern.trim() : undefined
      const notes = typeof body.notes === "string" ? body.notes.trim() : undefined

      if (!name || !Number.isFinite(amount) || amount <= 0 || !frequency || !nextExpected) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid fields: name, amount, frequency, and nextExpected are required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const now = new Date().toISOString()
      const doc = {
        userId: user.userId,
        name,
        amount,
        frequency,
        category,
        lastCharged: lastCharged || "",
        nextExpected,
        status,
        autoDetected,
        ...(merchantPattern && { merchantPattern }),
        ...(notes && { notes }),
        createdAt: now,
        updatedAt: now,
      }

      const db = await getMongoDb()
      const result = await db.collection("subscriptions").insertOne(doc)

      return NextResponse.json(
        { success: true, subscription: { ...doc, _id: result.insertedId.toString() } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("POST /api/subscriptions error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to create subscription." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

// ─── PATCH: update an existing subscription ───

export async function PATCH(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const id = typeof body.id === "string" ? body.id : ""

      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid subscription id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const updates: Record<string, unknown> = {}

      if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
      if (body.amount !== undefined) {
        const amt = Number(body.amount)
        if (Number.isFinite(amt) && amt > 0) updates.amount = amt
      }
      if (VALID_FREQUENCIES.includes(body.frequency)) updates.frequency = body.frequency
      if (typeof body.category === "string" && body.category.trim()) updates.category = body.category.trim()
      if (typeof body.lastCharged === "string") updates.lastCharged = body.lastCharged
      if (typeof body.nextExpected === "string") updates.nextExpected = body.nextExpected
      if (VALID_STATUSES.includes(body.status)) updates.status = body.status
      if (typeof body.merchantPattern === "string") updates.merchantPattern = body.merchantPattern.trim()
      if (typeof body.notes === "string") updates.notes = body.notes.trim()

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      updates.updatedAt = new Date().toISOString()

      const db = await getMongoDb()
      const result = await db.collection("subscriptions").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "Subscription not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      const updated = await db.collection("subscriptions").findOne({ _id: new ObjectId(id) })
      return NextResponse.json(
        { success: true, subscription: updated ? toResponse(updated as Record<string, unknown>) : null },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("PATCH /api/subscriptions error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to update subscription." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

// ─── DELETE: remove a subscription by id ───

export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get("id")

      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid subscription id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("subscriptions").deleteOne({
        _id: new ObjectId(id),
        userId: user.userId,
      })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("DELETE /api/subscriptions error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to delete subscription." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

// ─── OPTIONS: CORS preflight ───

export async function OPTIONS() {
  return handleOptions()
}
