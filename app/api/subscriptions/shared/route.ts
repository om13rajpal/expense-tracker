/**
 * Shared Subscriptions API
 * Manages shared subscription member details and split configurations.
 *
 * GET   /api/subscriptions/shared     - List all shared subscriptions with member details
 * PATCH /api/subscriptions/shared     - Update sharing configuration for a subscription
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"
import { createSplitsGroupForSubscription, type SharedMember } from "@/lib/subscription-splits"

/** GET /api/subscriptions/shared - List all shared subscriptions with full member details. */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const subscriptions = await db
        .collection("subscriptions")
        .find({ userId: user.userId, isShared: true })
        .sort({ nextExpected: 1 })
        .toArray()

      const result = subscriptions.map((doc) => ({
        ...doc,
        _id: doc._id.toString(),
      }))

      return NextResponse.json(
        { success: true, subscriptions: result },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("GET /api/subscriptions/shared error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to load shared subscriptions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/** PATCH /api/subscriptions/shared - Update sharing members, shares, notifications. */
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

      const now = new Date().toISOString()
      const updates: Record<string, unknown> = { updatedAt: now }

      // Update shared members
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
        updates.totalMembers = body.sharedWith.length + 1 // members + the user
      }

      if (typeof body.userShare === "number") updates.userShare = body.userShare
      if (typeof body.paidByUser === "boolean") updates.paidByUser = body.paidByUser
      if (typeof body.autoCreateSplitExpense === "boolean") updates.autoCreateSplitExpense = body.autoCreateSplitExpense

      // If subscription was not previously shared, create a splits group
      if (!existing.isShared && Array.isArray(body.sharedWith) && body.sharedWith.length > 0) {
        updates.isShared = true
        const groupId = await createSplitsGroupForSubscription(
          user.userId,
          id,
          existing.name,
          body.sharedWith
        )
        updates.splitGroupId = groupId
      }

      // If removing all shared members, mark as not shared
      if (Array.isArray(body.sharedWith) && body.sharedWith.length === 0) {
        updates.isShared = false
        updates.sharedWith = []
        updates.totalMembers = 1
        updates.splitGroupId = null
      }

      await db.collection("subscriptions").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      // Update the splits group if it exists
      if (existing.splitGroupId && Array.isArray(body.sharedWith) && body.sharedWith.length > 0) {
        await db.collection("splits_groups").updateOne(
          { _id: new ObjectId(existing.splitGroupId), userId: user.userId },
          {
            $set: {
              members: updates.sharedWith,
              updatedAt: now,
            },
          }
        )
      }

      const updated = await db.collection("subscriptions").findOne({ _id: new ObjectId(id) })
      return NextResponse.json(
        {
          success: true,
          subscription: updated ? { ...updated, _id: updated._id.toString() } : null,
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("PATCH /api/subscriptions/shared error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to update shared subscription." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/** OPTIONS /api/subscriptions/shared - CORS preflight. */
export async function OPTIONS() {
  return handleOptions()
}
