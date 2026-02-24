/**
 * Agent Conversation Threads API
 *
 * GET  /api/agent/threads        - List all threads (summary only)
 * GET  /api/agent/threads?id=xxx - Get full thread with all messages
 * DELETE /api/agent/threads?id=xxx - Delete a thread
 * OPTIONS                        - CORS preflight
 */

import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

/**
 * GET /api/agent/threads
 * List all conversation threads (summary: id, title, dates, message count) or
 * fetch a single thread with full messages when `?id=xxx` is provided.
 * Thread list is sorted by most recently updated.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} [id] - Thread ID to fetch a specific thread with messages
 *
 * @returns {200} `{ success: true, threads: Array<{ threadId, title, createdAt, updatedAt, messageCount }> }`
 *   or `{ success: true, thread: { threadId, title, messages, createdAt, updatedAt } }`
 * @returns {404} `{ success: false, message: string }` - Thread not found (single fetch)
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const db = await getMongoDb()
      const col = db.collection("agent_threads")
      const threadId = req.nextUrl.searchParams.get("id")

      if (threadId) {
        // Return full thread with all messages
        const thread = await col.findOne({ userId: user.userId, threadId })
        if (!thread) {
          return NextResponse.json(
            { success: false, message: "Thread not found" },
            { status: 404, headers: corsHeaders() }
          )
        }
        return NextResponse.json(
          { success: true, thread },
          { status: 200, headers: corsHeaders() }
        )
      }

      // List all threads — only return summary data
      // Use aggregation to get messageCount and last message preview efficiently
      const threads = await col
        .aggregate([
          { $match: { userId: user.userId } },
          { $sort: { updatedAt: -1 } },
          {
            $project: {
              _id: 0,
              threadId: 1,
              title: 1,
              updatedAt: 1,
              messageCount: { $size: { $ifNull: ["$messages", []] } },
              lastMessage: { $arrayElemAt: ["$messages", -1] },
            },
          },
        ])
        .toArray()

      const summaries = threads.map((t) => ({
        threadId: t.threadId,
        title: t.title,
        preview: t.lastMessage?.content?.slice(0, 80) || "",
        updatedAt: t.updatedAt,
        messageCount: t.messageCount || 0,
      }))

      return NextResponse.json(
        { success: true, threads: summaries },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Failed to fetch threads:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch threads" },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * DELETE /api/agent/threads?id=xxx
 * Delete a conversation thread and all its messages.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @query {string} id - Thread ID to delete (required)
 *
 * @returns {200} `{ success: true }`
 * @returns {400} `{ success: false, message: string }` - Missing thread ID
 * @returns {404} `{ success: false, message: string }` - Thread not found
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const threadId = req.nextUrl.searchParams.get("id")
      if (!threadId) {
        return NextResponse.json(
          { success: false, message: "Thread ID is required" },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()
      const col = db.collection("agent_threads")
      const result = await col.deleteOne({ userId: user.userId, threadId })

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, message: "Thread not found" },
          { status: 404, headers: corsHeaders() }
        )
      }

      return NextResponse.json(
        { success: true, message: "Thread deleted" },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Failed to delete thread:", error)
      return NextResponse.json(
        { success: false, message: "Failed to delete thread" },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/agent/threads
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
