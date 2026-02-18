/**
 * Recurring Transaction Detection API
 *
 * GET /api/recurring
 * Analyzes the last 6 months of transactions to detect recurring patterns
 * (subscriptions, EMIs, rent, etc.) using merchant/amount clustering.
 * Optional query params: tolerance (amount tolerance fraction), minCount (min occurrences).
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { detectRecurring } from "@/lib/recurring"
import type { TransactionInput } from "@/lib/recurring"

/**
 * GET /api/recurring
 *
 * Returns detected recurring transactions based on the last 6 months of data.
 * Optional query params:
 *   - tolerance  (number, default 0.10)  amount tolerance fraction
 *   - minCount   (number, default 2)     minimum occurrences
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const searchParams = req.nextUrl.searchParams

      // Optional detection parameters
      const toleranceParam = searchParams.get("tolerance")
      const minCountParam = searchParams.get("minCount")
      const amountTolerance = toleranceParam ? parseFloat(toleranceParam) : undefined
      const minOccurrences = minCountParam ? parseInt(minCountParam, 10) : undefined

      // Calculate 6 months ago from today
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const cutoffDate = sixMonthsAgo.toISOString()

      const db = await getMongoDb()
      const col = db.collection("transactions")

      const docs = await col
        .find({
          userId: user.userId,
          date: { $gte: cutoffDate },
        })
        .sort({ date: -1 })
        .toArray()

      // Map MongoDB docs to the shape expected by detectRecurring
      const transactions: TransactionInput[] = docs.map((doc) => ({
        id: doc.txnId || (doc._id as ObjectId).toString(),
        date: doc.date as string,
        merchant: (doc.merchant as string) || "",
        amount: doc.amount as number,
        category: (doc.category as string) || "Uncategorized",
        description: (doc.description as string) || "",
      }))

      const recurring = detectRecurring(transactions, {
        ...(amountTolerance !== undefined && !isNaN(amountTolerance)
          ? { amountTolerance }
          : {}),
        ...(minOccurrences !== undefined && !isNaN(minOccurrences)
          ? { minOccurrences }
          : {}),
      })

      return NextResponse.json(
        {
          success: true,
          recurring,
          count: recurring.length,
          analyzedTransactions: transactions.length,
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("Recurring detection error:", message)
      return NextResponse.json(
        { success: false, message: "Failed to detect recurring transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
