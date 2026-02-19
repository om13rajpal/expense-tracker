import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const groupId = req.nextUrl.searchParams.get("groupId")
      const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20")

      const query: Record<string, unknown> = { userId: user.userId }
      if (groupId) query.groupId = groupId

      const [expenses, settlements] = await Promise.all([
        db.collection("splits_expenses").find(query).sort({ date: -1 }).toArray(),
        db.collection("splits_settlements").find(query).sort({ date: -1 }).toArray(),
      ])

      const activity = [
        ...expenses.map((e) => ({
          _id: e._id.toString(),
          type: "expense" as const,
          description: e.description,
          amount: e.amount,
          paidBy: e.paidBy,
          splits: e.splits,
          splitType: e.splitType,
          groupId: e.groupId || null,
          date: e.date,
          createdAt: e.createdAt,
        })),
        ...settlements.map((s) => ({
          _id: s._id.toString(),
          type: "settlement" as const,
          description: `${s.paidBy} paid ${s.paidTo}`,
          amount: s.amount,
          paidBy: s.paidBy,
          paidTo: s.paidTo,
          groupId: s.groupId || null,
          date: s.date,
          notes: s.notes || "",
          createdAt: s.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)

      return NextResponse.json(
        { success: true, activity },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits activity GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch activity." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
