/**
 * Splits Notification API
 * Sends email notifications and reminders for the bill-splitting feature.
 * Stores a record of every notification attempt in the `split_notifications` collection.
 *
 * All endpoints require JWT authentication via the `auth-token` HTTP-only cookie.
 * Data is scoped to the authenticated user via `userId`.
 *
 * Endpoints:
 *   POST /api/splits/notify - Send a split notification or reminder email
 *
 * MongoDB collections: `splits_contacts`, `splits_expenses`, `splits_settlements`, `split_notifications`
 */

import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { sendSplitNotification, sendSplitReminder } from "@/lib/email"
import { computeNetBalances, type SplitExpense, type Settlement } from "@/lib/splits-utils"

/**
 * POST /api/splits/notify
 * Send an email notification about a split expense or a reminder about outstanding balances.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {string} contactId - The ObjectId of the contact to notify
 * @body {'split_created' | 'reminder'} type - Notification type
 * @body {string} [expenseId] - The expense ObjectId (required when type is 'split_created')
 *
 * @returns {200} `{ success: true, message: string }` - Notification sent
 * @returns {400} `{ success: false, message: string }` - Validation failure
 * @returns {404} `{ success: false, message: string }` - Contact or expense not found
 * @returns {500} `{ success: false, message: string }` - Server error
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const contactId = typeof body.contactId === "string" ? body.contactId.trim() : ""
      const type = body.type as string
      const expenseId = typeof body.expenseId === "string" ? body.expenseId.trim() : ""

      // Validate contactId
      if (!contactId || !/^[0-9a-fA-F]{24}$/.test(contactId)) {
        return NextResponse.json(
          { success: false, message: "Valid contactId is required." },
          { status: 400, headers: corsHeaders() }
        )
      }

      // Validate type
      if (!["split_created", "reminder"].includes(type)) {
        return NextResponse.json(
          { success: false, message: "type must be 'split_created' or 'reminder'." },
          { status: 400, headers: corsHeaders() }
        )
      }

      // Validate expenseId for split_created
      if (type === "split_created" && (!expenseId || !/^[0-9a-fA-F]{24}$/.test(expenseId))) {
        return NextResponse.json(
          { success: false, message: "Valid expenseId is required for split_created notifications." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const db = await getMongoDb()

      // Look up the contact
      const contact = await db.collection("splits_contacts").findOne({
        _id: new ObjectId(contactId),
        userId: user.userId,
      })

      if (!contact) {
        return NextResponse.json(
          { success: false, message: "Contact not found." },
          { status: 404, headers: corsHeaders() }
        )
      }

      if (!contact.email) {
        return NextResponse.json(
          { success: false, message: "Contact has no email address." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const now = new Date().toISOString()
      const fromName = user.name || "Someone"

      if (type === "split_created") {
        // Look up the expense
        const expense = await db.collection("splits_expenses").findOne({
          _id: new ObjectId(expenseId),
          userId: user.userId,
        })

        if (!expense) {
          return NextResponse.json(
            { success: false, message: "Expense not found." },
            { status: 404, headers: corsHeaders() }
          )
        }

        // Find the contact's share in this expense
        const contactSplit = (expense.splits as Array<{ person: string; amount: number }>)
          .find((s) => s.person === contact.name)

        if (!contactSplit) {
          return NextResponse.json(
            { success: false, message: "Contact is not part of this expense." },
            { status: 400, headers: corsHeaders() }
          )
        }

        // Send the notification email
        const result = await sendSplitNotification({
          to: contact.email,
          fromName,
          description: expense.description,
          amount: contactSplit.amount,
          totalAmount: expense.amount,
        })

        // Store notification record
        await db.collection("split_notifications").insertOne({
          userId: user.userId,
          contactId,
          expenseId,
          type: "split_created",
          sentTo: contact.email,
          sentAt: now,
          status: result.success ? "sent" : "failed",
          ...(result.error ? { error: result.error } : {}),
        })

        if (!result.success) {
          return NextResponse.json(
            { success: false, message: result.error || "Failed to send notification." },
            { status: 500, headers: corsHeaders() }
          )
        }

        return NextResponse.json(
          { success: true, message: `Notification sent to ${contact.name}` },
          { status: 200, headers: corsHeaders() }
        )
      }

      // type === "reminder"
      // Compute outstanding balance for this contact
      const [expenseDocs, settlementDocs] = await Promise.all([
        db.collection("splits_expenses").find({ userId: user.userId }).toArray(),
        db.collection("splits_settlements").find({ userId: user.userId }).toArray(),
      ])

      const expenses: SplitExpense[] = expenseDocs.map((e) => ({
        _id: e._id.toString(),
        userId: e.userId,
        groupId: e.groupId,
        description: e.description,
        amount: e.amount,
        paidBy: e.paidBy,
        splitType: e.splitType,
        splits: e.splits,
        date: e.date,
        category: e.category,
        createdAt: e.createdAt,
      }))

      const settlements: Settlement[] = settlementDocs.map((s) => ({
        _id: s._id.toString(),
        userId: s.userId,
        groupId: s.groupId,
        paidBy: s.paidBy,
        paidTo: s.paidTo,
        amount: s.amount,
        date: s.date,
        notes: s.notes,
        createdAt: s.createdAt,
      }))

      const balances = computeNetBalances(expenses, settlements, "Me")
      const personBalance = balances.find((b) => b.person === contact.name)

      if (!personBalance || personBalance.theyOwe <= 0) {
        return NextResponse.json(
          { success: false, message: `${contact.name} does not owe you anything.` },
          { status: 400, headers: corsHeaders() }
        )
      }

      // Gather outstanding expenses where this person owes money
      // (expenses where Me paid and this person is in the splits)
      const outstandingExpenses = expenses
        .filter((e) => {
          if (e.paidBy !== "Me") return false
          return e.splits.some((s) => s.person === contact.name)
        })
        .map((e) => {
          const split = e.splits.find((s) => s.person === contact.name)
          return {
            description: e.description,
            amount: split?.amount || 0,
            date: e.date,
          }
        })
        .filter((e) => e.amount > 0)

      const result = await sendSplitReminder({
        to: contact.email,
        fromName,
        totalOwed: personBalance.theyOwe,
        expenses: outstandingExpenses,
      })

      // Store notification record
      await db.collection("split_notifications").insertOne({
        userId: user.userId,
        contactId,
        type: "reminder",
        sentTo: contact.email,
        sentAt: now,
        status: result.success ? "sent" : "failed",
        ...(result.error ? { error: result.error } : {}),
      })

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.error || "Failed to send reminder." },
          { status: 500, headers: corsHeaders() }
        )
      }

      return NextResponse.json(
        { success: true, message: `Reminder sent to ${contact.name}` },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Splits notify POST error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to send notification." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/splits/notify
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
