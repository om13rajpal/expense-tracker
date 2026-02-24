/**
 * Inngest: Subscription Payment Auto-Check
 *
 * Triggered after each daily transaction sync (finance/sync.completed).
 * Runs payment detection logic for all active subscriptions across all
 * synced users. Idempotent via paymentHistory[].transactionId deduplication.
 */
import { inngest } from "@/lib/inngest"
import { getMongoDb } from "@/lib/mongodb"
import { fuzzyMatch } from "@/lib/categorizer"

/**
 * Computes the next expected payment date based on the last payment and frequency.
 * @param from - ISO date string of the last payment.
 * @param frequency - Payment frequency: "weekly", "monthly", or "yearly".
 * @returns ISO date string (YYYY-MM-DD) of the next expected payment.
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

/**
 * Inngest function that auto-detects subscription payments from synced transactions.
 *
 * @trigger `finance/sync.completed` event with `{ userIds }` payload.
 * @workflow For each synced user:
 *   1. Loads all active subscriptions and recent transactions (past 60 days).
 *   2. For each subscription, searches for matching transactions using fuzzy merchant
 *      matching within a +/-5 day window around the expected date, or within the last 10 days.
 *   3. Validates amount tolerance (within 20% of expected).
 *   4. On match: updates lastCharged, computes nextExpected, and appends to paymentHistory.
 *   5. Deduplicates via transactionId in paymentHistory (idempotent).
 * @returns Object with checked and matched subscription counts.
 */
export const subscriptionPaymentCheck = inngest.createFunction(
  {
    id: "subscription-payment-check",
    name: "Auto-detect subscription payments after sync",
  },
  { event: "finance/sync.completed" },
  async ({ event, logger }) => {
    const { userIds } = event.data
    const db = await getMongoDb()
    const now = new Date().toISOString()

    let totalMatched = 0
    let totalChecked = 0

    for (const userId of userIds) {
      const subscriptions = await db
        .collection("subscriptions")
        .find({ userId, status: "active" })
        .toArray()

      if (subscriptions.length === 0) continue

      // Get transactions from past 60 days
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

      for (const sub of subscriptions) {
        totalChecked++
        const searchPattern = sub.merchantPattern || sub.name
        const nextExpected = sub.nextExpected || ""
        const existingHistory: Array<{ transactionId?: string }> = sub.paymentHistory || []
        const existingTxnIds = new Set(
          existingHistory.filter((h) => h.transactionId).map((h) => h.transactionId)
        )

        // ±5 day window around nextExpected
        const expectedDate = new Date(nextExpected)
        const windowStart = new Date(expectedDate)
        windowStart.setDate(windowStart.getDate() - 5)
        const windowEnd = new Date(expectedDate)
        windowEnd.setDate(windowEnd.getDate() + 5)

        const recentWindow = new Date()
        recentWindow.setDate(recentWindow.getDate() - 10)

        let matchedTxn = null

        for (const txn of transactions) {
          const txnDate = new Date(txn.date)
          const inExpectedWindow = txnDate >= windowStart && txnDate <= windowEnd
          const inRecentWindow = txnDate >= recentWindow

          if (!inExpectedWindow && !inRecentWindow) continue
          if (existingTxnIds.has(txn._id.toString())) continue

          const searchText = `${txn.merchant || ""} ${txn.description || ""}`
          if (!fuzzyMatch(searchText, searchPattern)) continue

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

          totalMatched++
          logger.info(`Matched payment for ${sub.name}: ${paidDate} ${Math.abs(matchedTxn.amount)}`)
        }
      }
    }

    logger.info(`Subscription payment check complete: ${totalMatched}/${totalChecked} matched`)
    return { checked: totalChecked, matched: totalMatched }
  }
)
