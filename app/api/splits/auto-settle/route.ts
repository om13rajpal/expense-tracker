/**
 * Splits Auto-Settle API
 * Automatically matches bank transactions to split contacts and creates
 * settlement records. Uses name-matching heuristics against transaction
 * descriptions and merchant fields.
 *
 * Requires JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   POST /api/splits/auto-settle - Scan bank transactions and auto-create settlements
 *
 * MongoDB collections: `splits_expenses`, `splits_settlements`, `splits_contacts`,
 *   `splits_auto_settled`, `transactions`
 */

import { NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongodb"
import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { computeNetBalances, type SplitExpense, type Settlement } from "@/lib/splits-utils"

/**
 * POST /api/splits/auto-settle
 *
 * Scans the user's bank transactions for payments matching split contacts.
 * When a matching transaction is found after the split date, an automatic
 * settlement record is created. Each transaction is only processed once.
 *
 * Matching logic:
 *   - Contact name parts (3+ chars) are matched case-insensitively
 *     against transaction description and merchant fields
 *   - Income transactions matching a debtor → they paid you back
 *   - Expense transactions matching a creditor → you paid them back
 */
export async function POST(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb()

      const [expenseDocs, settlementDocs, contactDocs] = await Promise.all([
        db.collection("splits_expenses").find({ userId: user.userId }).toArray(),
        db.collection("splits_settlements").find({ userId: user.userId }).toArray(),
        db.collection("splits_contacts").find({ userId: user.userId }).toArray(),
      ])

      if (contactDocs.length === 0 || expenseDocs.length === 0) {
        return NextResponse.json(
          { success: true, settlementsCreated: 0, settlements: [] },
          { headers: corsHeaders() }
        )
      }

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
      const contactNames = contactDocs.map((c) => c.name as string)

      // Get already auto-settled transaction IDs to avoid duplicates
      const autoSettledDocs = await db
        .collection("splits_auto_settled")
        .find({ userId: user.userId })
        .toArray()
      const settledTxnIds = new Set(autoSettledDocs.map((a) => a.txnId as string))

      const newSettlements: Array<{
        person: string
        amount: number
        txnDescription: string
        txnDate: string
      }> = []

      for (const balance of balances) {
        if (Math.abs(balance.netBalance) < 1) continue
        if (!contactNames.includes(balance.person)) continue

        // Build case-insensitive regex from name parts (3+ chars)
        const nameParts = balance.person
          .toLowerCase()
          .split(/\s+/)
          .filter((p) => p.length >= 3)
        if (nameParts.length === 0) nameParts.push(balance.person.toLowerCase())
        const regexPattern = nameParts
          .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")

        // Find earliest split date involving this person
        const personExpenses = expenses.filter(
          (e) =>
            e.splits.some((s) => s.person === balance.person) ||
            e.paidBy === balance.person
        )
        if (personExpenses.length === 0) continue
        const earliestDate = personExpenses.map((e) => e.date).sort()[0]

        // Find matching bank transactions after the earliest split date
        const matchingTxns = await db
          .collection("transactions")
          .find({
            userId: user.userId,
            date: { $gte: earliestDate },
            $or: [
              { description: { $regex: regexPattern, $options: "i" } },
              { merchant: { $regex: regexPattern, $options: "i" } },
            ],
          })
          .sort({ date: 1 })
          .toArray()

        let remaining = balance.netBalance

        for (const txn of matchingTxns) {
          const txnId = (txn.txnId || txn._id.toString()) as string
          if (settledTxnIds.has(txnId)) continue

          const txnAmount = txn.amount as number
          if (txnAmount <= 0) continue

          let settlementAmount = 0
          let paidBy = ""
          let paidTo = ""

          if (remaining > 0 && txn.type === "income") {
            // They owe you + you received income matching their name = they paid you
            settlementAmount = Math.min(txnAmount, remaining)
            paidBy = balance.person
            paidTo = "Me"
          } else if (remaining < 0 && txn.type === "expense") {
            // You owe them + you paid an expense matching their name = you paid them
            settlementAmount = Math.min(txnAmount, Math.abs(remaining))
            paidBy = "Me"
            paidTo = balance.person
          }

          if (settlementAmount <= 0) continue

          const now = new Date().toISOString()
          const doc = {
            userId: user.userId,
            groupId: null,
            paidBy,
            paidTo,
            amount: Math.round(settlementAmount * 100) / 100,
            date: txn.date as string,
            notes: `Auto-settled from: ${txn.description}`,
            createdAt: now,
          }

          const result = await db.collection("splits_settlements").insertOne(doc)

          await db.collection("splits_auto_settled").insertOne({
            userId: user.userId,
            txnId,
            splitPerson: balance.person,
            settlementId: result.insertedId.toString(),
            amount: Math.round(settlementAmount * 100) / 100,
            createdAt: now,
          })

          settledTxnIds.add(txnId)
          newSettlements.push({
            person: balance.person,
            amount: Math.round(settlementAmount * 100) / 100,
            txnDescription: txn.description as string,
            txnDate: txn.date as string,
          })

          if (remaining > 0) {
            remaining -= settlementAmount
          } else {
            remaining += settlementAmount
          }
          if (Math.abs(remaining) < 1) break
        }
      }

      return NextResponse.json(
        {
          success: true,
          settlementsCreated: newSettlements.length,
          settlements: newSettlements,
        },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      console.error("Auto-settle error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to auto-settle." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

/**
 * OPTIONS /api/splits/auto-settle
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions()
}
