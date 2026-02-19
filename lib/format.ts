/**
 * Shared formatting utilities used across all pages.
 * Eliminates duplicate formatCurrency/formatCompact inline definitions.
 */

/**
 * Format a number as Indian Rupee currency string.
 * e.g. 125000 → "₹1,25,000"
 */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number in compact Indian notation.
 * e.g. 12500 → "₹12.5k", 125000 → "₹1.2L", 23000000 → "₹2.3Cr"
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "₹0"
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)}L`
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}k`
  return `${sign}₹${abs.toFixed(0)}`
}

/**
 * Format a number as a signed percentage string.
 * e.g. 12.5 → "+12.5%", -3.2 → "-3.2%"
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Format for chart Y-axis labels (compact).
 */
export function formatCompactAxis(value: number): string {
  if (!Number.isFinite(value)) return "₹0"
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(0)}L`
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(0)}k`
  return `${sign}₹${abs.toFixed(0)}`
}
