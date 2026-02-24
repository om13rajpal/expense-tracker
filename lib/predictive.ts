/**
 * Predictive computation utilities for budget burn rates, cash flow forecasts,
 * and savings goal predictions. Pure computation -- no LLM calls.
 * @module lib/predictive
 */
import type { Db } from 'mongodb';

// ─── Types ───────────────────────────────────────────────────────────

/** Budget burn rate data for a single budget category this month. */
export interface BurnRate {
  /** Budget category name. */
  category: string;
  /** Monthly budget limit in INR. */
  budget: number;
  /** Amount spent so far this month in INR. */
  spent: number;
  /** Daily burn rate (spent / elapsed days). */
  burnRate: number;
  /** Projected total spend for the full month at current pace. */
  projectedTotal: number;
  /** ISO date when the budget will be exhausted, or null if safe. */
  exhaustionDate: string | null;
  /** Alert status based on projected vs. budget ratio. */
  status: 'safe' | 'warning' | 'critical';
  /** Calendar days remaining in the current month. */
  daysRemaining: number;
}

/** Cash flow forecast for the remainder of the current month. */
export interface CashFlowForecast {
  /** Projected total expenses for the full month in INR. */
  projectedExpenses: number;
  /** Total income received so far (salary typically arrives early). */
  projectedIncome: number;
  /** Projected surplus (income minus expenses) for the month. */
  projectedSurplus: number;
  /** Average daily expense rate in INR. */
  dailyAverage: number;
  /** Forecast confidence 0-1 (increases as more of the month elapses). */
  confidence: number;
}

/** Savings goal prediction with projected completion timeline. */
export interface GoalPrediction {
  /** Goal name (e.g. "Emergency Fund", "Car Down Payment"). */
  goalName: string;
  /** Target amount in INR. */
  target: number;
  /** Current saved amount in INR. */
  current: number;
  /** Monthly contribution rate in INR (0 if no contribution). */
  monthlySavingRate: number;
  /** Projected months until the goal is reached. */
  monthsToCompletion: number;
  /** Projected completion date as YYYY-MM-DD. */
  completionDate: string;
  /** Whether the goal will be reached by the target date at current pace. */
  onTrack: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function startOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function daysElapsedInMonth(): number {
  return Math.max(1, new Date().getDate());
}

// ─── Budget Burn Rates ──────────────────────────────────────────────

/**
 * Compute budget burn rates for all budget categories this month.
 *
 * Loads budget categories from MongoDB, aggregates current-month spending
 * per category, and projects whether each category will stay within budget.
 *
 * @param db - MongoDB Db instance.
 * @param userId - User identifier.
 * @returns Array of BurnRate objects sorted by severity (critical first).
 */
export async function computeBurnRates(db: Db, userId: string): Promise<BurnRate[]> {
  // Load budget categories
  const budgetDocs = await db
    .collection('budget_categories')
    .find({ userId })
    .toArray();

  if (budgetDocs.length === 0) return [];

  // Build reverse map: transaction category -> budget name
  const reverseMap: Record<string, string> = {};
  for (const doc of budgetDocs) {
    const cats = doc.transactionCategories as string[] | undefined;
    if (Array.isArray(cats)) {
      for (const cat of cats) {
        reverseMap[cat] = doc.name as string;
      }
    }
  }

  // Get current month expenses
  const monthStart = startOfMonth();
  const transactions = await db
    .collection('transactions')
    .find({ userId, date: { $gte: monthStart }, type: 'expense' })
    .toArray();

  // Aggregate spend per budget category
  const spendByBudget: Record<string, number> = {};
  for (const txn of transactions) {
    const raw = txn.category as string;
    const budgetName = reverseMap[raw] || raw;
    spendByBudget[budgetName] = (spendByBudget[budgetName] || 0) + Math.abs(txn.amount as number);
  }

  const totalDays = daysInCurrentMonth();
  const elapsed = daysElapsedInMonth();

  const results: BurnRate[] = [];
  for (const doc of budgetDocs) {
    const budget = doc.budgetAmount as number;
    if (!budget || budget <= 0) continue;

    const category = doc.name as string;
    const spent = spendByBudget[category] || 0;
    const burnRate = spent / elapsed;
    const projectedTotal = burnRate * totalDays;
    const ratio = projectedTotal / budget;

    let status: BurnRate['status'] = 'safe';
    if (ratio >= 1) status = 'critical';
    else if (ratio >= 0.8) status = 'warning';

    let exhaustionDate: string | null = null;
    if (burnRate > 0 && budget > 0) {
      const daysToExhaust = budget / burnRate;
      if (daysToExhaust <= totalDays) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        exhaustionDate = new Date(
          monthStart.getTime() + daysToExhaust * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0];
      }
    }

    results.push({
      category,
      budget,
      spent,
      burnRate,
      projectedTotal,
      exhaustionDate,
      status,
      daysRemaining: Math.max(0, totalDays - elapsed),
    });
  }

  // Sort critical first, then warning, then safe
  const order = { critical: 0, warning: 1, safe: 2 };
  results.sort((a, b) => order[a.status] - order[b.status]);

  return results;
}

// ─── Cash Flow Forecast ─────────────────────────────────────────────

/**
 * Forecast cash flow for the remainder of the current month.
 *
 * Loads all current-month transactions, separates income from expenses,
 * and extrapolates the daily expense rate to produce a full-month projection.
 * Confidence increases as more of the month has elapsed (more data).
 *
 * @param db - MongoDB Db instance.
 * @param userId - User identifier.
 * @returns CashFlowForecast with projected expenses, income, surplus, and confidence.
 */
export async function computeCashFlowForecast(db: Db, userId: string): Promise<CashFlowForecast> {
  const monthStart = startOfMonth();
  const totalDays = daysInCurrentMonth();
  const elapsed = daysElapsedInMonth();

  const transactions = await db
    .collection('transactions')
    .find({ userId, date: { $gte: monthStart } })
    .toArray();

  let totalExpenses = 0;
  let totalIncome = 0;
  for (const txn of transactions) {
    const amount = Math.abs(txn.amount as number);
    if (txn.type === 'expense') totalExpenses += amount;
    else if (txn.type === 'income') totalIncome += amount;
  }

  const dailyAverage = totalExpenses / elapsed;
  const projectedExpenses = dailyAverage * totalDays;

  // For income, use what we have (salary usually arrives early in month)
  const projectedIncome = totalIncome;
  const projectedSurplus = projectedIncome - projectedExpenses;

  // Confidence decreases early in the month (less data)
  const confidence = Math.min(0.95, 0.3 + (elapsed / totalDays) * 0.65);

  return {
    projectedExpenses,
    projectedIncome,
    projectedSurplus,
    dailyAverage,
    confidence,
  };
}

// ─── Goal Predictions ───────────────────────────────────────────────

/**
 * Predict completion timelines for all savings goals.
 *
 * For each goal in the `savings_goals` collection, calculates the remaining
 * amount, estimates months to completion based on the configured monthly
 * contribution, and determines whether the goal is on track to meet its
 * target date.
 *
 * @param db - MongoDB Db instance.
 * @param userId - User identifier.
 * @returns Array of GoalPrediction objects, one per savings goal.
 */
export async function computeGoalPredictions(db: Db, userId: string): Promise<GoalPrediction[]> {
  const goals = await db
    .collection('savings_goals')
    .find({ userId })
    .toArray();

  if (goals.length === 0) return [];

  const results: GoalPrediction[] = [];

  for (const goal of goals) {
    const target = goal.targetAmount as number;
    const current = goal.currentAmount as number;
    const monthlyContribution = goal.monthlyContribution as number;
    const targetDate = goal.targetDate as string;

    const remaining = Math.max(0, target - current);

    // Use monthly contribution as the saving rate if available
    const monthlySavingRate = monthlyContribution > 0 ? monthlyContribution : 0;

    let monthsToCompletion = Infinity;
    let completionDate = '';
    let onTrack = false;

    if (monthlySavingRate > 0) {
      monthsToCompletion = remaining / monthlySavingRate;
      const now = new Date();
      const completionMs = now.getTime() + monthsToCompletion * 30.44 * 24 * 60 * 60 * 1000;
      completionDate = new Date(completionMs).toISOString().split('T')[0];

      if (targetDate) {
        onTrack = new Date(completionDate) <= new Date(targetDate);
      }
    } else if (remaining === 0) {
      onTrack = true;
      monthsToCompletion = 0;
      completionDate = new Date().toISOString().split('T')[0];
    }

    results.push({
      goalName: goal.name as string,
      target,
      current,
      monthlySavingRate,
      monthsToCompletion: Math.round(monthsToCompletion * 10) / 10,
      completionDate,
      onTrack,
    });
  }

  return results;
}
