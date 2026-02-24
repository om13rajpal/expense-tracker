/**
 * Core balance computation library for the Splits feature.
 * Handles net balance calculation, pairwise netting, and debt simplification.
 * @module lib/splits-utils
 */

/** A single person's share in a split expense. */
export interface SplitEntry {
  /** Person's name. */
  person: string
  /** Their share amount in INR. */
  amount: number
}

/** A shared expense record with split details, stored in MongoDB. */
export interface SplitExpense {
  /** MongoDB ObjectId (absent before insertion). */
  _id?: string
  /** Owner user identifier. */
  userId: string
  /** Optional group this expense belongs to. */
  groupId?: string
  /** What the expense was for. */
  description: string
  /** Total expense amount in INR. */
  amount: number
  /** Name of the person who paid. */
  paidBy: string
  /** How the expense was split among participants. */
  splitType: "equal" | "exact" | "percentage"
  /** Individual share breakdown. */
  splits: SplitEntry[]
  /** Date of the expense (ISO string). */
  date: string
  /** Optional spending category. */
  category?: string
  /** ISO timestamp of creation. */
  createdAt: string
}

/** A settlement payment that reduces an outstanding debt between two people. */
export interface Settlement {
  /** MongoDB ObjectId (absent before insertion). */
  _id?: string
  /** Owner user identifier. */
  userId: string
  /** Optional group this settlement belongs to. */
  groupId?: string
  /** Person making the payment. */
  paidBy: string
  /** Person receiving the payment. */
  paidTo: string
  /** Settlement amount in INR. */
  amount: number
  /** Date of the settlement (ISO string). */
  date: string
  /** Optional note about the settlement. */
  notes?: string
  /** ISO timestamp of creation. */
  createdAt: string
}

/** Simple net balance for a person (positive = they owe you). */
export interface Balance {
  /** Person's name. */
  person: string
  /** Net balance in INR. Positive means they owe you; negative means you owe them. */
  netBalance: number
}

/** Detailed balance for a person, split into directional components. */
export interface DetailedBalance {
  /** Person's name. */
  person: string
  /** Net balance in INR (positive = they owe you). */
  netBalance: number
  /** How much you owe this person (0 if they owe you). */
  youOwe: number
  /** How much this person owes you (0 if you owe them). */
  theyOwe: number
}

/** A directed debt edge in the simplified debt graph (from -> to). */
export interface DebtEdge {
  /** Person who owes money. */
  from: string
  /** Person who is owed money. */
  to: string
  /** Amount to transfer in INR. */
  amount: number
}

/**
 * Compute net balances from expenses and settlements, from `selfName`'s perspective.
 *
 * Tracks pairwise debts: for each expense, each non-payer participant owes
 * the payer their split share. Settlements reduce those debts. The result
 * is a per-person DetailedBalance showing how much you owe and are owed.
 *
 * @param expenses - All split expense records.
 * @param settlements - All settlement records.
 * @param selfName - Your display name (default "Me").
 * @returns Array of DetailedBalance sorted by net balance descending.
 */
export function computeNetBalances(
  expenses: SplitExpense[],
  settlements: Settlement[],
  selfName = "Me"
): DetailedBalance[] {
  // Track pairwise debts: debts[A][B] = amount A owes B
  const debts: Record<string, Record<string, number>> = {}

  function ensurePair(a: string, b: string) {
    if (!debts[a]) debts[a] = {}
    if (!debts[a][b]) debts[a][b] = 0
    if (!debts[b]) debts[b] = {}
    if (!debts[b][a]) debts[b][a] = 0
  }

  // Process expenses
  for (const exp of expenses) {
    const payer = exp.paidBy
    for (const split of exp.splits) {
      if (split.person === payer) continue
      ensurePair(split.person, payer)
      debts[split.person][payer] += split.amount
    }
  }

  // Process settlements (reduce debts)
  for (const s of settlements) {
    ensurePair(s.paidBy, s.paidTo)
    debts[s.paidBy][s.paidTo] -= s.amount
  }

  // Net pairwise: for each pair (A, B), compute net
  const people = new Set<string>()
  for (const a of Object.keys(debts)) {
    people.add(a)
    for (const b of Object.keys(debts[a])) {
      people.add(b)
    }
  }

  // From selfName's perspective
  const balances: DetailedBalance[] = []

  for (const person of people) {
    if (person === selfName) continue

    // How much person owes self (net)
    const personOwesSelf = (debts[person]?.[selfName] || 0) - (debts[selfName]?.[person] || 0)

    balances.push({
      person,
      netBalance: personOwesSelf, // positive = they owe you
      youOwe: personOwesSelf < 0 ? Math.abs(personOwesSelf) : 0,
      theyOwe: personOwesSelf > 0 ? personOwesSelf : 0,
    })
  }

  return balances.sort((a, b) => b.netBalance - a.netBalance)
}

/**
 * Compute net balances scoped to a specific group.
 *
 * @param expenses - All split expense records (will be filtered by groupId).
 * @param settlements - All settlement records (will be filtered by groupId).
 * @param groupId - Group identifier to filter by.
 * @param selfName - Your display name (default "Me").
 * @returns Array of DetailedBalance for the group.
 */
export function computeGroupBalances(
  expenses: SplitExpense[],
  settlements: Settlement[],
  groupId: string,
  selfName = "Me"
): DetailedBalance[] {
  const groupExpenses = expenses.filter((e) => e.groupId === groupId)
  const groupSettlements = settlements.filter((s) => s.groupId === groupId)
  return computeNetBalances(groupExpenses, groupSettlements, selfName)
}

/**
 * Simplify debts to minimise the number of settlement transactions needed.
 *
 * Uses a greedy algorithm that repeatedly matches the largest creditor with
 * the largest debtor, transferring the minimum of the two amounts. This
 * produces an optimal or near-optimal number of transfers.
 *
 * @param balances - Array of per-person net balances.
 * @returns Minimal set of DebtEdge transfers to settle all debts.
 */
export function simplifyDebts(balances: Balance[]): DebtEdge[] {
  // Clone and filter out zero balances
  const nets = balances
    .filter((b) => Math.abs(b.netBalance) > 0.01)
    .map((b) => ({ person: b.person, amount: b.netBalance }))

  const edges: DebtEdge[] = []

  while (nets.length > 1) {
    // Sort: most negative (biggest debtor) first, most positive (biggest creditor) last
    nets.sort((a, b) => a.amount - b.amount)

    const debtor = nets[0] // most negative
    const creditor = nets[nets.length - 1] // most positive

    if (Math.abs(debtor.amount) < 0.01 || Math.abs(creditor.amount) < 0.01) break

    const transfer = Math.min(Math.abs(debtor.amount), creditor.amount)

    edges.push({
      from: debtor.person,
      to: creditor.person,
      amount: Math.round(transfer * 100) / 100,
    })

    debtor.amount += transfer
    creditor.amount -= transfer

    // Remove settled entries
    const remaining = nets.filter((n) => Math.abs(n.amount) > 0.01)
    nets.length = 0
    nets.push(...remaining)
  }

  return edges
}
