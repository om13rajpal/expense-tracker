"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
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
  IconFlame,
  IconReceipt2,
  IconRefresh,
  IconRepeat,
  IconSparkles,
  IconStar,
  IconTarget,
  IconUsers,
  IconWallet,
  IconTrendingUp,
  IconCalendar,
} from "@tabler/icons-react"

import { stagger, fadeUpSmall, numberPop, spring } from "@/lib/motion"
import { BentoTile } from "@/components/ui/bento-tile"
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
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatINR as formatCurrency } from "@/lib/format"

/* ─── Constants ─── */

const CATEGORY_COLORS = [
  "bg-lime-400", "bg-lime-500/80", "bg-lime-600/60", "bg-lime-700/40",
]
const CATEGORY_BAR_GRADIENTS = [
  "from-lime-400/80 to-lime-400/20",
  "from-lime-500/60 to-lime-500/15",
  "from-lime-600/50 to-lime-600/10",
  "from-lime-700/40 to-lime-700/10",
]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

/* ─── Animated Counter Hook ─── */

function useAnimatedValue(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(0)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      setValue(target)
      prevTarget.current = target
      return
    }
    const from = prevTarget.current
    prevTarget.current = target
    const start = performance.now()
    let rafId: number
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])

  return value
}

/* ─── Sparkline Component ─── */

function BalanceSparkline({ data }: { data: { balance: number }[] }) {
  if (data.length < 2) return null
  const values = data.map(d => d.balance)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 240
  const h = 80
  const pad = 4

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = pad + (h - 2 * pad) * (1 - (v - min) / range)
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  const trend = values[values.length - 1] >= values[0]
  const color = trend ? "#a3e635" : "#fb923c"

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="sparkGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaPath} fill="url(#sparkArea)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#sparkGlow)" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill={color} filter="url(#sparkGlow)" />
    </svg>
  )
}

/* ─── Main Dashboard ─── */

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

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { year, month } = getCurrentMonth()
  const monthTransactions = getMonthTransactions(transactions, year, month)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, authLoading, router])

  const monthlyMetrics = transactions.length > 0
    ? calculateMonthlyMetrics(transactions, year, month) : null

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

  // Sparkline data: cumulative balance over 6 months
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

  const isLoading = authLoading || transactionsLoading
  const totalIncome = monthlyMetrics?.totalIncome || 0
  const totalExpenses = monthlyMetrics?.totalExpenses || 0
  const closingBalance = monthlyMetrics?.closingBalance || 0
  const netSaved = totalIncome - totalExpenses

  const animatedBalance = useAnimatedValue(closingBalance)
  const animatedIncome = useAnimatedValue(totalIncome)
  const animatedExpenses = useAnimatedValue(totalExpenses)

  const VISIBLE_CATEGORIES = 4
  const visibleCategories = categoryBreakdown.slice(0, VISIBLE_CATEGORIES)
  const hiddenCount = Math.max(0, categoryBreakdown.length - VISIBLE_CATEGORIES)

  /* Daily summary */
  const dailySummary = useMemo(() => {
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
          actions={<SyncButtonCompact onSync={async () => { await syncFromSheets(false) }} />}
        />
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto min-h-0 relative">
          {/* Ambient background glow orbs — cinematic aurora (dark only) */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
            <div className="absolute top-[40%] left-[30%] w-[600px] h-[600px] rounded-full bg-lime-500/[0.02] blur-[250px]" />
          </div>
          <div className="flex flex-1 flex-col p-3 md:p-4 relative z-[1]">
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
              <motion.div
                variants={stagger}
                initial={mounted ? "hidden" : false}
                animate="show"
                className="grid grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-auto"
              >
                {(() => {
                  const partialInfo = getPartialMonthInfo(monthTransactions, year, month)
                  return partialInfo.isPartial ? (
                    <div className="col-span-2 lg:col-span-4">
                      <ContextBanner variant="info" title={partialInfo.message} />
                    </div>
                  ) : null
                })()}

                {/* ━━━ HERO: Net Position (2x2) ━━━ */}
                <BentoTile
                  className="col-span-2 row-span-2 min-h-[320px]"
                  gradient="from-lime-500/[0.07] via-lime-500/[0.02] to-transparent"
                >
                  <div className="p-6 sm:p-7 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-base font-semibold text-muted-foreground">
                        {getGreeting()}, <span className="text-primary">Om</span>
                      </p>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center -mt-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                        Current Balance
                      </p>
                      <motion.p
                        variants={numberPop}
                        className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums"
                        style={{ filter: "drop-shadow(0 0 50px rgba(163,230,53,0.15))" }}
                      >
                        {formatCurrency(animatedBalance)}
                      </motion.p>

                      {/* Sparkline */}
                      <div className="mt-3 -mx-1">
                        <BalanceSparkline data={sparklineData} />
                      </div>
                    </div>

                    {/* Bottom: Income / Expenses / Saved */}
                    <div className="grid grid-cols-3 gap-4 pt-4 mt-auto border-t border-border">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="size-2 rounded-full bg-lime-600 dark:bg-lime-400" />
                          <span className="text-[11px] text-muted-foreground font-medium">Income</span>
                        </div>
                        <p className="text-base font-bold tabular-nums text-lime-600 dark:text-lime-400">{formatCurrency(animatedIncome)}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="size-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                          <span className="text-[11px] text-muted-foreground font-medium">Expenses</span>
                        </div>
                        <p className="text-base font-bold tabular-nums text-foreground/70">{formatCurrency(animatedExpenses)}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="size-2 rounded-full bg-lime-500 dark:bg-lime-300" />
                          <span className="text-[11px] text-muted-foreground font-medium">Saved</span>
                        </div>
                        <p className={`text-base font-bold tabular-nums ${netSaved >= 0 ? "text-lime-600 dark:text-lime-400" : "text-red-500 dark:text-red-400"}`}>
                          {formatCurrency(netSaved)}
                        </p>
                      </div>
                    </div>
                  </div>
                </BentoTile>

                {/* ━━━ DAILY BUDGET TILE (1x1) ━━━ */}
                <BentoTile
                  gradient="from-lime-500/[0.04] to-transparent"
                  hoverBorder="hover:border-lime-500/15"
                >
                  <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                    {(() => {
                      const effectiveDailyLimit = totalIncome > 0
                        ? totalIncome / new Date(year, month, 0).getDate() : 0
                      const spentPct = effectiveDailyLimit > 0
                        ? Math.min((dailySummary.todaySpent / effectiveDailyLimit) * 100, 100) : 0
                      const ringSize = 100
                      const strokeWidth = 6
                      const radius = (ringSize - strokeWidth) / 2
                      const circumference = 2 * Math.PI * radius
                      const strokeDashoffset = circumference * (1 - spentPct / 100)
                      const ringColor = spentPct >= 100 ? "#f43f5e" : spentPct >= 80 ? "#fb923c" : "#a3e635"

                      return (
                        <>
                          <div className="relative mb-3" style={{ width: ringSize, height: ringSize }}>
                            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                              <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/60" strokeWidth={strokeWidth} />
                              <motion.circle
                                cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
                                stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round"
                                strokeDasharray={circumference}
                                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ delay: 0.5, duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xl font-black tabular-nums" style={{ color: ringColor }}>{Math.round(spentPct)}%</span>
                            </div>
                          </div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Daily Budget</p>
                          <p className="text-lg font-black tabular-nums text-lime-600 dark:text-lime-400">{formatCurrency(Math.max(0, dailySummary.dailyBudget))}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            per day remaining
                          </p>
                        </>
                      )
                    })()}
                  </div>
                </BentoTile>

                {/* ━━━ MONTH PROGRESS TILE (1x1) ━━━ */}
                <BentoTile
                  gradient="from-lime-500/[0.04] to-transparent"
                  hoverBorder="hover:border-lime-500/15"
                >
                  <div className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center size-9 rounded-xl bg-lime-500/10 shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)]">
                        <IconCalendar className="size-4 text-lime-600 dark:text-lime-300" strokeWidth={2} />
                      </div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Month Progress</p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((dailySummary.daysElapsed / dailySummary.totalDaysInMonth) * 100)}%` }}
                        transition={{ delay: 0.3, duration: 0.8, ease: [0, 0, 0.2, 1] }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-3">
                      Day {dailySummary.daysElapsed} of {dailySummary.totalDaysInMonth} — {dailySummary.remainingDays}d left
                    </p>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-medium">Savings Rate</span>
                        <span className={`text-lg font-black tabular-nums ${dailySummary.savingsRate >= 0 ? "text-lime-600 dark:text-lime-400" : "text-red-500 dark:text-red-400"}`}>
                          {dailySummary.savingsRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </BentoTile>

                {/* ━━━ AI INSIGHT TILE (2x1) ━━━ */}
                <BentoTile
                  className="col-span-2"
                  gradient="from-primary/[0.04] to-transparent"
                  hoverBorder="hover:border-primary/20"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <IconSparkles className="size-4 text-primary" />
                        AI Highlights
                      </h3>
                      <Link href="/ai?tab=reports" className="text-[11px] text-primary hover:underline font-medium">
                        View all &rarr;
                      </Link>
                    </div>
                    <AiInsightsWidget compact />
                  </div>
                </BentoTile>

                {/* ━━━ MONTHLY TREND CHART (2x2) ━━━ */}
                <SectionErrorBoundary name="monthly-trend">
                  <BentoTile className="col-span-2 min-h-[300px]">
                    <div className="p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold">Monthly Trend</h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="size-2 rounded-full bg-lime-400" />
                            <span className="text-[10px] text-muted-foreground font-medium">Income</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="size-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                            <span className="text-[10px] text-muted-foreground font-medium">Expenses</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium mb-3">Last 6 months</p>

                      <div className="flex-1 min-h-0">
                        {monthlyTrendData.some(d => d.income > 0 || d.expenses > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrendData} barGap={4}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.2} />
                              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                              <Tooltip
                                formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "Income" : "Expenses"]}
                                contentStyle={{ borderRadius: 12, fontSize: 11, border: "1px solid var(--border)", background: "var(--popover)", backdropFilter: "blur(20px)", color: "var(--popover-foreground)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                                cursor={{ fill: "var(--muted)", radius: 8, fillOpacity: 0.3 }}
                              />
                              <Bar dataKey="income" fill="#a3e635" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="expenses" fill="var(--color-expense-bar, #a1a1aa)" radius={[6, 6, 0, 0]} opacity={0.45} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet.</div>
                        )}
                      </div>
                    </div>
                  </BentoTile>
                </SectionErrorBoundary>

                {/* ━━━ CATEGORIES (2x2) ━━━ */}
                <BentoTile
                  className="col-span-2"
                  gradient="from-lime-500/[0.04] to-transparent"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Top Spending</h3>
                      <Link href="/money?tab=analytics" className="text-[11px] text-primary hover:underline font-medium">
                        {categoryBreakdown.length} categories &rarr;
                      </Link>
                    </div>

                    {visibleCategories.length > 0 ? (
                      <div className="space-y-3">
                        {visibleCategories.map((cat, i) => (
                          <div key={cat.category} className="flex items-center gap-3">
                            <span className={`size-2 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} shrink-0`} />
                            <span className="text-sm font-medium text-foreground/80 flex-1 min-w-0 truncate">{cat.category}</span>
                            <span className="text-xs font-bold tabular-nums shrink-0">{formatCurrency(cat.amount)}</span>
                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                              <motion.div
                                className={`h-full rounded-full bg-gradient-to-r ${CATEGORY_BAR_GRADIENTS[i % CATEGORY_BAR_GRADIENTS.length]}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(cat.percentage, 2)}%` }}
                                transition={{ delay: 0.2 + i * 0.05, duration: 0.5, ease: [0, 0, 0.2, 1] }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-7 text-right shrink-0">
                              {cat.percentage.toFixed(0)}%
                            </span>
                          </div>
                        ))}
                        {hiddenCount > 0 && (
                          <p className="text-[10px] text-muted-foreground pl-5">+{hiddenCount} more</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">No expenses this month.</p>
                    )}
                  </div>
                </BentoTile>

                {/* ━━━ SMALL WIDGET TILES (4x 1x1) ━━━ */}
                <CrossFeatureWidgets />

              </motion.div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/* ─── Cross-Feature Widget Tiles ─── */

interface SubData { name: string; amount: number; nextExpected: string }
interface BucketData { monthlyAllocation: number; count: number }
interface GamificationData { levelName: string; streak: number }
interface SplitBalance { net: number }

function CrossFeatureWidgets() {
  const [subs, setSubs] = useState<{ nearest: SubData | null; dueCount: number } | null>(null)
  const [bucket, setBucket] = useState<BucketData | null>(null)
  const [gamification, setGamification] = useState<GamificationData | null>(null)
  const [splits, setSplits] = useState<SplitBalance | null>(null)

  useEffect(() => {
    fetch("/api/subscriptions").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const items = data.subscriptions || data.items || []
      const now = new Date(); const weekOut = new Date(); weekOut.setDate(weekOut.getDate() + 7)
      const nowStr = now.toISOString().split("T")[0]; const weekStr = weekOut.toISOString().split("T")[0]
      const upcoming = items.filter((s: Record<string, unknown>) => s.status === "active" && s.nextExpected && (s.nextExpected as string) >= nowStr && (s.nextExpected as string) <= weekStr)
      const sorted = upcoming.sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((a.nextExpected as string) || "").localeCompare((b.nextExpected as string) || ""))
      setSubs({ dueCount: sorted.length, nearest: sorted[0] ? { name: sorted[0].name as string, amount: sorted[0].amount as number, nextExpected: sorted[0].nextExpected as string } : null })
    }).catch(() => {})

    fetch("/api/bucket-list").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const items = data.items || []
      setBucket({ monthlyAllocation: items.reduce((sum: number, it: Record<string, unknown>) => sum + ((it.monthlyAllocation as number) || 0), 0), count: items.length })
    }).catch(() => {})

    fetch("/api/gamification").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      setGamification({ levelName: data.levelName || data.level?.name || "Beginner", streak: data.streak?.currentStreak || data.currentStreak || 0 })
    }).catch(() => {})

    fetch("/api/splits/balances").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const balances = data.balances || []
      setSplits({ net: balances.reduce((sum: number, b: Record<string, unknown>) => sum + ((b.amount as number) || 0), 0) })
    }).catch(() => {})
  }, [])

  const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)

  const tiles = [
    {
      href: "/bills",
      icon: <IconRepeat className="size-4 text-lime-600 dark:text-lime-300" />,
      iconBg: "bg-lime-500/10",
      iconGlow: "shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)]",
      gradient: "from-lime-500/[0.04] to-transparent",
      hoverBorder: "hover:border-lime-500/15",
      label: "Renewals",
      content: subs ? (
        <>
          <p className="text-sm font-bold truncate">{subs.dueCount > 0 ? `${subs.dueCount} due` : "None"}</p>
          {subs.nearest && <p className="text-[10px] text-muted-foreground truncate">{subs.nearest.name}</p>}
        </>
      ) : <Skeleton className="h-4 w-16" />,
    },
    {
      href: "/goals?tab=bucket-list",
      icon: <IconStar className="size-4 text-lime-600 dark:text-lime-300" />,
      iconBg: "bg-lime-500/10",
      iconGlow: "shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)]",
      gradient: "from-lime-500/[0.04] to-transparent",
      hoverBorder: "hover:border-lime-500/15",
      label: "Bucket List",
      content: bucket ? (
        <>
          <p className="text-sm font-bold tabular-nums truncate">{fmt(bucket.monthlyAllocation)}/mo</p>
          <p className="text-[10px] text-muted-foreground">{bucket.count} item{bucket.count !== 1 ? "s" : ""}</p>
        </>
      ) : <Skeleton className="h-4 w-16" />,
    },
    {
      href: "/gamification",
      icon: <IconFlame className="size-4 text-lime-600 dark:text-lime-300" />,
      iconBg: "bg-lime-500/10",
      iconGlow: "shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)]",
      gradient: "from-lime-500/[0.04] to-transparent",
      hoverBorder: "hover:border-lime-500/15",
      label: "Streak",
      content: gamification ? (
        <>
          <p className="text-sm font-bold truncate">{gamification.levelName}</p>
          <p className="text-[10px] text-muted-foreground">{gamification.streak > 0 ? `${gamification.streak}-day` : "No streak"}</p>
        </>
      ) : <Skeleton className="h-4 w-16" />,
    },
    {
      href: "/bills?tab=splits",
      icon: <IconUsers className="size-4 text-lime-600 dark:text-lime-300" />,
      iconBg: "bg-lime-500/10",
      iconGlow: "shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)]",
      gradient: "from-lime-500/[0.04] to-transparent",
      hoverBorder: "hover:border-lime-500/15",
      label: "Splits",
      content: splits ? (
        <>
          <p className={`text-sm font-bold tabular-nums truncate ${splits.net >= 0 ? "text-lime-600 dark:text-lime-400" : "text-red-500 dark:text-red-400"}`}>
            {splits.net >= 0 ? `+${fmt(splits.net)}` : fmt(splits.net)}
          </p>
          <p className="text-[10px] text-muted-foreground">{splits.net >= 0 ? "Owed to you" : "You owe"}</p>
        </>
      ) : <Skeleton className="h-4 w-16" />,
    },
  ]

  return (
    <>
      {tiles.map((tile) => (
        <BentoTile key={tile.label} gradient={tile.gradient} hoverBorder={tile.hoverBorder}>
          <Link href={tile.href} className="block p-5 h-full">
            <div className={`flex items-center justify-center size-9 rounded-lg ${tile.iconBg} ${tile.iconGlow} mb-2`}>
              {tile.icon}
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{tile.label}</p>
            {tile.content}
          </Link>
        </BentoTile>
      ))}
    </>
  )
}

/* ─── Loading Skeleton ─── */

function DashboardLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Hero */}
      <div className="col-span-2 row-span-2 rounded-2xl border border-border bg-card p-7 min-h-[320px]">
        <Skeleton className="h-4 w-32 mb-6" />
        <Skeleton className="h-14 w-56 mb-6" />
        <Skeleton className="h-20 w-full rounded-lg mb-4" />
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          {[0, 1, 2].map(i => <div key={i} className="space-y-1"><Skeleton className="h-2 w-12" /><Skeleton className="h-5 w-20" /></div>)}
        </div>
      </div>
      {/* Daily Budget + Month Progress */}
      {[0, 1].map(i => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6">
          <Skeleton className="size-10 rounded-xl mb-3" />
          <Skeleton className="h-2.5 w-14 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
      {/* AI */}
      <div className="col-span-2 rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      {/* Chart */}
      <div className="col-span-2 row-span-2 rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-28 mb-4" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
      {/* Categories */}
      <div className="col-span-2 rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-24 mb-4" />
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-4 w-full mb-3" />)}
      </div>
      {/* Widgets */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="size-9 rounded-lg mb-2" />
          <Skeleton className="h-2 w-14 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
