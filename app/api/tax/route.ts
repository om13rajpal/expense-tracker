/**
 * Tax Configuration API
 * Stores and retrieves the user's Indian tax planning configuration.
 *
 * GET /api/tax - Fetch saved tax config (or defaults if none exists)
 * PUT /api/tax - Save/update tax config (80C, 80D, HRA, income, regime preference)
 */
import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { getDefaultTaxConfig } from "@/lib/tax"

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()
      const config = await db
        .collection("tax_config")
        .findOne({ userId: user.userId })

      // Strip MongoDB _id before returning
      if (config) {
        const { _id, ...rest } = config
        return NextResponse.json(
          { success: true, config: rest },
          { status: 200, headers: corsHeaders() }
        )
      }

      return NextResponse.json(
        { success: true, config: getDefaultTaxConfig() },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("GET /api/tax error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to load tax config." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const db = await getMongoDb()

      // Allowlist: only persist known TaxConfig fields
      const safeConfig: Record<string, unknown> = {}
      const allowedScalars = [
        "grossAnnualIncome",
        "section80TTA",
        "section24HomeLoan",
        "section80E",
        "section80CCD1B",
        "preferredRegime",
      ] as const
      const allowedObjects = [
        "otherIncome",
        "deductions80C",
        "deductions80D",
        "hra",
      ] as const

      for (const key of allowedScalars) {
        if (key in body) safeConfig[key] = body[key]
      }
      for (const key of allowedObjects) {
        if (key in body && typeof body[key] === "object" && body[key] !== null) {
          safeConfig[key] = body[key]
        }
      }

      await db.collection("tax_config").updateOne(
        { userId: user.userId },
        {
          $set: {
            ...safeConfig,
            userId: user.userId,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      )

      return NextResponse.json(
        { success: true },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("PUT /api/tax error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to save tax config." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
