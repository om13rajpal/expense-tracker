import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

function toTxnResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const txns = await db
        .collection("mutual_fund_transactions")
        .find({ userId: user.userId })
        .sort({ date: -1 })
        .toArray()

      return NextResponse.json(
        { success: true, items: txns.map(toTxnResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to load mutual fund transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const items = Array.isArray(body.items) ? body.items : null

      if (!items) {
        return NextResponse.json(
          { success: false, message: "Missing items payload." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()

      const replaceAll = body.replaceAll === true
      if (replaceAll) {
        await db.collection("mutual_fund_transactions").deleteMany({ userId: user.userId })
      }

      const now = new Date().toISOString()
      const docs = [] as Record<string, unknown>[]
      const errors: Array<{ index: number; message: string }> = []

      items.forEach((item: Record<string, unknown>, index: number) => {
        const schemeName = typeof item.schemeName === "string" ? item.schemeName.trim() : ""
        const transactionType = typeof item.transactionType === "string" ? item.transactionType.trim() : ""
        const units = Number(item.units)
        const nav = Number(item.nav)
        const amount = Number(item.amount)
        const date = typeof item.date === "string" ? item.date.trim() : ""

        if (!schemeName || !transactionType || !date || !Number.isFinite(amount)) {
          errors.push({ index, message: "Missing or invalid fields" })
          return
        }

        docs.push({
          userId: user.userId,
          schemeName,
          transactionType,
          units: Number.isFinite(units) ? units : 0,
          nav: Number.isFinite(nav) ? nav : 0,
          amount,
          date,
          createdAt: now,
          updatedAt: now,
        })
      })

      if (!docs.length) {
        return NextResponse.json(
          { success: false, message: "No valid transaction rows.", errors },
          { status: 400, headers: corsHeaders() }
        )
      }

      const result = await db.collection("mutual_fund_transactions").insertMany(docs)
      return NextResponse.json(
        { success: true, insertedCount: result.insertedCount, errors },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to save mutual fund transactions." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get("id")
      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid transaction id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("mutual_fund_transactions").deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete mutual fund transaction." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
