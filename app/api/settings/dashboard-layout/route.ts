/**
 * GET/PUT dashboard widget layout settings.
 * Stored in user_settings.dashboardLayout in MongoDB.
 * @module app/api/settings/dashboard-layout/route
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth, corsHeaders, handleOptions } from "@/lib/middleware"
import { getMongoDb } from "@/lib/mongodb"

const COLLECTION = "user_settings"

export const OPTIONS = handleOptions

export const GET = withAuth(async (_req, { user }) => {
  try {
    const db = await getMongoDb()
    const settings = await db.collection(COLLECTION).findOne({ userId: user.userId })
    const layout = settings?.dashboardLayout ?? null

    return NextResponse.json(
      { success: true, layout },
      { headers: corsHeaders() }
    )
  } catch (error) {
    console.error("Failed to fetch dashboard layout:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch layout" },
      { status: 500, headers: corsHeaders() }
    )
  }
})

export const PUT = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json()
    if (!body || !Array.isArray(body.widgets)) {
      return NextResponse.json(
        { success: false, message: "Invalid layout: widgets array required" },
        { status: 400, headers: corsHeaders() }
      )
    }

    const layout = {
      version: body.version || 1,
      widgets: body.widgets,
      updatedAt: new Date().toISOString(),
    }

    const db = await getMongoDb()
    await db.collection(COLLECTION).updateOne(
      { userId: user.userId },
      { $set: { dashboardLayout: layout, updatedAt: layout.updatedAt } },
      { upsert: true }
    )

    return NextResponse.json(
      { success: true, layout },
      { headers: corsHeaders() }
    )
  } catch (error) {
    console.error("Failed to save dashboard layout:", error)
    return NextResponse.json(
      { success: false, message: "Failed to save layout" },
      { status: 500, headers: corsHeaders() }
    )
  }
})
