/**
 * Weekly calculation utilities for finance dashboard
 * Handles week-based filtering, ISO week numbers, and metrics calculation
 *
 * This library provides production-ready utilities for:
 * - Calculating ISO week numbers (week starts Monday)
 * - Filtering transactions by week
 * - Computing comprehensive weekly metrics
 * - Week-over-week growth analysis
 */

import { Transaction, TransactionType, WeeklyMetrics, WeekIdentifier } from './types';
import { isCompletedStatus } from './utils';

// Re-export types for convenience
export type { WeekIdentifier };

/**
 * Round currency to 2 decimal places
 * Prevents floating point errors in calculations
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Round percentage to 2 decimal places
 */
function roundPercentage(percentage: number): number {
  return Math.round(percentage * 100) / 100;
}

/**
 * Get ISO week number for a date (1-53)
 * Week starts on Monday
 *
 * @param date - Date to get week number for
 * @returns Week number (1-53)
 *
 * @example
 * const weekNum = getWeekNumber(new Date(2026, 0, 15)); // Jan 15, 2026
 * // Returns: 3
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Get the year that the week belongs to (for ISO week-year)
 * Important: Week 1 may start in the previous year
 *
 * @param date - Date to get week-year for
 * @returns Year that the week belongs to
 *
 * @example
 * const weekYear = getWeekYear(new Date(2026, 0, 1)); // Jan 1, 2026 (Thursday)
 * // Returns: 2026 (belongs to week 1 of 2026)
 */
export function getWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Get Monday (start) of a specific ISO week
 *
 * @param year - ISO week-year
 * @param week - Week number (1-53)
 * @returns Monday of the week
 *
 * @example
 * const monday = getWeekStartDate(2026, 3);
 * // Returns: Monday, January 12, 2026
 */
export function getWeekStartDate(year: number, week: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const isoWeekStart = simple;

  if (dayOfWeek <= 4) {
    isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }

  // Set to UTC midnight for consistency
  return new Date(isoWeekStart.getFullYear(), isoWeekStart.getMonth(), isoWeekStart.getDate());
}

/**
 * Get Sunday (end) of a specific ISO week
 *
 * @param year - ISO week-year
 * @param week - Week number (1-53)
 * @returns Sunday of the week
 *
 * @example
 * const sunday = getWeekEndDate(2026, 3);
 * // Returns: Sunday, January 18, 2026
 */
export function getWeekEndDate(year: number, week: number): Date {
  const monday = getWeekStartDate(year, week);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

/**
 * Filter transactions by specific week
 *
 * @param transactions - All transactions
 * @param year - ISO week-year
 * @param week - Week number (1-53)
 * @returns Transactions in the specified week
 *
 * @example
 * const weekTxns = getWeekTransactions(transactions, 2026, 3);
 */
export function getWeekTransactions(
  transactions: Transaction[],
  year: number,
  week: number
): Transaction[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  if (year < 1900 || year > 2100) {
    console.warn(`Invalid year: ${year}. Expected 1900-2100.`);
    return [];
  }

  if (week < 1 || week > 53) {
    console.warn(`Invalid week: ${week}. Expected 1-53.`);
    return [];
  }

  return transactions.filter(t => {
    try {
      const date = new Date(t.date);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date in transaction: ${t.date}`);
        return false;
      }

      const txnWeekYear = getWeekYear(date);
      const txnWeek = getWeekNumber(date);

      return txnWeekYear === year && txnWeek === week;
    } catch (error) {
      console.warn(`Error parsing date for transaction:`, error);
      return false;
    }
  });
}

/**
 * Calculate comprehensive weekly metrics
 *
 * @param transactions - All transactions
 * @param year - ISO week-year
 * @param week - Week number (1-53)
 * @returns Complete weekly metrics
 *
 * @example
 * const metrics = calculateWeeklyMetrics(transactions, 2026, 3);
 * console.log(`${metrics.weekLabel}: ${metrics.netSavings}`);
 */
export function calculateWeeklyMetrics(
  transactions: Transaction[],
  year: number,
  week: number
): WeeklyMetrics {
  const weekTransactions = getWeekTransactions(transactions, year, week);
  const weekStartDate = getWeekStartDate(year, week);
  const weekEndDate = getWeekEndDate(year, week);

  // Filter only completed transactions
  const completedTransactions = weekTransactions.filter(t => isCompletedStatus(t.status));

  // Income & Expense calculations
  const incomeTransactions = completedTransactions.filter(
    t => t.type === TransactionType.INCOME
  );
  const expenseTransactions = completedTransactions.filter(
    t => t.type === TransactionType.EXPENSE
  );

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const netSavings = totalIncome - totalExpenses;

  // Savings rate with zero-division protection
  const savingsRate = totalIncome !== 0
    ? (netSavings / totalIncome) * 100
    : 0;

  // Find top spending category
  const categoryTotals = new Map<string, number>();
  expenseTransactions.forEach(t => {
    const current = categoryTotals.get(t.category) || 0;
    categoryTotals.set(t.category, current + (t.amount ?? 0));
  });

  let topCategory = { name: 'N/A', amount: 0 };
  let maxAmount = 0;
  categoryTotals.forEach((amount, category) => {
    if (amount > maxAmount) {
      maxAmount = amount;
      topCategory = { name: category, amount };
    }
  });

  // Calculate days in week (actual transaction span)
  const daysInWeek = completedTransactions.length > 0
    ? calculateDaysInWeek(completedTransactions, weekStartDate, weekEndDate)
    : 7;

  // Average daily spend
  const averageDailySpend = daysInWeek > 0 ? totalExpenses / daysInWeek : 0;

  // Week label
  const weekLabel = formatWeekLabel(year, week);

  return {
    year,
    weekNumber: week,
    weekLabel,
    weekStartDate,
    weekEndDate,
    totalIncome: roundCurrency(totalIncome),
    totalExpenses: roundCurrency(totalExpenses),
    netSavings: roundCurrency(netSavings),
    savingsRate: roundPercentage(savingsRate),
    transactionCount: weekTransactions.length,
    incomeTransactionCount: incomeTransactions.length,
    expenseTransactionCount: expenseTransactions.length,
    topCategory,
    averageDailySpend: roundCurrency(averageDailySpend),
    daysInWeek
  };
}

/**
 * Calculate actual days with transactions in a week
 *
 * @param transactions - Week's transactions
 * @param weekStart - Start of week
 * @param weekEnd - End of week
 * @returns Number of unique days with transactions
 */
function calculateDaysInWeek(
  transactions: Transaction[],
  weekStart: Date,
  weekEnd: Date
): number {
  if (transactions.length === 0) return 7;

  const uniqueDays = new Set<string>();
  transactions.forEach(t => {
    const date = new Date(t.date);
    const dateStr = date.toISOString().split('T')[0];
    uniqueDays.add(dateStr);
  });

  return uniqueDays.size;
}

/**
 * Get all available weeks from transactions
 *
 * @param transactions - All transactions
 * @returns Array of week identifiers, sorted chronologically (oldest first)
 *
 * @example
 * const weeks = getAvailableWeeks(transactions);
 * // Returns: [{ year: 2026, weekNumber: 1, label: "Week 1, 2026" }, ...]
 */
export function getAvailableWeeks(
  transactions: Transaction[]
): WeekIdentifier[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const weekSet = new Set<string>();

  transactions.forEach(t => {
    try {
      if (!isCompletedStatus(t.status)) {
        return;
      }
      const date = new Date(t.date);
      if (isNaN(date.getTime())) {
        return; // Skip invalid dates
      }

      const weekYear = getWeekYear(date);
      const weekNum = getWeekNumber(date);
      const key = `${weekYear}-W${String(weekNum).padStart(2, '0')}`;
      weekSet.add(key);
    } catch (error) {
      console.warn('Error processing transaction date:', error);
    }
  });

  const weeks: WeekIdentifier[] = Array.from(weekSet)
    .sort()
    .map(key => {
      const [year, weekPart] = key.split('-W');
      const weekNumber = parseInt(weekPart, 10);
      const label = formatWeekLabel(parseInt(year, 10), weekNumber);
      return { year: parseInt(year, 10), weekNumber, label };
    });

  return weeks;
}

/**
 * Get current week identifier
 *
 * @returns Current ISO week and year
 *
 * @example
 * const current = getCurrentWeek();
 * // Returns: { year: 2026, weekNumber: 4, label: "Week 4, 2026" }
 */
export function getCurrentWeek(): WeekIdentifier {
  const now = new Date();
  const year = getWeekYear(now);
  const weekNumber = getWeekNumber(now);
  const label = formatWeekLabel(year, weekNumber);

  return { year, weekNumber, label };
}

/**
 * Calculate week-over-week growth
 *
 * @param transactions - All transactions
 * @param year - Current ISO week-year
 * @param week - Current week number
 * @returns Percentage change from previous week
 *
 * @example
 * const growth = calculateWeekOverWeekGrowth(transactions, 2026, 3);
 * // Returns: 15.5 (15.5% increase from week 2)
 */
export function calculateWeekOverWeekGrowth(
  transactions: Transaction[],
  year: number,
  week: number
): number {
  const current = calculateWeeklyMetrics(transactions, year, week);
  const prevWeek = getPreviousWeek({ year, weekNumber: week, label: '' });
  const previous = calculateWeeklyMetrics(transactions, prevWeek.year, prevWeek.weekNumber);

  if (previous.totalExpenses === 0) return 0;

  const growth = ((current.totalExpenses - previous.totalExpenses) / previous.totalExpenses) * 100;
  return roundPercentage(growth);
}

/**
 * Format week as "Week 3, 2026"
 *
 * @param year - ISO week-year
 * @param week - Week number
 * @returns Formatted week label
 *
 * @example
 * const label = formatWeekLabel(2026, 3);
 * // Returns: "Week 3, 2026"
 */
export function formatWeekLabel(year: number, week: number): string {
  return `Week ${week}, ${year}`;
}

/**
 * Get week date range label (e.g., "Jan 12-18, 2026")
 *
 * @param year - ISO week-year
 * @param week - Week number
 * @returns Formatted date range
 *
 * @example
 * const range = formatWeekDateRange(2026, 3);
 * // Returns: "Jan 12-18, 2026"
 */
export function formatWeekDateRange(year: number, week: number): string {
  const start = getWeekStartDate(year, week);
  const end = getWeekEndDate(year, week);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });

  // If same month
  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  // Different months
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Get previous week
 *
 * @param current - Current week identifier
 * @returns Previous week identifier
 *
 * @example
 * const prev = getPreviousWeek({ year: 2026, weekNumber: 1, label: "Week 1, 2026" });
 * // Returns: { year: 2025, weekNumber: 53, label: "Week 53, 2025" }
 */
export function getPreviousWeek(current: WeekIdentifier): WeekIdentifier {
  let { year, weekNumber } = current;

  weekNumber--;
  if (weekNumber === 0) {
    year--;
    // Get last week of previous year (usually 52 or 53)
    const lastDayOfYear = new Date(year, 11, 31);
    weekNumber = getWeekNumber(lastDayOfYear);
  }

  const label = formatWeekLabel(year, weekNumber);
  return { year, weekNumber, label };
}

/**
 * Get next week
 *
 * @param current - Current week identifier
 * @returns Next week identifier
 *
 * @example
 * const next = getNextWeek({ year: 2026, weekNumber: 52, label: "Week 52, 2026" });
 * // Returns: { year: 2027, weekNumber: 1, label: "Week 1, 2027" }
 */
export function getNextWeek(current: WeekIdentifier): WeekIdentifier {
  let { year, weekNumber } = current;

  // Get last week of current year
  const lastDayOfYear = new Date(year, 11, 31);
  const lastWeek = getWeekNumber(lastDayOfYear);

  weekNumber++;
  if (weekNumber > lastWeek) {
    weekNumber = 1;
    year++;
  }

  const label = formatWeekLabel(year, weekNumber);
  return { year, weekNumber, label };
}

/**
 * Compare two week identifiers
 *
 * @param a - First week
 * @param b - Second week
 * @returns True if weeks are equal
 */
export function isSameWeek(a: WeekIdentifier, b: WeekIdentifier): boolean {
  return a.year === b.year && a.weekNumber === b.weekNumber;
}

/**
 * Format currency for display
 *
 * @param amount - Amount to format
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56);
 * // Returns: "₹1,234.56"
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
