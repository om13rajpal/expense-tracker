/**
 * Predictive analytics dashboard cards: budget burn rates, cash flow
 * forecast, and goal on-track predictions. Uses the `/api/predictions`
 * endpoint that runs projection algorithms over the user's transaction
 * and budget data.
 * @module components/predictions-card
 */
"use client"

import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import {
  IconFlame,
  IconTrendingUp,
  IconTarget,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { formatINR } from "@/lib/format"
import { spring } from "@/lib/motion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { BurnRate, CashFlowForecast, GoalPrediction } from "@/lib/predictive"

/**
 * Aggregated prediction response from the API.
 * @property success         - Whether the API call succeeded.
 * @property burnRates       - Per-category budget burn rate projections.
 * @property cashFlow        - Month-end cash flow forecast with confidence level.
 * @property goalPredictions - Savings-goal progress and on-track predictions.
 */
interface PredictionsData {
  success: boolean
  burnRates: BurnRate[]
  cashFlow: CashFlowForecast
  goalPredictions: GoalPrediction[]
}

/**
 * Fetches predictive analytics data from the API.
 * @returns Parsed PredictionsData JSON response.
 * @throws Error when the response indicates failure.
 */
async function fetchPredictions(): Promise<PredictionsData> {
  const res = await fetch("/api/predictions", { credentials: "include" })
  const data = await res.json()
  if (!data.success) throw new Error("Failed to fetch predictions")
  return data
}

/** Tailwind colour classes mapped to burn rate status levels. */
const statusColors = {
  safe: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
}

/**
 * Renders a three-section predictive analytics dashboard:
 * 1. **Budget Burn Rates** – categories at risk of exhausting their budget.
 * 2. **Cash Flow Forecast** – projected income, expenses, and surplus with confidence.
 * 3. **Goal Predictions** – whether each savings goal is on track.
 * Returns null when no data is available.
 */
export function PredictionsCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["predictions"],
    queryFn: fetchPredictions,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl bg-card p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    )
  }

  if (error || !data) return null

  const { burnRates, cashFlow, goalPredictions } = data
  const criticalBudgets = burnRates.filter(b => b.status !== "safe")
  const hasGoals = goalPredictions.length > 0

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth} className="space-y-4">
      {/* Top row: Burn Rates + Cash Flow side by side */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        {/* Budget Burn Rates */}
        <div className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500/15 to-amber-500/15">
              <IconFlame className="h-4 w-4 text-rose-500" />
            </div>
            <h3 className="text-sm font-semibold">Budget Burn Rates</h3>
            {criticalBudgets.length > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">
                {criticalBudgets.length} alert{criticalBudgets.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {criticalBudgets.length > 0 ? (
            <div className="space-y-2.5">
              {criticalBudgets.map((b) => (
                <div
                  key={b.category}
                  className={cn(
                    "flex items-center justify-between py-2.5 px-3 rounded-lg border",
                    statusColors[b.status]
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.category}</p>
                    <p className="text-xs opacity-80">
                      {b.exhaustionDate
                        ? `Exhausted by ${new Date(b.exhaustionDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                        : `${Math.round((b.projectedTotal / b.budget) * 100)}% projected`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatINR(b.spent)} / {formatINR(b.budget)}
                    </p>
                    <p className="text-[11px] opacity-70 tabular-nums">
                      {formatINR(b.burnRate)}/day
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">All budgets on track</p>
          )}
        </div>

        {/* Cash Flow Forecast */}
        <div className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/15">
              <IconTrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-sm font-semibold">Cash Flow Forecast</h3>
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {Math.round(cashFlow.confidence * 100)}% confidence
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Projected Expenses</p>
              <p className="text-sm font-bold tabular-nums">{formatINR(cashFlow.projectedExpenses)}</p>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Projected Income</p>
              <p className="text-sm font-bold tabular-nums">{formatINR(cashFlow.projectedIncome)}</p>
            </div>
            <div className={cn(
              "flex items-center justify-between py-2.5 px-3 rounded-lg border",
              cashFlow.projectedSurplus >= 0
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-rose-500/5 border-rose-500/20"
            )}>
              <p className="text-xs font-medium">Projected Surplus</p>
              <p className={cn(
                "text-base font-bold tabular-nums",
                cashFlow.projectedSurplus >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}>
                {cashFlow.projectedSurplus >= 0 ? "+" : ""}{formatINR(cashFlow.projectedSurplus)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Predictions - full width */}
      {hasGoals && (
        <div className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/15 to-pink-500/15">
              <IconTarget className="h-4 w-4 text-violet-500" />
            </div>
            <h3 className="text-sm font-semibold">Goal Predictions</h3>
          </div>
          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
            {goalPredictions.map((g) => (
              <div
                key={g.goalName}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{g.goalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.monthsToCompletion === 0
                      ? "Completed"
                      : g.monthlySavingRate > 0
                        ? `~${g.monthsToCompletion} months to go`
                        : "No monthly contribution set"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 ml-3",
                    g.onTrack
                      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "text-amber-600 dark:text-amber-400 border-amber-500/30"
                  )}
                >
                  {g.onTrack ? "On Track" : "Behind"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
