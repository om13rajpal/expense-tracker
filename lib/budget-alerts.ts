/**
 * Budget Alert System
 * Compares per-category spending against budget limits and generates
 * prioritized alerts when spending approaches or exceeds budgets.
 */

/**
 * Represents a budget alert for a single category.
 */
export interface BudgetAlert {
  /** The budget category name */
  category: string;
  /** The budgeted limit amount */
  budget: number;
  /** The actual amount spent */
  spent: number;
  /** Spending as a percentage of budget (e.g. 85 means 85%) */
  percentage: number;
  /** Alert severity level */
  level: "warning" | "critical" | "exceeded";
  /** Human-readable alert message */
  message: string;
}

/** Budget input: a category with its spending limit. */
export interface BudgetInput {
  category: string;
  limit: number;
}

/** Spending input: a category with its total spent amount. */
export interface SpendingInput {
  category: string;
  total: number;
}

/** Maximum number of alerts returned to avoid notification fatigue. */
const MAX_ALERTS = 5;

/** Alert level sort order (most severe first). */
const LEVEL_ORDER: Record<string, number> = {
  exceeded: 0,
  critical: 1,
  warning: 2,
};

/**
 * Format a number as a readable currency string (Rs.X,XXX).
 */
function formatAmount(amount: number): string {
  return `Rs.${Math.round(amount).toLocaleString("en-IN")}`;
}

/**
 * Generate budget alerts by comparing actual spending to budget limits.
 *
 * Thresholds:
 * - Warning: 80-99% of budget used
 * - Critical: 100-120% of budget used
 * - Exceeded: >120% of budget used
 *
 * @param budgets - Array of budget categories with their limits
 * @param spending - Array of spending totals per category
 * @returns Up to 5 alerts sorted by severity (exceeded first), then by percentage descending
 */
export function generateBudgetAlerts(
  budgets: BudgetInput[],
  spending: SpendingInput[]
): BudgetAlert[] {
  if (!budgets.length || !spending.length) return [];

  // Build a lookup map for spending by category (case-insensitive)
  const spendingMap = new Map<string, number>();
  for (const s of spending) {
    spendingMap.set(s.category.toLowerCase(), s.total);
  }

  const alerts: BudgetAlert[] = [];

  for (const budget of budgets) {
    // Skip invalid budgets
    if (!budget.category || !budget.limit || budget.limit <= 0) continue;

    const spent = spendingMap.get(budget.category.toLowerCase()) ?? 0;

    // Skip if no spending recorded
    if (spent <= 0) continue;

    const percentage = (spent / budget.limit) * 100;

    // Only generate alerts for 80%+ usage
    if (percentage < 80) continue;

    const overAmount = spent - budget.limit;
    const overPercent = Math.round(percentage - 100);

    let level: BudgetAlert["level"];
    let message: string;

    if (percentage > 120) {
      level = "exceeded";
      message = `${budget.category} is ${overPercent}% over budget!`;
    } else if (percentage >= 100) {
      level = "critical";
      message = `${budget.category} has exceeded budget by ${formatAmount(overAmount)}`;
    } else {
      level = "warning";
      message = `${budget.category} is at ${Math.round(percentage)}% of budget (${formatAmount(spent)} of ${formatAmount(budget.limit)})`;
    }

    alerts.push({
      category: budget.category,
      budget: budget.limit,
      spent,
      percentage: Math.round(percentage * 10) / 10,
      level,
      message,
    });
  }

  // Sort by severity (exceeded first), then by percentage descending
  alerts.sort((a, b) => {
    const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    if (levelDiff !== 0) return levelDiff;
    return b.percentage - a.percentage;
  });

  // Cap at MAX_ALERTS to avoid notification spam
  return alerts.slice(0, MAX_ALERTS);
}
