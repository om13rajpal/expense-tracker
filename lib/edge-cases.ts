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
