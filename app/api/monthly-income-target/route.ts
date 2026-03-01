/**
 * Monthly Income Target API — lightweight per-month income goals.
 * Supports GET (current month target + actual income), POST (upsert),
 * and DELETE (remove current month target).
 * @module app/api/monthly-income-target/route
 */
import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { withAuth, handleOptions, corsHeaders } from "@/lib/middleware"

/** Current month key in YYYY-MM format. */
function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** Start and end dates for the current month. */
function currentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = new Date(year, month, 1).toISOString()
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()
  return { start, end }
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const month = currentMonthKey()

      // Fetch target for current month
      const target = await db
        .collection("monthly_income_targets")
        .findOne({ userId: user.userId, month })

      // Sum actual income transactions this month
      const { start, end } = currentMonthRange()
      const pipeline = [
        {
          $match: {
            userId: user.userId,
            type: "income",
            date: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]
      const [agg] = await db
        .collection("transactions")
        .aggregate(pipeline)
        .toArray()
      const actualIncome = agg?.total ?? 0

      const targetAmount = target?.target ?? null
      const percentage =
        targetAmount && targetAmount > 0
          ? Math.round((actualIncome / targetAmount) * 100)
          : null
      const achieved = targetAmount ? actualIncome >= targetAmount : false

      let status: "achieved" | "on-track" | "behind" | null = null
      if (targetAmount) {
        if (achieved) {
          status = "achieved"
        } else {
          // Check if on track based on day of month
          const now = new Date()
          const dayOfMonth = now.getDate()
          const daysInMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
          ).getDate()
          const expectedByNow = targetAmount * (dayOfMonth / daysInMonth)
          status = actualIncome >= expectedByNow * 0.8 ? "on-track" : "behind"
        }
      }

      return NextResponse.json(
        {
          success: true,
          month,
          target: targetAmount,
          actualIncome,
          percentage,
          achieved,
          status,
        },
        { headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to fetch monthly income target: ${error instanceof Error ? error.message : error}`,
        },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const { target } = body

      if (typeof target !== "number" || target <= 0) {
        return NextResponse.json(
          { success: false, message: "Target must be a positive number" },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const month = currentMonthKey()
      const now = new Date().toISOString()

      await db.collection("monthly_income_targets").updateOne(
        { userId: user.userId, month },
        {
          $set: { target, updatedAt: now },
          $setOnInsert: { userId: user.userId, month, createdAt: now },
        },
        { upsert: true }
      )

      return NextResponse.json(
        { success: true, month, target },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to set monthly income target: ${error instanceof Error ? error.message : error}`,
        },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function DELETE(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const month = currentMonthKey()

      const result = await db
        .collection("monthly_income_targets")
        .deleteOne({ userId: user.userId, month })

      return NextResponse.json(
        { success: true, deletedCount: result.deletedCount },
        { headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to delete monthly income target: ${error instanceof Error ? error.message : error}`,
        },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
