/**
 * Full weekly analytics view with period bridge, stat bar, daily breakdown chart,
 * top categories, and top expenses list. Includes week navigation.
 * @module components/weekly-analytics-content
 */
"use client"

import * as React from "react"
import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Transaction, TransactionCategory } from "@/lib/types"
import { isCompletedStatus } from "@/lib/utils"
import {
  calculateWeeklyMetrics,
  formatWeekDateRange,
  getAvailableWeeks,
  getCurrentWeek,
  getNextWeek,
  getPreviousWeek,
  getWeekEndDate,
  getWeekStartDate,
  getWeekTransactions,
  WeekIdentifier,
} from "@/lib/weekly-utils"
import { getBalanceAtDate } from "@/lib/balance-utils"
import { PeriodBridge } from "@/components/period-bridge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

/**
 * Props for {@link WeeklyAnalyticsContent}.
 * @property transactions - Full transaction list; week filtering is handled internally.
 */
interface WeeklyAnalyticsContentProps {
  transactions: Transaction[]
}

/**
 * Formats a number as INR currency without decimal places.
 * @param amount - Numeric amount in INR.
 * @returns Formatted currency string (e.g. "Rs 12,500").
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/** CSS custom property for the income bar chart colour. */
const CHART_INCOME = "var(--chart-1)"
/** CSS custom property for the expense bar chart colour. */
const CHART_EXPENSE = "var(--chart-5)"

/**
 * Renders a week-by-week analytics dashboard with navigation, charts, and breakdowns.
 * @param transactions - Full transaction list; filtering by week is handled internally.
 */
export function WeeklyAnalyticsContent({ transactions }: WeeklyAnalyticsContentProps) {
  const availableWeeks = useMemo(
    () => getAvailableWeeks(transactions),
    [transactions]
  )

  const [selectedWeek, setSelectedWeek] = React.useState<WeekIdentifier>(
    availableWeeks.length > 0 ? availableWeeks[availableWeeks.length - 1] : getCurrentWeek()
  )

  React.useEffect(() => {
    if (availableWeeks.length > 0) {
      const current = availableWeeks.find(
        (week) => week.year === selectedWeek.year && week.weekNumber === selectedWeek.weekNumber
      )
      if (!current) {
        setSelectedWeek(availableWeeks[availableWeeks.length - 1])
      }
    }
  }, [availableWeeks, selectedWeek])

  const weekTransactions = useMemo(
    () => getWeekTransactions(transactions, selectedWeek.year, selectedWeek.weekNumber),
    [transactions, selectedWeek]
  )

  const weeklyMetrics = useMemo(
    () => calculateWeeklyMetrics(transactions, selectedWeek.year, selectedWeek.weekNumber),
    [transactions, selectedWeek]
  )

  const weekStart = getWeekStartDate(selectedWeek.year, selectedWeek.weekNumber)
  const weekEnd = getWeekEndDate(selectedWeek.year, selectedWeek.weekNumber)
  const openingBalance = getBalanceAtDate(
    transactions,
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 1)
  )
  const closingBalance = getBalanceAtDate(transactions, weekEnd)

  const dailyBreakdown = useMemo(() => {
    const days: Record<string, { date: string; income: number; expenses: number }> = {}
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      const key = date.toLocaleDateString("en-CA")
      days[key] = {
        date: date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        income: 0,
        expenses: 0,
      }
    }

    weekTransactions.forEach((t) => {
      const key = new Date(t.date).toLocaleDateString("en-CA")
      if (!days[key] || !isCompletedStatus(t.status)) return
      if (t.type === "income") days[key].income += t.amount
      if (t.type === "expense") days[key].expenses += t.amount
    })

    return Object.values(days)
  }, [weekTransactions, weekStart])

  const topExpenses = useMemo(() => {
    return weekTransactions
      .filter((t) => t.type === "expense" && isCompletedStatus(t.status))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }, [weekTransactions])

  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<TransactionCategory, number>()
    weekTransactions
      .filter((t) => t.type === "expense" && isCompletedStatus(t.status))
      .forEach((t) => {
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount)
      })
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [weekTransactions])

  if (availableWeeks.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground">
        No weekly data available yet. Add transactions to see weekly analytics.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{weeklyMetrics.weekLabel}</h2>
          <p className="text-xs text-muted-foreground">
            {formatWeekDateRange(selectedWeek.year, selectedWeek.weekNumber)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedWeek(getPreviousWeek(selectedWeek))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select
            value={selectedWeek.label}
            onValueChange={(value) => {
              const week = availableWeeks.find((item) => item.label === value)
              if (week) setSelectedWeek(week)
            }}
          >
            <SelectTrigger className="w-[220px] h-9 text-xs">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {availableWeeks.map((week) => (
                <SelectItem key={`${week.year}-${week.weekNumber}`} value={week.label}>
                  <div className="flex items-center gap-2">
                    {week.label}
                    {week.label === getCurrentWeek().label && (
                      <Badge variant="default" className="text-[10px]">Current</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedWeek(getNextWeek(selectedWeek))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PeriodBridge
        title="Week Reference"
        periodLabel={selectedWeek.label}
        openingBalance={openingBalance}
        inflow={weeklyMetrics.totalIncome}
        outflow={weeklyMetrics.totalExpenses}
        closingBalance={closingBalance}
      />

      {/* Unified stat bar */}
      <div className="rounded-xl border border-border/60 bg-card divide-x divide-border/40 grid grid-cols-4">
        <div className="px-5 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Income</p>
          <p className="text-lg font-semibold text-primary tabular-nums mt-0.5">
            {formatCurrency(weeklyMetrics.totalIncome)}
          </p>
          <p className="text-[10px] text-muted-foreground">{weeklyMetrics.incomeTransactionCount} entries</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
          <p className="text-lg font-semibold tabular-nums mt-0.5">
            {formatCurrency(weeklyMetrics.totalExpenses)}
          </p>
          <p className="text-[10px] text-muted-foreground">{weeklyMetrics.expenseTransactionCount} entries</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Net Change</p>
          <p className={`text-lg font-semibold tabular-nums mt-0.5 ${(weeklyMetrics.totalIncome - weeklyMetrics.totalExpenses) >= 0 ? "text-primary" : "text-destructive"}`}>
            {(weeklyMetrics.totalIncome - weeklyMetrics.totalExpenses) >= 0 ? "+" : ""}{formatCurrency(weeklyMetrics.totalIncome - weeklyMetrics.totalExpenses)}
          </p>
          <p className="text-[10px] text-muted-foreground">Balance change this week</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Avg Daily</p>
          <p className="text-lg font-semibold tabular-nums mt-0.5">
            {formatCurrency(weeklyMetrics.averageDailySpend)}
          </p>
          <p className="text-[10px] text-muted-foreground">{weeklyMetrics.daysInWeek} active days</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Daily Breakdown</h3>
            <p className="text-xs text-muted-foreground">Income vs expenses by day</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyBreakdown}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: 10,
                  fontSize: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                }}
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              />
              <Bar dataKey="income" fill={CHART_INCOME} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="expenses" fill={CHART_EXPENSE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_INCOME }} />
              Income
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_EXPENSE }} />
              Expenses
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Top Categories</h3>
            <p className="text-xs text-muted-foreground">Highest weekly spend areas</p>
          </div>
          <div className="space-y-3">
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <span className="text-sm">{item.category}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No expenses this week.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Top Expenses</h3>
          <p className="text-xs text-muted-foreground">Largest transactions this week</p>
        </div>
        <div className="space-y-3">
          {topExpenses.length > 0 ? (
            topExpenses.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{txn.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {txn.merchant} · {txn.category}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(txn.amount)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No expenses this week.</p>
          )}
        </div>
      </div>
    </div>
  )
}
