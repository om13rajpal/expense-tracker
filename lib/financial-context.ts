/**
 * Shared financial context builder.
 *
 * Fetches all relevant MongoDB collections for a user in parallel and
 * builds a comprehensive structured-text summary suitable for injecting
 * into LLM system prompts. Covers:
 * - Account overview (balance, income, expenses, savings rate)
 * - Monthly summary (last 6 months)
 * - Expense category breakdown
 * - Budget categories with current-month spend vs. limits
 * - Stock holdings and mutual fund positions
 * - Active SIPs and NWI configuration
 * - Savings goals with on-track analysis
 * - Recurring expenses and top merchants
 * - Previous AI analysis highlights
 * - Recent 30 transactions as a markdown table
 *
 * Extracted from `app/api/agent/chat/route.ts` so both the full AI agent
 * and the spotlight search can share the same rich context.
 *
 * @module lib/financial-context
 */

import type { Db } from 'mongodb'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a number as an Indian-locale currency string (Rs.X,XX,XXX).
 *
 * @param amount - Amount in INR.
 * @returns Formatted string like "Rs.1,50,000".
 */
export function fmt(amount: number): string {
  return `Rs.${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/**
 * Format a number as a percentage string with one decimal place.
 *
 * @param value - Percentage value (e.g. 12.5).
 * @returns Formatted string like "12.5%".
 */
export function pct(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Safely convert an unknown value to a YYYY-MM-DD date string.
 * Returns "N/A" if the value is falsy or not a valid date.
 *
 * @param d - Date-like value (string, Date, or unknown).
 * @returns ISO date string (YYYY-MM-DD) or "N/A".
 */
export function safeDate(d: unknown): string {
  if (!d) return 'N/A'
  const date = typeof d === 'string' ? new Date(d) : d as Date
  if (isNaN(date.getTime())) return 'N/A'
  return date.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Data fetching — all collections in parallel
// ---------------------------------------------------------------------------

/** Aggregated financial data fetched from all relevant MongoDB collections. */
export interface FinancialData {
  /** Most recent 500 transactions sorted by date descending. */
  transactions: Record<string, unknown>[]
  /** All stock holdings. */
  stocks: Record<string, unknown>[]
  /** All mutual fund holdings. */
  mutualFunds: Record<string, unknown>[]
  /** All SIP (Systematic Investment Plan) records. */
  sips: Record<string, unknown>[]
  /** Budget category documents with limits. */
  budgetCategories: Record<string, unknown>[]
  /** Active user-defined categorization rules. */
  categorizationRules: Record<string, unknown>[]
  /** Needs/Wants/Investments configuration, or null if not set. */
  nwiConfig: Record<string, unknown> | null
  /** All savings goals. */
  savingsGoals: Record<string, unknown>[]
  /** Most recent 5 AI analysis documents. */
  aiAnalyses: Record<string, unknown>[]
}

/**
 * Fetch all financial data for a user from MongoDB in parallel.
 *
 * Queries 9 collections concurrently: transactions (last 500), stocks,
 * mutual_funds, sips, budget_categories, categorization_rules (enabled only),
 * nwi_config, savings_goals, and ai_analyses (last 5).
 *
 * @param db - MongoDB Db instance.
 * @param userId - User identifier.
 * @returns Aggregated FinancialData across all collections.
 */
export async function fetchAllFinancialData(db: Db, userId: string): Promise<FinancialData> {
  const [
    transactions,
    stocks,
    mutualFunds,
    sips,
    budgetCategories,
    categorizationRules,
    nwiConfig,
    savingsGoals,
    aiAnalyses,
  ] = await Promise.all([
    db.collection('transactions')
      .find({ userId })
      .sort({ date: -1 })
      .limit(500)
      .toArray(),
    db.collection('stocks')
      .find({ userId })
      .toArray(),
    db.collection('mutual_funds')
      .find({ userId })
      .toArray(),
    db.collection('sips')
      .find({ userId })
      .toArray(),
    db.collection('budget_categories')
      .find({ userId })
      .toArray(),
    db.collection('categorization_rules')
      .find({ userId, enabled: true })
      .toArray(),
    db.collection('nwi_config')
      .findOne({ userId }),
    db.collection('savings_goals')
      .find({ userId })
      .toArray(),
    db.collection('ai_analyses')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
  ])

  return {
    transactions: transactions as Record<string, unknown>[],
    stocks: stocks as Record<string, unknown>[],
    mutualFunds: mutualFunds as Record<string, unknown>[],
    sips: sips as Record<string, unknown>[],
    budgetCategories: budgetCategories as Record<string, unknown>[],
    categorizationRules: categorizationRules as Record<string, unknown>[],
    nwiConfig: nwiConfig as Record<string, unknown> | null,
    savingsGoals: savingsGoals as Record<string, unknown>[],
    aiAnalyses: aiAnalyses as Record<string, unknown>[],
  }
}

// ---------------------------------------------------------------------------
// Context builder — turns raw data into a concise, structured text summary
// ---------------------------------------------------------------------------

/**
 * Build a comprehensive structured-text financial summary from raw data.
 *
 * Produces a multi-section markdown string covering account overview,
 * monthly trends, category breakdown, budgets, investments, SIPs,
 * NWI config, savings goals, recurring expenses, top merchants,
 * AI analysis history, and recent transactions. Designed to be injected
 * into LLM system prompts to provide full financial context.
 *
 * @param data - Aggregated financial data from {@link fetchAllFinancialData}.
 * @returns Multi-section markdown string summarising all financial data.
 */
export function buildFinancialContext(data: FinancialData): string {
  const lines: string[] = []
  const { transactions, stocks, mutualFunds, sips, budgetCategories, nwiConfig, savingsGoals, aiAnalyses } = data

  // ---- Account overview ----
  const incomeTransactions = transactions.filter(
    (t) => t.type === 'income' || t.type === 'refund'
  )
  const expenseTransactions = transactions.filter(
    (t) => t.type === 'expense'
  )
  const investmentTransactions = transactions.filter(
    (t) => t.type === 'investment'
  )

  const totalIncome = incomeTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const totalExpenses = expenseTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const totalInvestmentTxns = investmentTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  // Current balance from the most recent transaction that has a balance field
  const withBalance = transactions.find((t) => t.balance != null)
  const currentBalance = withBalance ? Number(withBalance.balance) : undefined

  lines.push('## Account Overview')
  if (currentBalance !== undefined) {
    lines.push(`- Current Bank Balance: ${fmt(currentBalance)}`)
  }
  lines.push(`- Total Income (from loaded transactions): ${fmt(totalIncome)}`)
  lines.push(`- Total Expenses (from loaded transactions): ${fmt(totalExpenses)}`)
  lines.push(`- Total Investment Transactions: ${fmt(totalInvestmentTxns)}`)
  lines.push(`- Net Savings: ${fmt(totalIncome - totalExpenses)}`)
  lines.push(`- Savings Rate: ${pct(savingsRate)}`)
  lines.push(`- Transaction count loaded: ${transactions.length}`)
  lines.push('')

  // ---- Monthly summary (last 6 months) ----
  const monthMap = new Map<string, { income: number; expenses: number; investments: number; count: number }>()
  for (const t of transactions) {
    const dateStr = typeof t.date === 'string' ? t.date : ''
    const month = dateStr.slice(0, 7) // "YYYY-MM"
    if (!month) continue
    const entry = monthMap.get(month) || { income: 0, expenses: 0, investments: 0, count: 0 }
    const amt = Number(t.amount) || 0
    if (t.type === 'income' || t.type === 'refund') entry.income += amt
    else if (t.type === 'expense') entry.expenses += amt
    else if (t.type === 'investment') entry.investments += amt
    entry.count++
    monthMap.set(month, entry)
  }

  const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).reverse()

  if (sortedMonths.length > 0) {
    lines.push('## Monthly Summary (last 6 months)')
    for (const [month, m] of sortedMonths) {
      const savings = m.income - m.expenses
      lines.push(
        `- ${month}: Income ${fmt(m.income)}, Expenses ${fmt(m.expenses)}, Investments ${fmt(m.investments)}, Savings ${fmt(savings)} (${m.count} txns)`
      )
    }
    lines.push('')
  }

  // ---- Category breakdown (expenses) ----
  const categoryTotals = new Map<string, number>()
  for (const t of expenseTransactions) {
    const cat = (t.category as string) || 'Uncategorized'
    categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + (Number(t.amount) || 0))
  }
  const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])

  if (sortedCategories.length > 0) {
    lines.push('## Expense Category Breakdown')
    for (const [cat, amount] of sortedCategories.slice(0, 15)) {
      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      lines.push(`- ${cat}: ${fmt(amount)} (${pct(percentage)})`)
    }
    lines.push('')
  }

  // ---- Payment method breakdown ----
  const paymentTotals = new Map<string, number>()
  for (const t of expenseTransactions) {
    const method = (t.paymentMethod as string) || 'Other'
    paymentTotals.set(method, (paymentTotals.get(method) || 0) + (Number(t.amount) || 0))
  }
  const sortedPayments = Array.from(paymentTotals.entries()).sort((a, b) => b[1] - a[1])

  if (sortedPayments.length > 0) {
    lines.push('## Payment Methods')
    for (const [method, amount] of sortedPayments) {
      lines.push(`- ${method}: ${fmt(amount)}`)
    }
    lines.push('')
  }

  // ---- Budget categories ----
  if (budgetCategories.length > 0) {
    lines.push('## Budget Categories')

    // Calculate current month spending per budget category
    const currentMonth = new Date().toISOString().slice(0, 7)
    const currentMonthExpenses = expenseTransactions.filter(
      (t) => typeof t.date === 'string' && t.date.startsWith(currentMonth)
    )
    const currentMonthCategorySpend = new Map<string, number>()
    for (const t of currentMonthExpenses) {
      const cat = (t.category as string) || 'Uncategorized'
      currentMonthCategorySpend.set(cat, (currentMonthCategorySpend.get(cat) || 0) + (Number(t.amount) || 0))
    }

    for (const b of budgetCategories) {
      const cat = (b.name as string) || (b.category as string) || 'Unknown'
      const limit = Number(b.budgetAmount) || Number(b.limit) || 0
      const spent = currentMonthCategorySpend.get(cat) || 0
      const remaining = limit - spent
      const usedPct = limit > 0 ? (spent / limit) * 100 : 0
      const status = usedPct > 100 ? 'EXCEEDED' : usedPct > 80 ? 'WARNING' : 'on-track'
      lines.push(`- ${cat}: ${fmt(limit)}/month budget, ${fmt(spent)} spent this month (${pct(usedPct)} used) [${status}], ${fmt(remaining)} remaining`)
    }
    lines.push('')
  }

  // ---- Investment portfolio: Stocks ----
  if (stocks.length > 0) {
    lines.push('## Stock Holdings')
    let totalStockInvested = 0
    let totalStockCurrent = 0
    for (const s of stocks) {
      const symbol = s.symbol as string
      const exchange = s.exchange as string || ''
      const shares = Number(s.shares) || 0
      const avgCost = Number(s.averageCost) || 0
      const currentPrice = s.currentPrice != null ? Number(s.currentPrice) : undefined
      const invested = shares * avgCost
      totalStockInvested += invested
      const currentVal = currentPrice != null ? currentPrice * shares : undefined
      if (currentVal != null) totalStockCurrent += currentVal

      let line = `- ${symbol} (${exchange}): ${shares} shares @ avg ${fmt(avgCost)}, invested ${fmt(invested)}`
      if (currentPrice != null && currentVal != null) {
        const returns = currentVal - invested
        const returnsPct = invested > 0 ? (returns / invested) * 100 : 0
        line += `, current price ${fmt(currentPrice)}, value ${fmt(currentVal)}, returns ${fmt(returns)} (${pct(returnsPct)})`
      }
      if (s.expectedAnnualReturn != null) {
        line += `, expected ${pct(Number(s.expectedAnnualReturn))}/yr`
      }
      lines.push(line)
    }
    lines.push(`- **Total Stocks**: Invested ${fmt(totalStockInvested)}${totalStockCurrent > 0 ? `, Current ${fmt(totalStockCurrent)}, Returns ${fmt(totalStockCurrent - totalStockInvested)}` : ''}`)
    lines.push('')
  }

  // ---- Investment portfolio: Mutual Funds ----
  if (mutualFunds.length > 0) {
    lines.push('## Mutual Fund Holdings')
    let totalMFInvested = 0
    let totalMFCurrent = 0
    for (const mf of mutualFunds) {
      const name = mf.name as string || mf.fundName as string || 'Unknown'
      const fundCode = mf.fundCode as string || ''
      const units = Number(mf.units) || 0
      const avgNav = Number(mf.averageNAV) || 0
      const currentNav = mf.currentNAV != null ? Number(mf.currentNAV) : undefined
      const invested = Number(mf.totalInvested) || units * avgNav
      totalMFInvested += invested
      const currentVal = currentNav != null ? currentNav * units : (mf.currentValue != null ? Number(mf.currentValue) : undefined)
      if (currentVal != null) totalMFCurrent += currentVal

      let line = `- ${name}${fundCode ? ` (${fundCode})` : ''}: ${units.toFixed(3)} units @ avg NAV ${fmt(avgNav)}, invested ${fmt(invested)}`
      if (currentVal != null) {
        const returns = currentVal - invested
        const returnsPct = invested > 0 ? (returns / invested) * 100 : 0
        line += `, current value ${fmt(currentVal)}, returns ${fmt(returns)} (${pct(returnsPct)})`
      }
      if (mf.sipLinked) line += ' [SIP linked]'
      lines.push(line)
    }
    lines.push(`- **Total Mutual Funds**: Invested ${fmt(totalMFInvested)}${totalMFCurrent > 0 ? `, Current ${fmt(totalMFCurrent)}, Returns ${fmt(totalMFCurrent - totalMFInvested)}` : ''}`)
    lines.push('')
  }

  // ---- SIPs ----
  if (sips.length > 0) {
    lines.push('## SIPs (Systematic Investment Plans)')
    let totalMonthly = 0
    for (const sip of sips) {
      const name = sip.name as string
      const provider = sip.provider as string || ''
      const monthly = Number(sip.monthlyAmount) || 0
      const status = sip.status as string || 'active'
      const startDate = safeDate(sip.startDate)
      if (status === 'active') totalMonthly += monthly

      let line = `- ${name} (${provider}): ${fmt(monthly)}/month, started ${startDate}, status: ${status}`
      if (sip.expectedAnnualReturn != null) {
        line += `, expected return ${pct(Number(sip.expectedAnnualReturn))}/yr`
      }
      lines.push(line)
    }
    lines.push(`- **Total Active SIP Monthly**: ${fmt(totalMonthly)}`)
    lines.push('')
  }

  // ---- NWI Configuration ----
  if (nwiConfig) {
    lines.push('## NWI Configuration (Needs/Wants/Investments/Savings Split)')
    const buckets = ['needs', 'wants', 'investments', 'savings'] as const
    for (const bucket of buckets) {
      const b = nwiConfig[bucket] as { percentage?: number; categories?: string[] } | undefined
      if (b) {
        const categories = b.categories?.join(', ') || 'none'
        lines.push(`- ${bucket.charAt(0).toUpperCase() + bucket.slice(1)}: ${pct(b.percentage || 0)} target (categories: ${categories})`)
      }
    }
    lines.push('')
  }

  // ---- Savings Goals ----
  if (savingsGoals.length > 0) {
    lines.push('## Savings Goals')
    for (const goal of savingsGoals) {
      const name = goal.name as string
      const target = Number(goal.targetAmount) || 0
      const current = Number(goal.currentAmount) || 0
      const deadline = safeDate(goal.targetDate)
      const monthlyContrib = Number(goal.monthlyContribution) || 0
      const progress = target > 0 ? (current / target) * 100 : 0

      // Calculate if on track
      const remaining = target - current
      const targetDate = new Date(goal.targetDate as string)
      const now = new Date()
      const monthsLeft = Math.max(0, (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()))
      const requiredMonthly = monthsLeft > 0 ? remaining / monthsLeft : remaining
      const onTrack = monthlyContrib >= requiredMonthly || current >= target

      lines.push(
        `- ${name}: ${fmt(current)} / ${fmt(target)} (${pct(progress)}), deadline: ${deadline}, contributing ${fmt(monthlyContrib)}/month, required ${fmt(requiredMonthly)}/month [${onTrack ? 'ON TRACK' : 'BEHIND'}]`
      )
    }
    lines.push('')
  }

  // ---- Recurring expenses ----
  const recurringTxns = expenseTransactions.filter((t) => t.recurring === true)
  if (recurringTxns.length > 0) {
    const recurringTotal = recurringTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const recurringCategories = new Map<string, number>()
    for (const t of recurringTxns) {
      const cat = (t.category as string) || 'Uncategorized'
      recurringCategories.set(cat, (recurringCategories.get(cat) || 0) + (Number(t.amount) || 0))
    }
    lines.push('## Recurring Expenses')
    lines.push(`- Total recurring: ${fmt(recurringTotal)} (${recurringTxns.length} transactions)`)
    for (const [cat, amount] of Array.from(recurringCategories.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      lines.push(`  - ${cat}: ${fmt(amount)}`)
    }
    lines.push('')
  }

  // ---- Top merchants ----
  const merchantTotals = new Map<string, number>()
  for (const t of expenseTransactions) {
    const merchant = (t.merchant as string || t.description as string || '').trim()
    if (!merchant) continue
    merchantTotals.set(merchant, (merchantTotals.get(merchant) || 0) + (Number(t.amount) || 0))
  }
  const topMerchants = Array.from(merchantTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
  if (topMerchants.length > 0) {
    lines.push('## Top Merchants/Payees (by expense volume)')
    for (const [merchant, amount] of topMerchants) {
      lines.push(`- ${merchant}: ${fmt(amount)}`)
    }
    lines.push('')
  }

  // ---- AI analyses summary ----
  if (aiAnalyses.length > 0) {
    lines.push('## Previous AI Analysis Highlights')
    for (const analysis of aiAnalyses) {
      const type = analysis.type as string || 'general'
      const createdAt = safeDate(analysis.createdAt)
      const summary = analysis.summary as string || analysis.content as string || ''
      if (summary) {
        lines.push(`- [${type}] ${createdAt}: ${summary.slice(0, 200)}${summary.length > 200 ? '...' : ''}`)
      }
    }
    lines.push('')
  }

  // ---- Recent transactions (last 30) ----
  const recent = transactions.slice(0, 30)
  if (recent.length > 0) {
    lines.push('## Recent Transactions (last 30)')
    lines.push('| Date | Description | Category | Amount | Type | Payment Method |')
    lines.push('|------|-------------|----------|--------|------|----------------|')
    for (const t of recent) {
      const date = safeDate(t.date)
      const desc = ((t.description as string) || '').slice(0, 50)
      const cat = (t.category as string) || 'Uncategorized'
      const amount = fmt(Number(t.amount) || 0)
      const type = (t.type as string) || ''
      const payment = (t.paymentMethod as string) || ''
      lines.push(`| ${date} | ${desc} | ${cat} | ${amount} | ${type} | ${payment} |`)
    }
    lines.push('')
  }

  // ---- Categorization rules (for context on how the user classifies) ----
  if (data.categorizationRules.length > 0) {
    lines.push('## Active Categorization Rules')
    for (const rule of data.categorizationRules.slice(0, 20)) {
      const pattern = rule.pattern as string
      const matchField = rule.matchField as string || 'any'
      const category = rule.category as string
      lines.push(`- Pattern "${pattern}" on ${matchField} -> ${category}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
