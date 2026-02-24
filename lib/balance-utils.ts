/**
 * Balance tracking utilities for accurate account balance calculations.
 *
 * Uses actual running-balance data imported from Google Sheets rather than
 * reconstructing balances from income minus expenses. This approach is more
 * accurate when the user began tracking mid-way through their financial history.
 *
 * Provides functions for:
 * - Calculating account summaries (opening, closing, net change)
 * - Looking up balances at specific dates
 * - Building balance-over-time trend data for charts
 * - Validating balance consistency across adjacent transactions
 *
 * @module lib/balance-utils
 */

import { Transaction } from './types';
import { isCompletedStatus } from './utils';

/**
 * Helper to ensure date is a Date object (handles string dates from JSON)
 */
function ensureDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

/**
 * Sort comparator for transactions by date ascending, with sequence as tie-breaker.
 * When multiple transactions share the same date, the sequence (row index from sheet)
 * preserves original sheet row ordering, ensuring the running balance sequence
 * is maintained correctly. Falls back to id if sequence is unavailable.
 */
function sortByDateAsc(a: Transaction, b: Transaction): number {
  const diff = ensureDate(a.date).getTime() - ensureDate(b.date).getTime();
  if (diff !== 0) return diff;
  // Tie-break by sequence (row index) to preserve sheet row order
  if (a.sequence != null && b.sequence != null) return a.sequence - b.sequence;
  return (a.id || '').localeCompare(b.id || '');
}

/**
 * Sort comparator for transactions by date descending, with sequence as tie-breaker.
 */
function sortByDateDesc(a: Transaction, b: Transaction): number {
  const diff = ensureDate(b.date).getTime() - ensureDate(a.date).getTime();
  if (diff !== 0) return diff;
  // Tie-break by sequence descending (higher sequence = later in sheet = first when descending)
  if (a.sequence != null && b.sequence != null) return b.sequence - a.sequence;
  return (b.id || '').localeCompare(a.id || '');
}

/**
 * Account summary derived from actual balance fields in imported sheet data.
 * All amounts are in INR.
 */
export interface AccountSummary {
  /** Balance after the most recent (chronologically last) transaction. */
  currentBalance: number;
  /** Balance of the chronologically first transaction. */
  startingBalance: number;
  /** Calculated balance *before* the very first transaction (reverse-engineered). */
  openingBalance: number;
  /** Difference between current balance and opening balance. */
  netChange: number;
}

/**
 * Calculate account summary using actual balance data from transactions
 * This is more accurate than calculating income - expenses when user started tracking mid-way
 *
 * @param transactions - Array of transactions with balance field
 * @returns Account summary with actual balances
 */
export function calculateAccountSummary(transactions: Transaction[]): AccountSummary {
  const filtered = transactions.filter(t => isCompletedStatus(t.status));
  if (filtered.length === 0) {
    return {
      currentBalance: 0,
      startingBalance: 0,
      openingBalance: 0,
      netChange: 0
    };
  }

  // Sort by date to get chronological order (with id tie-breaker for same-day txns)
  const sorted = [...filtered].sort(sortByDateAsc);

  // Get actual balances from sheet (if available)
  const firstTransaction = sorted[0];
  const lastTransaction = sorted[sorted.length - 1];

  const firstBalance = Number(firstTransaction?.balance ?? 0);
  const lastBalance = Number(lastTransaction?.balance ?? 0);

  // Calculate the true opening balance (before the first transaction)
  // openingBalance = firstTransaction.balance + debit - credit
  // i.e. reverse the first transaction to get the balance before it
  let openingBalance = firstBalance;
  if (firstTransaction) {
    const amount = firstTransaction.amount ?? 0;
    if (firstTransaction.type === 'income' || firstTransaction.type === 'refund') {
      // Income increased the balance, so opening was lower
      openingBalance = firstBalance - amount;
    } else if (firstTransaction.type === 'expense' || firstTransaction.type === 'investment') {
      // Expense decreased the balance, so opening was higher
      openingBalance = firstBalance + amount;
    }
    // For transfers, balance change is ambiguous, keep as-is
  }

  return {
    currentBalance: lastBalance,
    startingBalance: firstBalance,
    openingBalance,
    netChange: lastBalance - openingBalance
  };
}

/**
 * Get balance at a specific date
 * Finds the transaction closest to (but not after) the specified date
 *
 * @param transactions - Array of transactions with balance field
 * @param targetDate - Date to get balance for
 * @returns Balance at the target date, or 0 if no transactions before that date
 */
export function getBalanceAtDate(transactions: Transaction[], targetDate: Date): number {
  if (transactions.length === 0) return 0;
  const filtered = transactions.filter(t => isCompletedStatus(t.status));
  if (filtered.length === 0) return 0;

  // Filter transactions up to target date, sort descending (latest first)
  const transactionsUpToDate = filtered.filter(
    t => ensureDate(t.date) <= targetDate
  ).sort(sortByDateDesc);

  // Return balance of most recent transaction before target date
  const latestWithBalance = transactionsUpToDate.find(
    t => t.balance !== undefined && t.balance !== null
  );
  if (!latestWithBalance) return 0;
  const numericBalance = Number(latestWithBalance.balance);
  return Number.isFinite(numericBalance) ? numericBalance : 0;
}

/**
 * Calculate balance trend over time
 * Returns an array of {date, balance} points for charting
 *
 * @param transactions - Array of transactions with balance field
 * @returns Array of balance points sorted by date
 */
export function calculateBalanceTrend(
  transactions: Transaction[]
): Array<{ date: Date; balance: number }> {
  if (transactions.length === 0) return [];

  // Sort by date (with id tie-breaker for same-day txns)
  const sorted = [...transactions].sort(sortByDateAsc);

  const completed = sorted.filter(t => isCompletedStatus(t.status));
  const balancePoints = sorted
    .filter(t => isCompletedStatus(t.status) && t.balance !== undefined && t.balance !== null)
    .map(t => ({
      date: ensureDate(t.date),
      balance: Number(t.balance)
    }))
    .filter(point => Number.isFinite(point.balance));

  if (balancePoints.length === 0) {
    let runningBalance = 0;
    return completed.map(t => {
      if (t.type === "income") {
        runningBalance += t.amount;
      } else if (t.type === "expense") {
        runningBalance -= t.amount;
      }
      return {
        date: ensureDate(t.date),
        balance: runningBalance
      };
    });
  }

  // Extract balance points
  return balancePoints;
}

/**
 * Validate balance consistency across transactions
 * Checks if balance changes match transaction amounts
 *
 * @param transactions - Array of transactions with balance field
 * @returns Validation result with any inconsistencies found
 */
export function validateBalanceConsistency(transactions: Transaction[]): {
  isConsistent: boolean;
  inconsistencies: Array<{
    transactionId: string;
    expectedBalance: number;
    actualBalance: number;
    difference: number;
  }>;
} {
  if (transactions.length < 2) {
    return { isConsistent: true, inconsistencies: [] };
  }

  const sorted = [...transactions].sort(sortByDateAsc);
  const inconsistencies = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (prev.balance === undefined || curr.balance === undefined) continue;

    // Calculate expected balance based on transaction type
    const expectedChange = curr.type === 'income' ? curr.amount : -curr.amount;
    const expectedBalance = prev.balance + expectedChange;

    // Allow small floating point differences (within 0.01)
    const difference = Math.abs(expectedBalance - curr.balance);
    if (difference > 0.01) {
      inconsistencies.push({
        transactionId: curr.id,
        expectedBalance,
        actualBalance: curr.balance,
        difference
      });
    }
  }

  return {
    isConsistent: inconsistencies.length === 0,
    inconsistencies
  };
}
