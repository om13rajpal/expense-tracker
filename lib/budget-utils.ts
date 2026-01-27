/**
 * Budget calculation utilities
 * Handles pro-rating, projections, and spending calculations
 */

import { Transaction, TransactionCategory, CategoryBreakdown } from './types';
import { getTransactionCategoriesForBudget } from './budget-mapping';

/**
 * Budget period information
 */
export interface BudgetPeriod {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  isPartialMonth: boolean;
  periodLabel: string;
}

/**
 * Budget spending data
 */
export interface BudgetSpending {
  budgetCategory: string;
  monthlyBudget: number;
  proratedBudget: number;
  actualSpent: number;
  projectedSpent: number;
  remaining: number;
  percentageUsed: number;
  isOverspent: boolean;
  transactionCount: number;
}

/**
 * Calculate budget period information from transactions
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
 * Calculate spending for a budget category
 */
export function calculateBudgetSpending(
  budgetCategory: string,
  monthlyBudget: number,
  categoryBreakdown: CategoryBreakdown[],
  period: BudgetPeriod
): BudgetSpending {
  // Get transaction categories for this budget category
  const transactionCategories = getTransactionCategoriesForBudget(budgetCategory);

  // Calculate total spent in this budget category
  const actualSpent = categoryBreakdown
    .filter(cb => transactionCategories.includes(cb.category))
    .reduce((sum, cb) => sum + cb.amount, 0);

  const transactionCount = categoryBreakdown
    .filter(cb => transactionCategories.includes(cb.category))
    .reduce((sum, cb) => sum + cb.transactionCount, 0);

  // Pro-rate budget for partial month
  const proratedBudget = period.isPartialMonth
    ? (monthlyBudget * period.elapsedDays) / period.totalDays
    : monthlyBudget;

  // Calculate projected spending for full month
  const dailyAverage = period.elapsedDays > 0 ? actualSpent / period.elapsedDays : 0;
  const projectedSpent = dailyAverage * period.totalDays;

  // Calculate remaining budget
  const remaining = proratedBudget - actualSpent;

  // Calculate percentage used (based on pro-rated budget)
  const percentageUsed = proratedBudget > 0 ? (actualSpent / proratedBudget) * 100 : 0;

  // Check if overspent
  const isOverspent = actualSpent > proratedBudget;

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
 * Calculate all budget spending data
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
 * Get status for budget percentage
 */
export function getBudgetStatus(percentageUsed: number): 'success' | 'warning' | 'danger' {
  if (percentageUsed >= 100) return 'danger';
  if (percentageUsed >= 75) return 'warning';
  return 'success';
}

/**
 * Get color class for budget status
 */
export function getBudgetStatusColor(percentageUsed: number): string {
  if (percentageUsed >= 100) return 'text-red-500';
  if (percentageUsed >= 75) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Get progress bar color for budget status
 */
export function getBudgetProgressColor(percentageUsed: number): string {
  if (percentageUsed >= 100) return 'bg-red-500';
  if (percentageUsed >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}
