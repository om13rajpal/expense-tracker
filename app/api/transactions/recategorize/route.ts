/**
 * POST /api/transactions/recategorize
 *
 * Re-applies categorization rules to ALL existing transactions in MongoDB.
 * Skips transactions that have categoryOverride: true (manual overrides).
 *
 * This endpoint works directly on MongoDB data — no Google Sheets dependency.
 *
 * Logic order:
 *   1. Start with the built-in categorizer (lib/categorizer.ts fuzzy matching)
 *   2. Then apply user-defined categorization_rules (DB rules override built-in)
 *   3. Skip any transaction with categoryOverride: true
 */

import { NextRequest, NextResponse } from "next/server"

import { getMongoDb } from "@/lib/mongodb"
import { categorizeTransaction } from "@/lib/categorizer"
import { TransactionCategory } from "@/lib/types"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { buildReverseCategoryMap, mapToBudgetCategory } from "@/lib/budget-mapping"

export async function POST(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const col = db.collection("transactions")

      // 1. Load all active categorization rules for this user
      const rules = await db
        .collection("categorization_rules")
        .find({ userId: user.userId, enabled: true })
        .toArray()

      // 2. Load all transactions that are NOT manually overridden
      const transactions = await col
        .find({
          userId: user.userId,
          $or: [
            { categoryOverride: { $ne: true } },
            { categoryOverride: { $exists: false } },
          ],
        })
        .toArray()

      if (transactions.length === 0) {
        return NextResponse.json(
          {
            success: true,
            message: "No transactions to recategorize (all may have manual overrides).",
            total: 0,
            updated: 0,
            unchanged: 0,
            skippedOverrides: 0,
          },
          { status: 200, headers: corsHeaders() }
        )
      }

      // Count overridden transactions for reporting
      const overrideCount = await col.countDocuments({
        userId: user.userId,
        categoryOverride: true,
      })

      // 2b. Load budget categories to map raw categories to budget names
      const budgetDocs = await db
        .collection("budget_categories")
        .find({ userId: user.userId })
        .toArray()

      const reverseMap = buildReverseCategoryMap(
        budgetDocs.map(d => ({
          name: d.name as string,
          transactionCategories: (d.transactionCategories || []) as string[],
        }))
      )
      const budgetNames = new Set(budgetDocs.map(d => d.name as string))

      // 3. Determine new category for each transaction
      const ops = []
      let updatedCount = 0
      let unchangedCount = 0
      const changeSummary: Record<string, number> = {}

      for (const txn of transactions) {
        const merchant = (txn.merchant as string) || ""
        const description = (txn.description as string) || ""

        // Step A: Built-in categorizer (fuzzy matching)
        let newCategory: string = categorizeTransaction(merchant, description)

        // Step B: User-defined rules override built-in (first match wins)
        for (const rule of rules) {
          const pattern = rule.pattern as string
          const matchField = rule.matchField as string
          const caseSensitive = rule.caseSensitive === true

          let textToSearch = ""
          if (matchField === "merchant") textToSearch = merchant
          else if (matchField === "description") textToSearch = description
          else textToSearch = `${merchant} ${description}`

          const haystack = caseSensitive ? textToSearch : textToSearch.toLowerCase()
          const needle = caseSensitive ? pattern : pattern.toLowerCase()

          if (haystack.includes(needle)) {
            newCategory = rule.category as string
            break
          }
        }

        // Step C: Map raw transaction category to budget category name
        // e.g. "Dining" -> "Food & Dining", income categories stay as-is
        if (budgetDocs.length > 0) {
          newCategory = mapToBudgetCategory(newCategory, reverseMap, budgetNames)
        }

        const oldCategory = (txn.category as string) || TransactionCategory.UNCATEGORIZED

        if (newCategory !== oldCategory) {
          ops.push({
            updateOne: {
              filter: { _id: txn._id },
              update: {
                $set: {
                  category: newCategory,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          })
          updatedCount++

          // Track change summary
          const changeKey = `${oldCategory} -> ${newCategory}`
          changeSummary[changeKey] = (changeSummary[changeKey] || 0) + 1
        } else {
          unchangedCount++
        }
      }

      // 4. Execute bulk update
      if (ops.length > 0) {
        await col.bulkWrite(ops, { ordered: false })
      }

      console.log(
        `[recategorize] userId=${user.userId}: ${updatedCount} updated, ${unchangedCount} unchanged, ${overrideCount} skipped (manual override). Rules applied: ${rules.length}`
      )
      if (Object.keys(changeSummary).length > 0) {
        console.log("[recategorize] Changes:", JSON.stringify(changeSummary, null, 2))
      }

      return NextResponse.json(
        {
          success: true,
          message: `Recategorized ${updatedCount} transactions.`,
          total: transactions.length,
          updated: updatedCount,
          unchanged: unchangedCount,
          skippedOverrides: overrideCount,
          rulesApplied: rules.length,
          changes: changeSummary,
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("[recategorize] Error:", message)
      return NextResponse.json(
        { success: false, message: `Recategorization failed: ${message}` },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
