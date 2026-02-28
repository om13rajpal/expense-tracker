"use client"

import { useMemo } from "react"
import { IconTrendingUp, IconTrendingDown, IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react"
import { formatINR, formatCompact } from "@/lib/format"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function CashFlowForecastWidget({}: WidgetComponentProps) {
  const { transactions, totalIncome, totalExpenses, closingBalance, dailySummary } = useDashboardData()

  const forecast = useMemo(() => {
    const avgDailyIncome = totalIncome / Math.max(1, dailySummary.daysElapsed)
    const avgDailyExpense = totalExpenses / Math.max(1, dailySummary.daysElapsed)
    const netDailyFlow = avgDailyIncome - avgDailyExpense
    const projectedBalance30d = closingBalance + (netDailyFlow * 30)
    const monthlyBurn = avgDailyExpense * 30
    const monthlyEarn = avgDailyIncome * 30
    const runwayDays = avgDailyExpense > 0 ? Math.floor(closingBalance / avgDailyExpense) : 999

    return { avgDailyIncome, avgDailyExpense, netDailyFlow, projectedBalance30d, monthlyBurn, monthlyEarn, runwayDays }
  }, [totalIncome, totalExpenses, closingBalance, dailySummary.daysElapsed])

  const isPositiveFlow = forecast.netDailyFlow >= 0

  return (
    <div className="p-6 h-full flex flex-col">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Cash Flow Forecast</p>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-black tracking-tight tabular-nums">{formatINR(forecast.projectedBalance30d)}</span>
        <span className="text-[11px] text-muted-foreground font-medium">in 30 days</span>
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <IconArrowUpRight className="size-3.5 text-lime-600 dark:text-lime-400" />
            <span className="text-xs text-muted-foreground">Avg. Monthly Income</span>
          </div>
          <span className="text-xs font-black tabular-nums text-lime-600 dark:text-lime-400">{formatCompact(forecast.monthlyEarn)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <IconArrowDownRight className="size-3.5 text-foreground/60" />
            <span className="text-xs text-muted-foreground">Avg. Monthly Expenses</span>
          </div>
          <span className="text-xs font-black tabular-nums text-foreground/70">{formatCompact(forecast.monthlyBurn)}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isPositiveFlow ? <IconTrendingUp className="size-3.5 text-lime-600 dark:text-lime-400" /> : <IconTrendingDown className="size-3.5 text-destructive" />}
            <span className="text-xs text-muted-foreground">Net Daily Flow</span>
          </div>
          <span className={`text-xs font-black tabular-nums ${isPositiveFlow ? "text-lime-600 dark:text-lime-400" : "text-destructive"}`}>
            {isPositiveFlow ? "+" : ""}{formatCompact(forecast.netDailyFlow)}/day
          </span>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">Runway</span>
          <span className={`text-sm font-black tabular-nums ${forecast.runwayDays > 60 ? "text-lime-600 dark:text-lime-400" : forecast.runwayDays > 30 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
            {forecast.runwayDays > 365 ? "1y+" : `${forecast.runwayDays}d`}
          </span>
        </div>
      </div>
    </div>
  )
}
