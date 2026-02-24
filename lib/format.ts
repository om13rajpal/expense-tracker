/**
 * Shared INR formatting utilities used across all Finova pages and components.
 *
 * Centralizes currency, percentage, and chart-axis formatting to eliminate
 * duplicate inline definitions. All monetary formatting uses the Indian
 * numbering system (lakhs and crores) with the "en-IN" locale.
 *
 * @module lib/format
 */

/**
 * Format a number as a full Indian Rupee currency string.
 *
 * Uses `Intl.NumberFormat` with the "en-IN" locale for proper Indian grouping
 * (e.g. lakhs and crores). Returns "₹0" for non-finite values (NaN, Infinity).
 *
 * @param amount - The numeric amount in INR.
 * @returns Formatted currency string like "₹1,25,000".
 *
 * @example
 * formatINR(125000)  // => "₹1,25,000"
 * formatINR(0)       // => "₹0"
 * formatINR(NaN)     // => "₹0"
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
 * Format a number in compact Indian notation with unit suffixes.
 *
 * Converts large numbers to short-form representations using Indian units:
 * - >= 1 Crore (1,00,00,000): "₹X.XCr"
 * - >= 1 Lakh (1,00,000): "₹X.XL"
 * - >= 1 Thousand (1,000): "₹X.Xk"
 * - Below 1,000: plain "₹X"
 *
 * Handles negative values by prepending a minus sign.
 * Returns "₹0" for non-finite values.
 *
 * @param value - The numeric amount in INR.
 * @returns Compact string like "₹12.5k", "₹1.2L", or "₹2.3Cr".
 *
 * @example
 * formatCompact(12500)     // => "₹12.5k"
 * formatCompact(125000)    // => "₹1.2L"
 * formatCompact(23000000)  // => "₹2.3Cr"
 * formatCompact(-50000)    // => "-₹50.0k"
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
 * Format a number as a signed percentage string with one decimal place.
 *
 * Positive values are prefixed with "+" for visual clarity in gain/loss displays.
 * Returns "0.0%" for non-finite values.
 *
 * @param value - The percentage value (e.g. 12.5 for +12.5%, -3.2 for -3.2%).
 * @returns Signed percentage string like "+12.5%" or "-3.2%".
 *
 * @example
 * formatPercent(12.5)   // => "+12.5%"
 * formatPercent(-3.2)   // => "-3.2%"
 * formatPercent(0)      // => "0.0%"
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Format a number for chart Y-axis tick labels using compact Indian notation.
 *
 * Similar to `formatCompact()` but uses zero decimal places for lakh and
 * thousand tiers to keep axis labels concise. Crore values retain one decimal.
 *
 * @param value - The numeric amount in INR for the axis label.
 * @returns Compact axis label like "₹2.3Cr", "₹1L", or "₹45k".
 *
 * @example
 * formatCompactAxis(125000)    // => "₹1L"
 * formatCompactAxis(45000)     // => "₹45k"
 * formatCompactAxis(23000000)  // => "₹2.3Cr"
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
