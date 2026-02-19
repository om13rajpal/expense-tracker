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
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { fuzzyMatch } from "@/lib/categorizer"

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

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json().catch(() => ({}))
      const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : null

      const db = await getMongoDb()

      // Build query for subscriptions to check
      const subQuery: Record<string, unknown> = {
        userId: user.userId,
        status: "active",
      }
      if (subscriptionId) {
        subQuery._id = new ObjectId(subscriptionId)
      }

      const subscriptions = await db
        .collection("subscriptions")
        .find(subQuery)
        .toArray()

      if (subscriptions.length === 0) {
        return NextResponse.json(
          { success: true, results: [], message: "No active subscriptions to check." },
          { status: 200, headers: corsHeaders() }
        )
      }

      // Get transactions from the past 60 days for matching
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 60)

      const transactions = await db
        .collection("transactions")
        .find({
          userId: user.userId,
          type: "expense",
          date: { $gte: cutoff.toISOString().split("T")[0] },
        })
        .sort({ date: -1 })
        .toArray()

      const results: Array<{
        subscriptionId: string
        name: string
        status: "matched" | "unmatched"
        matchedTransaction?: { id: string; date: string; amount: number; merchant: string }
        updatedNextExpected?: string
      }> = []

      const now = new Date().toISOString()

      for (const sub of subscriptions) {
        const subId = sub._id.toString()
        const searchPattern = sub.merchantPattern || sub.name
        const nextExpected = sub.nextExpected || ""
        const existingHistory: Array<{ transactionId?: string }> = sub.paymentHistory || []
        const existingTxnIds = new Set(
          existingHistory.filter((h) => h.transactionId).map((h) => h.transactionId)
        )

        // Find matching transactions in ±5 day window around nextExpected
        const expectedDate = new Date(nextExpected)
        const windowStart = new Date(expectedDate)
        windowStart.setDate(windowStart.getDate() - 5)
        const windowEnd = new Date(expectedDate)
        windowEnd.setDate(windowEnd.getDate() + 5)

        // Also check recent past (in case nextExpected is stale)
        const recentWindow = new Date()
        recentWindow.setDate(recentWindow.getDate() - 10)

        let matchedTxn = null

        for (const txn of transactions) {
          const txnDate = new Date(txn.date)
          const inExpectedWindow = txnDate >= windowStart && txnDate <= windowEnd
          const inRecentWindow = txnDate >= recentWindow

          if (!inExpectedWindow && !inRecentWindow) continue

          // Skip already-tracked payments
          if (existingTxnIds.has(txn._id.toString())) continue

          // Fuzzy match merchant/description against subscription pattern
          const searchText = `${txn.merchant || ""} ${txn.description || ""}`
          if (!fuzzyMatch(searchText, searchPattern)) continue

          // Amount tolerance: 20%
          const txnAmount = Math.abs(txn.amount)
          const subAmount = sub.amount
          if (subAmount > 0 && Math.abs(txnAmount - subAmount) / subAmount > 0.2) continue

          matchedTxn = txn
          break
        }

        if (matchedTxn) {
          const paidDate = (matchedTxn.date as string).split("T")[0]
          const newNextExpected = computeNextExpected(paidDate, sub.frequency || "monthly")

          const paymentEntry = {
            date: paidDate,
            amount: Math.abs(matchedTxn.amount),
            transactionId: matchedTxn._id.toString(),
            auto: true,
            detectedAt: now,
          }

          await db.collection("subscriptions").updateOne(
            { _id: sub._id },
            {
              $set: {
                lastCharged: paidDate,
                nextExpected: newNextExpected,
                updatedAt: now,
              },
              $push: { paymentHistory: paymentEntry } as unknown as Record<string, never>,
            }
          )

          results.push({
            subscriptionId: subId,
            name: sub.name,
            status: "matched",
            matchedTransaction: {
              id: matchedTxn._id.toString(),
              date: paidDate,
              amount: Math.abs(matchedTxn.amount),
              merchant: matchedTxn.merchant || matchedTxn.description || "",
            },
            updatedNextExpected: newNextExpected,
          })
        } else {
          results.push({
            subscriptionId: subId,
            name: sub.name,
            status: "unmatched",
          })
        }
      }

      const matchedCount = results.filter((r) => r.status === "matched").length
      return NextResponse.json(
        {
          success: true,
          results,
          summary: {
            checked: results.length,
            matched: matchedCount,
            unmatched: results.length - matchedCount,
          },
        },
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
