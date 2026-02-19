/**
 * Subscription Lookup API
 *
 * POST /api/subscriptions/lookup
 * Searches past 18 months of expense transactions for a given brand/merchant name
 * using fuzzy matching. Returns matching transactions and a suggestion object
 * with auto-detected amount, frequency, and next expected date.
 */
import { NextRequest, NextResponse } from "next/server"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { fuzzyMatch, cleanBankText } from "@/lib/categorizer"

// Frequency bands reused from lib/recurring.ts logic
const FREQUENCY_BANDS = [
  { label: "weekly" as const, minDays: 5, maxDays: 9, advanceDays: 7 },
  { label: "monthly" as const, minDays: 25, maxDays: 35, advanceDays: 30 },
  { label: "quarterly" as const, minDays: 80, maxDays: 100, advanceDays: 90 },
  { label: "yearly" as const, minDays: 350, maxDays: 380, advanceDays: 365 },
]

function classifyInterval(avgDays: number): (typeof FREQUENCY_BANDS)[number] | null {
  for (const band of FREQUENCY_BANDS) {
    if (avgDays >= band.minDays && avgDays <= band.maxDays) return band
  }
  return null
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
}

function addDaysToDate(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

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
    case "quarterly":
      d.setMonth(d.getMonth() + 3)
      break
    case "yearly":
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().split("T")[0]
}

/**
 * Calculate confidence score based on occurrences, interval consistency, and amount variance.
 * Mirrors logic from lib/recurring-detector.ts
 */
function calculateConfidence(
  occurrences: number,
  intervalConsistency: number,
  amountVariance: number
): number {
  const occurrenceScore = Math.min(1, (occurrences - 1) / 4)
  const intervalScore = intervalConsistency
  const amountScore = Math.max(0, 1 - amountVariance / 50)
  const confidence = occurrenceScore * 0.3 + intervalScore * 0.4 + amountScore * 0.3
  return Math.round(confidence * 100) / 100
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const name = typeof body.name === "string" ? body.name.trim() : ""

      if (!name) {
        return NextResponse.json(
          { success: false, message: "Name is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()

      // Search past 18 months of expense transactions
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - 18)

      const transactions = await db
        .collection("transactions")
        .find({
          userId: user.userId,
          type: "expense",
          date: { $gte: cutoff.toISOString().split("T")[0] },
        })
        .sort({ date: -1 })
        .toArray()

      // Fuzzy match against merchant or description
      const matches = transactions.filter((txn) => {
        const searchText = `${txn.merchant || ""} ${txn.description || ""}`
        return fuzzyMatch(searchText, name)
      })

      // Limit to 5 most recent matches for the response
      const recentMatches = matches.slice(0, 5).map((txn) => ({
        _id: txn._id.toString(),
        date: typeof txn.date === "string" ? txn.date.split("T")[0] : txn.date,
        amount: Math.abs(txn.amount),
        merchant: txn.merchant || "",
        description: txn.description || "",
        category: txn.category || "",
      }))

      if (matches.length === 0) {
        return NextResponse.json(
          { success: true, matches: [], suggestion: null },
          { status: 200, headers: corsHeaders() }
        )
      }

      // Sort all matches by date ascending for interval analysis
      const sorted = [...matches].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      const lastCharged = (sorted[sorted.length - 1].date as string).split("T")[0]
      const amount = Math.abs(sorted[sorted.length - 1].amount)
      const matchedMerchant = sorted[sorted.length - 1].merchant || cleanBankText(sorted[sorted.length - 1].description || name)

      if (matches.length === 1) {
        // Single match: default to monthly, low confidence
        return NextResponse.json(
          {
            success: true,
            matches: recentMatches,
            suggestion: {
              amount,
              lastCharged,
              frequency: "monthly",
              nextExpected: computeNextExpected(lastCharged, "monthly"),
              confidence: 0.3,
              matchedMerchant,
            },
          },
          { status: 200, headers: corsHeaders() }
        )
      }

      // 2+ matches: compute frequency from intervals
      const intervals: number[] = []
      for (let i = 1; i < sorted.length; i++) {
        intervals.push(daysBetween(sorted[i - 1].date as string, sorted[i].date as string))
      }

      const avgInterval = intervals.reduce((sum, d) => sum + d, 0) / intervals.length
      const band = classifyInterval(avgInterval)

      // Frequency detection
      const frequency = band?.label === "quarterly" ? "monthly" : (band?.label || "monthly")
      const advanceDays = band?.advanceDays || 30

      // Interval consistency
      const idealDays = advanceDays
      const deviations = intervals.map((d) => Math.abs(d - idealDays))
      const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length
      const intervalConsistency = Math.max(0, 1 - avgDeviation / (idealDays * 0.5))

      // Amount variance
      const amounts = sorted.map((t) => Math.abs(t.amount))
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length
      const amountVariance =
        avgAmount > 0
          ? (amounts.reduce((s, a) => s + Math.abs(a - avgAmount), 0) / amounts.length / avgAmount) * 100
          : 0

      const confidence = calculateConfidence(matches.length, intervalConsistency, amountVariance)

      const nextExpected = band
        ? addDaysToDate(lastCharged, advanceDays)
        : computeNextExpected(lastCharged, frequency)

      return NextResponse.json(
        {
          success: true,
          matches: recentMatches,
          suggestion: {
            amount: Math.round(avgAmount),
            lastCharged,
            frequency,
            nextExpected,
            confidence,
            matchedMerchant,
          },
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("POST /api/subscriptions/lookup error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to lookup subscription." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
