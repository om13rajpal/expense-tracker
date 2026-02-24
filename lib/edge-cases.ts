/**
 * Shared edge-case detection utilities used across dashboard pages.
 *
 * Identifies one-time large purchases, outlier transactions, and
 * partial-month data coverage so that analytics components can
 * display appropriate warnings or adjust their calculations.
 *
 * @module lib/edge-cases
 */

/**
 * Check whether a single expense is likely a one-time large purchase.
 *
 * @param amount - Transaction amount in INR.
 * @param threshold - Minimum amount to consider "large" (default Rs.50,000).
 * @returns `true` if the amount meets or exceeds the threshold.
 */
export function isOneTimePurchase(amount: number, threshold = 50000): boolean {
  return amount >= threshold
}

/**
 * Check whether a transaction amount is an outlier relative to the daily average.
 *
 * @param amount - Transaction amount in INR.
 * @param dailyAvg - Average daily expense amount.
 * @param multiplier - How many times the daily average to consider an outlier (default 3x).
 * @returns `true` if the amount exceeds `dailyAvg * multiplier`.
 */
export function isOutlierTransaction(
  amount: number,
  dailyAvg: number,
  multiplier = 3
): boolean {
  return dailyAvg > 0 && amount > dailyAvg * multiplier
}

/** Describes how much of a calendar month is covered by transaction data. */
export interface PartialMonthInfo {
  /** Whether the month has fewer days covered than total calendar days. */
  isPartial: boolean
  /** Human-readable description of the coverage (e.g. "Jan 1-24 only"). */
  message: string
  /** Number of days with data in the month. */
  coverageDays: number
  /** Total calendar days in the month. */
  totalDays: number
}

/**
 * Determine how much of a calendar month is covered by transaction data.
 *
 * For the current month, coverage is capped at today's date. For past
 * months, full calendar coverage is assumed.
 *
 * @param transactions - Array of transaction-like objects with a date field.
 * @param year - Calendar year (e.g. 2026).
 * @param month - Calendar month (1-12, where 1 = January).
 * @returns PartialMonthInfo with coverage details and a human-readable message.
 */
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
