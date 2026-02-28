/**
 * Subscription Payment Detection API
 *
 * POST /api/subscriptions/check-payments
 * For each active subscription, searches transactions in a ±5 day window around
 * nextExpected to detect if a payment has been made. Updates lastCharged,
 * nextExpected, and pushes to paymentHistory on match.
 *
 * Body: { subscriptionId?: string } — optional, to check a single subscription.
 */
import { NextRequest, NextResponse } from "next/server"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { checkSubscriptionPayments } from "@/lib/check-subscription-payments"

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json().catch(() => ({}))
      const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : null

      const db = await getMongoDb()
      const { results, summary } = await checkSubscriptionPayments(db, user.userId, subscriptionId)

      return NextResponse.json(
        { success: true, results, summary },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("POST /api/subscriptions/check-payments error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to check payments." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
