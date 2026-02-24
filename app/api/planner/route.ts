/**
 * Finance Planner API Route
 *
 * GET  /api/planner  — Fetch saved plan + linked data from other features
 * POST /api/planner  — Save/update the user's finance plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware'
import { calculateGoalProgress } from '@/lib/savings-goals'
import type { SavingsGoalConfig } from '@/lib/types'

/**
 * Extract a human-readable error message from an unknown error value.
 *
 * @param error - The caught error (may be Error, string, or unknown)
 * @returns A string error message
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

/**
 * Safely execute an async function, returning null on failure.
 * Allows partial success when fetching linked data -- one sub-fetch
 * failing won't break the rest of the planner response.
 *
 * @param fn - Async function to execute
 * @returns The result of `fn()`, or null if it throws
 */
async function safeFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    console.error('Planner linked-data fetch error:', getErrorMessage(error))
    return null
  }
}

/**
 * GET /api/planner
 * Fetch the user's saved financial plan along with linked data from other features
 * (savings goals, income goals, debts, subscriptions, budget, tax config).
 * Each linked data fetch is wrapped in `safeFetch` for graceful partial failure.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, plan: object, linkedData: { savingsGoals, incomeGoals, debts, subscriptions, budget, taxConfig } }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()

      const [
        plan,
        goals,
        budgetConfig,
        sips,
        stocks,
        actualSpending,
        aiRecommendation,
      ] = await Promise.all([
        // 1. Saved plan
        safeFetch(() =>
          db.collection('finance_plans').findOne({ userId: user.userId })
        ),

        // 2. Savings goals
        safeFetch(async () => {
          const goalDocs = await db
            .collection('savings_goals')
            .find({ userId: user.userId })
            .toArray()

          return goalDocs.map((doc) => {
            const goalConfig: SavingsGoalConfig = {
              id: doc._id.toString(),
              userId: doc.userId as string,
              name: doc.name as string,
              targetAmount: Number(doc.targetAmount) || 0,
              currentAmount: Number(doc.currentAmount) || 0,
              targetDate: doc.targetDate as string,
              monthlyContribution: Number(doc.monthlyContribution) || 0,
              autoTrack: Boolean(doc.autoTrack),
              category: doc.category as string | undefined,
              createdAt: doc.createdAt as string,
              updatedAt: doc.updatedAt as string,
            }
            const progress = calculateGoalProgress(goalConfig)
            return {
              name: progress.name,
              targetAmount: progress.targetAmount,
              currentAmount: progress.currentAmount,
              targetDate: progress.targetDate,
              percentageComplete: Math.round(progress.percentageComplete * 100) / 100,
            }
          })
        }),

        // 3. Budget config (NWI)
        safeFetch(async () => {
          const nwiDoc = await db
            .collection('nwi_config')
            .findOne({ userId: user.userId })

          if (!nwiDoc) return null

          return {
            needs: Number(nwiDoc.needs?.percentage) || 0,
            wants: Number(nwiDoc.wants?.percentage) || 0,
            investments: Number(nwiDoc.investments?.percentage) || 0,
            savings: Number(nwiDoc.savings?.percentage) || 0,
          }
        }),

        // 4. Active SIPs
        safeFetch(async () => {
          const activeSips = await db
            .collection('sips')
            .find({ userId: user.userId, status: 'active' })
            .toArray()

          const totalMonthly = activeSips.reduce(
            (sum, sip) => sum + (Number(sip.monthlyAmount) || 0),
            0
          )

          return {
            totalMonthly,
            count: activeSips.length,
          }
        }),

        // 5. Stocks
        safeFetch(async () => {
          const stockDocs = await db
            .collection('stocks')
            .find({ userId: user.userId })
            .toArray()

          const totalInvested = stockDocs.reduce(
            (sum, stock) =>
              sum + (Number(stock.shares) || 0) * (Number(stock.averageCost) || 0),
            0
          )

          return {
            totalInvested: Math.round(totalInvested * 100) / 100,
            count: stockDocs.length,
          }
        }),

        // 6. Actual spending (most recent complete month)
        safeFetch(async () => {
          const now = new Date()
          // Use the previous month as the most recent complete month
          const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const year = targetDate.getFullYear()
          const month = targetDate.getMonth() // 0-indexed

          const startOfMonth = new Date(year, month, 1).toISOString()
          const endOfMonth = new Date(year, month + 1, 1).toISOString()

          const transactions = await db
            .collection('transactions')
            .find({
              userId: user.userId,
              date: { $gte: startOfMonth, $lt: endOfMonth },
            })
            .toArray()

          let monthlyIncome = 0
          let monthlyExpenses = 0

          for (const txn of transactions) {
            const amount = Number(txn.amount) || 0
            if (txn.type === 'income') {
              monthlyIncome += amount
            } else if (txn.type === 'expense') {
              monthlyExpenses += amount
            }
          }

          const savingsRate =
            monthlyIncome > 0
              ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
              : 0

          return {
            monthlyIncome: Math.round(monthlyIncome),
            monthlyExpenses: Math.round(monthlyExpenses),
            savingsRate,
          }
        }),

        // 7. AI recommendation (most recent spending_analysis)
        safeFetch(async () => {
          const analysisDoc = await db
            .collection('ai_analyses')
            .findOne(
              { userId: user.userId, type: 'spending_analysis' },
              { sort: { generatedAt: -1 } }
            )

          if (!analysisDoc) return null

          const content = typeof analysisDoc.content === 'string'
            ? analysisDoc.content.slice(0, 500)
            : ''

          return {
            content,
            generatedAt: analysisDoc.generatedAt as string,
          }
        }),
      ])

      return NextResponse.json(
        {
          success: true,
          plan: plan || null,
          linked: {
            goals,
            budgetConfig,
            sips,
            stocks,
            actualSpending,
            aiRecommendation,
          },
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error('Planner GET error:', getErrorMessage(error))
      return NextResponse.json(
        { success: false, message: getErrorMessage(error) },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * POST /api/planner
 * Save or update the user's financial plan via upsert.
 * Stores monthly income, investment allocations, savings, needs/wants split, and goal allocations.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {number} [monthlyIncome] - Monthly income in INR
 * @body {object} [investments] - Investment allocation breakdown
 * @body {number} [savings] - Savings allocation
 * @body {number} [needs] - Needs allocation
 * @body {number} [wants] - Wants allocation
 * @body {object} [goalAllocations] - Per-goal allocation mapping
 *
 * @returns {200} `{ success: true, plan: object }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const db = await getMongoDb()

      const planData = {
        userId: user.userId,
        monthlyIncome: Number(body.monthlyIncome) || 0,
        investments: body.investments || {},
        savings: Number(body.savings) || 0,
        needs: Number(body.needs) || 0,
        wants: Number(body.wants) || 0,
        goalAllocations: body.goalAllocations || {},
        updatedAt: new Date().toISOString(),
      }

      await db.collection('finance_plans').updateOne(
        { userId: user.userId },
        {
          $set: planData,
          $setOnInsert: { createdAt: new Date().toISOString() },
        },
        { upsert: true }
      )

      return NextResponse.json(
        { success: true, plan: planData },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error('Planner POST error:', getErrorMessage(error))
      return NextResponse.json(
        { success: false, message: getErrorMessage(error) },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/planner
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
