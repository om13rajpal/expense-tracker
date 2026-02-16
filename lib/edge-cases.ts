/**
 * Shared edge-case detection utilities used across pages.
 */

/**
 * Returns true when a single expense is likely a one-time large purchase.
 */
export function isOneTimePurchase(amount: number, threshold = 50000): boolean {
  return amount >= threshold
}

/**
 * Returns true when a transaction amount exceeds `multiplier` times the daily average.
 */
export function isOutlierTransaction(
  amount: number,
  dailyAvg: number,
  multiplier = 3
): boolean {
  return dailyAvg > 0 && amount > dailyAvg * multiplier
}

/**
 * Describes how much of a calendar month is covered by transactions.
 */
export interface PartialMonthInfo {
  isPartial: boolean
  message: string
  coverageDays: number
  totalDays: number
}

export function getPartialMonthInfo(
  transactions: { date: string | Date }[],
  year: number,
  month: number
): PartialMonthInfo {
  const totalDays = new Date(year, month, 0).getDate()
  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month
  const coverageDays = isCurrentMonth ? today.getDate() : totalDays

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const isPartial = coverageDays < totalDays
  const monthName = monthNames[month - 1] ?? `Month ${month}`

  const message = isPartial
    ? `${monthName} data covers ${monthName.slice(0, 3)} 1\u2013${coverageDays} only (${coverageDays} of ${totalDays} days)`
    : `Full month data for ${monthName}`

  return { isPartial, message, coverageDays, totalDays }
}

/**
 * Returns true when the closing balance is negative.
 */
export function hasNegativeBalance(balance: number): boolean {
  return balance < 0
}

/**
 * Generate plain-English insight strings suitable for MorphingText.
 */
export function getInsightTexts(metrics: {
  totalIncome?: number
  totalExpenses?: number
  savingsRate?: number
  topCategory?: string
  topCategoryAmount?: number
  incomeChangePercent?: number
}): string[] {
  const insights: string[] = []

  const { totalIncome = 0, totalExpenses = 0, savingsRate, topCategory, topCategoryAmount, incomeChangePercent } = metrics

  if (totalIncome > 0 && totalExpenses > 0) {
    const saved = totalIncome - totalExpenses
    if (saved > 0) {
      insights.push(`You saved \u20B9${Math.round(saved).toLocaleString("en-IN")} this month`)
    } else {
      insights.push(`You overspent by \u20B9${Math.round(Math.abs(saved)).toLocaleString("en-IN")} this month`)
    }
  }

  if (topCategory && topCategoryAmount && topCategoryAmount > 0) {
    insights.push(`${topCategory} is your #1 expense at \u20B9${Math.round(topCategoryAmount).toLocaleString("en-IN")}`)
  }

  if (typeof incomeChangePercent === "number" && incomeChangePercent !== 0) {
    const direction = incomeChangePercent > 0 ? "up" : "down"
    insights.push(`Income ${direction} ${Math.abs(incomeChangePercent).toFixed(1)}% vs last month`)
  }

  if (typeof savingsRate === "number" && totalIncome > 0) {
    if (savingsRate >= 30) {
      insights.push("Great savings rate — you're building wealth fast")
    } else if (savingsRate >= 10) {
      insights.push("Solid savings this month — keep it up")
    } else if (savingsRate >= 0) {
      insights.push("Tight month — look for ways to cut back")
    }
  }

  if (totalIncome === 0) {
    insights.push("No income recorded yet this month")
  }

  // Always return at least 2 items for MorphingText
  if (insights.length < 2) {
    insights.push("Welcome to your financial dashboard")
  }

  return insights
}
