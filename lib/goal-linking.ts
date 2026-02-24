/**
 * Goal Auto-Contribution Linking.
 *
 * Scans transactions to detect contributions toward savings goals
 * by matching on category membership and keyword presence in
 * descriptions and merchant names. Provides default link configs
 * for common goal types (emergency fund, education, investment)
 * and supports custom per-goal configurations.
 *
 * @module lib/goal-linking
 */

/**
 * Represents a single transaction matched as a contribution toward a goal.
 */
export interface GoalContribution {
  /** The goal this contribution is linked to */
  goalId: string;
  /** The matching transaction ID */
  transactionId: string;
  /** Date of the transaction (ISO string) */
  date: string;
  /** Transaction amount */
  amount: number;
  /** Transaction description */
  description: string;
  /** Why this transaction matched, e.g. "Category: Savings" or "Keyword: PPF" */
  matchReason: string;
}

/**
 * Configuration for linking transactions to a specific savings goal.
 */
export interface GoalLinkConfig {
  /** Unique goal identifier */
  goalId: string;
  /** Human-readable goal name */
  goalName: string;
  /** Goal category like "Emergency Fund", "Car", etc. */
  goalCategory?: string;
  /** Transaction categories that count as contributions */
  linkedCategories: string[];
  /** Keywords to match in description or merchant (case-insensitive) */
  linkedKeywords: string[];
}

/** Shape of a transaction record used by the goal linker. */
export interface GoalTransaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  category: string;
  type: string;
}

/** Default link configurations for common goal categories. */
const DEFAULT_CONFIGS: Record<
  string,
  { categories: string[]; keywords: string[] }
> = {
  "emergency fund": {
    categories: ["Savings", "Investment"],
    keywords: ["savings", "FD", "RD", "emergency"],
  },
  savings: {
    categories: ["Savings", "Investment"],
    keywords: ["savings", "FD", "RD", "emergency"],
  },
  education: {
    categories: ["Education"],
    keywords: ["education", "course", "tuition", "school"],
  },
  investment: {
    categories: ["Investment"],
    keywords: ["mutual fund", "SIP", "stocks", "ELSS", "PPF", "NPS"],
  },
};

/** Fallback config when no specific match is found. */
const FALLBACK_CONFIG = { categories: ["Savings"], keywords: [] as string[] };

/**
 * Get default link configuration for common goal categories.
 *
 * Maps well-known goal types to their typical transaction categories
 * and keywords. Falls back to a generic savings-only config for
 * unrecognized categories.
 *
 * @param goalCategory - The goal category string (case-insensitive)
 * @returns Object with default categories and keywords arrays
 */
export function getDefaultLinkConfig(goalCategory: string): {
  categories: string[];
  keywords: string[];
} {
  const key = goalCategory.toLowerCase().trim();
  return DEFAULT_CONFIGS[key] ?? FALLBACK_CONFIG;
}

/**
 * Check if a text contains any of the given keywords (case-insensitive).
 * Returns the first matched keyword or null.
 */
function findKeywordMatch(
  text: string,
  keywords: string[]
): string | null {
  if (!text || keywords.length === 0) return null;
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
}

/**
 * Check if a category matches any of the linked categories (case-insensitive).
 * Returns the matched category or null.
 */
function findCategoryMatch(
  category: string,
  linkedCategories: string[]
): string | null {
  if (!category || linkedCategories.length === 0) return null;
  const lower = category.toLowerCase();
  for (const linked of linkedCategories) {
    if (lower === linked.toLowerCase()) {
      return linked;
    }
  }
  return null;
}

/**
 * Find transactions that match a goal's linking configuration.
 *
 * For each transaction, checks:
 * 1. Category match: transaction category is in the goal's linkedCategories
 * 2. Keyword match: description or merchant contains any linkedKeyword
 *
 * If a transaction matches on both category and keyword, the category
 * match takes precedence in the matchReason.
 *
 * @param config - The goal's link configuration
 * @param transactions - Array of transaction records to scan
 * @param dateRange - Optional date range filter (inclusive, ISO date strings)
 * @returns Matched contributions sorted by date descending
 */
export function findGoalContributions(
  config: GoalLinkConfig,
  transactions: GoalTransaction[],
  dateRange?: { start: string; end: string }
): GoalContribution[] {
  const contributions: GoalContribution[] = [];

  for (const tx of transactions) {
    // Apply date range filter if provided
    if (dateRange) {
      const txDate =
        typeof tx.date === "string"
          ? tx.date.slice(0, 10)
          : new Date(tx.date).toISOString().slice(0, 10);
      if (txDate < dateRange.start || txDate > dateRange.end) continue;
    }

    // Check category match
    const categoryMatch = findCategoryMatch(
      tx.category,
      config.linkedCategories
    );

    // Check keyword match in description and merchant
    const descKeyword = findKeywordMatch(tx.description, config.linkedKeywords);
    const merchantKeyword = findKeywordMatch(
      tx.merchant,
      config.linkedKeywords
    );
    const keywordMatch = descKeyword || merchantKeyword;

    // Skip if no match at all
    if (!categoryMatch && !keywordMatch) continue;

    // Build match reason (category takes precedence)
    let matchReason: string;
    if (categoryMatch) {
      matchReason = `Category: ${categoryMatch}`;
    } else {
      matchReason = `Keyword: ${keywordMatch}`;
    }

    const txDate =
      typeof tx.date === "string"
        ? tx.date.slice(0, 10)
        : new Date(tx.date).toISOString().slice(0, 10);

    contributions.push({
      goalId: config.goalId,
      transactionId: tx.id,
      date: txDate,
      amount: Math.abs(tx.amount),
      description: tx.description,
      matchReason,
    });
  }

  // Sort by date descending (most recent first)
  contributions.sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  });

  return contributions;
}
