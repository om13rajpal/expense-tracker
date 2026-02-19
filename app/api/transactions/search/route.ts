import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, withAuth, handleOptions } from "@/lib/middleware"

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

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

export async function OPTIONS() {
  return handleOptions()
}
