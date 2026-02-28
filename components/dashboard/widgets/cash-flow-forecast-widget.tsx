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
      <p className="text-[13px] font-medium text-neutral-500 mb-3">Cash Flow Forecast</p>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-black tracking-tight tabular-nums text-neutral-900">{formatINR(forecast.projectedBalance30d)}</span>
        <span className="text-[11px] text-neutral-400 font-medium">in 30 days</span>
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <IconArrowUpRight className="size-3.5 text-emerald-600" />
            <span className="text-xs text-neutral-500">Avg. Monthly Income</span>
          </div>
          <span className="text-xs font-black tabular-nums text-emerald-600">{formatCompact(forecast.monthlyEarn)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <IconArrowDownRight className="size-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Avg. Monthly Expenses</span>
          </div>
          <span className="text-xs font-black tabular-nums text-neutral-700">{formatCompact(forecast.monthlyBurn)}</span>
        </div>
        <div className="h-px bg-neutral-100" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isPositiveFlow ? <IconTrendingUp className="size-3.5 text-emerald-600" /> : <IconTrendingDown className="size-3.5 text-red-500" />}
            <span className="text-xs text-neutral-500">Net Daily Flow</span>
          </div>
          <span className={`text-xs font-black tabular-nums ${isPositiveFlow ? "text-emerald-600" : "text-red-500"}`}>
            {isPositiveFlow ? "+" : ""}{formatCompact(forecast.netDailyFlow)}/day
          </span>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-medium">Runway</span>
          <span className={`text-sm font-black tabular-nums ${forecast.runwayDays > 60 ? "text-emerald-600" : forecast.runwayDays > 30 ? "text-amber-600" : "text-red-500"}`}>
            {forecast.runwayDays > 365 ? "1y+" : `${forecast.runwayDays}d`}
          </span>
        </div>
      </div>
    </div>
  )
}
