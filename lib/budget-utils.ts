/**
 * Budget calculation utilities.
 *
 * Handles pro-rating of budgets for partial months, full-month spending
 * projections based on daily averages, and status classification for
 * budget progress bars and alerts.
 *
 * @module lib/budget-utils
 */

import { Transaction, TransactionCategory, CategoryBreakdown } from './types';
import { getTransactionCategoriesForBudget } from './budget-mapping';

/**
 * Budget period information describing the date range and coverage
 * of the currently active budget month.
 */
export interface BudgetPeriod {
  /** Earliest transaction date in the period. */
  startDate: Date;
  /** Latest transaction date in the period. */
  endDate: Date;
  /** Total calendar days in the month. */
  totalDays: number;
  /** Calendar days elapsed so far (from day 1 to latest transaction). */
  elapsedDays: number;
  /** Calendar days remaining until month end. */
  remainingDays: number;
  /** Whether the period does not span the full calendar month. */
  isPartialMonth: boolean;
  /** Human-readable period label (e.g. "January 1-24, 2026 (24 of 31 days)"). */
  periodLabel: string;
}

/**
 * Budget spending data for a single category, including actual vs.
 * pro-rated vs. projected figures.
 */
export interface BudgetSpending {
  /** Budget category display name. */
  budgetCategory: string;
  /** Full monthly budget limit in INR. */
  monthlyBudget: number;
  /** Pro-rated budget for the elapsed portion of the month. */
  proratedBudget: number;
  /** Actual amount spent so far in this category. */
  actualSpent: number;
  /** Projected spend for the full month at the current daily rate. */
  projectedSpent: number;
  /** Remaining budget (monthly limit minus actual spent). */
  remaining: number;
  /** Percentage of monthly budget consumed (0-100+). */
  percentageUsed: number;
  /** Whether actual spend has exceeded the full monthly budget. */
  isOverspent: boolean;
  /** Number of transactions contributing to this category. */
  transactionCount: number;
}

/**
 * Calculate budget period information from a set of transactions.
 *
 * Determines the date range, elapsed days, and whether the month is
 * partial (data does not cover the full calendar month).
 *
 * @param transactions - Array of transactions for the relevant month.
 * @returns BudgetPeriod describing coverage and elapsed time.
 */
export function calculateBudgetPeriod(transactions: Transaction[]): BudgetPeriod {
  if (transactions.length === 0) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      startDate: firstDay,
      endDate: now,
      totalDays: lastDay.getDate(),
      elapsedDays: now.getDate(),
      remainingDays: lastDay.getDate() - now.getDate(),
      isPartialMonth: true,
      periodLabel: `${getMonthName(now)} ${now.getDate()}, ${now.getFullYear()}`,
    };
  }

  // Find min and max dates in transactions
  const dates = transactions.map(t => new Date(t.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Get the month's first and last day
  const firstDayOfMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const lastDayOfMonth = new Date(minDate.getFullYear(), minDate.getMonth() + 1, 0);

  const totalDays = lastDayOfMonth.getDate();
  const elapsedDays = maxDate.getDate();
  const remainingDays = totalDays - elapsedDays;
  const isPartialMonth = elapsedDays < totalDays;

  const periodLabel = isPartialMonth
    ? `${getMonthName(minDate)} 1-${elapsedDays}, ${minDate.getFullYear()} (${elapsedDays} of ${totalDays} days)`
    : `${getMonthName(minDate)} ${minDate.getFullYear()}`;

  return {
    startDate: minDate,
    endDate: maxDate,
    totalDays,
    elapsedDays,
    remainingDays,
    isPartialMonth,
    periodLabel,
  };
}

/**
 * Calculate spending metrics for a single budget category.
 *
 * Matches transactions whose category is either a mapped transaction
 * category or the budget category name itself (for manually re-categorized
 * transactions). Pro-rates the budget for partial months and projects
 * full-month spend based on the daily average.
 *
 * @param budgetCategory - Budget category display name.
 * @param monthlyBudget - Full monthly budget limit in INR.
 * @param categoryBreakdown - Per-category spending aggregation.
 * @param period - Budget period metadata.
 * @returns BudgetSpending with actual, pro-rated, and projected figures.
 */
export function calculateBudgetSpending(
  budgetCategory: string,
  monthlyBudget: number,
  categoryBreakdown: CategoryBreakdown[],
  period: BudgetPeriod
): BudgetSpending {
  // Get transaction categories for this budget category
  const transactionCategories = getTransactionCategoriesForBudget(budgetCategory);

  // Match transactions whose category is either a mapped transaction category
  // OR the budget category name itself (for manually re-categorized transactions)
  const matches = (cat: string) =>
    transactionCategories.includes(cat as TransactionCategory) || cat === budgetCategory;

  // Calculate total spent in this budget category
  const actualSpent = categoryBreakdown
    .filter(cb => matches(cb.category))
    .reduce((sum, cb) => sum + cb.amount, 0);

  const transactionCount = categoryBreakdown
    .filter(cb => matches(cb.category))
    .reduce((sum, cb) => sum + cb.transactionCount, 0);

  // Pro-rate budget for partial month
  const proratedBudget = period.isPartialMonth
    ? (monthlyBudget * period.elapsedDays) / period.totalDays
    : monthlyBudget;

  // Calculate projected spending for full month
  const dailyAverage = period.elapsedDays > 0 ? actualSpent / period.elapsedDays : 0;
  const projectedSpent = dailyAverage * period.totalDays;

  // Calculate remaining budget (against full monthly budget)
  const remaining = monthlyBudget - actualSpent;

  // Calculate percentage used (against full monthly budget)
  const percentageUsed = monthlyBudget > 0 ? (actualSpent / monthlyBudget) * 100 : 0;

  // Check if overspent (against full monthly budget)
  const isOverspent = actualSpent > monthlyBudget;

  return {
    budgetCategory,
    monthlyBudget,
    proratedBudget,
    actualSpent,
    projectedSpent,
    remaining,
    percentageUsed,
    isOverspent,
    transactionCount,
  };
}

/**
 * Calculate spending metrics for every budget category at once.
 *
 * @param budgets - Record mapping category name to monthly budget limit.
 * @param categoryBreakdown - Per-category spending aggregation.
 * @param period - Budget period metadata.
 * @returns Array of BudgetSpending objects, one per budget category.
 */
export function calculateAllBudgetSpending(
  budgets: Record<string, number>,
  categoryBreakdown: CategoryBreakdown[],
  period: BudgetPeriod
): BudgetSpending[] {
  return Object.entries(budgets).map(([category, budget]) =>
    calculateBudgetSpending(category, budget, categoryBreakdown, period)
  );
}

/**
 * Get month name from date
 */
function getMonthName(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[date.getMonth()];
}

/**
 * Classify a budget percentage into a traffic-light status.
 *
 * @param percentageUsed - Budget usage as a percentage (0-100+).
 * @returns `'danger'` if >= 100%, `'warning'` if >= 75%, otherwise `'success'`.
 */
export function getBudgetStatus(percentageUsed: number): 'success' | 'warning' | 'danger' {
  if (percentageUsed >= 100) return 'danger';
  if (percentageUsed >= 75) return 'warning';
  return 'success';
}

/**
 * Get a Tailwind text colour class for a budget status percentage.
 *
 * @param percentageUsed - Budget usage as a percentage (0-100+).
 * @returns Tailwind CSS class string (red/yellow/green).
 */
export function getBudgetStatusColor(percentageUsed: number): string {
  if (percentageUsed >= 100) return 'text-red-500';
  if (percentageUsed >= 75) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Get a Tailwind background colour class for a budget progress bar.
 *
 * @param percentageUsed - Budget usage as a percentage (0-100+).
 * @returns Tailwind CSS background class string (red/yellow/green).
 */
export function getBudgetProgressColor(percentageUsed: number): string {
  if (percentageUsed >= 100) return 'bg-red-500';
  if (percentageUsed >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}
