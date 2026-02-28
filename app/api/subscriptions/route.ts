/**
 * Subscriptions CRUD API
 * Manages recurring subscription entries (Netflix, Spotify, etc.) in MongoDB.
 *
 * GET    /api/subscriptions       - List all subscriptions for the user
 * POST   /api/subscriptions       - Create a new subscription
 * PATCH  /api/subscriptions       - Update an existing subscription (body includes id)
 * DELETE /api/subscriptions?id=x  - Delete a subscription by ObjectId
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"
import { createSplitsGroupForSubscription, createRecurringSplitExpense, notifySubscriptionMembers, type SharedMember } from "@/lib/subscription-splits"

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

/** GET /api/subscriptions - List all subscriptions for the user, sorted by next expected date. */
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

/** POST /api/subscriptions - Create a new subscription. Body: { name, amount, frequency, nextExpected, ... } */
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

      // Optional paymentHistory pass-through (from auto-detection)
      const paymentHistory = Array.isArray(body.paymentHistory) ? body.paymentHistory : undefined

      // Shared subscription fields
      const isShared = body.isShared === true
      const totalMembers = typeof body.totalMembers === "number" ? body.totalMembers : 1
      const userShare = typeof body.userShare === "number" ? body.userShare : amount
      const paidByUser = body.paidByUser !== false // default true
      const sharedWith: SharedMember[] = Array.isArray(body.sharedWith)
        ? body.sharedWith.map((m: SharedMember) => ({
            name: typeof m.name === "string" ? m.name.trim() : "",
            email: typeof m.email === "string" ? m.email.trim() : "",
            phone: typeof m.phone === "string" ? m.phone.trim() : "",
            telegramChatId: typeof m.telegramChatId === "number" ? m.telegramChatId : null,
            share: typeof m.share === "number" ? m.share : 0,
            status: "pending" as const,
            lastPaidDate: null,
          }))
        : []
      const autoCreateSplitExpense = body.autoCreateSplitExpense === true

      const now = new Date().toISOString()
      const doc: Record<string, unknown> = {
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
        ...(paymentHistory && { paymentHistory }),
        // Shared subscription fields
        isShared,
        ...(isShared && {
          totalMembers,
          userShare,
          paidByUser,
          sharedWith,
          autoCreateSplitExpense,
        }),
        createdAt: now,
        updatedAt: now,
      }

      const db = await getMongoDb()
      const result = await db.collection("subscriptions").insertOne(doc)
      const insertedId = result.insertedId.toString()

      // If shared, create a splits group and link it
      if (isShared && sharedWith.length > 0) {
        try {
          const groupId = await createSplitsGroupForSubscription(
            user.userId,
            insertedId,
            name,
            sharedWith
          )
          doc.splitGroupId = groupId
        } catch (err) {
          console.error("Failed to create splits group:", err)
        }
      }

      return NextResponse.json(
        { success: true, subscription: { ...doc, _id: insertedId } },
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

/** PATCH /api/subscriptions - Update an existing subscription. Body: { id, ...fields } */
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

      // ── Mark as Paid shortcut ──
      // When body contains { id, markPaidDate }, treat as a manual "paid" action:
      // set lastCharged to the given date, advance nextExpected by one cycle.
      if (typeof body.markPaidDate === "string") {
        const db = await getMongoDb()
        const existing = await db.collection("subscriptions").findOne({
          _id: new ObjectId(id),
          userId: user.userId,
        })
        if (!existing) {
          return NextResponse.json(
            { success: false, message: "Subscription not found." },
            { status: 404, headers: corsHeaders() }
          )
        }

        const paidDate = body.markPaidDate
        const freq = existing.frequency || "monthly"
        const nextExpected = computeNextExpected(paidDate, freq)
        const now = new Date().toISOString()

        const paymentEntry = {
          date: paidDate,
          amount: existing.amount,
          auto: false,
          detectedAt: now,
        }

        await db.collection("subscriptions").updateOne(
          { _id: new ObjectId(id), userId: user.userId },
          {
            $set: { lastCharged: paidDate, nextExpected, updatedAt: now },
            $push: { paymentHistory: paymentEntry } as unknown as Record<string, never>,
          }
        )

        // If shared subscription with autoCreateSplitExpense, create a split expense and notify
        if (existing.isShared && existing.autoCreateSplitExpense && Array.isArray(existing.sharedWith) && existing.sharedWith.length > 0) {
          try {
            await createRecurringSplitExpense(user.userId, {
              _id: id,
              name: existing.name,
              amount: existing.amount,
              sharedWith: existing.sharedWith,
              userShare: existing.userShare || existing.amount,
              paidByUser: existing.paidByUser !== false,
            })
            // Notify members about the new billing cycle
            await notifySubscriptionMembers(
              user.userId,
              {
                name: existing.name,
                amount: existing.amount,
                frequency: existing.frequency,
                nextExpected,
                sharedWith: existing.sharedWith,
              },
              'payment_due'
            ).catch((err) => console.error("Notification error:", err))
          } catch (err) {
            console.error("Failed to create recurring split expense:", err)
          }
        }

        const updated = await db.collection("subscriptions").findOne({ _id: new ObjectId(id) })
        return NextResponse.json(
          { success: true, subscription: updated ? toResponse(updated as Record<string, unknown>) : null },
          { status: 200, headers: corsHeaders() }
        )
      }

      // ── Standard field updates ──
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

      // Shared subscription fields
      if (typeof body.isShared === "boolean") updates.isShared = body.isShared
      if (typeof body.userShare === "number") updates.userShare = body.userShare
      if (typeof body.paidByUser === "boolean") updates.paidByUser = body.paidByUser
      if (typeof body.autoCreateSplitExpense === "boolean") updates.autoCreateSplitExpense = body.autoCreateSplitExpense
      if (Array.isArray(body.sharedWith)) {
        updates.sharedWith = body.sharedWith.map((m: SharedMember) => ({
          name: typeof m.name === "string" ? m.name.trim() : "",
          email: typeof m.email === "string" ? m.email.trim() : "",
          phone: typeof m.phone === "string" ? m.phone.trim() : "",
          telegramChatId: typeof m.telegramChatId === "number" ? m.telegramChatId : null,
          share: typeof m.share === "number" ? m.share : 0,
          status: (["pending", "paid", "overdue"] as const).includes(m.status) ? m.status : "pending",
          lastPaidDate: typeof m.lastPaidDate === "string" ? m.lastPaidDate : null,
        }))
        updates.totalMembers = body.sharedWith.length + 1
      }
      // Clean up shared fields if toggled off
      if (body.isShared === false) {
        updates.sharedWith = []
        updates.totalMembers = 1
        updates.splitGroupId = null
        updates.autoCreateSplitExpense = false
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      updates.updatedAt = new Date().toISOString()

      const db = await getMongoDb()

      // Support paymentHistory push alongside other updates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateOps: any = { $set: updates }
      if (body.paymentHistoryEntry && typeof body.paymentHistoryEntry === "object") {
        updateOps.$push = { paymentHistory: body.paymentHistoryEntry }
      }

      const result = await db.collection("subscriptions").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        updateOps
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

/** DELETE /api/subscriptions?id=x - Remove a subscription by ObjectId. */
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

/** OPTIONS /api/subscriptions - CORS preflight. */
export async function OPTIONS() {
  return handleOptions()
}
