/**
 * Shared utility functions used across the Finova application.
 *
 * Provides class-name merging (Tailwind + clsx), date coercion and formatting,
 * basic math helpers (sum, average, percentage), array grouping, ID generation,
 * and INR currency/date/percentage formatting utilities.
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge multiple Tailwind CSS class values with conflict resolution.
 *
 * Combines `clsx` (for conditional class composition) with `tailwind-merge`
 * (to intelligently resolve conflicting Tailwind classes like `p-2` vs `p-4`).
 *
 * @param inputs - Any number of class values: strings, arrays, objects, or conditionals.
 * @returns A single merged class string with Tailwind conflicts resolved.
 *
 * @example
 * cn("p-2 bg-red-500", isActive && "bg-blue-500", "p-4")
 * // => "bg-blue-500 p-4" (p-4 wins over p-2, blue wins over red when isActive)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/**
 * Coerce a string or Date value into a Date object.
 *
 * If the input is already a Date, it is returned as-is.
 * If the input is a string (ISO format or other parseable format),
 * it is parsed into a new Date.
 *
 * @param date - A Date object or date string to coerce.
 * @returns A Date object.
 */
export function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date
}

/**
 * Check whether a transaction status represents a completed/settled transaction.
 *
 * Treats null, undefined, or empty string as "completed" (the default state
 * for bank-imported transactions that don't carry an explicit status field).
 *
 * @param status - The status string to check, or null/undefined.
 * @returns `true` if the status is missing or equals "completed".
 */
export function isCompletedStatus(status?: string | null): boolean {
  return !status || status === 'completed'
}

/**
 * Convert a Date (or date string) to an ISO date string in "YYYY-MM-DD" format.
 *
 * Strips the time component from a full ISO timestamp. Useful for grouping
 * transactions by calendar date regardless of time zone.
 *
 * @param date - A Date object or parseable date string.
 * @returns Date string in "YYYY-MM-DD" format.
 */
export function toISODateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Extract a month key in "YYYY-MM" format from a date.
 *
 * Used throughout the app to group transactions by calendar month
 * (e.g. for monthly trends, budget calculations, and NWI analysis).
 *
 * @param date - A Date object or parseable date string.
 * @returns Month key string like "2026-02".
 */
export function getMonthKey(date: Date | string): string {
  const d = toDate(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Format a "YYYY-MM" month key into a human-readable label.
 *
 * @param monthKey - A month key string like "2026-02".
 * @returns Formatted string like "February 2026", or "Invalid Date" if the input is malformed.
 *
 * @example
 * formatMonthYear("2026-02") // => "February 2026"
 */
export function formatMonthYear(monthKey: string): string {
  if (!monthKey || typeof monthKey !== 'string') {
    return 'Invalid Date'
  }
  const parts = monthKey.split('-')
  if (parts.length !== 2) {
    return 'Invalid Date'
  }
  const [year, month] = parts
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Math utilities
// ---------------------------------------------------------------------------

/**
 * Sum all numbers in an array.
 *
 * @param numbers - Array of numeric values to add together.
 * @returns The sum of all values, or 0 for an empty array.
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, num) => acc + num, 0)
}

/**
 * Calculate the arithmetic mean of an array of numbers.
 *
 * Returns 0 for empty arrays to avoid division-by-zero errors in
 * downstream calculations.
 *
 * @param numbers - Array of numeric values.
 * @returns The arithmetic mean, or 0 for empty arrays.
 */
export function average(numbers: number[]): number {
  return numbers.length > 0 ? sum(numbers) / numbers.length : 0
}

/**
 * Calculate a value as a percentage of a total, safe against zero division.
 *
 * Used for budget utilization, savings rate, category share, and other
 * ratio calculations throughout the analytics engine.
 *
 * @param value - The numerator (e.g. amount spent in a category).
 * @param total - The denominator (e.g. total spending).
 * @returns The percentage (0-100+), or 0 if total is zero.
 */
export function calculatePercentage(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

// ---------------------------------------------------------------------------
// Array utilities
// ---------------------------------------------------------------------------

/**
 * Group an array of objects by a specified key, producing a record of arrays.
 *
 * @typeParam T - The type of items in the array.
 * @param array - The array of objects to group.
 * @param key - The property name to group by (its value is stringified).
 * @returns A Record mapping each unique key value to its array of matching items.
 *
 * @example
 * groupBy(transactions, 'category')
 * // => { "Dining": [txn1, txn3], "Groceries": [txn2] }
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a random 9-character alphanumeric identifier.
 *
 * Suitable for temporary client-side IDs; not cryptographically secure.
 * For persistent storage, MongoDB ObjectIds are preferred.
 *
 * @returns A random string like "k7x2m9p4q".
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Parse a date string into a Date object.
 *
 * Thin wrapper around the Date constructor for consistent usage patterns.
 *
 * @param dateString - An ISO date string or other parseable date format.
 * @returns A new Date object.
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString)
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

/**
 * Format a number as an Indian Rupee (INR) currency string using the
 * Indian numbering system (lakhs and crores grouping).
 *
 * @param amount - The numeric amount in INR.
 * @returns Formatted string like "₹1,25,000" or "₹1,250.50".
 *
 * @example
 * formatCurrency(125000)  // => "₹1,25,000"
 * formatCurrency(1250.5)  // => "₹1,250.50"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format large INR amounts in compact Indian notation with K/L/Cr suffixes.
 *
 * Uses the Indian numbering convention:
 * - >= 1 Crore (10M): "₹X.XXCr"
 * - >= 1 Lakh (100K): "₹X.XXL"
 * - >= 1 Thousand: "₹X.XXK"
 * - Below 1000: falls back to full `formatCurrency()`.
 *
 * @param amount - The numeric amount in INR.
 * @returns Compact string like "₹1.25Cr", "₹12.50L", or "₹45.00K".
 */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(2)}K`
  }
  return formatCurrency(amount)
}

/**
 * Format a date for display in the UI.
 *
 * @param date - A Date object or parseable date string.
 * @param format - Optional format hint: "short" for "Jan 15" (no year),
 *                 or omit for the default "Jan 15, 2026" (with year).
 * @returns Formatted date string.
 *
 * @example
 * formatDate(new Date("2026-02-24"))          // => "Feb 24, 2026"
 * formatDate(new Date("2026-02-24"), "short") // => "Feb 24"
 */
export function formatDate(date: Date | string, format?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Format a number as a percentage string with one decimal place.
 *
 * @param value - The percentage value (e.g. 12.5 for 12.5%).
 * @returns Formatted string like "12.5%".
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
