import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const contacts = await db
        .collection("splits_contacts")
        .find({ userId: user.userId })
        .sort({ name: 1 })
        .toArray()

      return NextResponse.json(
        {
          success: true,
          contacts: contacts.map((c) => ({
            _id: c._id.toString(),
            name: c.name,
            phone: c.phone || "",
            email: c.email || "",
            createdAt: c.createdAt,
          })),
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits contacts GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch contacts." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (!name) {
        return NextResponse.json(
          { success: false, message: "Name is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const now = new Date().toISOString()

      const doc = {
        userId: user.userId,
        name,
        phone: typeof body.phone === "string" ? body.phone.trim() : "",
        email: typeof body.email === "string" ? body.email.trim() : "",
        createdAt: now,
      }

      const result = await db.collection("splits_contacts").insertOne(doc)

      return NextResponse.json(
        { success: true, contact: { _id: result.insertedId.toString(), ...doc } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits contacts POST error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to create contact." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const id = typeof body.id === "string" ? body.id.trim() : ""
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        return NextResponse.json(
          { success: false, message: "Valid contact id is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const updates: Record<string, string> = {}
      if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
      if (typeof body.phone === "string") updates.phone = body.phone.trim()
      if (typeof body.email === "string") updates.email = body.email.trim()

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, message: "No fields to update." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("splits_contacts").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      return NextResponse.json(
        { success: true, modifiedCount: result.modifiedCount },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits contacts PATCH error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to update contact." },
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
          { success: false, message: "Valid contact id is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("splits_contacts").deleteOne({
        _id: new ObjectId(id),
        userId: user.userId,
      })

      return NextResponse.json(
        { success: true, deletedCount: result.deletedCount },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits contacts DELETE error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to delete contact." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
