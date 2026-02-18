/**
 * Shared utility functions: classnames, date helpers, math, formatting.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merge Tailwind classes with clsx conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/** Coerce a string or Date to a Date object. */
export function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date
}

/** Returns true if status is missing or "completed" (treats null/undefined as completed). */
export function isCompletedStatus(status?: string | null): boolean {
  return !status || status === 'completed'
}

/** Convert a Date to "YYYY-MM-DD" string. */
export function toISODateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/** Get a "YYYY-MM" month key from a date. */
export function getMonthKey(date: Date | string): string {
  const d = toDate(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Format a "YYYY-MM" month key as "January 2026". */
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

/** Sum an array of numbers. */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, num) => acc + num, 0)
}

/** Average of an array of numbers (returns 0 for empty arrays). */
export function average(numbers: number[]): number {
  return numbers.length > 0 ? sum(numbers) / numbers.length : 0
}

/** Calculate `value` as a percentage of `total` (safe against zero division). */
export function calculatePercentage(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

// ---------------------------------------------------------------------------
// Array utilities
// ---------------------------------------------------------------------------

/** Group an array of objects by a given key, returning a record of arrays. */
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

/** Generate a random 9-character alphanumeric ID. */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/** Parse a date string into a Date object. */
export function parseDate(dateString: string): Date {
  return new Date(dateString)
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

/** Format a number as INR currency (e.g. "₹1,25,000"). */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Format large amounts in compact Indian notation (K/L/Cr). */
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

/** Format a date for display. Use format="short" for "Jan 15", otherwise "Jan 15, 2026". */
export function formatDate(date: Date | string, format?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format a number as a percentage string (e.g. "12.5%"). */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
