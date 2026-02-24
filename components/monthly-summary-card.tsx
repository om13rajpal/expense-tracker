/**
 * Summary card showing opening/closing balance, net change, growth, income,
 * expenses, and savings rate for a given month.
 * @module components/monthly-summary-card
 */
"use client"

import { Badge } from "@/components/ui/badge"
import { MonthlyMetrics } from "@/lib/monthly-utils"
import { IconTrendingUp, IconTrendingDown, IconAlertCircle } from "@tabler/icons-react"

/**
 * Props for the MonthlySummaryCard component.
 * @property metrics - Pre-computed monthly financial metrics from `calculateMonthlyMetrics`.
 */
interface MonthlySummaryCardProps {
  metrics: MonthlyMetrics
}

/** Formats a number as INR currency with no decimal places. */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Renders a two-row stat grid for the given month's financial metrics.
 * @param metrics - Pre-computed monthly metrics from `calculateMonthlyMetrics`.
 */
export function MonthlySummaryCard({ metrics }: MonthlySummaryCardProps) {
  const isPositiveGrowth = metrics.netChange >= 0
  const isPartialMonth = metrics.isPartialMonth

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Monthly Summary</h3>
          <p className="text-xs text-muted-foreground">Snapshot for {metrics.monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{metrics.monthLabel}</Badge>
          {isPartialMonth && (
            <Badge variant="secondary" className="text-[10px]">
              <IconAlertCircle className="mr-1 size-3" />
              Partial Month
            </Badge>
          )}
        </div>
      </div>

      {isPartialMonth && (
        <p className="text-[11px] text-muted-foreground">
          {metrics.daysInPeriod} days covered ({metrics.startDate.toLocaleDateString()} - {metrics.endDate.toLocaleDateString()})
        </p>
      )}

      {/* Top row: Opening, Closing, Net Change, Growth */}
      <div className="rounded-lg border border-border/40 divide-x divide-border/40 grid grid-cols-4">
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Opening</p>
          <p className="text-lg font-semibold tabular-nums mt-0.5">{formatCurrency(metrics.openingBalance)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Closing</p>
          <p className="text-lg font-semibold tabular-nums mt-0.5">{formatCurrency(metrics.closingBalance)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Net Change</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className={`text-lg font-semibold tabular-nums ${isPositiveGrowth ? "text-primary" : "text-destructive"}`}>
              {isPositiveGrowth ? "+" : ""}{formatCurrency(metrics.netChange)}
            </p>
            {isPositiveGrowth ? (
              <IconTrendingUp className="size-4 text-primary" />
            ) : (
              <IconTrendingDown className="size-4 text-destructive" />
            )}
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Growth</p>
          <p className={`text-lg font-semibold tabular-nums mt-0.5 ${isPositiveGrowth ? "text-primary" : "text-destructive"}`}>
            {metrics.growthRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Bottom row: Income, Expenses, Savings Rate */}
      <div className="rounded-lg border border-border/40 divide-x divide-border/40 grid grid-cols-3">
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Income</p>
          <p className="text-lg font-semibold text-primary tabular-nums mt-0.5">{formatCurrency(metrics.totalIncome)}</p>
          <p className="text-[10px] text-muted-foreground">{metrics.incomeTransactionCount} transactions</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
          <p className="text-lg font-semibold tabular-nums mt-0.5">{formatCurrency(metrics.totalExpenses)}</p>
          <p className="text-[10px] text-muted-foreground">{metrics.expenseTransactionCount} transactions</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Net Change
          </p>
          <p className={`text-lg font-semibold tabular-nums mt-0.5 ${metrics.netChange >= 0 ? "text-primary" : "text-destructive"}`}>
            {metrics.netChange >= 0 ? "+" : ""}{formatCurrency(metrics.netChange)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Balance change this month
          </p>
        </div>
      </div>
    </div>
  )
}
