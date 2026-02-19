/**
 * Google Sheets Sync API
 * Fetches transactions from a linked Google Sheet and persists them to MongoDB.
 *
 * GET    /api/sheets/sync          - Sync from Sheets (uses cache unless ?force=true)
 * DELETE /api/sheets/sync          - Clear the in-memory transaction cache
 *
 * Category handling during sync:
 *   - Manual overrides (categoryOverride: true) are never touched
 *   - Existing transactions keep their current category
 *   - New transactions are categorized via user rules + built-in categorizer
 */
import { NextRequest, NextResponse } from "next/server"

import {
  fetchTransactionsFromSheet,
  getCachedTransactions,
  clearCache,
} from "@/lib/sheets"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { persistTransactions } from "@/lib/persist-transactions"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
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
        const persisted = await persistTransactions(user.userId, cached.transactions)

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
      const persisted = await persistTransactions(user.userId, transactions)

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
