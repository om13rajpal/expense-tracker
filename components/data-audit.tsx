/**
 * Data quality audit dashboard that computes descriptive statistics,
 * merchant rankings, temporal aggregates, and balance anomaly detection
 * from raw transaction data.
 * @module components/data-audit
 */
"use client"

import * as React from "react"
import { useMemo } from "react"

import { Transaction } from "@/lib/types"
import { getWeekNumber, getWeekYear } from "@/lib/weekly-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** Abbreviated day-of-week labels for the weekly distribution table. */
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Formats a number as INR currency with two decimal places. */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Computes a percentile value from an array using linear interpolation.
 * @param values - Numeric array to compute the percentile from.
 * @param p      - Percentile to compute (0-1, e.g. 0.5 for median).
 */
function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (sorted.length - 1) * p
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  const weight = idx - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

/**
 * Computes descriptive statistics (total, average, median, P25, P75, min, max)
 * for an array of numeric amounts.
 */
function summarizeAmounts(values: number[]) {
  if (!values.length) {
    return { total: 0, average: 0, median: 0, p25: 0, p75: 0, min: 0, max: 0 }
  }
  const total = values.reduce((sum, v) => sum + v, 0)
  return {
    total,
    average: total / values.length,
    median: percentile(values, 0.5),
    p25: percentile(values, 0.25),
    p75: percentile(values, 0.75),
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

/** Amount histogram bucket definitions for the income/expense distribution table. */
const amountBuckets = [
  { label: "0-100", min: 0, max: 100 },
  { label: "100-500", min: 100, max: 500 },
  { label: "500-1k", min: 500, max: 1000 },
  { label: "1k-5k", min: 1000, max: 5000 },
  { label: "5k-10k", min: 5000, max: 10000 },
  { label: "10k-25k", min: 10000, max: 25000 },
  { label: "25k-50k", min: 25000, max: 50000 },
  { label: "50k-100k", min: 50000, max: 100000 },
  { label: "100k+", min: 100000, max: Infinity },
]

/**
 * Renders a comprehensive data audit view: coverage, amount stats, balance stats,
 * top merchants, daily/weekly/monthly aggregates, and anomaly detection.
 * @param transactions - Full transaction array to audit.
 */
export function DataAudit({ transactions }: { transactions: Transaction[] }) {
  const audit = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateDiff !== 0) return dateDiff
      const aBalance = a.balance ?? 0
      const bBalance = b.balance ?? 0
      return aBalance - bBalance
    })

    const income = sorted.filter((t) => t.type === "income")
    const expenses = sorted.filter((t) => t.type === "expense")

    const dateValues = sorted.map((t) => new Date(t.date)).filter((d) => !isNaN(d.getTime()))
    const dateRange = {
      start: dateValues.length ? new Date(Math.min(...dateValues.map((d) => d.getTime()))) : null,
      end: dateValues.length ? new Date(Math.max(...dateValues.map((d) => d.getTime()))) : null,
    }

    const merchantCounts = new Map<string, number>()
    const merchantExpenseTotals = new Map<string, number>()
    const merchantIncomeTotals = new Map<string, number>()

    const dailyMap = new Map<string, { count: number; debit: number; credit: number }>()
    const weeklyMap = new Map<string, { count: number; debit: number; credit: number }>()
    const monthlyMap = new Map<string, { count: number; debit: number; credit: number }>()
    const dayOfWeek = new Map<string, number>()

    const balances: number[] = []
    const balanceChanges: number[] = []
    const anomalies: Array<{ date: string; expected: number; actual: number; delta: number; description: string }> = []

    let previousBalance: number | null = null

    sorted.forEach((t) => {
      const date = new Date(t.date)
      const dateKey = date.toISOString().split("T")[0]
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const weekKey = `${getWeekYear(date)}-W${String(getWeekNumber(date)).padStart(2, "0")}`

      const merchant = t.merchant?.trim() || "Unknown"
      merchantCounts.set(merchant, (merchantCounts.get(merchant) || 0) + 1)

      if (t.type === "expense") {
        merchantExpenseTotals.set(merchant, (merchantExpenseTotals.get(merchant) || 0) + t.amount)
      }
      if (t.type === "income") {
        merchantIncomeTotals.set(merchant, (merchantIncomeTotals.get(merchant) || 0) + t.amount)
      }

      const daily = dailyMap.get(dateKey) || { count: 0, debit: 0, credit: 0 }
      daily.count += 1
      if (t.type === "expense") daily.debit += t.amount
      if (t.type === "income") daily.credit += t.amount
      dailyMap.set(dateKey, daily)

      const weekly = weeklyMap.get(weekKey) || { count: 0, debit: 0, credit: 0 }
      weekly.count += 1
      if (t.type === "expense") weekly.debit += t.amount
      if (t.type === "income") weekly.credit += t.amount
      weeklyMap.set(weekKey, weekly)

      const monthly = monthlyMap.get(monthKey) || { count: 0, debit: 0, credit: 0 }
      monthly.count += 1
      if (t.type === "expense") monthly.debit += t.amount
      if (t.type === "income") monthly.credit += t.amount
      monthlyMap.set(monthKey, monthly)

      const dayLabel = dayNames[date.getDay()]
      dayOfWeek.set(dayLabel, (dayOfWeek.get(dayLabel) || 0) + 1)

      if (typeof t.balance === "number") {
        balances.push(t.balance)
        if (previousBalance !== null) {
          const expected = previousBalance + (t.type === "income" ? t.amount : -t.amount)
          const delta = t.balance - expected
          if (Math.abs(delta) > 1) {
            anomalies.push({
              date: dateKey,
              expected,
              actual: t.balance,
              delta,
              description: t.description,
            })
          }
          balanceChanges.push(t.balance - previousBalance)
        }
        previousBalance = t.balance
      }
    })

    const incomeAmounts = income.map((t) => t.amount)
    const expenseAmounts = expenses.map((t) => t.amount)

    const incomeStats = summarizeAmounts(incomeAmounts)
    const expenseStats = summarizeAmounts(expenseAmounts)
    const balanceStats = summarizeAmounts(balances)

    const bucketize = (values: number[]) =>
      amountBuckets.map((bucket) => ({
        label: bucket.label,
        count: values.filter((v) => v >= bucket.min && v < bucket.max).length,
      }))

    const topMerchantsByCount = Array.from(merchantCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const topMerchantsByExpense = Array.from(merchantExpenseTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const topMerchantsByIncome = Array.from(merchantIncomeTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const dailyRows = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, stats]) => ({ date, ...stats }))

    const weeklyRows = Array.from(weeklyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, stats]) => ({ week, ...stats }))

    const monthlyRows = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, stats]) => ({ month, ...stats }))

    const dayOfWeekRows = dayNames.map((day) => ({ day, count: dayOfWeek.get(day) || 0 }))

    const duplicates = {
      ids: transactions.length - new Set(transactions.map((t) => t.id)).size,
    }

    return {
      sorted,
      dateRange,
      counts: {
        total: transactions.length,
        income: income.length,
        expenses: expenses.length,
        merchants: merchantCounts.size,
        accounts: new Set(transactions.map((t) => t.account)).size,
      },
      incomeStats,
      expenseStats,
      balanceStats,
      incomeAmounts,
      expenseAmounts,
      balanceChanges,
      topMerchantsByCount,
      topMerchantsByExpense,
      topMerchantsByIncome,
      dailyRows,
      weeklyRows,
      monthlyRows,
      dayOfWeekRows,
      buckets: {
        income: bucketize(incomeAmounts),
        expense: bucketize(expenseAmounts),
      },
      anomalies,
      duplicates,
    }
  }, [transactions])

  const earliest = audit.dateRange.start?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  const latest = audit.dateRange.end?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="space-y-6">
      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Data Coverage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-2xl font-semibold">{audit.counts.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date Range</p>
            <p className="text-sm font-medium">{earliest} → {latest}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Merchants</p>
            <p className="text-2xl font-semibold">{audit.counts.merchants}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accounts</p>
            <p className="text-2xl font-semibold">{audit.counts.accounts}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Amount Statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {([
            { label: "Income", stats: audit.incomeStats },
            { label: "Expenses", stats: audit.expenseStats },
          ] as const).map((block) => (
            <div key={block.label} className="rounded-xl border border-border/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{block.label}</p>
                <Badge variant="outline">{block.label === "Income" ? audit.counts.income : audit.counts.expenses} rows</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>Total: {formatCurrency(block.stats.total)}</div>
                <div>Average: {formatCurrency(block.stats.average)}</div>
                <div>Median: {formatCurrency(block.stats.median)}</div>
                <div>P25/P75: {formatCurrency(block.stats.p25)} / {formatCurrency(block.stats.p75)}</div>
                <div>Min: {formatCurrency(block.stats.min)}</div>
                <div>Max: {formatCurrency(block.stats.max)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Balance Statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div>Average: {formatCurrency(audit.balanceStats.average)}</div>
          <div>Median: {formatCurrency(audit.balanceStats.median)}</div>
          <div>P25/P75: {formatCurrency(audit.balanceStats.p25)} / {formatCurrency(audit.balanceStats.p75)}</div>
          <div>Min: {formatCurrency(audit.balanceStats.min)}</div>
          <div>Max: {formatCurrency(audit.balanceStats.max)}</div>
          <div>Recorded balances: {audit.balanceChanges.length + 1}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Top Merchants by Count</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {audit.topMerchantsByCount.map(([merchant, count]) => (
              <div key={merchant} className="flex items-center justify-between text-sm">
                <span className="truncate">{merchant}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Top Merchants by Spend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {audit.topMerchantsByExpense.map(([merchant, total]) => (
              <div key={merchant} className="flex items-center justify-between text-sm">
                <span className="truncate">{merchant}</span>
                <span className="font-medium text-destructive">{formatCurrency(total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Top Merchants by Income</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {audit.topMerchantsByIncome.map(([merchant, total]) => (
              <div key={merchant} className="flex items-center justify-between text-sm">
                <span className="truncate">{merchant}</span>
                <span className="font-medium text-lime-600 dark:text-lime-400">{formatCurrency(total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Day of Week Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {audit.dayOfWeekRows.map((row) => (
              <div key={row.day} className="flex items-center justify-between text-sm">
                <span>{row.day}</span>
                <Badge variant="outline">{row.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Amount Buckets</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Income</p>
              {audit.buckets.income.map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between text-xs">
                  <span>{bucket.label}</span>
                  <Badge variant="outline">{bucket.count}</Badge>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Expenses</p>
              {audit.buckets.expense.map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between text-xs">
                  <span>{bucket.label}</span>
                  <Badge variant="outline">{bucket.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Daily Aggregates</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.dailyRows.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell className="text-destructive">{formatCurrency(row.debit)}</TableCell>
                  <TableCell className="text-lime-600 dark:text-lime-400">{formatCurrency(row.credit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Weekly Aggregates</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.weeklyRows.map((row) => (
                <TableRow key={row.week}>
                  <TableCell>{row.week}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell className="text-destructive">{formatCurrency(row.debit)}</TableCell>
                  <TableCell className="text-lime-600 dark:text-lime-400">{formatCurrency(row.credit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Monthly Aggregates</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.monthlyRows.map((row) => (
                <TableRow key={row.month}>
                  <TableCell>{row.month}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell className="text-destructive">{formatCurrency(row.debit)}</TableCell>
                  <TableCell className="text-lime-600 dark:text-lime-400">{formatCurrency(row.credit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Duplicates & Anomalies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">Duplicate transaction IDs: {audit.duplicates.ids}</div>
          <div className="text-xs text-muted-foreground">
            Balance anomalies compare consecutive records (date order). Multiple same-day transactions can create variance.
          </div>
          <div className="max-h-[320px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.anomalies.length > 0 ? (
                  audit.anomalies.map((item, idx) => (
                    <TableRow key={`${item.date}-${idx}`}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{formatCurrency(item.expected)}</TableCell>
                      <TableCell>{formatCurrency(item.actual)}</TableCell>
                      <TableCell className={item.delta >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive"}>
                        {formatCurrency(item.delta)}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No anomalies detected.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Raw Sheet Fields</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Fields like `reference_no`, `hash`, and `imported_at` are not exposed by the current transaction model.
          To surface them here, we would add them to the API and Transaction type.
        </CardContent>
      </Card>
    </div>
  )
}
