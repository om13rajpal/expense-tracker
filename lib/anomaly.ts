/**
 * Transaction Anomaly Detection
 * Flags unusual spending using statistical analysis.
 *
 * Two detection strategies:
 * 1. Per-category statistical outliers (mean + N*stddev)
 * 2. First-time large merchants (single occurrence above median threshold)
 */

/**
 * Represents a detected spending anomaly.
 */
export interface Anomaly {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  reason: string;
  severity: "low" | "medium" | "high";
  expectedRange: { min: number; max: number };
}

/**
 * Configuration options for anomaly detection.
 */
export interface AnomalyOptions {
  /** Number of standard deviations above mean to flag. Default: 2 */
  stdDevThreshold?: number;
  /** How many months of history to consider. Default: 3 */
  lookbackMonths?: number;
  /** Minimum transactions per category to analyze. Default: 5 */
  minTransactions?: number;
}

/** Shape of a transaction record used by the anomaly detector. */
export interface AnomalyTransaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  category: string;
  type: string;
}

/**
 * Compute the arithmetic mean of an array of numbers.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute the population standard deviation of an array of numbers.
 */
function stdDev(values: number[], avg: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.reduce((sum, v) => sum + (v - avg) ** 2, 0);
  return Math.sqrt(squaredDiffs / values.length);
}

/**
 * Compute the median of an array of numbers.
 * Returns 0 for an empty array.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Determine severity based on how many standard deviations above mean.
 * >4 sigma = high, >3 sigma = medium, >2 sigma = low.
 */
function determineSeverity(
  amount: number,
  avg: number,
  sd: number
): "low" | "medium" | "high" {
  if (sd === 0) return "low";
  const sigmas = (amount - avg) / sd;
  if (sigmas > 4) return "high";
  if (sigmas > 3) return "medium";
  return "low";
}

/**
 * Get the lookback cutoff date as an ISO string.
 */
function getLookbackDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/**
 * Severity sort order for final output (high first).
 */
const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Detect anomalous transactions using statistical analysis.
 *
 * Groups expenses by category, computes per-category mean and standard
 * deviation over the lookback window, and flags transactions that exceed
 * the configured threshold. Also flags first-time merchants with
 * unusually high amounts.
 *
 * @param transactions - Array of transaction records to analyze
 * @param options - Detection configuration
 * @returns Anomalies sorted by severity (high first), then by amount descending
 */
export function detectAnomalies(
  transactions: AnomalyTransaction[],
  options?: AnomalyOptions
): Anomaly[] {
  const threshold = options?.stdDevThreshold ?? 2;
  const lookbackMonths = options?.lookbackMonths ?? 3;
  const minTransactions = options?.minTransactions ?? 5;

  // Filter to expenses only
  const expenses = transactions.filter(
    (t) => t.type === "expense" || t.type === "Expense"
  );

  if (expenses.length === 0) return [];

  // Determine lookback cutoff
  const cutoff = getLookbackDate(lookbackMonths);

  // Filter to lookback window
  const recentExpenses = expenses.filter((t) => {
    const txDate = typeof t.date === "string" ? t.date.slice(0, 10) : "";
    return txDate >= cutoff;
  });

  if (recentExpenses.length === 0) return [];

  const anomalies: Anomaly[] = [];
  const seenIds = new Set<string>();

  // --- Strategy 1: Per-category statistical outliers ---

  // Group by category
  const byCategory = new Map<string, AnomalyTransaction[]>();
  for (const tx of recentExpenses) {
    const cat = tx.category || "Uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(tx);
  }

  for (const [category, txns] of Array.from(byCategory.entries())) {
    if (txns.length < minTransactions) continue;

    const amounts = txns.map((t) => Math.abs(t.amount));
    const avg = mean(amounts);
    const sd = stdDev(amounts, avg);

    // Skip categories with zero variance (all same amount)
    if (sd === 0) continue;

    const upperBound = avg + threshold * sd;

    for (const tx of txns) {
      const absAmount = Math.abs(tx.amount);
      if (absAmount > upperBound) {
        const multiplier = (absAmount / avg).toFixed(1);
        const severity = determineSeverity(absAmount, avg, sd);
        const txDate =
          typeof tx.date === "string"
            ? tx.date.slice(0, 10)
            : new Date(tx.date).toISOString().slice(0, 10);

        anomalies.push({
          transactionId: tx.id,
          description: tx.description,
          amount: absAmount,
          date: txDate,
          category,
          reason: `Amount is ${multiplier}x above average for ${category}`,
          severity,
          expectedRange: {
            min: Math.round(Math.max(0, avg - sd)),
            max: Math.round(avg + sd),
          },
        });
        seenIds.add(tx.id);
      }
    }
  }

  // --- Strategy 2: First-time large merchants ---

  // Count merchant occurrences across ALL expenses (not just lookback)
  const merchantCounts = new Map<string, number>();
  for (const tx of expenses) {
    const m = (tx.merchant || tx.description || "").toLowerCase().trim();
    if (m) merchantCounts.set(m, (merchantCounts.get(m) || 0) + 1);
  }

  // Compute overall median expense amount
  const allAmounts = recentExpenses.map((t) => Math.abs(t.amount));
  const medianAmount = median(allAmounts);
  const largeThreshold = medianAmount * 2;

  for (const tx of recentExpenses) {
    if (seenIds.has(tx.id)) continue;

    const m = (tx.merchant || tx.description || "").toLowerCase().trim();
    if (!m) continue;

    const count = merchantCounts.get(m) || 0;
    const absAmount = Math.abs(tx.amount);

    if (count === 1 && absAmount > largeThreshold) {
      const txDate =
        typeof tx.date === "string"
          ? tx.date.slice(0, 10)
          : new Date(tx.date).toISOString().slice(0, 10);

      anomalies.push({
        transactionId: tx.id,
        description: tx.description,
        amount: absAmount,
        date: txDate,
        category: tx.category || "Uncategorized",
        reason: "First-time merchant with unusually high amount",
        severity: absAmount > largeThreshold * 2 ? "medium" : "low",
        expectedRange: {
          min: 0,
          max: Math.round(medianAmount),
        },
      });
    }
  }

  // Sort by severity (high first), then amount descending
  anomalies.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.amount - a.amount;
  });

  return anomalies;
}
