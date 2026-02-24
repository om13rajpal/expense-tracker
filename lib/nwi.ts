/**
 * Needs / Wants / Investments / Savings (NWI) split calculator.
 *
 * Classifies every expense or investment transaction into one of four
 * budgeting buckets based on the user's NWI configuration. Then builds
 * per-bucket metrics (target vs. actual amounts, category breakdown)
 * and returns a complete NWISplit for dashboard consumption.
 *
 * @module lib/nwi
 */

import {
  TransactionCategory,
  TransactionType,
  Transaction,
  NWIConfig,
  NWIBucket,
  NWISplit,
  NWIBucketType,
  CategoryBreakdown,
} from './types';
import { isCompletedStatus, sum, calculatePercentage } from './utils';

/** Essential spending categories assigned to the "Needs" bucket by default. */
const DEFAULT_NEEDS_CATEGORIES: TransactionCategory[] = [
  TransactionCategory.RENT,
  TransactionCategory.UTILITIES,
  TransactionCategory.GROCERIES,
  TransactionCategory.HEALTHCARE,
  TransactionCategory.INSURANCE,
  TransactionCategory.TRANSPORT,
  TransactionCategory.FUEL,
  TransactionCategory.EDUCATION,
];

/** Discretionary spending categories assigned to the "Wants" bucket by default. */
const DEFAULT_WANTS_CATEGORIES: TransactionCategory[] = [
  TransactionCategory.DINING,
  TransactionCategory.ENTERTAINMENT,
  TransactionCategory.SHOPPING,
  TransactionCategory.TRAVEL,
  TransactionCategory.FITNESS,
  TransactionCategory.PERSONAL_CARE,
  TransactionCategory.SUBSCRIPTION,
  TransactionCategory.GIFTS,
];

/** Categories routed to the "Investments" bucket by default. */
const DEFAULT_INVESTMENTS_CATEGORIES: TransactionCategory[] = [
  TransactionCategory.INVESTMENT,
  TransactionCategory.LOAN_PAYMENT,
  TransactionCategory.TAX,
];

/** Categories routed to the "Savings" bucket by default. */
const DEFAULT_SAVINGS_CATEGORIES: TransactionCategory[] = [
  TransactionCategory.SAVINGS,
];

/**
 * Build a default NWI configuration following the 50/30/10/10 split.
 *
 * @param userId - Owner of the configuration.
 * @returns A fresh NWIConfig with default category assignments.
 */
export function getDefaultNWIConfig(userId: string): NWIConfig {
  return {
    userId,
    needs: { percentage: 50, categories: [...DEFAULT_NEEDS_CATEGORIES] },
    wants: { percentage: 30, categories: [...DEFAULT_WANTS_CATEGORIES] },
    investments: { percentage: 10, categories: [...DEFAULT_INVESTMENTS_CATEGORIES] },
    savings: { percentage: 10, categories: [...DEFAULT_SAVINGS_CATEGORIES] },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Classify a single transaction into an NWI bucket.
 *
 * Resolution order:
 * 1. Manual `nwiOverride` on the transaction document.
 * 2. Category membership in the user's NWI config (needs > savings > investments > wants).
 * 3. Defaults to "wants" if no match is found.
 *
 * Non-expense/non-investment types also default to "wants".
 *
 * @param transaction - The transaction to classify.
 * @param config - The user's NWI bucket configuration.
 * @returns The NWI bucket type this transaction belongs to.
 */
export function classifyTransaction(
  transaction: Transaction,
  config: NWIConfig
): NWIBucketType {
  const override = (transaction as any).nwiOverride as NWIBucketType | undefined;
  if (override) return override;

  if (
    transaction.type !== TransactionType.EXPENSE &&
    transaction.type !== TransactionType.INVESTMENT
  ) {
    return 'wants';
  }

  const { category } = transaction;

  if (config.needs.categories.includes(category)) return 'needs';
  if (config.savings.categories.includes(category)) return 'savings';
  if (config.investments.categories.includes(category)) return 'investments';
  if (config.wants.categories.includes(category)) return 'wants';

  return 'wants';
}

/**
 * Build a single NWI bucket with actual vs. target metrics and category breakdown.
 *
 * @param label - Human-readable bucket label (e.g. "Needs").
 * @param targetPercentage - Configured target percentage of income.
 * @param totalIncome - Total income for the period.
 * @param transactions - Completed expense/investment transactions.
 * @param config - User's NWI configuration.
 * @param bucketType - The bucket type to filter for.
 * @returns Fully computed NWIBucket with category breakdown.
 */
function buildBucket(
  label: string,
  targetPercentage: number,
  totalIncome: number,
  transactions: Transaction[],
  config: NWIConfig,
  bucketType: NWIBucketType
): NWIBucket {
  const bucketTransactions = transactions.filter(
    (t) => classifyTransaction(t, config) === bucketType
  );

  const actualAmount = sum(bucketTransactions.map((t) => t.amount));
  const actualPercentage = calculatePercentage(actualAmount, totalIncome);
  const targetAmount = totalIncome * (targetPercentage / 100);
  const difference = targetAmount - actualAmount;

  const categoryMap = new Map<
    TransactionCategory,
    { amount: number; count: number }
  >();

  for (const t of bucketTransactions) {
    const existing = categoryMap.get(t.category);
    if (existing) {
      existing.amount += t.amount;
      existing.count += 1;
    } else {
      categoryMap.set(t.category, { amount: t.amount, count: 1 });
    }
  }

  const categoryBreakdown: CategoryBreakdown[] = Array.from(
    categoryMap.entries()
  ).map(([category, { amount, count }]) => ({
    category,
    amount,
    percentage: calculatePercentage(amount, actualAmount),
    transactionCount: count,
  }));

  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  return {
    label,
    targetPercentage,
    actualPercentage,
    targetAmount,
    actualAmount,
    difference,
    categoryBreakdown,
  };
}

/**
 * Calculate the full NWI split for a set of transactions.
 *
 * Filters to completed expense and investment transactions, computes
 * total income from completed income transactions, and then builds
 * each of the four buckets (needs, wants, investments, savings).
 *
 * @param transactions - All transactions for the period.
 * @param config - The user's NWI bucket configuration.
 * @returns A complete NWISplit with all four buckets and total income.
 */
export function calculateNWISplit(
  transactions: Transaction[],
  config: NWIConfig
): NWISplit {
  const completedExpenseInvestment = transactions.filter(
    (t) =>
      isCompletedStatus(t.status) &&
      (t.type === TransactionType.EXPENSE || t.type === TransactionType.INVESTMENT)
  );

  const totalIncome = sum(
    transactions
      .filter((t) => isCompletedStatus(t.status) && t.type === TransactionType.INCOME)
      .map((t) => t.amount)
  );

  return {
    totalIncome,
    needs: buildBucket('Needs', config.needs.percentage, totalIncome, completedExpenseInvestment, config, 'needs'),
    wants: buildBucket('Wants', config.wants.percentage, totalIncome, completedExpenseInvestment, config, 'wants'),
    investments: buildBucket('Investments', config.investments.percentage, totalIncome, completedExpenseInvestment, config, 'investments'),
    savings: buildBucket('Savings', config.savings.percentage, totalIncome, completedExpenseInvestment, config, 'savings'),
  };
}
