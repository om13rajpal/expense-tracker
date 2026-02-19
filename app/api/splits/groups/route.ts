import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const singleId = req.nextUrl.searchParams.get("id")

      if (singleId) {
        if (!/^[0-9a-fA-F]{24}$/.test(singleId)) {
          return NextResponse.json(
            { success: false, message: "Invalid group id." },
            { status: 400, headers: corsHeaders() }
          )
        }
        const group = await db
          .collection("splits_groups")
          .findOne({ _id: new ObjectId(singleId), userId: user.userId })

        if (!group) {
          return NextResponse.json(
            { success: false, message: "Group not found." },
            { status: 404, headers: corsHeaders() }
          )
        }

        return NextResponse.json(
          {
            success: true,
            group: {
              _id: group._id.toString(),
              name: group.name,
              members: group.members,
              description: group.description || "",
              isArchived: group.isArchived || false,
              createdAt: group.createdAt,
              updatedAt: group.updatedAt,
            },
          },
          { status: 200, headers: corsHeaders() }
        )
      }

      const groups = await db
        .collection("splits_groups")
        .find({ userId: user.userId })
        .sort({ updatedAt: -1 })
        .toArray()

      return NextResponse.json(
        {
          success: true,
          groups: groups.map((g) => ({
            _id: g._id.toString(),
            name: g.name,
            members: g.members,
            description: g.description || "",
            isArchived: g.isArchived || false,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          })),
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits groups GET error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch groups." },
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
          { success: false, message: "Group name is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const members = Array.isArray(body.members) ? body.members.filter((m: unknown) => typeof m === "string" && m.trim()) : []
      if (members.length === 0) {
        return NextResponse.json(
          { success: false, message: "At least one member is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      // Always include "Me" in members
      if (!members.includes("Me")) {
        members.unshift("Me")
      }

      const db = await getMongoDb()
      const now = new Date().toISOString()

      const doc = {
        userId: user.userId,
        name,
        members,
        description: typeof body.description === "string" ? body.description.trim() : "",
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      }

      const result = await db.collection("splits_groups").insertOne(doc)

      return NextResponse.json(
        { success: true, group: { _id: result.insertedId.toString(), ...doc } },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits groups POST error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to create group." },
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
          { success: false, message: "Valid group id is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
      if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
      if (typeof body.description === "string") updates.description = body.description.trim()
      if (typeof body.isArchived === "boolean") updates.isArchived = body.isArchived
      if (Array.isArray(body.members)) {
        const members = body.members.filter((m: unknown) => typeof m === "string" && m.trim())
        if (!members.includes("Me")) members.unshift("Me")
        updates.members = members
      }

      const db = await getMongoDb()
      const result = await db.collection("splits_groups").updateOne(
        { _id: new ObjectId(id), userId: user.userId },
        { $set: updates }
      )

      return NextResponse.json(
        { success: true, modifiedCount: result.modifiedCount },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits groups PATCH error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to update group." },
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
          { success: false, message: "Valid group id is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const result = await db.collection("splits_groups").deleteOne({
        _id: new ObjectId(id),
        userId: user.userId,
      })

      return NextResponse.json(
        { success: true, deletedCount: result.deletedCount },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits groups DELETE error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to delete group." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
