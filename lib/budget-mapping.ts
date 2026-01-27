/**
 * Budget category mapping configuration
 * Maps budget display categories to actual transaction categories
 */

import { TransactionCategory } from './types';

/**
 * Budget category definition
 */
export interface BudgetCategoryConfig {
  displayName: string;
  transactionCategories: TransactionCategory[];
  description: string;
}

/**
 * Budget category mapping
 * Maps friendly budget names to transaction categories
 */
export const BUDGET_CATEGORY_MAPPING: Record<string, BudgetCategoryConfig> = {
  'Food & Dining': {
    displayName: 'Food & Dining',
    transactionCategories: [
      TransactionCategory.DINING,
      TransactionCategory.GROCERIES,
    ],
    description: 'Dining out, restaurants, groceries, and food delivery',
  },
  'Transport': {
    displayName: 'Transport',
    transactionCategories: [
      TransactionCategory.TRANSPORT,
      TransactionCategory.FUEL,
    ],
    description: 'Transportation, fuel, taxi, auto, and commute expenses',
  },
  'Shopping': {
    displayName: 'Shopping',
    transactionCategories: [TransactionCategory.SHOPPING],
    description: 'Shopping, online purchases, and retail',
  },
  'Bills & Utilities': {
    displayName: 'Bills & Utilities',
    transactionCategories: [
      TransactionCategory.UTILITIES,
      TransactionCategory.RENT,
    ],
    description: 'Utilities, rent, electricity, water, and internet bills',
  },
  'Entertainment': {
    displayName: 'Entertainment',
    transactionCategories: [
      TransactionCategory.ENTERTAINMENT,
      TransactionCategory.SUBSCRIPTION,
    ],
    description: 'Entertainment, subscriptions, movies, and streaming services',
  },
  'Healthcare': {
    displayName: 'Healthcare',
    transactionCategories: [
      TransactionCategory.HEALTHCARE,
      TransactionCategory.INSURANCE,
    ],
    description: 'Healthcare, medical expenses, and insurance',
  },
  'Education': {
    displayName: 'Education',
    transactionCategories: [TransactionCategory.EDUCATION],
    description: 'Education, courses, books, and learning materials',
  },
  'Fitness': {
    displayName: 'Fitness',
    transactionCategories: [
      TransactionCategory.FITNESS,
      TransactionCategory.PERSONAL_CARE,
    ],
    description: 'Fitness, gym, sports, and personal care',
  },
  'Travel': {
    displayName: 'Travel',
    transactionCategories: [TransactionCategory.TRAVEL],
    description: 'Travel, vacation, and trip expenses',
  },
  'Others': {
    displayName: 'Others',
    transactionCategories: [
      TransactionCategory.MISCELLANEOUS,
      TransactionCategory.UNCATEGORIZED,
      TransactionCategory.GIFTS,
      TransactionCategory.CHARITY,
    ],
    description: 'Other miscellaneous expenses',
  },
};

/**
 * Get all budget category names
 */
export function getBudgetCategories(): string[] {
  return Object.keys(BUDGET_CATEGORY_MAPPING);
}

/**
 * Get transaction categories for a budget category
 */
export function getTransactionCategoriesForBudget(
  budgetCategory: string
): TransactionCategory[] {
  const config = BUDGET_CATEGORY_MAPPING[budgetCategory];
  return config ? config.transactionCategories : [];
}

/**
 * Get budget category for a transaction category
 */
export function getBudgetCategoryForTransaction(
  transactionCategory: TransactionCategory
): string | null {
  for (const [budgetCategory, config] of Object.entries(
    BUDGET_CATEGORY_MAPPING
  )) {
    if (config.transactionCategories.includes(transactionCategory)) {
      return budgetCategory;
    }
  }
  return null;
}

/**
 * Default budget amounts (in INR)
 */
export const DEFAULT_BUDGETS: Record<string, number> = {
  'Food & Dining': 15000,
  'Transport': 5000,
  'Shopping': 10000,
  'Bills & Utilities': 8000,
  'Entertainment': 5000,
  'Healthcare': 3000,
  'Education': 5000,
  'Fitness': 3000,
  'Travel': 10000,
  'Others': 5000,
};
