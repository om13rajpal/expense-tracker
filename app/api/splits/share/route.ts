import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

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

export async function OPTIONS() {
  return handleOptions()
}
