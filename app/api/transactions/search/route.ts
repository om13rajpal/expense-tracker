/**
 * Transaction Search API
 * Provides quick regex-based search across transaction description, merchant, and category fields.
 * Designed for spotlight/autocomplete search with a minimum 2-character query and capped result limit.
 *
 * Requires JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   GET /api/transactions/search?q=xxx - Search transactions by text query
 *
 * MongoDB collection: `transactions`
 */

import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, withAuth, handleOptions } from "@/lib/middleware"

/**
 * Escape special regex characters in a user-provided search string
 * to prevent regex injection when building MongoDB `$regex` queries.
 *
 * @param str - The raw search string to escape
 * @returns The escaped string safe for use in a RegExp pattern
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * GET /api/transactions/search?q=xxx
 * Search transactions by a text query. Performs case-insensitive regex matching
 * across `description`, `merchant`, and `category` fields.
 * Returns an empty array if the query is less than 2 characters.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} q - Search query (min 2 characters)
 * @query {string} [limit="5"] - Maximum results to return (capped at 8)
 *
 * @returns {200} `{ success: true, transactions: Array<{ _id, description, merchant, category, amount, type, date }> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const q = req.nextUrl.searchParams.get("q")?.trim() || ""
      const limit = Math.min(
        parseInt(req.nextUrl.searchParams.get("limit") || "5", 10),
        8
      )

      if (q.length < 2) {
        return NextResponse.json(
          { success: true, transactions: [] },
          { headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const col = db.collection("transactions")
      const pattern = escapeRegex(q)

      const docs = await col
        .find({
          userId: user.userId,
          $or: [
            { description: { $regex: pattern, $options: "i" } },
            { merchant: { $regex: pattern, $options: "i" } },
            { category: { $regex: pattern, $options: "i" } },
          ],
        })
        .sort({ date: -1 })
        .limit(limit)
        .project({
          _id: 1,
          description: 1,
          merchant: 1,
          category: 1,
          amount: 1,
          type: 1,
          date: 1,
        })
        .toArray()

      const transactions = docs.map((doc) => ({
        _id: doc._id.toString(),
        description: doc.description,
        merchant: doc.merchant,
        category: doc.category,
        amount: doc.amount,
        type: doc.type,
        date: doc.date,
      }))

      return NextResponse.json(
        { success: true, transactions },
        { headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Transaction search error:", error)
      return NextResponse.json(
        { success: false, message: "Search failed" },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/transactions/search
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
