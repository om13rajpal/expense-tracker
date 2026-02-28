/**
 * Shared subscription payment detection logic.
 *
 * Matches bank transactions against active subscriptions using fuzzy merchant
 * matching and a ±5 day window around the expected payment date. When a match
 * is found, updates lastCharged, advances nextExpected, and appends to
 * paymentHistory. Called by the check-payments API route and automatically
 * after a sheets sync.
 */
import { ObjectId, Db } from "mongodb"

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

export interface PaymentCheckResult {
  subscriptionId: string
  name: string
  status: "matched" | "unmatched"
  matchedTransaction?: { id: string; date: string; amount: number; merchant: string }
  updatedNextExpected?: string
}

/**
 * Check active subscriptions against recent transactions for automatic payment detection.
 *
 * @param db - MongoDB database instance
 * @param userId - The authenticated user's ID
 * @param subscriptionId - Optional: check a single subscription only
 * @returns Object with per-subscription results and a summary
 */
export async function checkSubscriptionPayments(
  db: Db,
  userId: string,
  subscriptionId?: string | null
) {
  const subQuery: Record<string, unknown> = {
    userId,
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
    return { results: [] as PaymentCheckResult[], summary: { checked: 0, matched: 0, unmatched: 0 } }
  }

  // Get transactions from the past 60 days for matching
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 60)

  const transactions = await db
    .collection("transactions")
    .find({
      userId,
      type: "expense",
      date: { $gte: cutoff.toISOString().split("T")[0] },
    })
    .sort({ date: -1 })
    .toArray()

  const results: PaymentCheckResult[] = []
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
  return {
    results,
    summary: {
      checked: results.length,
      matched: matchedCount,
      unmatched: results.length - matchedCount,
    },
  }
}
