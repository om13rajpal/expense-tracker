/**
 * Groww-related utilities for identifying investment transactions.
 */

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
 */
export function isGrowwTransaction(description: string): boolean {
  const lower = description.toLowerCase()
  return GROWW_KEYWORDS.some((keyword) => lower.includes(keyword))
}
