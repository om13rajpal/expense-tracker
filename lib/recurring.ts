/**
 * Recurring Transaction Detection (simple variant).
 *
 * Groups transactions by normalized merchant name (via {@link cleanBankText}),
 * checks amount tolerance and interval consistency, then classifies the
 * frequency as weekly, monthly, quarterly, or yearly. Lighter-weight than
 * {@link module:lib/recurring-detector} -- no confidence scoring or
 * subscription detection.
 *
 * @module lib/recurring
 */

import { cleanBankText } from "@/lib/categorizer"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A detected recurring transaction pattern and its constituent transactions. */
export interface RecurringTransaction {
  /** Original (un-normalized) merchant name. */
  merchant: string
  /** Average transaction amount across all occurrences. */
  avgAmount: number
  /** Detected payment frequency. */
  frequency: "weekly" | "monthly" | "quarterly" | "yearly"
  /** Date of the most recent occurrence (YYYY-MM-DD). */
  lastDate: string
  /** Predicted date of the next occurrence (YYYY-MM-DD). */
  nextExpected: string
  /** Most common category among the grouped transactions. */
  category: string
  /** Total number of occurrences found. */
  count: number
  /** Individual transaction records contributing to this pattern. */
  transactions: { id: string; date: string; amount: number; description: string }[]
}

export interface RecurringDetectionOptions {
  /** Fractional tolerance around the average amount (default 0.10 = 10%) */
  amountTolerance?: number
  /** Minimum number of occurrences to qualify (default 2) */
  minOccurrences?: number
}

/** Minimal transaction shape required by the recurring detection algorithm. */
export interface TransactionInput {
  id: string
  date: string
  merchant: string
  amount: number
  category: string
  description: string
}

// ---------------------------------------------------------------------------
// Frequency helpers
// ---------------------------------------------------------------------------

interface FrequencyBand {
  label: "weekly" | "monthly" | "quarterly" | "yearly"
  minDays: number
  maxDays: number
  advanceDays: number // days to add for nextExpected
}

const FREQUENCY_BANDS: FrequencyBand[] = [
  { label: "weekly", minDays: 5, maxDays: 9, advanceDays: 7 },
  { label: "monthly", minDays: 25, maxDays: 35, advanceDays: 30 },
  { label: "quarterly", minDays: 80, maxDays: 100, advanceDays: 90 },
  { label: "yearly", minDays: 350, maxDays: 380, advanceDays: 365 },
]

/**
 * Given an average interval in days, return the matching frequency band
 * or null if none matches.
 */
function classifyInterval(avgDays: number): FrequencyBand | null {
  for (const band of FREQUENCY_BANDS) {
    if (avgDays >= band.minDays && avgDays <= band.maxDays) {
      return band
    }
  }
  return null
}

/**
 * Calculate the number of days between two ISO date strings.
 */
function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / msPerDay
}

/**
 * Add `days` to an ISO date string and return a new ISO date string (date only).
 */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

/**
 * Detect recurring transactions from a list of transactions.
 *
 * Algorithm:
 *   1. Normalize each merchant name via {@link cleanBankText}.
 *   2. Group transactions by normalized merchant.
 *   3. For groups meeting `minOccurrences`:
 *      a. Verify amount consistency (all within `avgAmount * tolerance`).
 *      b. Compute average interval between sorted dates.
 *      c. Classify the interval into a frequency band.
 *   4. Return results sorted by next expected date (ascending).
 *
 * @param transactions - Array of expense transactions to analyse.
 * @param options - Detection parameters (amount tolerance, minimum occurrences).
 * @returns Array of RecurringTransaction patterns sorted by next expected date.
 */
export function detectRecurring(
  transactions: TransactionInput[],
  options: RecurringDetectionOptions = {}
): RecurringTransaction[] {
  const { amountTolerance = 0.1, minOccurrences = 2 } = options

  // --- Step 1 & 2: Group by normalized merchant ---
  const groups = new Map<
    string,
    {
      originalMerchant: string
      items: TransactionInput[]
    }
  >()

  for (const txn of transactions) {
    // Use merchant if available, otherwise fall back to description
    const rawText = txn.merchant || txn.description
    const key = cleanBankText(rawText)

    if (!key) continue

    const existing = groups.get(key)
    if (existing) {
      existing.items.push(txn)
    } else {
      groups.set(key, {
        originalMerchant: txn.merchant || txn.description,
        items: [txn],
      })
    }
  }

  // --- Step 3: Evaluate each group ---
  const results: RecurringTransaction[] = []

  for (const [, group] of groups) {
    const { items, originalMerchant } = group

    if (items.length < minOccurrences) continue

    // Sort by date ascending
    const sorted = [...items].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // 3a. Amount consistency
    const totalAmount = sorted.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const avgAmount = totalAmount / sorted.length

    // Skip if average is zero (avoids division by zero)
    if (avgAmount === 0) continue

    const amountsConsistent = sorted.every(
      (t) => Math.abs(Math.abs(t.amount) - avgAmount) <= avgAmount * amountTolerance
    )
    if (!amountsConsistent) continue

    // 3b. Interval consistency
    if (sorted.length < 2) continue

    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(daysBetween(sorted[i - 1].date, sorted[i].date))
    }

    const avgInterval = intervals.reduce((sum, d) => sum + d, 0) / intervals.length

    // 3c. Classify frequency
    const band = classifyInterval(avgInterval)
    if (!band) continue

    // Verify that individual intervals are reasonably close to the band range.
    // Allow a bit more slack: each interval should be within 1.5x of the band range.
    const slackMin = band.minDays * 0.7
    const slackMax = band.maxDays * 1.3
    const intervalsConsistent = intervals.every(
      (d) => d >= slackMin && d <= slackMax
    )
    if (!intervalsConsistent) continue

    const lastDate = sorted[sorted.length - 1].date
    const nextExpected = addDays(lastDate, band.advanceDays)

    // Use the most common category in the group
    const categoryCounts = new Map<string, number>()
    for (const t of sorted) {
      categoryCounts.set(t.category, (categoryCounts.get(t.category) || 0) + 1)
    }
    let topCategory = sorted[0].category
    let topCount = 0
    for (const [cat, count] of categoryCounts) {
      if (count > topCount) {
        topCategory = cat
        topCount = count
      }
    }

    results.push({
      merchant: originalMerchant,
      avgAmount: Math.round(avgAmount * 100) / 100,
      frequency: band.label,
      lastDate: lastDate.split("T")[0],
      nextExpected,
      category: topCategory,
      count: sorted.length,
      transactions: sorted.map((t) => ({
        id: t.id,
        date: t.date.split("T")[0],
        amount: t.amount,
        description: t.description,
      })),
    })
  }

  // Sort by next expected date ascending
  results.sort(
    (a, b) => new Date(a.nextExpected).getTime() - new Date(b.nextExpected).getTime()
  )

  return results
}
