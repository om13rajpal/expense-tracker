/**
 * Subscription auto-detection API.
 *
 * Analyses the last 3 months of expense transactions to identify recurring
 * payment patterns (similar amounts at regular intervals). Cross-references
 * with existing subscriptions to flag already-tracked merchants.
 *
 * GET /api/subscriptions/detect - Returns detected recurring patterns
 *
 * @module app/api/subscriptions/detect
 */
import { NextRequest, NextResponse } from "next/server"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()

      // Get transactions from last 3 months
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const transactions = await db.collection("transactions")
        .find({
          userId: user.userId,
          type: "expense",
          date: { $gte: threeMonthsAgo.toISOString() },
        })
        .sort({ date: -1 })
        .toArray()

      // Group by normalized merchant
      const merchantGroups = new Map<string, Array<{ amount: number; date: string; description: string }>>()

      for (const txn of transactions) {
        const desc = (txn.description as string || "").toUpperCase()
        // Extract merchant name (first meaningful word after UPI/transfer prefixes)
        const merchant = desc
          .replace(/^(WDL TFR UPI\/DR\/\d+\/|DEP TFR IMPS\/\d+\/|WDL TFR UPI\/CR\/\d+\/)/, "")
          .split("/")[0]
          .trim()

        if (!merchant || merchant.length < 3) continue

        if (!merchantGroups.has(merchant)) merchantGroups.set(merchant, [])
        merchantGroups.get(merchant)!.push({
          amount: Math.abs(txn.amount as number),
          date: txn.date as string,
          description: txn.description as string,
        })
      }

      // Identify recurring patterns
      const existingSubs = await db.collection("subscriptions")
        .find({ userId: user.userId })
        .toArray()
      const existingNames = new Set(existingSubs.map(s => (s.name as string).toUpperCase()))

      const detected: Array<{
        merchant: string
        avgAmount: number
        frequency: string
        lastDate: string
        occurrences: number
        alreadyTracked: boolean
      }> = []

      for (const [merchant, entries] of merchantGroups) {
        if (entries.length < 2) continue

        // Check if amounts are similar (within 20% of average)
        const amounts = entries.map(e => e.amount)
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
        const allSimilar = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.2)
        if (!allSimilar) continue

        // Check cadence
        const dates = entries.map(e => new Date(e.date).getTime()).sort((a, b) => b - a)
        if (dates.length >= 2) {
          const gaps: number[] = []
          for (let i = 0; i < dates.length - 1; i++) {
            gaps.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24))
          }
          const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length

          let frequency = "monthly"
          if (avgGap >= 5 && avgGap <= 10) frequency = "weekly"
          else if (avgGap >= 25 && avgGap <= 35) frequency = "monthly"
          else if (avgGap >= 350 && avgGap <= 380) frequency = "yearly"
          else continue // Not a recognizable frequency

          const alreadyTracked = existingNames.has(merchant) ||
            existingSubs.some(s => merchant.includes((s.name as string).toUpperCase()))

          detected.push({
            merchant: entries[0].description.split("/").find(p => p.trim().length > 2 && !/^\d+$/.test(p.trim())) || merchant,
            avgAmount: Math.round(avgAmount),
            frequency,
            lastDate: entries[0].date,
            occurrences: entries.length,
            alreadyTracked,
          })
        }
      }

      // Sort by occurrences descending
      detected.sort((a, b) => b.occurrences - a.occurrences)

      return NextResponse.json(
        { success: true, detected: detected.slice(0, 20) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("GET /api/subscriptions/detect error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to detect subscriptions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
