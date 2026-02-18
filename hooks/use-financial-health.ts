/**
 * Hook for fetching the composite financial health dashboard metrics.
 * @module hooks/use-financial-health
 */
import { useQuery } from "@tanstack/react-query"

interface ExpenseVelocity {
  currentMonthlyAvg: number
  previousMonthlyAvg: number
  changePercent: number
  trend: "increasing" | "decreasing" | "stable"
}

interface ScoreBreakdown {
  savingsRate: number
  emergencyFund: number
  nwiAdherence: number
  investmentRate: number
}

interface NetWorthPoint {
  month: string
  bankBalance: number
  investmentValue: number
  totalNetWorth: number
}

interface IncomeProfile {
  avgMonthlyIncome: number
  incomeStability: number
  isVariable: boolean
  lastIncomeDate: string | null
}

export interface FinancialHealthMetrics {
  emergencyFundMonths: number
  emergencyFundTarget: number
  expenseVelocity: ExpenseVelocity
  financialFreedomScore: number
  scoreBreakdown: ScoreBreakdown
  netWorthTimeline: NetWorthPoint[]
  incomeProfile: IncomeProfile
}

interface FinancialHealthResponse {
  success: boolean
  metrics?: FinancialHealthMetrics
  message?: string
}

/**
 * Fetches financial health metrics including emergency fund coverage,
 * expense velocity, freedom score breakdown, net-worth timeline, and income profile.
 */
export function useFinancialHealth() {
  return useQuery<FinancialHealthResponse>({
    queryKey: ["financial-health"],
    queryFn: async () => {
      const res = await fetch("/api/financial-health")
      if (!res.ok) throw new Error("Failed to fetch financial health")
      return res.json()
    },
  })
}
