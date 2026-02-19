import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const groupId = req.nextUrl.searchParams.get("groupId")

      const query: Record<string, unknown> = { userId: user.userId }
      if (groupId) query.groupId = groupId

      const settlements = await db
        .collection("splits_settlements")
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .toArray()

      return NextResponse.json(
        {
          success: true,
          settlements: settlements.map((s) => ({
            _id: s._id.toString(),
            groupId: s.groupId || null,
            paidBy: s.paidBy,
            paidTo: s.paidTo,
            amount: s.amount,
            date: s.date,
            notes: s.notes || "",
            createdAt: s.createdAt,
          })),
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits settlements GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch settlements." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const paidBy = typeof body.paidBy === "string" ? body.paidBy.trim() : ""
      const paidTo = typeof body.paidTo === "string" ? body.paidTo.trim() : ""
      const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount)
      const date = typeof body.date === "string" ? body.date.trim() : new Date().toISOString()

      if (!paidBy || !paidTo || isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, message: "paidBy, paidTo, and amount (>0) are required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const now = new Date().toISOString()

      const doc = {
        userId: user.userId,
        groupId: typeof body.groupId === "string" ? body.groupId.trim() : null,
        paidBy,
        paidTo,
        amount,
        date,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
        createdAt: now,
      }

      const result = await db.collection("splits_settlements").insertOne(doc)

      return NextResponse.json(
        { success: true, settlement: { _id: result.insertedId.toString(), ...doc } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits settlements POST error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to record settlement." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
