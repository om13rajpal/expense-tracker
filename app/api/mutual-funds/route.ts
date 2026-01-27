import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

function toFundResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const funds = await db
        .collection("mutual_funds")
        .find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .toArray()

      return NextResponse.json(
        { success: true, items: funds.map(toFundResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to load mutual funds." },
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

      if (items) {
        const replaceAll = body.replaceAll === true
        const db = await getMongoDb()

        if (replaceAll) {
          await db.collection("mutual_funds").deleteMany({ userId: user.userId })
        }

        const now = new Date().toISOString()
        const docs = [] as Record<string, unknown>[]
        const errors: Array<{ index: number; message: string }> = []

        items.forEach((item: Record<string, unknown>, index: number) => {
          const schemeName = typeof item.schemeName === "string" ? item.schemeName.trim() : ""
          const amc = typeof item.amc === "string" ? item.amc.trim() : undefined
          const category = typeof item.category === "string" ? item.category.trim() : undefined
          const subCategory = typeof item.subCategory === "string" ? item.subCategory.trim() : undefined
          const folioNumber = typeof item.folioNumber === "string" ? item.folioNumber.trim() : undefined
          const source = typeof item.source === "string" ? item.source.trim() : undefined
          const units = Number(item.units)
          const investedValue = Number(item.investedValue)
          const currentValue = Number(item.currentValue)
          const returns = Number(item.returns)
          const xirr = typeof item.xirr === "string" ? item.xirr.trim() : null

          if (!schemeName || !Number.isFinite(units) || !Number.isFinite(investedValue) || !Number.isFinite(currentValue)) {
            errors.push({ index, message: "Missing or invalid fields" })
            return
          }

          docs.push({
            userId: user.userId,
            schemeName,
            amc,
            category,
            subCategory,
            folioNumber,
            source,
            units,
            investedValue,
            currentValue,
            returns: Number.isFinite(returns) ? returns : currentValue - investedValue,
            xirr: xirr === "N/A" ? null : xirr,
            createdAt: now,
            updatedAt: now,
          })
        })

        if (!docs.length) {
          return NextResponse.json(
            { success: false, message: "No valid fund rows.", errors },
            { status: 400, headers: corsHeaders() }
          )
        }

        const result = await db.collection("mutual_funds").insertMany(docs)
        return NextResponse.json(
          { success: true, insertedCount: result.insertedCount, errors },
          { status: 201, headers: corsHeaders() }
        )
      }

      return NextResponse.json(
        { success: false, message: "Missing items payload." },
        { status: 400, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to save mutual funds." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get("id")
      if (!id || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid fund id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const body = await req.json()
      const updates: Record<string, unknown> = {}

      if (typeof body.schemeName === "string" && body.schemeName.trim()) updates.schemeName = body.schemeName.trim()
      if (typeof body.amc === "string") updates.amc = body.amc.trim()
      if (typeof body.category === "string") updates.category = body.category.trim()
      if (typeof body.subCategory === "string") updates.subCategory = body.subCategory.trim()
      if (typeof body.folioNumber === "string") updates.folioNumber = body.folioNumber.trim()
      if (typeof body.source === "string") updates.source = body.source.trim()
      if (body.units !== undefined) {
        const units = Number(body.units)
        if (Number.isFinite(units)) updates.units = units
      }
      if (body.investedValue !== undefined) {
        const iv = Number(body.investedValue)
        if (Number.isFinite(iv)) updates.investedValue = iv
      }
      if (body.currentValue !== undefined) {
        const cv = Number(body.currentValue)
        if (Number.isFinite(cv)) updates.currentValue = cv
      }
      if (body.returns !== undefined) {
        const r = Number(body.returns)
        if (Number.isFinite(r)) updates.returns = r
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      updates.updatedAt = new Date().toISOString()

      const db = await getMongoDb()
      const result = await db.collection("mutual_funds").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "Fund not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      const updated = await db.collection("mutual_funds").findOne({ _id: new ObjectId(id) })
      return NextResponse.json(
        { success: true, item: updated ? toFundResponse(updated as Record<string, unknown>) : null },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update mutual fund." },
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
          { success: false, message: "Missing or invalid fund id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("mutual_funds").deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete mutual fund." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
