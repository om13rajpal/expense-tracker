/**
 * Splits Share Link API
 * Generates a time-limited, public share token for viewing split balances.
 * The token expires after 7 days and is stored in MongoDB.
 *
 * Requires JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   POST /api/splits/share - Generate a new share link token
 *
 * MongoDB collection: `splits_share_tokens`
 */

import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

/**
 * POST /api/splits/share
 * Generate a cryptographically random share token (48-char hex) that provides
 * read-only access to the user's split balances for a specific group or person.
 * The token expires after 7 days.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} [groupId] - Optional group ID to scope the share link
 * @body {string} [personFilter] - Optional person name to filter balances
 *
 * @returns {201} `{ success: true, token: string, url: string, expiresAt: string }`
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const groupId = typeof body.groupId === "string" ? body.groupId.trim() : null
      const personFilter = typeof body.personFilter === "string" ? body.personFilter.trim() : null

      const token = crypto.randomBytes(24).toString("hex")
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const now = new Date().toISOString()

      const db = await getMongoDb()

      await db.collection("splits_share_tokens").insertOne({
        userId: user.userId,
        token,
        groupId,
        personFilter,
        expiresAt,
        createdAt: now,
      })

      // Build the share URL using the request origin
      const origin = req.headers.get("origin") || req.nextUrl.origin
      const url = `${origin}/splits/share/${token}`

      return NextResponse.json(
        { success: true, token, url, expiresAt },
        { status: 201, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits share POST error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to generate share link." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/splits/share
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
