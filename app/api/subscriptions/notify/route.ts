/**
 * Subscription Notification API
 * Sends email/Telegram notifications to shared subscription members.
 *
 * POST /api/subscriptions/notify
 * Body: { subscriptionId, memberIndex?, type: 'reminder' | 'new_share' }
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"
import { notifySubscriptionMembers, type SharedMember } from "@/lib/subscription-splits"

/** POST /api/subscriptions/notify - Send notifications to shared subscription members. */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : ""
      const memberIndex = typeof body.memberIndex === "number" ? body.memberIndex : null
      const type = body.type === "new_share" ? "new_share" : "renewal_reminder" as const

      if (!subscriptionId || !isValidObjectId(subscriptionId)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid subscriptionId." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const subscription = await db.collection("subscriptions").findOne({
        _id: new ObjectId(subscriptionId),
        userId: user.userId,
      })

      if (!subscription) {
        return NextResponse.json(
          { success: false, message: "Subscription not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      if (!subscription.isShared || !Array.isArray(subscription.sharedWith) || subscription.sharedWith.length === 0) {
        return NextResponse.json(
          { success: false, message: "This subscription is not shared with anyone." },
          { status: 400, headers: corsHeaders() }
        )
      }

      // Determine which members to notify
      let membersToNotify: SharedMember[] = subscription.sharedWith
      if (memberIndex !== null) {
        if (memberIndex < 0 || memberIndex >= subscription.sharedWith.length) {
          return NextResponse.json(
            { success: false, message: "Invalid member index." },
            { status: 400, headers: corsHeaders() }
          )
        }
        membersToNotify = [subscription.sharedWith[memberIndex]]
      }

      const result = await notifySubscriptionMembers(
        user.userId,
        {
          name: subscription.name,
          amount: subscription.amount,
          frequency: subscription.frequency,
          nextExpected: subscription.nextExpected,
          sharedWith: membersToNotify,
        },
        type
      )

      return NextResponse.json(
        {
          success: true,
          emailsSent: result.emailsSent,
          telegramSent: result.telegramSent,
          message: `Sent ${result.emailsSent} email(s) and ${result.telegramSent} Telegram message(s).`,
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("POST /api/subscriptions/notify error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to send notifications." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/** OPTIONS /api/subscriptions/notify - CORS preflight. */
export async function OPTIONS() {
  return handleOptions()
}
