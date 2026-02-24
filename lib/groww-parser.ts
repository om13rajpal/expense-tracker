/**
 * Groww-related utilities for identifying investment transactions.
 *
 * Detects whether a bank transaction description matches known Groww
 * (investment platform) keywords, allowing the sync pipeline to
 * auto-tag such transactions as investments.
 *
 * @module lib/groww-parser
 */

/** Keywords that appear in bank descriptions for Groww-originated transactions. */
const GROWW_KEYWORDS = [
  "groww",
  "groww.iccl",
  "groww.brk",
  "mutual f",
  "billdesk groww",
  "razorpay groww",
  "ng-groww",
  "nextbillion groww",
]

/**
 * Check if a bank transaction description matches Groww-related keywords.
 *
 * Performs a case-insensitive substring match against known Groww
 * identifiers commonly found in Indian bank statements.
 *
 * @param description - The raw bank transaction description.
 * @returns `true` if the description contains any Groww keyword.
 */
export function isGrowwTransaction(description: string): boolean {
  const lower = description.toLowerCase()
  return GROWW_KEYWORDS.some((keyword) => lower.includes(keyword))
}
