import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const groupId = req.nextUrl.searchParams.get("groupId")

      const query: Record<string, unknown> = { userId: user.userId }
      if (groupId) query.groupId = groupId

      const expenses = await db
        .collection("splits_expenses")
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .toArray()

      return NextResponse.json(
        {
          success: true,
          expenses: expenses.map((e) => ({
            _id: e._id.toString(),
            groupId: e.groupId || null,
            description: e.description,
            amount: e.amount,
            paidBy: e.paidBy,
            splitType: e.splitType,
            splits: e.splits,
            date: e.date,
            category: e.category || "",
            createdAt: e.createdAt,
          })),
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits expenses GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch expenses." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const description = typeof body.description === "string" ? body.description.trim() : ""
      const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount)
      const paidBy = typeof body.paidBy === "string" ? body.paidBy.trim() : ""
      const splitType = body.splitType as string
      const date = typeof body.date === "string" ? body.date.trim() : new Date().toISOString()

      if (!description || isNaN(amount) || amount <= 0 || !paidBy) {
        return NextResponse.json(
          { success: false, message: "description, amount (>0), and paidBy are required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (!["equal", "exact", "percentage"].includes(splitType)) {
        return NextResponse.json(
          { success: false, message: "splitType must be 'equal', 'exact', or 'percentage'." },
          { status: 400, headers: corsHeaders() }
        )
      }

      let splits: { person: string; amount: number }[] = []

      if (splitType === "equal") {
        const people: string[] = Array.isArray(body.splits)
          ? body.splits.map((s: { person: string }) => s.person)
          : []
        if (people.length === 0) {
          return NextResponse.json(
            { success: false, message: "At least one person is required in splits." },
            { status: 400, headers: corsHeaders() }
          )
        }
        const perPerson = Math.round((amount / people.length) * 100) / 100
        const remainder = Math.round((amount - perPerson * people.length) * 100) / 100
        splits = people.map((person, i) => ({
          person,
          amount: i === 0 ? perPerson + remainder : perPerson,
        }))
      } else if (splitType === "percentage") {
        if (!Array.isArray(body.splits) || body.splits.length === 0) {
          return NextResponse.json(
            { success: false, message: "Splits array is required." },
            { status: 400, headers: corsHeaders() }
          )
        }
        const totalPct = body.splits.reduce((sum: number, s: { amount: number }) => sum + (s.amount || 0), 0)
        if (Math.abs(totalPct - 100) > 0.01) {
          return NextResponse.json(
            { success: false, message: "Percentages must sum to 100." },
            { status: 400, headers: corsHeaders() }
          )
        }
        splits = body.splits.map((s: { person: string; amount: number }) => ({
          person: s.person,
          amount: Math.round((amount * s.amount) / 100 * 100) / 100,
        }))
      } else {
        // exact
        if (!Array.isArray(body.splits) || body.splits.length === 0) {
          return NextResponse.json(
            { success: false, message: "Splits array is required." },
            { status: 400, headers: corsHeaders() }
          )
        }
        const totalSplit = body.splits.reduce((sum: number, s: { amount: number }) => sum + (s.amount || 0), 0)
        if (Math.abs(totalSplit - amount) > 0.01) {
          return NextResponse.json(
            { success: false, message: `Split amounts (${totalSplit}) must equal total (${amount}).` },
            { status: 400, headers: corsHeaders() }
          )
        }
        splits = body.splits.map((s: { person: string; amount: number }) => ({
          person: s.person,
          amount: s.amount,
        }))
      }

      const db = await getMongoDb()
      const now = new Date().toISOString()

      const doc = {
        userId: user.userId,
        groupId: typeof body.groupId === "string" ? body.groupId.trim() : null,
        description,
        amount,
        paidBy,
        splitType,
        splits,
        date,
        category: typeof body.category === "string" ? body.category.trim() : "",
        createdAt: now,
      }

      const result = await db.collection("splits_expenses").insertOne(doc)

      return NextResponse.json(
        { success: true, expense: { _id: result.insertedId.toString(), ...doc } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits expenses POST error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to create split expense." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const id = req.nextUrl.searchParams.get("id") || ""
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        return NextResponse.json(
          { success: false, message: "Valid expense id is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("splits_expenses").deleteOne({
        _id: new ObjectId(id),
        userId: user.userId,
      })

      return NextResponse.json(
        { success: true, deletedCount: result.deletedCount },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits expenses DELETE error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to delete expense." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
