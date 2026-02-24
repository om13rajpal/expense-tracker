/**
 * Hook for fetching the composite financial health dashboard metrics.
 * Aggregates emergency fund coverage, expense velocity trends, financial
 * freedom score breakdown, net-worth timeline, and income profile data.
 * @module hooks/use-financial-health
 */
import { useQuery } from "@tanstack/react-query"

/**
 * Expense velocity comparison between the current and previous periods.
 * Indicates whether the user's spending rate is accelerating or decelerating.
 * @property currentMonthlyAvg - Average monthly spending over the current analysis window
 * @property previousMonthlyAvg - Average monthly spending over the previous analysis window
 * @property changePercent - Percentage change from previous to current (positive = spending more)
 * @property trend - Direction label derived from the change percentage
 */
interface ExpenseVelocity {
  currentMonthlyAvg: number
  previousMonthlyAvg: number
  changePercent: number
  trend: "increasing" | "decreasing" | "stable"
}

/**
 * Breakdown of the composite financial freedom score into its four components.
 * Each sub-score is on a 0-100 scale; the overall score is a weighted average.
 * @property savingsRate - Score based on the percentage of income saved each month
 * @property emergencyFund - Score based on how many months of expenses the emergency fund covers
 * @property nwiAdherence - Score based on how closely spending matches the NWI allocation targets
 * @property investmentRate - Score based on the percentage of income directed to investments
 */
interface ScoreBreakdown {
  savingsRate: number
  emergencyFund: number
  nwiAdherence: number
  investmentRate: number
}

/**
 * A single data point in the net-worth timeline chart.
 * @property month - Month identifier (e.g. "2026-01")
 * @property bankBalance - Total liquid cash across all linked bank accounts
 * @property investmentValue - Current market value of all tracked investments
 * @property totalNetWorth - Sum of bankBalance and investmentValue
 */
interface NetWorthPoint {
  month: string
  bankBalance: number
  investmentValue: number
  totalNetWorth: number
}

/**
 * Profile of the user's income patterns derived from transaction history.
 * @property avgMonthlyIncome - Average monthly income over the analysis period
 * @property incomeStability - Stability score from 0 (highly variable) to 1 (perfectly consistent)
 * @property isVariable - True if income varies significantly month to month (e.g. freelance)
 * @property lastIncomeDate - ISO date string of the most recent income transaction, or null if none found
 */
interface IncomeProfile {
  avgMonthlyIncome: number
  incomeStability: number
  isVariable: boolean
  lastIncomeDate: string | null
}

/**
 * Complete set of financial health metrics computed from the user's transaction
 * and investment data. Powers the Financial Health dashboard page.
 * @property emergencyFundMonths - Number of months of essential expenses covered by the emergency fund
 * @property emergencyFundTarget - Recommended emergency fund target in currency units (typically 6 months)
 * @property expenseVelocity - Spending rate comparison between current and previous periods
 * @property financialFreedomScore - Composite health score from 0-100
 * @property scoreBreakdown - Per-category breakdown of the financial freedom score
 * @property netWorthTimeline - Monthly net-worth data points for charting
 * @property incomeProfile - Income pattern analysis and stability metrics
 */
export interface FinancialHealthMetrics {
  emergencyFundMonths: number
  emergencyFundTarget: number
  expenseVelocity: ExpenseVelocity
  financialFreedomScore: number
  scoreBreakdown: ScoreBreakdown
  netWorthTimeline: NetWorthPoint[]
  incomeProfile: IncomeProfile
}

/**
 * API response shape from the financial health endpoint.
 * @property success - Whether the API call succeeded
 * @property metrics - The complete financial health metrics object, if available
 * @property message - Optional error or status message from the server
 */
interface FinancialHealthResponse {
  success: boolean
  metrics?: FinancialHealthMetrics
  message?: string
}

/**
 * Fetches financial health metrics including emergency fund coverage,
 * expense velocity, freedom score breakdown, net-worth timeline, and income profile.
 *
 * Data is considered stale after 5 minutes and garbage-collected after 30 minutes.
 * Retries up to 2 times on failure.
 *
 * @returns A React Query result containing `FinancialHealthResponse` with the `metrics` field
 */
export function useFinancialHealth() {
  return useQuery<FinancialHealthResponse>({
    queryKey: ["financial-health"],
    queryFn: async () => {
      const res = await fetch("/api/financial-health")
      if (!res.ok) throw new Error("Failed to fetch financial health")
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  })
}
