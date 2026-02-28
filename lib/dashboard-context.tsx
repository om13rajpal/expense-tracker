"use client"

/**
 * DashboardDataProvider — shared context for transaction-dependent widgets.
 * Extracts computed metrics from the dashboard page so widgets can consume
 * them without redundant fetches or prop drilling.
 * @module lib/dashboard-context
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import type { Transaction } from "@/lib/types"
import {
  calculateMonthlyMetrics,
  getCurrentMonth,
  getMonthTransactions,
  type MonthlyMetrics,
} from "@/lib/monthly-utils"
import { calculateCategoryBreakdown } from "@/lib/analytics"
import type { CategoryBreakdown } from "@/lib/types"

/* ─── Daily Summary ─── */

export interface DailySummary {
  todaySpent: number
  remainingDays: number
  dailyBudget: number
  isToday: boolean
  dateLabel: string
  daysElapsed: number
  totalDaysInMonth: number
  savingsRate: number
  projectedEndBalance: number
}

/* ─── Context Shape ─── */

export interface DashboardData {
  transactions: Transaction[]
  monthTransactions: Transaction[]
  monthlyMetrics: MonthlyMetrics | null
  categoryBreakdown: CategoryBreakdown[]
  monthlyTrendData: { name: string; income: number; expenses: number }[]
  sparklineData: { balance: number }[]
  dailySummary: DailySummary
  totalIncome: number
  totalExpenses: number
  closingBalance: number
  netSaved: number
  year: number
  month: number
  isLoading: boolean
}

const DashboardDataContext = createContext<DashboardData | null>(null)

export function useDashboardData(): DashboardData {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) throw new Error("useDashboardData must be used within DashboardDataProvider")
  return ctx
}

/* ─── Provider ─── */

export function DashboardDataProvider({
  children,
  transactions,
  isLoading,
}: {
  children: ReactNode
  transactions: Transaction[]
  isLoading: boolean
}) {
  const { year, month } = getCurrentMonth()
  const monthTransactions = getMonthTransactions(transactions, year, month)

  const monthlyMetrics = transactions.length > 0
    ? calculateMonthlyMetrics(transactions, year, month) : null

  const categoryBreakdown = calculateCategoryBreakdown(monthTransactions)

  const totalIncome = monthlyMetrics?.totalIncome || 0
  const totalExpenses = monthlyMetrics?.totalExpenses || 0
  const closingBalance = monthlyMetrics?.closingBalance || 0
  const netSaved = totalIncome - totalExpenses

  const monthlyTrendData = useMemo(() => {
    if (transactions.length === 0) return []
    const data: { name: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      let m = month - i
      let y = year
      while (m < 1) { m += 12; y -= 1 }
      const metrics = calculateMonthlyMetrics(transactions, y, m)
      const shortLabel = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" })
      data.push({ name: shortLabel, income: metrics.totalIncome, expenses: metrics.totalExpenses })
    }
    return data
  }, [transactions, year, month])

  const sparklineData = useMemo(() => {
    if (transactions.length === 0) return []
    const data: { balance: number }[] = []
    for (let i = 5; i >= 0; i--) {
      let m = month - i
      let y = year
      while (m < 1) { m += 12; y -= 1 }
      const metrics = calculateMonthlyMetrics(transactions, y, m)
      data.push({ balance: metrics.closingBalance })
    }
    return data
  }, [transactions, year, month])

  const dailySummary = useMemo((): DailySummary => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayTxns = monthTransactions.filter(
      t => new Date(t.date).toISOString().slice(0, 10) === todayStr
    ).filter(t => t.type === "expense")

    let displayTxns = todayTxns
    let isToday = true
    let lastDate = todayStr

    if (todayTxns.length === 0) {
      const expensesByDate = new Map<string, typeof monthTransactions>()
      for (const t of monthTransactions) {
        if (t.type !== "expense") continue
        const d = new Date(t.date).toISOString().slice(0, 10)
        if (!expensesByDate.has(d)) expensesByDate.set(d, [])
        expensesByDate.get(d)!.push(t)
      }
      const sortedDates = [...expensesByDate.keys()].sort().reverse()
      if (sortedDates.length > 0) {
        lastDate = sortedDates[0]
        displayTxns = expensesByDate.get(lastDate)!
        isToday = false
      }
    }

    const todaySpent = displayTxns.reduce((sum, t) => sum + t.amount, 0)
    const totalDaysInMonth = new Date(year, month, 0).getDate()
    const daysElapsed = Math.max(1, new Date().getDate())
    const remainingDays = Math.max(0, totalDaysInMonth - daysElapsed)
    const dailyBudget = remainingDays > 0 ? (totalIncome - totalExpenses) / remainingDays : 0
    const savingsRate = totalIncome > 0 ? Math.round((netSaved / totalIncome) * 100) : 0
    const projectedEndBalance = closingBalance + (dailyBudget * remainingDays)

    const dateLabel = isToday
      ? "Today"
      : new Date(lastDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

    return { todaySpent, remainingDays, dailyBudget, isToday, dateLabel, daysElapsed, totalDaysInMonth, savingsRate, projectedEndBalance }
  }, [monthTransactions, totalIncome, totalExpenses, netSaved, closingBalance, year, month])

  const value: DashboardData = {
    transactions,
    monthTransactions,
    monthlyMetrics,
    categoryBreakdown,
    monthlyTrendData,
    sparklineData,
    dailySummary,
    totalIncome,
    totalExpenses,
    closingBalance,
    netSaved,
    year,
    month,
    isLoading,
  }

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  )
}
