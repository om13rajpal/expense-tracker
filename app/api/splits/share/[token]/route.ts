import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions } from "@/lib/middleware"
import { computeNetBalances, type SplitExpense, type Settlement } from "@/lib/splits-utils"

/** Public route - NO auth required */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const db = await getMongoDb()

    const shareDoc = await db.collection("splits_share_tokens").findOne({ token })

    if (!shareDoc) {
      return NextResponse.json(
        { success: false, message: "Share link not found." },
        { status: 404, headers: corsHeaders() }
      )
    }

    if (new Date(shareDoc.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, message: "Share link has expired." },
        { status: 404, headers: corsHeaders() }
      )
    }

    const userId = shareDoc.userId
    const groupId = shareDoc.groupId
    const personFilter = shareDoc.personFilter

    // Fetch group info if applicable
    let group = null
    if (groupId) {
      const { ObjectId } = await import("mongodb")
      const groupDoc = await db
        .collection("splits_groups")
        .findOne({ _id: new ObjectId(groupId), userId })
      if (groupDoc) {
        group = {
          name: groupDoc.name,
          members: groupDoc.members,
          description: groupDoc.description || "",
        }
      }
    }

    // Fetch expenses and settlements
    const expenseQuery: Record<string, unknown> = { userId }
    const settlementQuery: Record<string, unknown> = { userId }
    if (groupId) {
      expenseQuery.groupId = groupId
      settlementQuery.groupId = groupId
    }

    const [expenseDocs, settlementDocs] = await Promise.all([
      db.collection("splits_expenses").find(expenseQuery).sort({ date: -1 }).toArray(),
      db.collection("splits_settlements").find(settlementQuery).sort({ date: -1 }).toArray(),
    ])

    const expenses: SplitExpense[] = expenseDocs.map((e) => ({
      _id: e._id.toString(),
      userId: e.userId,
      groupId: e.groupId,
      description: e.description,
      amount: e.amount,
      paidBy: e.paidBy,
      splitType: e.splitType,
      splits: e.splits,
      date: e.date,
      category: e.category,
      createdAt: e.createdAt,
    }))

    const settlements: Settlement[] = settlementDocs.map((s) => ({
      _id: s._id.toString(),
      userId: s.userId,
      groupId: s.groupId,
      paidBy: s.paidBy,
      paidTo: s.paidTo,
      amount: s.amount,
      date: s.date,
      notes: s.notes,
      createdAt: s.createdAt,
    }))

    let balances = computeNetBalances(expenses, settlements, "Me")
    if (personFilter) {
      balances = balances.filter((b) => b.person === personFilter)
    }

    // Recent activity (last 20)
    const recentActivity = [
      ...expenses.slice(0, 20).map((e) => ({
        type: "expense" as const,
        description: e.description,
        amount: e.amount,
        paidBy: e.paidBy,
        date: e.date,
      })),
      ...settlements.slice(0, 20).map((s) => ({
        type: "settlement" as const,
        description: `${s.paidBy} paid ${s.paidTo}`,
        amount: s.amount,
        paidBy: s.paidBy,
        date: s.date,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)

    return NextResponse.json(
      { success: true, group, balances, recentActivity },
      { status: 200, headers: corsHeaders() }
    )
  } catch (error) {
    console.error("Splits share token GET error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to load shared data." },
      { status: 500, headers: corsHeaders() }
    )
  }
}

export async function OPTIONS() {
  return handleOptions()
}
