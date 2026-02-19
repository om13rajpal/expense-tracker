/**
 * Core balance computation library for the Splits feature.
 * Handles net balance calculation, pairwise netting, and debt simplification.
 * @module lib/splits-utils
 */

export interface SplitEntry {
  person: string
  amount: number
}

export interface SplitExpense {
  _id?: string
  userId: string
  groupId?: string
  description: string
  amount: number
  paidBy: string
  splitType: "equal" | "exact" | "percentage"
  splits: SplitEntry[]
  date: string
  category?: string
  createdAt: string
}

export interface Settlement {
  _id?: string
  userId: string
  groupId?: string
  paidBy: string
  paidTo: string
  amount: number
  date: string
  notes?: string
  createdAt: string
}

export interface Balance {
  person: string
  netBalance: number
}

export interface DetailedBalance {
  person: string
  netBalance: number
  youOwe: number
  theyOwe: number
}

export interface DebtEdge {
  from: string
  to: string
  amount: number
}

/**
 * Compute net balances from expenses and settlements.
 * Positive netBalance = they owe you, Negative = you owe them.
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
 * Compute balances filtered by a specific group.
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
 * Simplify debts to minimize number of transactions needed.
 * Uses a greedy algorithm: repeatedly match the largest creditor with the largest debtor.
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
