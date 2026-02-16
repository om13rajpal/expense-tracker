// Google Sheets sync API route — now persists to MongoDB on sync
import { NextRequest, NextResponse } from "next/server"

import {
  fetchTransactionsFromSheet,
  getCachedTransactions,
  clearCache,
} from "@/lib/sheets"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { TransactionCategory } from "@/lib/types"
import type { Transaction } from "@/lib/types"
import { buildReverseCategoryMap, mapToBudgetCategory } from "@/lib/budget-mapping"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}

/**
 * Apply categorization rules to a transaction's text fields.
 * Returns the rule-matched category or null if no rule matches.
 */
function applyRules(
  txn: Transaction,
  rules: Array<{ pattern: string; matchField: string; caseSensitive?: boolean; category: string }>
): TransactionCategory | null {
  for (const rule of rules) {
    let textToSearch = ""
    if (rule.matchField === "merchant") textToSearch = txn.merchant || ""
    else if (rule.matchField === "description") textToSearch = txn.description || ""
    else textToSearch = `${txn.merchant || ""} ${txn.description || ""}`

    const haystack = rule.caseSensitive ? textToSearch : textToSearch.toLowerCase()
    const needle = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase()

    if (haystack.includes(needle)) {
      return rule.category as TransactionCategory
    }
  }
  return null
}

/**
 * Persist transactions to MongoDB, preserving existing categories.
 *
 * Category handling during sync:
 *  - Manually overridden (categoryOverride: true): NEVER touched
 *  - Existing in MongoDB (already synced before): category preserved as-is
 *  - Brand new transactions (first sync): categorized via rules + built-in categorizer
 *
 * To re-apply rules to existing transactions, use POST /api/transactions/recategorize instead.
 */
async function persistToMongo(userId: string, transactions: Transaction[]) {
  if (!transactions.length) return 0

  const db = await getMongoDb()
  const col = db.collection("transactions")

  // Load user rules for categorizing NEW transactions
  const rules = await db
    .collection("categorization_rules")
    .find({ userId, enabled: true })
    .toArray()

  // Load budget categories for mapping raw categories to budget names
  const budgetDocs = await db
    .collection("budget_categories")
    .find({ userId })
    .toArray()

  const reverseMap = buildReverseCategoryMap(
    budgetDocs.map(d => ({
      name: d.name as string,
      transactionCategories: (d.transactionCategories || []) as string[],
    }))
  )
  const budgetNames = new Set(budgetDocs.map(d => d.name as string))

  // Load ALL existing txnIds so we know which transactions are new vs existing
  const existingDocs = await col
    .find({ userId }, { projection: { txnId: 1, category: 1, categoryOverride: 1 } })
    .toArray()

  const existingMap = new Map<string, { category: string; override: boolean }>()
  for (const doc of existingDocs) {
    if (doc.txnId) {
      existingMap.set(doc.txnId as string, {
        category: doc.category as string,
        override: doc.categoryOverride === true,
      })
    }
  }

  const ops = transactions.map((txn) => {
    const dateStr = txn.date instanceof Date ? txn.date.toISOString() : String(txn.date)
    const existing = existingMap.get(txn.id)

    // Common non-category fields to always update
    const baseFields = {
      date: dateStr,
      description: txn.description,
      merchant: txn.merchant,
      amount: txn.amount,
      type: txn.type,
      paymentMethod: txn.paymentMethod,
      account: txn.account,
      status: txn.status,
      tags: txn.tags,
      recurring: txn.recurring,
      balance: txn.balance,
      sequence: txn.sequence,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      // EXISTING transaction — never touch the category (whether override or not)
      return {
        updateOne: {
          filter: { userId, txnId: txn.id },
          update: { $set: baseFields },
          upsert: false,
        },
      }
    }

    // NEW transaction — apply rules, fall back to built-in categorizer
    const ruleCategory = applyRules(txn, rules as unknown as Array<{ pattern: string; matchField: string; caseSensitive?: boolean; category: string }>)
    const rawCategory = ruleCategory || txn.category
    // Map raw category (e.g. "Dining") to budget category name (e.g. "Food & Dining")
    const category = budgetDocs.length > 0
      ? mapToBudgetCategory(rawCategory as string, reverseMap, budgetNames)
      : rawCategory

    return {
      updateOne: {
        filter: { userId, txnId: txn.id },
        update: {
          $set: {
            userId,
            txnId: txn.id,
            ...baseFields,
            category,
          },
          $setOnInsert: {
            createdAt: new Date().toISOString(),
          },
        },
        upsert: true,
      },
    }
  })

  const result = await col.bulkWrite(ops, { ordered: false })
  return result.upsertedCount + result.modifiedCount
}

/**
 * GET /api/sheets/sync
 * Fetch from Google Sheets and persist to MongoDB.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const searchParams = req.nextUrl.searchParams
      const force = searchParams.get("force") === "true"

      // Check if we have cached data and force refresh is not requested
      const cached = getCachedTransactions()
      if (!force && cached.transactions && cached.lastSync) {
        // Still persist to MongoDB in case it's empty
        const persisted = await persistToMongo(user.userId, cached.transactions)

        return NextResponse.json(
          {
            success: true,
            message: "Using cached data",
            transactions: cached.transactions,
            lastSync: cached.lastSync,
            count: cached.transactions.length,
            persisted,
            cached: true,
          },
          { status: 200, headers: corsHeaders() }
        )
      }

      // Clear cache if force refresh
      if (force) {
        clearCache()
      }

      // Fetch fresh data from Google Sheets
      const { transactions, lastSync } = await fetchTransactionsFromSheet()

      // Persist to MongoDB
      const persisted = await persistToMongo(user.userId, transactions)

      return NextResponse.json(
        {
          success: true,
          message: "Data synced successfully",
          transactions,
          lastSync,
          count: transactions.length,
          persisted,
          cached: false,
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error("Sheets sync error:", getErrorMessage(error))
      return NextResponse.json(
        {
          success: false,
          message: `Failed to sync data: ${getErrorMessage(error)}`,
        },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/sheets/sync
 * Clear the cached transaction data
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (_req, _context) => {
    try {
      clearCache()

      return NextResponse.json(
        {
          success: true,
          message: "Cache cleared successfully",
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error: unknown) {
      console.error("Cache clear error:", getErrorMessage(error))
      return NextResponse.json(
        {
          success: false,
          message: "Failed to clear cache",
        },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
