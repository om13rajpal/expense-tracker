import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, isValidObjectId, withAuth } from "@/lib/middleware"

function toSipResponse(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: (doc._id as ObjectId)?.toString?.() || doc._id,
  }
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const sips = await db
        .collection("sips")
        .find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .toArray()

      return NextResponse.json(
        { success: true, items: sips.map(toSipResponse) },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to load SIPs." },
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
          await db.collection("sips").deleteMany({ userId: user.userId })
        }

        const now = new Date().toISOString()
        const docs = [] as Record<string, unknown>[]
        const errors: Array<{ index: number; message: string }> = []

        items.forEach((item: Record<string, unknown>, index: number) => {
          const name = typeof item.name === "string" ? item.name.trim() : ""
          const provider = typeof item.provider === "string" ? item.provider.trim() : ""
          const monthlyAmount = Number(item.monthlyAmount)
          const startDate = typeof item.startDate === "string" ? item.startDate : ""
          const expectedAnnualReturn = item.expectedAnnualReturn === "" || item.expectedAnnualReturn == null
            ? undefined
            : Number(item.expectedAnnualReturn)
          const status = item.status === "paused" || item.status === "cancelled" ? item.status : "active"

          if (!name || !provider || !startDate || !Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
            errors.push({ index, message: "Missing or invalid fields" })
            return
          }

          if (expectedAnnualReturn !== undefined && !Number.isFinite(expectedAnnualReturn)) {
            errors.push({ index, message: "Expected return must be a number" })
            return
          }

          docs.push({
            userId: user.userId,
            name,
            provider,
            monthlyAmount,
            startDate,
            expectedAnnualReturn,
            status,
            createdAt: now,
            updatedAt: now,
          })
        })

        if (!docs.length) {
          return NextResponse.json(
            { success: false, message: "No valid SIP rows.", errors },
            { status: 400, headers: corsHeaders() }
          )
        }

        const result = await db.collection("sips").insertMany(docs)
        return NextResponse.json(
          { success: true, insertedCount: result.insertedCount, errors },
          { status: 201, headers: corsHeaders() }
        )
      }

      const name = typeof body.name === "string" ? body.name.trim() : ""
      const provider = typeof body.provider === "string" ? body.provider.trim() : ""
      const monthlyAmount = Number(body.monthlyAmount)
      const startDate = typeof body.startDate === "string" ? body.startDate : ""
      const expectedAnnualReturn = body.expectedAnnualReturn === "" || body.expectedAnnualReturn === null
        ? undefined
        : Number(body.expectedAnnualReturn)
      const status = body.status === "paused" || body.status === "cancelled" ? body.status : "active"

      if (!name || !provider || !startDate || !Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
        return NextResponse.json(
          { success: false, message: "Missing or invalid SIP fields." },
          { status: 400, headers: corsHeaders() }
        )
      }

      if (expectedAnnualReturn !== undefined && !Number.isFinite(expectedAnnualReturn)) {
        return NextResponse.json(
          { success: false, message: "Expected return must be a number." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const now = new Date().toISOString()
      const doc = {
        userId: user.userId,
        name,
        provider,
        monthlyAmount,
        startDate,
        expectedAnnualReturn,
        status,
        createdAt: now,
        updatedAt: now,
      }

      const db = await getMongoDb()
      const result = await db.collection("sips").insertOne(doc)

      return NextResponse.json(
        { success: true, item: { ...doc, _id: result.insertedId.toString() } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to save SIP." },
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
          { success: false, message: "Missing or invalid SIP id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const body = await req.json()
      const updates: Record<string, unknown> = {}

      if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
      if (typeof body.provider === "string" && body.provider.trim()) updates.provider = body.provider.trim()
      if (body.monthlyAmount !== undefined) {
        const amount = Number(body.monthlyAmount)
        if (Number.isFinite(amount) && amount > 0) updates.monthlyAmount = amount
      }
      if (typeof body.startDate === "string" && body.startDate) updates.startDate = body.startDate
      if (body.expectedAnnualReturn !== undefined) {
        const ear = body.expectedAnnualReturn === "" || body.expectedAnnualReturn === null
          ? undefined
          : Number(body.expectedAnnualReturn)
        if (ear === undefined || Number.isFinite(ear)) updates.expectedAnnualReturn = ear
      }
      if (body.status === "active" || body.status === "paused" || body.status === "cancelled") {
        updates.status = body.status
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      updates.updatedAt = new Date().toISOString()

      const db = await getMongoDb()
      const result = await db.collection("sips").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "SIP not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      const updated = await db.collection("sips").findOne({ _id: new ObjectId(id) })
      return NextResponse.json(
        { success: true, item: updated ? toSipResponse(updated as Record<string, unknown>) : null },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update SIP." },
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
          { success: false, message: "Missing or invalid sip id." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("sips").deleteOne({ _id: new ObjectId(id), userId: user.userId })

      return NextResponse.json(
        { success: true, deleted: result.deletedCount > 0 },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete SIP." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
