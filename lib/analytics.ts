/**
 * Analytics engine for financial data aggregation, trend computation, and insights.
 *
 * Provides the core computation layer for the Finova dashboard. Takes an array
 * of transactions and produces:
 * - Summary KPIs (total income/expenses, savings rate, daily average)
 * - Category and payment method breakdowns for pie/donut charts
 * - Monthly and daily time-series trends for line/bar charts
 * - Top-N category and merchant rankings
 * - Year-over-year growth comparisons with partial-year annualization
 * - One-time vs. recurring expense separation
 *
 * All functions filter out non-completed transactions before aggregation.
 * All monetary values are in INR.
 *
 * @module lib/analytics
 */

import {
  Transaction,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
  Analytics,
  CategoryBreakdown,
  PaymentMethodBreakdown,
  MonthlyTrend,
  DailyTrend,
  CategorySummary,
  MerchantSummary,
  FinancialSummary,
} from './types';
import {
  getMonthKey,
  formatMonthYear,
  calculatePercentage,
  sum,
  average,
  groupBy,
  toDate,
  toISODateString,
  isCompletedStatus,
} from './utils';

/**
 * Calculate comprehensive analytics from a set of transactions.
 *
 * This is the primary entry point for dashboard data. It computes all KPIs,
 * breakdowns, trends, and rankings in a single pass, returning a complete
 * `Analytics` object ready for UI consumption.
 *
 * Only completed transactions are included in calculations.
 *
 * @param transactions - The full array of transactions to analyze.
 * @returns A complete `Analytics` object with all computed metrics and breakdowns.
 */
export function calculateAnalytics(transactions: Transaction[]): Analytics {
  // Filter only completed transactions for analytics
  const completedTransactions = transactions.filter(
    t => isCompletedStatus(t.status)
  );

  // Calculate basic totals
  const totalIncome = calculateTotalByType(
    completedTransactions,
    TransactionType.INCOME
  );
  const totalExpenses = calculateTotalByType(
    completedTransactions,
    TransactionType.EXPENSE
  );
  const netSavings = totalIncome - totalExpenses;
  const rawSavingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const savingsRate = rawSavingsRate;

  // Calculate monthly averages
  const monthlyTrends = calculateMonthlyTrends(completedTransactions);
  const averageMonthlyIncome =
    monthlyTrends.length > 0
      ? average(monthlyTrends.map(m => m.income))
      : 0;
  const averageMonthlyExpense =
    monthlyTrends.length > 0
      ? average(monthlyTrends.map(m => m.expenses))
      : 0;
  const averageMonthlySavings =
    monthlyTrends.length > 0
      ? average(monthlyTrends.map(m => m.savings))
      : 0;

  // Calculate daily average spend
  const dailyAverageSpend = calculateDailyAverageSpend(completedTransactions);

  // Calculate breakdowns
  const categoryBreakdown = calculateCategoryBreakdown(completedTransactions);
  const paymentMethodBreakdown = calculatePaymentMethodBreakdown(
    completedTransactions
  );

  // Calculate top categories and merchants
  const topExpenseCategories = getTopExpenseCategories(
    completedTransactions,
    5
  );
  const topMerchants = getTopMerchants(completedTransactions, 10);

  // Calculate recurring expenses
  const recurringExpenses = calculateTotalByFilter(
    completedTransactions,
    t => t.recurring && t.type === TransactionType.EXPENSE
  );

  return {
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    averageMonthlyIncome,
    averageMonthlyExpense,
    averageMonthlySavings,
    dailyAverageSpend,
    categoryBreakdown,
    paymentMethodBreakdown,
    monthlyTrends,
    topExpenseCategories,
    topMerchants,
    recurringExpenses,
  };
}

/**
 * Calculate the total amount for a specific transaction type.
 *
 * Sums the `amount` field of all transactions matching the given type.
 *
 * @param transactions - Array of transactions to filter and sum.
 * @param type - The transaction type to filter by (e.g. INCOME, EXPENSE).
 * @returns Total amount in INR for the specified type.
 */
export function calculateTotalByType(
  transactions: Transaction[],
  type: TransactionType
): number {
  return sum(
    transactions
      .filter(t => t.type === type)
      .map(t => t.amount)
  );
}

/**
 * Calculate total amount for transactions matching a custom predicate.
 *
 * @param transactions - Array of transactions to filter and sum.
 * @param filter - A predicate function that returns `true` for transactions to include.
 * @returns Total amount in INR for transactions passing the filter.
 */
export function calculateTotalByFilter(
  transactions: Transaction[],
  filter: (t: Transaction) => boolean
): number {
  return sum(
    transactions
      .filter(filter)
      .map(t => t.amount)
  );
}

/**
 * Calculate expense breakdown by transaction category.
 *
 * Groups completed expense transactions by category, computing each category's
 * total amount, percentage share, and transaction count. Results are sorted
 * by amount in descending order for chart rendering.
 *
 * @param transactions - Array of transactions (pre-filtered to expenses internally).
 * @returns Array of `CategoryBreakdown` objects sorted by amount descending.
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[]
): CategoryBreakdown[] {
  const expenses = transactions.filter(
    t => t.type === TransactionType.EXPENSE && isCompletedStatus(t.status)
  );
  const totalExpenses = sum(expenses.map(t => t.amount));

  // Group by category
  const byCategory = groupBy(expenses, 'category');

  const breakdown: CategoryBreakdown[] = Object.entries(byCategory).map(
    ([category, txns]) => {
      const amount = sum(txns.map(t => t.amount));
      return {
        category: category as TransactionCategory,
        amount,
        percentage: calculatePercentage(amount, totalExpenses),
        transactionCount: txns.length,
      };
    }
  );

  // Sort by amount descending
  return breakdown.sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate transaction volume breakdown by payment method.
 *
 * Groups all completed transactions by payment method (UPI, NEFT, IMPS, etc.),
 * computing each method's total amount, percentage share, and count.
 * Sorted by amount descending.
 *
 * @param transactions - Array of transactions to analyze.
 * @returns Array of `PaymentMethodBreakdown` objects sorted by amount descending.
 */
export function calculatePaymentMethodBreakdown(
  transactions: Transaction[]
): PaymentMethodBreakdown[] {
  const completed = transactions.filter(t => isCompletedStatus(t.status));
  const totalAmount = sum(completed.map(t => t.amount));

  // Group by payment method
  const byMethod = groupBy(completed, "paymentMethod");

  const breakdown: PaymentMethodBreakdown[] = Object.entries(byMethod).map(
    ([method, txns]) => {
      const amount = sum(txns.map(t => t.amount));
      return {
        method: method as PaymentMethod,
        amount,
        percentage: calculatePercentage(amount, totalAmount),
        transactionCount: txns.length,
      };
    }
  );

  // Sort by amount descending
  return breakdown.sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate month-by-month income, expense, and savings trends.
 *
 * Groups completed transactions into calendar months using "YYYY-MM" keys,
 * then computes income, expenses, savings, and savings rate for each month.
 * Returns results sorted chronologically.
 *
 * @param transactions - Array of transactions to aggregate by month.
 * @returns Array of `MonthlyTrend` objects sorted chronologically (oldest first).
 */
export function calculateMonthlyTrends(
  transactions: Transaction[]
): MonthlyTrend[] {
  const completed = transactions.filter(t => isCompletedStatus(t.status));
  // Group transactions by month
  const byMonth: Record<string, Transaction[]> = {};

  for (const transaction of completed) {
    const monthKey = getMonthKey(transaction.date);
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = [];
    }
    byMonth[monthKey].push(transaction);
  }

  // Calculate trends for each month
  const trends: MonthlyTrend[] = Object.entries(byMonth).map(
    ([monthKey, txns]) => {
      const income = calculateTotalByType(txns, TransactionType.INCOME);
      const expenses = calculateTotalByType(txns, TransactionType.EXPENSE);
      const savings = income - expenses;

      // Parse month key to get year and month
      const [year, month] = monthKey.split('-').map(Number);
      const date = new Date(year, month - 1, 1);

      return {
        month: monthKey,
        year,
        monthName: formatMonthYear(monthKey),
        income,
        expenses,
        savings,
        savingsRate: income > 0 ? (savings / income) * 100 : 0,
        transactionCount: txns.length,
      };
    }
  );

  // Sort by month chronologically
  return trends.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate day-by-day income, expense, and net trends for a date range.
 *
 * Groups completed transactions by calendar date, optionally filtered to a
 * start/end date window. Computes daily income, expenses, net amount, and
 * transaction count. Results are sorted chronologically.
 *
 * @param transactions - Array of transactions to aggregate by day.
 * @param startDate - Optional inclusive start date for filtering.
 * @param endDate - Optional inclusive end date for filtering.
 * @returns Array of `DailyTrend` objects sorted chronologically.
 */
export function calculateDailyTrends(
  transactions: Transaction[],
  startDate?: Date,
  endDate?: Date
): DailyTrend[] {
  const completed = transactions.filter(t => isCompletedStatus(t.status));
  // Filter by date range if provided
  let filtered = completed;
  if (startDate && endDate) {
    filtered = completed.filter(t => {
      const txnDate = toDate(t.date);
      return txnDate >= startDate && txnDate <= endDate;
    });
  }

  // Group by date
  const byDate: Record<string, Transaction[]> = {};

  for (const transaction of filtered) {
    const dateKey = toISODateString(transaction.date);
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push(transaction);
  }

  // Calculate trends for each day
  const trends: DailyTrend[] = Object.entries(byDate).map(
    ([dateKey, txns]) => {
      const income = calculateTotalByType(txns, TransactionType.INCOME);
      const expenses = calculateTotalByType(txns, TransactionType.EXPENSE);

      return {
        date: dateKey,
        income,
        expenses,
        net: income - expenses,
        transactionCount: txns.length,
      };
    }
  );

  // Sort by date chronologically
  return trends.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate the average daily spending over the transaction period.
 *
 * Divides total expense amount by the number of calendar days between the
 * earliest and latest transaction dates (inclusive). Uses all transaction dates
 * (not just expense dates) to determine the period span, avoiding inflated
 * averages when income arrives on boundary dates.
 *
 * @param transactions - Array of transactions (expenses are filtered internally).
 * @returns Average daily spending in INR, or 0 if there are no expenses.
 */
export function calculateDailyAverageSpend(
  transactions: Transaction[]
): number {
  const expenses = transactions.filter(
    t => t.type === TransactionType.EXPENSE
  );

  if (expenses.length === 0) return 0;

  const totalExpenses = sum(expenses.map(t => t.amount));

  // Use calendar days from first to last transaction (not just expense days)
  const allDates = transactions.map(t => toDate(t.date).getTime());
  const firstDate = Math.min(...allDates);
  const lastDate = Math.max(...allDates);
  const calendarDays = Math.max(
    1,
    Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1
  );

  return totalExpenses / calendarDays;
}

/**
 * Get the top N expense categories ranked by total spending.
 *
 * Computes summary statistics for each category (total, count, average,
 * percentage of total) and returns the highest-spending categories.
 *
 * @param transactions - Array of transactions (expenses filtered internally).
 * @param limit - Maximum number of categories to return (default: 5).
 * @returns Array of `CategorySummary` objects sorted by total amount descending.
 */
export function getTopExpenseCategories(
  transactions: Transaction[],
  limit: number = 5
): CategorySummary[] {
  const expenses = transactions.filter(
    t => t.type === TransactionType.EXPENSE
  );
  const totalExpenses = sum(expenses.map(t => t.amount));

  // Group by category
  const byCategory = groupBy(expenses, 'category');

  const summaries: CategorySummary[] = Object.entries(byCategory).map(
    ([category, txns]) => {
      const totalAmount = sum(txns.map(t => t.amount));
      return {
        category: category as TransactionCategory,
        totalAmount,
        transactionCount: txns.length,
        averageAmount: totalAmount / txns.length,
        percentageOfTotal: calculatePercentage(totalAmount, totalExpenses),
      };
    }
  );

  // Sort by total amount descending and return top N
  return summaries
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

/**
 * Get the top N merchants ranked by total transaction volume.
 *
 * Computes summary statistics for each merchant including the most frequently
 * occurring category (primary category). Only completed transactions are included.
 *
 * @param transactions - Array of transactions to analyze.
 * @param limit - Maximum number of merchants to return (default: 10).
 * @returns Array of `MerchantSummary` objects sorted by total amount descending.
 */
export function getTopMerchants(
  transactions: Transaction[],
  limit: number = 10
): MerchantSummary[] {
  const completed = transactions.filter(t => isCompletedStatus(t.status));
  // Group by merchant
  const byMerchant = groupBy(completed, "merchant");

  const summaries: MerchantSummary[] = Object.entries(byMerchant).map(
    ([merchant, txns]) => {
      const totalAmount = sum(txns.map(t => t.amount));

      // Find most common category
      const categoryCount: Record<string, number> = {};
      for (const txn of txns) {
        categoryCount[txn.category] = (categoryCount[txn.category] || 0) + 1;
      }
      const primaryCategory = Object.entries(categoryCount).sort(
        (a, b) => b[1] - a[1]
      )[0][0] as TransactionCategory;

      return {
        merchant,
        totalAmount,
        transactionCount: txns.length,
        averageAmount: totalAmount / txns.length,
        primaryCategory,
      };
    }
  );

  // Sort by total amount descending and return top N
  return summaries
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

/**
 * Calculate a comprehensive financial summary for a labeled period.
 *
 * Aggregates income and expenses with category-level breakdowns, computes
 * savings rate, and counts transactions by type. Used for period-specific
 * reporting (monthly summaries, custom date ranges).
 *
 * @param transactions - Array of transactions for the period.
 * @param periodName - Human-readable period label (e.g. "January 2026").
 * @returns A `FinancialSummary` with income, expense, savings, and transaction details.
 */
export function calculateFinancialSummary(
  transactions: Transaction[],
  periodName: string
): FinancialSummary {
  const completed = transactions.filter(t => isCompletedStatus(t.status));
  // Calculate income breakdown
  const income = completed.filter(
    t => t.type === TransactionType.INCOME
  );
  const totalIncome = sum(income.map(t => t.amount));
  const incomeByCategory = calculateCategoryBreakdownForType(
    completed,
    TransactionType.INCOME
  );

  // Calculate expense breakdown
  const expenses = completed.filter(
    t => t.type === TransactionType.EXPENSE
  );
  const totalExpenses = sum(expenses.map(t => t.amount));
  const expensesByCategory = calculateCategoryBreakdownForType(
    completed,
    TransactionType.EXPENSE
  );

  // Calculate savings
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Calculate transaction counts by type
  const byType: Record<TransactionType, number> = {
    [TransactionType.INCOME]: 0,
    [TransactionType.EXPENSE]: 0,
    [TransactionType.TRANSFER]: 0,
    [TransactionType.INVESTMENT]: 0,
    [TransactionType.REFUND]: 0,
  };

  for (const transaction of completed) {
    byType[transaction.type]++;
  }

  return {
    period: periodName,
    income: {
      total: totalIncome,
      byCategory: incomeByCategory,
    },
    expenses: {
      total: totalExpenses,
      byCategory: expensesByCategory,
    },
    savings: {
      total: savings,
      rate: savingsRate,
    },
    transactions: {
      total: transactions.length,
      byType,
    },
  };
}

/**
 * Calculate category breakdown filtered to a specific transaction type.
 *
 * Internal helper used by `calculateFinancialSummary()` to produce
 * separate category breakdowns for income and expenses.
 *
 * @param transactions - Array of transactions to filter and group.
 * @param type - Transaction type to include (INCOME or EXPENSE).
 * @returns Array of `CategoryBreakdown` objects sorted by amount descending.
 */
function calculateCategoryBreakdownForType(
  transactions: Transaction[],
  type: TransactionType
): CategoryBreakdown[] {
  const filtered = transactions.filter(
    t => t.type === type && isCompletedStatus(t.status)
  );
  const total = sum(filtered.map(t => t.amount));

  const byCategory = groupBy(filtered, 'category');

  const breakdown: CategoryBreakdown[] = Object.entries(byCategory).map(
    ([category, txns]) => {
      const amount = sum(txns.map(t => t.amount));
      return {
        category: category as TransactionCategory,
        amount,
        percentage: calculatePercentage(amount, total),
        transactionCount: txns.length,
      };
    }
  );

  return breakdown.sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate a simple income-vs-expense comparison.
 *
 * Returns totals, their difference (net savings), and the income-to-expense
 * ratio. A ratio > 1 means income exceeds expenses.
 *
 * @param transactions - Array of transactions to analyze.
 * @returns An object with `income`, `expenses`, `difference`, and `ratio` fields.
 */
export function calculateIncomeVsExpense(transactions: Transaction[]): {
  income: number;
  expenses: number;
  difference: number;
  ratio: number;
} {
  const completed = transactions.filter(t => isCompletedStatus(t.status));
  const income = calculateTotalByType(completed, TransactionType.INCOME);
  const expenses = calculateTotalByType(completed, TransactionType.EXPENSE);
  const difference = income - expenses;
  const ratio = expenses > 0 ? income / expenses : 0;

  return {
    income,
    expenses,
    difference,
    ratio,
  };
}

/**
 * Get expense category breakdown for a specific date range.
 *
 * Filters transactions to the given date window and expense type,
 * then delegates to `calculateCategoryBreakdown()`.
 *
 * @param transactions - Array of transactions to filter.
 * @param startDate - Inclusive start date.
 * @param endDate - Inclusive end date.
 * @returns Array of `CategoryBreakdown` objects for the period.
 */
export function getSpendingByPeriod(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): CategoryBreakdown[] {
  const filtered = transactions.filter(t => {
    const txnDate = toDate(t.date);
    return txnDate >= startDate && txnDate <= endDate && t.type === TransactionType.EXPENSE && isCompletedStatus(t.status);
  });

  return calculateCategoryBreakdown(filtered);
}

/**
 * Calculate year-over-year growth rates for income, expenses, and savings.
 *
 * Compares the given year to the previous year. If the given year is the
 * current calendar year and is not yet complete, actual figures are annualized
 * (multiplied by `12 / monthsElapsed`) for a fair comparison.
 *
 * @param transactions - Full transaction history.
 * @param year - The year to calculate growth for (compared against `year - 1`).
 * @returns Growth percentages for income, expenses, and savings, plus an `isAnnualized` flag.
 */
export function calculateYearOverYearGrowth(
  transactions: Transaction[],
  year: number
): {
  incomeGrowth: number;
  expenseGrowth: number;
  savingsGrowth: number;
  isAnnualized: boolean;
} {
  const completed = transactions.filter(t => isCompletedStatus(t.status));
  // Get transactions for current and previous year
  const currentYearTxns = completed.filter(
    t => toDate(t.date).getFullYear() === year
  );
  const previousYearTxns = completed.filter(
    t => toDate(t.date).getFullYear() === year - 1
  );

  // Determine if current year is partial and needs annualization
  const now = new Date();
  const isCurrentYear = year === now.getFullYear();
  const monthsElapsed = isCurrentYear ? now.getMonth() + 1 : 12;
  const annualizationFactor = isCurrentYear && monthsElapsed < 12
    ? 12 / monthsElapsed
    : 1;
  const isAnnualized = annualizationFactor > 1;

  // Calculate totals (annualize current year if partial)
  const rawCurrentIncome = calculateTotalByType(
    currentYearTxns,
    TransactionType.INCOME
  );
  const currentIncome = rawCurrentIncome * annualizationFactor;
  const previousIncome = calculateTotalByType(
    previousYearTxns,
    TransactionType.INCOME
  );

  const rawCurrentExpenses = calculateTotalByType(
    currentYearTxns,
    TransactionType.EXPENSE
  );
  const currentExpenses = rawCurrentExpenses * annualizationFactor;
  const previousExpenses = calculateTotalByType(
    previousYearTxns,
    TransactionType.EXPENSE
  );

  const currentSavings = currentIncome - currentExpenses;
  const previousSavings = previousIncome - previousExpenses;

  // Calculate growth percentages
  const incomeGrowth =
    previousIncome > 0
      ? ((currentIncome - previousIncome) / previousIncome) * 100
      : 0;

  const expenseGrowth =
    previousExpenses > 0
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
      : 0;

  const savingsGrowth =
    previousSavings !== 0
      ? ((currentSavings - previousSavings) / Math.abs(previousSavings)) * 100
      : 0;

  return {
    incomeGrowth,
    expenseGrowth,
    savingsGrowth,
    isAnnualized,
  };
}

/**
 * Result of separating transactions into one-time large expenses and
 * recurring daily expenses, with computed totals for each category.
 */
export interface SeparatedExpenses {
  oneTime: Transaction[];
  recurring: Transaction[];
  oneTimeTotal: number;
  recurringTotal: number;
  totalExpenses: number;
}

/**
 * Separate one-time large expenses from recurring/small daily expenses.
 *
 * Transactions with amounts at or above the threshold are classified as
 * "one-time" (e.g. large purchases, tuition fees, medical procedures),
 * while those below are treated as recurring daily expenses. This allows
 * the UI to show both "total" and "excluding one-time" expense views.
 *
 * @param transactions - Array of transactions to classify.
 * @param threshold - Amount threshold in INR for one-time classification (default: 50,000).
 * @returns A `SeparatedExpenses` object with arrays and totals for each category.
 */
export function separateOneTimeExpenses(
  transactions: Transaction[],
  threshold: number = 50000
): SeparatedExpenses {
  const expenses = transactions.filter(
    t => t.type === TransactionType.EXPENSE && isCompletedStatus(t.status)
  );

  const oneTime = expenses.filter(t => t.amount >= threshold);
  const recurring = expenses.filter(t => t.amount < threshold);

  return {
    oneTime,
    recurring,
    oneTimeTotal: sum(oneTime.map(t => t.amount)),
    recurringTotal: sum(recurring.map(t => t.amount)),
    totalExpenses: sum(expenses.map(t => t.amount)),
  };
}
