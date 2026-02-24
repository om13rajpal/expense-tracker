/**
 * Splits Contacts API
 * Manages contacts used in the bill-splitting feature.
 * Contacts represent people the user splits expenses with.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 * Data is scoped to the authenticated user via `userId`.
 *
 * Endpoints:
 *   GET    /api/splits/contacts          - List all contacts
 *   POST   /api/splits/contacts          - Create a new contact
 *   PATCH  /api/splits/contacts          - Update an existing contact
 *   DELETE /api/splits/contacts?id=xxx   - Delete a contact by ID
 *
 * MongoDB collection: `splits_contacts`
 */

import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

/**
 * GET /api/splits/contacts
 * Retrieve all split contacts for the authenticated user, sorted alphabetically by name.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, contacts: Array<{ _id, name, phone, email, createdAt }> }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
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

/**
 * POST /api/splits/contacts
 * Create a new split contact.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} name - Contact name (required, non-empty)
 * @body {string} [phone] - Contact phone number
 * @body {string} [email] - Contact email address
 *
 * @returns {201} `{ success: true, contact: { _id, name, phone, email, createdAt } }`
 * @returns {400} `{ success: false, message: string }` - Missing or empty name
 * @returns {500} `{ success: false, message: string }` - Server error
 */
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

/**
 * PATCH /api/splits/contacts
 * Update an existing split contact. Only provided fields are updated.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} id - Contact ObjectId (required, must be valid 24-char hex)
 * @body {string} [name] - Updated contact name
 * @body {string} [phone] - Updated phone number
 * @body {string} [email] - Updated email address
 *
 * @returns {200} `{ success: true, modifiedCount: number }`
 * @returns {400} `{ success: false, message: string }` - Invalid ID or no fields to update
 * @returns {500} `{ success: false, message: string }` - Server error
 */
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

/**
 * DELETE /api/splits/contacts?id=xxx
 * Delete a split contact by its ObjectId.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - Contact ObjectId (required, must be valid 24-char hex)
 *
 * @returns {200} `{ success: true, deletedCount: number }`
 * @returns {400} `{ success: false, message: string }` - Missing or invalid ID
 * @returns {500} `{ success: false, message: string }` - Server error
 */
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

/**
 * OPTIONS /api/splits/contacts
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
