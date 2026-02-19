"use client"

import * as React from "react"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  IconAlertCircle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconChartBar,
  IconRefresh,
  IconSparkles,
  IconWallet,
  IconScale,
} from "@tabler/icons-react"

import { stagger, fadeUp, fadeUpSmall, numberPop, listItem } from "@/lib/motion"
import { getPartialMonthInfo } from "@/lib/edge-cases"
import { ContextBanner } from "@/components/context-banner"
import { useTransactions } from "@/hooks/use-transactions"
import { useAuth } from "@/hooks/use-auth"

import {
  calculateMonthlyMetrics,
  getCurrentMonth,
  getMonthTransactions,
} from "@/lib/monthly-utils"
import { calculateCategoryBreakdown } from "@/lib/analytics"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { AiInsightsWidget } from "@/components/ai-insights-widget"
import { SyncButtonCompact } from "@/components/sync-button"
import { SectionErrorBoundary } from "@/components/error-boundary"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatINR as formatCurrency } from "@/lib/format"

/* ─── Category color palette ─── */
const CATEGORY_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
]

const CATEGORY_BAR_GRADIENTS = [
  "from-emerald-500/80 to-emerald-500/40",
  "from-blue-500/80 to-blue-500/40",
  "from-amber-500/80 to-amber-500/40",
  "from-rose-500/80 to-rose-500/40",
  "from-violet-500/80 to-violet-500/40",
  "from-cyan-500/80 to-cyan-500/40",
  "from-orange-500/80 to-orange-500/40",
  "from-pink-500/80 to-pink-500/40",
]

/* ─── Stat card config ─── */
const STAT_CONFIG = [
  {
    key: "opening",
    label: "Opening Balance",
    icon: IconScale,
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "border-t-blue-500/40",
  },
  {
    key: "income",
    label: "Income",
    icon: IconArrowUpRight,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "border-t-emerald-500/40",
  },
  {
    key: "expenses",
    label: "Expenses",
    icon: IconArrowDownRight,
    iconBg: "bg-rose-500/10 dark:bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
    accent: "border-t-rose-500/40",
  },
  {
    key: "balance",
    label: "Current Balance",
    icon: IconWallet,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "border-t-amber-500/40",
  },
] as const

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    syncFromSheets,
    refresh,
  } = useTransactions()

  // Track client-side mount to prevent SSR hydration animation glitch.
  // On SSR, initial="hidden" sets children to opacity:0 which can persist
  // if the animation doesn't trigger during hydration. By using initial={false}
  // on the first render, content is immediately visible. After mount,
  // subsequent renders will properly animate.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const { year, month } = getCurrentMonth()
  const monthTransactions = getMonthTransactions(transactions, year, month)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const monthlyMetrics = transactions.length > 0
    ? calculateMonthlyMetrics(transactions, year, month)
    : null

  const categoryBreakdown = calculateCategoryBreakdown(monthTransactions)

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

  const isLoading = authLoading || transactionsLoading
  const totalIncome = monthlyMetrics?.totalIncome || 0
  const totalExpenses = monthlyMetrics?.totalExpenses || 0
  const openingBalance = monthlyMetrics?.openingBalance || 0
  const closingBalance = monthlyMetrics?.closingBalance || 0

  const VISIBLE_CATEGORIES = 4
  const visibleCategories = categoryBreakdown.slice(0, VISIBLE_CATEGORIES)
  const hiddenCount = Math.max(0, categoryBreakdown.length - VISIBLE_CATEGORIES)

  const statValues = [
    formatCurrency(openingBalance),
    formatCurrency(totalIncome),
    formatCurrency(totalExpenses),
    formatCurrency(closingBalance),
  ]

  const statValueColors = [
    "text-blue-600 dark:text-blue-400",
    totalIncome === 0 ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400",
    totalExpenses === 0 ? "text-muted-foreground" : "text-rose-600 dark:text-rose-400",
    "",
  ]

  /* ─── Smart Daily Summary ─── */
  const dailySummary = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayTxns = monthTransactions.filter(
      t => new Date(t.date).toISOString().slice(0, 10) === todayStr
    ).filter(t => t.type === "expense")

    let displayTxns = todayTxns
    let isToday = true
    let lastDate = todayStr

    // If no spending today, find the most recent day with expenses
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

    const topCategory = displayTxns.length > 0
      ? Object.entries(
          displayTxns.reduce<Record<string, number>>((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount
            return acc
          }, {})
        )
          .sort((a, b) => b[1] - a[1])[0]?.[0] || ""
      : ""

    const budgetRemaining = totalIncome - totalExpenses
    const totalDaysInMonth = new Date(year, month, 0).getDate()
    const daysElapsed = Math.max(1, new Date().getDate())
    const remainingDays = Math.max(0, totalDaysInMonth - daysElapsed)
    const dailyBudget = remainingDays > 0 ? budgetRemaining / remainingDays : 0

    // Format the date label for display (e.g., "Feb 17")
    const dateLabel = isToday
      ? ""
      : new Date(lastDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

    return { todaySpent, topCategory, budgetRemaining, remainingDays, dailyBudget, isToday, dateLabel }
  }, [monthTransactions, totalIncome, totalExpenses, year, month])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title="Dashboard"
          actions={
            <SyncButtonCompact onSync={async () => { await syncFromSheets(false) }} />
          }
        />
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <div className="@container/main flex flex-1 flex-col gap-5 p-4 md:p-6">
            {isLoading ? (
              <DashboardLoadingSkeleton />
            ) : transactionsError ? (
              <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] gap-4">
                <IconAlertCircle className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Failed to load data</h3>
                  <p className="text-sm text-muted-foreground mt-1">{transactionsError}</p>
                </div>
                <Button variant="outline" onClick={() => refresh()}>
                  <IconRefresh className="mr-2 h-4 w-4" /> Try Again
                </Button>
              </div>
            ) : (
              <motion.div variants={stagger} initial={mounted ? "hidden" : false} animate="show" className="flex flex-col gap-5">
                {(() => {
                  const partialInfo = getPartialMonthInfo(monthTransactions, year, month)
                  return partialInfo.isPartial ? <ContextBanner variant="info" title={partialInfo.message} /> : null
                })()}

                {/* ─── 1. Stat Bar (full width) ─── */}
                <motion.div
                  variants={fadeUp}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3 overflow-hidden"
                >
                  {STAT_CONFIG.map((stat, i) => {
                    const Icon = stat.icon
                    return (
                      <motion.div
                        key={stat.key}
                        variants={fadeUpSmall}
                        className={`card-elevated rounded-xl bg-card border-t-2 ${stat.accent} p-4 flex items-start gap-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:scale-[1.01]`}
                      >
                        <div className={`flex items-center justify-center h-10 w-10 rounded-xl ${stat.iconBg} shrink-0`}>
                          <Icon className={`h-5 w-5 ${stat.iconColor}`} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                            {stat.label}
                          </p>
                          <motion.p
                            variants={numberPop}
                            className={`text-base sm:text-xl font-bold tabular-nums truncate ${statValueColors[i]}`}
                          >
                            {statValues[i]}
                          </motion.p>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>

                {/* ─── 2. Today's Pulse + AI Highlights (side by side) ─── */}
                <motion.div variants={fadeUp} className="grid gap-5 lg:grid-cols-2 items-start">
                  {/* Today's Pulse */}
                  <div className="card-elevated rounded-xl bg-card p-5 flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex items-center gap-5">
                      {/* Circular progress ring */}
                      {(() => {
                        const effectiveDailyLimit = totalIncome > 0
                          ? totalIncome / new Date(year, month, 0).getDate()
                          : 0
                        const spentPct = effectiveDailyLimit > 0
                          ? Math.min((dailySummary.todaySpent / effectiveDailyLimit) * 100, 100)
                          : 0
                        const ringSize = 72
                        const strokeWidth = 6
                        const radius = (ringSize - strokeWidth) / 2
                        const circumference = 2 * Math.PI * radius
                        const strokeDashoffset = circumference * (1 - spentPct / 100)
                        const ringColor = spentPct >= 100
                          ? "#f43f5e"
                          : spentPct >= 80
                            ? "#f59e0b"
                            : "#10b981"

                        return (
                          <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
                            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                              <circle
                                cx={ringSize / 2}
                                cy={ringSize / 2}
                                r={radius}
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth={strokeWidth}
                                strokeOpacity={0.3}
                              />
                              <motion.circle
                                cx={ringSize / 2}
                                cy={ringSize / 2}
                                r={radius}
                                fill="none"
                                stroke={ringColor}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-sm font-bold tabular-nums" style={{ color: ringColor }}>
                                {Math.round(spentPct)}%
                              </span>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Text details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          {dailySummary.isToday ? "Today\u2019s Spending" : `Last: ${dailySummary.dateLabel}`}
                        </p>
                        <p className="text-lg font-bold tabular-nums text-foreground">
                          {formatCurrency(dailySummary.todaySpent)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dailySummary.todaySpent > 0 && dailySummary.topCategory
                            ? `Mostly on ${dailySummary.topCategory}`
                            : "No spending recorded this month"}
                        </p>
                      </div>

                      {/* Right stats */}
                      <div className="hidden sm:flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Daily Budget</p>
                          <p className="text-sm font-semibold tabular-nums">{formatCurrency(dailySummary.dailyBudget)}</p>
                        </div>
                        <div className="h-8 w-px bg-border/40" />
                        <div className="text-right">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Days Left</p>
                          <p className="text-sm font-semibold tabular-nums">{dailySummary.remainingDays}</p>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Budget Progress */}
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Budget Usage</p>
                        <span className="text-xs font-semibold tabular-nums">
                          {totalIncome > 0 ? `${Math.min(Math.round((totalExpenses / totalIncome) * 100), 999)}%` : "—"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${totalExpenses > totalIncome ? "bg-rose-500" : totalExpenses > totalIncome * 0.8 ? "bg-amber-500" : "bg-emerald-500"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0}%` }}
                          transition={{ delay: 0.4, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Income</p>
                          <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Spent</p>
                          <p className="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(totalExpenses)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Saved</p>
                          <p className={`text-sm font-semibold tabular-nums ${totalIncome - totalExpenses >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {formatCurrency(totalIncome - totalExpenses)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Link to Budget page */}
                    <Link
                      href="/budget"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-3"
                    >
                      View budget details &rarr;
                    </Link>
                  </div>

                  {/* AI Highlights */}
                  <div className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <IconSparkles className="size-4 text-primary" />
                        AI Highlights
                      </h3>
                      <Link href="/ai?tab=reports" className="text-xs text-primary hover:underline">
                        View all
                      </Link>
                    </div>
                    <div className="space-y-2">
                      <AiInsightsWidget compact />
                      <Link
                        href="/ai?tab=chat"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-2"
                      >
                        Chat with AI Assistant &rarr;
                      </Link>
                    </div>
                  </div>
                </motion.div>

                {/* ─── 3. Spending Breakdown + Monthly Trend (side by side) ─── */}
                <motion.div variants={fadeUp} className="grid gap-5 lg:grid-cols-2">
                  {/* Spending Breakdown */}
                  <div className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500/15 to-purple-500/15">
                          <IconChartBar className="h-4 w-4 text-blue-500" />
                        </div>
                        <h3 className="text-sm font-semibold">Spending Breakdown</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground tabular-nums">{categoryBreakdown.length} categories</span>
                        <Link href="/money?tab=analytics" className="text-xs text-primary hover:underline">View all</Link>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {visibleCategories.map((cat, i) => {
                        const anim = listItem(i)
                        return (
                          <motion.div
                            key={cat.category}
                            initial={anim.initial}
                            animate={anim.animate}
                            transition={anim.transition}
                            className="group rounded-lg px-2.5 py-2 -mx-2.5 hover:bg-muted/40 transition-colors cursor-default"
                          >
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <div className="flex items-center gap-2.5">
                                <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} shrink-0`} />
                                <span className="font-medium text-foreground/90">{cat.category}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold tabular-nums">{formatCurrency(cat.amount)}</span>
                                <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-10 text-right bg-muted/50 px-1.5 py-0.5 rounded-md">
                                  {cat.percentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                              <motion.div
                                className={`h-2 rounded-full bg-gradient-to-r ${CATEGORY_BAR_GRADIENTS[i % CATEGORY_BAR_GRADIENTS.length]}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(cat.percentage, 1)}%` }}
                                transition={{ delay: 0.15 + i * 0.04, duration: 0.45, ease: [0, 0, 0.2, 1] as const }}
                              />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {hiddenCount > 0 && (
                      <p className="mt-4 text-xs text-muted-foreground pl-2.5">
                        +{hiddenCount} more {hiddenCount === 1 ? "category" : "categories"}
                      </p>
                    )}

                    {visibleCategories.length === 0 && (
                      <p className="text-sm text-muted-foreground py-8 text-center">No expenses recorded this month.</p>
                    )}
                  </div>

                  {/* Monthly Trend */}
                  <SectionErrorBoundary name="monthly-trend">
                    <div className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500/15 to-amber-500/15">
                            <IconChartBar className="h-4 w-4 text-emerald-500" />
                          </div>
                          <h3 className="text-sm font-semibold">Monthly Trend</h3>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Link href="/money?tab=analytics" className="text-xs text-primary hover:underline hidden sm:inline">View all</Link>
                          <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-[3px] bg-chart-1" />
                            <span className="text-[11px] text-muted-foreground">Income</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-[3px] bg-chart-5" />
                            <span className="text-[11px] text-muted-foreground">Expenses</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>

                      {monthlyTrendData.some((d) => d.income > 0 || d.expenses > 0) ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={monthlyTrendData} barGap={6}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={55} />
                            <Tooltip
                              formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "Income" : "Expenses"]}
                              contentStyle={{
                                borderRadius: 10,
                                fontSize: 12,
                                border: "1px solid var(--border)",
                                background: "var(--card)",
                                color: "var(--card-foreground)",
                                boxShadow: "0 4px 16px oklch(0 0 0 / 8%)",
                              }}
                              cursor={{ fill: "var(--muted)", opacity: 0.3, radius: 6 }}
                            />
                            <Bar dataKey="income" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="expenses" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                          No data available.
                        </div>
                      )}
                    </div>
                  </SectionErrorBoundary>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


/* ─── Loading Skeleton ─── */
function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-5">
      {/* Stat Bar skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated rounded-xl bg-card p-4 flex items-start gap-3.5 min-w-0">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ))}
      </div>
      {/* Pulse + AI Highlights skeleton */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card-elevated rounded-xl bg-card p-5 space-y-3">
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="card-elevated rounded-xl bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      {/* Spending + Trend skeleton */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card-elevated rounded-xl bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /></div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="card-elevated rounded-xl bg-card p-5">
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
