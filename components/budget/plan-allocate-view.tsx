/**
 * Budget Plan & Allocate view — interactive budget planner with income
 * input, Needs/Wants/Investments/Savings allocation pie chart, per-category
 * budget cards with editable limits, and a plan-vs-actual bar chart.
 * @module components/budget/plan-allocate-view
 */
"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  IconCalculator,
  IconCash,
  IconCheck,
  IconChartPie,
  IconDeviceFloppy,
  IconHome,
  IconInfoCircle,
  IconPigMoney,
  IconPlus,
  IconShoppingCart,
  IconTarget,
  IconTrash,
  IconTrendingUp,
  IconBuildingBank,
  IconBulb,
  IconArrowRight,
} from "@tabler/icons-react"
import Link from "next/link"
import { motion } from "motion/react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { stagger, fadeUp, fadeUpSmall } from "@/lib/motion"
import { formatINR, formatCompact } from "@/lib/format"

// ── Types ──

interface InvestmentItem {
  id: string
  label: string
  amount: number
}

interface LinkedGoal {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  percentageComplete: number
}

interface LinkedData {
  goals: LinkedGoal[] | null
  budgetConfig: { needs: number; wants: number; investments: number; savings: number } | null
  sips: { totalMonthly: number; count: number } | null
  stocks: { totalInvested: number; count: number } | null
  actualSpending: { monthlyIncome: number; monthlyExpenses: number; savingsRate: number } | null
}

const DEFAULT_INVESTMENT_TYPES = [
  { id: "sips", label: "SIPs" },
  { id: "ppf", label: "PPF" },
  { id: "stocks", label: "Stocks" },
  { id: "fd", label: "Fixed Deposits" },
  { id: "nps", label: "NPS" },
]

const CATEGORY_COLORS: Record<string, string> = {
  investments: "var(--chart-4)",
  savings: "var(--chart-1)",
  needs: "var(--chart-3)",
  wants: "var(--chart-5)",
  unallocated: "var(--muted-foreground)",
}

const INVESTMENT_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
  "var(--chart-5)", "var(--muted-foreground)", "var(--primary)", "var(--accent-foreground)",
]

// ── Helpers ──

function pct(amount: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((amount / total) * 1000) / 10
}

function formatPct(amount: number, total: number): string {
  return `${pct(amount, total).toFixed(1)}%`
}

/**
 * Top-level Budget Plan & Allocate page for the `/budget` route.
 * Provides income input, a doughnut chart of the NWIS (Needs/Wants/
 * Investments/Savings) split, editable per-category budget cards,
 * a plan-vs-actual bar chart, and AI budget suggestion integration.
 * Auth-guarded: redirects to `/login` when not authenticated.
 */
export function PlanAllocateView() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>(
    DEFAULT_INVESTMENT_TYPES.map((t) => ({ ...t, amount: 0 }))
  )
  const [savings, setSavings] = useState(0)
  const [goalAllocations, setGoalAllocations] = useState<Record<string, number>>({})
  const [needs, setNeeds] = useState(0)
  const [wants, setWants] = useState(0)
  const [customLabel, setCustomLabel] = useState("")

  const [linked, setLinked] = useState<LinkedData>({
    goals: null,
    budgetConfig: null,
    sips: null,
    stocks: null,
    actualSpending: null,
  })

  // Load saved plan + linked data
  const loadPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/planner", { credentials: "include" })
      const data = await res.json()
      if (data.success) {
        if (data.plan) {
          const p = data.plan
          setMonthlyIncome(p.monthlyIncome || 0)
          setSavings(p.savings || 0)
          setNeeds(p.needs || 0)
          setWants(p.wants || 0)
          if (p.goalAllocations && typeof p.goalAllocations === "object") {
            setGoalAllocations(p.goalAllocations as Record<string, number>)
          }

          if (p.investments && typeof p.investments === "object") {
            const items: InvestmentItem[] = []
            for (const def of DEFAULT_INVESTMENT_TYPES) {
              items.push({ id: def.id, label: def.label, amount: Number(p.investments[def.id]) || 0 })
            }
            for (const [key, val] of Object.entries(p.investments)) {
              if (!DEFAULT_INVESTMENT_TYPES.find((d) => d.id === key)) {
                items.push({ id: key, label: key, amount: Number(val) || 0 })
              }
            }
            setInvestmentItems(items)
          }
        }
        if (data.linked) setLinked(data.linked)
      }
    } catch {
      // first time
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    loadPlan()
  }, [isAuthenticated, loadPlan])

  // Derived values
  const totalInvestments = useMemo(() => investmentItems.reduce((s, i) => s + i.amount, 0), [investmentItems])
  const totalAllocated = totalInvestments + savings + needs + wants
  const unallocated = Math.max(monthlyIncome - totalAllocated, 0)
  const overAllocated = totalAllocated > monthlyIncome ? totalAllocated - monthlyIncome : 0

  // Pie chart data
  const pieData = useMemo(() => {
    const slices = [
      { name: "Investments", value: totalInvestments, color: CATEGORY_COLORS.investments },
      { name: "Savings", value: savings, color: CATEGORY_COLORS.savings },
      { name: "Needs", value: needs, color: CATEGORY_COLORS.needs },
      { name: "Wants", value: wants, color: CATEGORY_COLORS.wants },
    ].filter((s) => s.value > 0)
    if (unallocated > 0) slices.push({ name: "Unallocated", value: unallocated, color: CATEGORY_COLORS.unallocated })
    return slices
  }, [totalInvestments, savings, needs, wants, unallocated])

  const investmentPieData = useMemo(
    () => investmentItems.filter((i) => i.amount > 0).map((i, idx) => ({
      name: i.label, value: i.amount, color: INVESTMENT_COLORS[idx % INVESTMENT_COLORS.length],
    })),
    [investmentItems]
  )

  // Plan vs Actual bar data
  const planVsActual = useMemo(() => {
    if (!linked.actualSpending || monthlyIncome <= 0) return []
    const actual = linked.actualSpending
    return [
      { category: "Income", planned: monthlyIncome, actual: actual.monthlyIncome },
      { category: "Expenses", planned: needs + wants, actual: actual.monthlyExpenses },
      { category: "Invest+Save", planned: totalInvestments + savings, actual: Math.max(actual.monthlyIncome - actual.monthlyExpenses, 0) },
    ]
  }, [monthlyIncome, needs, wants, totalInvestments, savings, linked.actualSpending])

  // ── Handlers ──

  const updateInvestment = useCallback((id: string, amount: number) => {
    setInvestmentItems((prev) => prev.map((item) => (item.id === id ? { ...item, amount } : item)))
    setSaved(false)
  }, [])

  const removeInvestment = useCallback((id: string) => {
    setInvestmentItems((prev) => prev.filter((item) => item.id !== id))
    setSaved(false)
  }, [])

  const addCustomInvestment = useCallback(() => {
    const label = customLabel.trim()
    if (!label) return
    const id = label.toLowerCase().replace(/\s+/g, "_")
    if (investmentItems.find((i) => i.id === id)) { toast.error("Already exists"); return }
    setInvestmentItems((prev) => [...prev, { id, label, amount: 0 }])
    setCustomLabel("")
    setSaved(false)
  }, [customLabel, investmentItems])

  const autoAllocate = useCallback(() => {
    if (monthlyIncome <= 0) { toast.error("Enter your monthly income first"); return }
    const cfg = linked.budgetConfig
    const needsPct = cfg ? cfg.needs / 100 : 0.5
    const wantsPct = cfg ? cfg.wants / 100 : 0.3
    const invPct = cfg ? cfg.investments / 100 : 0.12
    const rawNeeds = Math.round(monthlyIncome * needsPct)
    const rawWants = Math.round(monthlyIncome * wantsPct)
    const rawInv = Math.round(monthlyIncome * invPct)
    const rawSav = monthlyIncome - rawNeeds - rawWants - rawInv
    setNeeds(rawNeeds)
    setWants(rawWants)
    setSavings(Math.max(rawSav, 0))
    const perItem = Math.floor(rawInv / Math.max(investmentItems.length, 1))
    setInvestmentItems((prev) => prev.map((item) => ({ ...item, amount: perItem })))
    setSaved(false)
    toast.success(cfg ? "Allocated using your budget ratios" : "Allocated using 50/30/20 rule")
  }, [monthlyIncome, investmentItems.length, linked.budgetConfig])

  const savePlan = useCallback(async () => {
    setSaving(true)
    try {
      const investments: Record<string, number> = {}
      for (const item of investmentItems) investments[item.id] = item.amount
      const res = await fetch("/api/planner", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyIncome, investments, savings, needs, wants, goalAllocations }),
      })
      const data = await res.json()
      if (data.success) { setSaved(true); toast.success("Plan saved") }
      else toast.error(data.message || "Failed to save plan")
    } catch { toast.error("Failed to save plan") }
    finally { setSaving(false) }
  }, [monthlyIncome, investmentItems, savings, needs, wants, goalAllocations])

  // ── Tooltips ──

  const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]
    return (
      <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.payload.color }} />
          <span className="text-sm font-medium">{d.name}</span>
        </div>
        <p className="text-sm text-muted-foreground">{formatINR(d.value)} ({formatPct(d.value, monthlyIncome)})</p>
      </div>
    )
  }

  const CustomBarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-lg">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span className="capitalize">{p.dataKey}</span>
            <span className="font-medium tabular-nums">{formatINR(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={autoAllocate} className="gap-1.5">
          <IconCalculator className="h-4 w-4" />
          <span className="hidden sm:inline">{linked.budgetConfig ? "Use Budget Ratios" : "50/30/20"}</span>
        </Button>
        <Button size="sm" onClick={savePlan} disabled={saving} className="gap-1.5">
          {saved ? <IconCheck className="h-4 w-4" /> : <IconDeviceFloppy className="h-4 w-4" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save Plan"}
        </Button>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

        {/* Quick Stats */}
        <motion.div variants={fadeUp} className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard icon={IconCash} iconBg="bg-emerald-500/10" iconColor="text-emerald-500" label="Monthly Income" value={monthlyIncome > 0 ? formatINR(monthlyIncome) : "\u2014"} sub={monthlyIncome > 0 ? `${formatCompact(monthlyIncome * 12)}/yr` : "Set below"} />
          <StatCard icon={IconTrendingUp} iconBg="bg-indigo-500/10" iconColor="text-indigo-500" label="Planned Investments" value={totalInvestments > 0 ? formatINR(totalInvestments) : "\u2014"} sub={monthlyIncome > 0 && totalInvestments > 0 ? `${formatPct(totalInvestments, monthlyIncome)} of income` : linked.sips ? `${linked.sips.count} SIPs active` : "\u2014"} />
          <StatCard icon={IconPigMoney} iconBg="bg-emerald-500/10" iconColor="text-emerald-500" label="Planned Savings" value={savings > 0 ? formatINR(savings) : "\u2014"} sub={linked.actualSpending ? `Actual: ${linked.actualSpending.savingsRate.toFixed(0)}% rate` : "\u2014"} />
          <StatCard icon={IconTarget} iconBg="bg-violet-500/10" iconColor="text-violet-500" label="Active Goals" value={linked.goals ? `${linked.goals.length}` : "\u2014"} sub={linked.goals && linked.goals.length > 0 ? `${formatINR(linked.goals.reduce((s, g) => s + g.targetAmount, 0))} target` : "No goals set"} />
        </motion.div>

        {/* Income + Investments | Pie Chart */}
        <div className="grid gap-5 lg:grid-cols-2 items-stretch">
          {/* Left: Income + Investments */}
          <motion.div variants={fadeUpSmall} className="flex flex-col gap-4">
            {/* Income */}
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <IconCash className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold">Monthly Income</h2>
                  <p className="text-[11px] text-muted-foreground">Expected monthly earning</p>
                </div>
                {linked.actualSpending && linked.actualSpending.monthlyIncome > 0 && (
                  <Badge variant="secondary" className="text-[11px] tabular-nums">
                    Actual: {formatINR(linked.actualSpending.monthlyIncome)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-muted-foreground">\u20B9</span>
                <Input
                  type="number"
                  value={monthlyIncome || ""}
                  onChange={(e) => { setMonthlyIncome(Number(e.target.value) || 0); setSaved(false) }}
                  placeholder="0"
                  className="text-base font-semibold tabular-nums max-w-[200px]"
                />
                {monthlyIncome > 0 && (
                  <Badge variant="secondary" className="text-xs tabular-nums">{formatCompact(monthlyIncome * 12)}/yr</Badge>
                )}
              </div>
            </div>

            {/* Investments */}
            <div className="rounded-xl border border-border/60 bg-card p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                    <IconTrendingUp className="h-4 w-4 text-indigo-500" />
                  </div>
                  <h2 className="text-sm font-semibold">Investments</h2>
                </div>
                <div className="flex items-center gap-2">
                  {linked.sips && linked.sips.totalMonthly > 0 && (
                    <Badge variant="secondary" className="text-[11px] tabular-nums">
                      SIPs: {formatINR(linked.sips.totalMonthly)}/mo
                    </Badge>
                  )}
                  {totalInvestments > 0 && (
                    <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-0 text-xs tabular-nums">
                      {formatINR(totalInvestments)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2 flex-1 flex flex-col justify-between">
                {investmentItems.map((item) => {
                  const isDefault = DEFAULT_INVESTMENT_TYPES.some((d) => d.id === item.id)
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <Label className="w-24 text-xs font-medium text-muted-foreground shrink-0 truncate">{item.label}</Label>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">\u20B9</span>
                        <Input type="number" value={item.amount || ""} onChange={(e) => updateInvestment(item.id, Number(e.target.value) || 0)} placeholder="0" className="pl-6 text-sm tabular-nums h-8" />
                      </div>
                      {monthlyIncome > 0 && item.amount > 0 && (
                        <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right shrink-0">{formatPct(item.amount, monthlyIncome)}</span>
                      )}
                      {!isDefault && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeInvestment(item.id)}>
                          <IconTrash className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                })}
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Custom (e.g. Gold, Crypto)" className="text-sm h-8" onKeyDown={(e) => e.key === "Enter" && addCustomInvestment()} />
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs shrink-0" onClick={addCustomInvestment} disabled={!customLabel.trim()}>
                    <IconPlus className="h-3.5 w-3.5" />Add
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Pie charts */}
          <motion.div variants={fadeUpSmall} className="flex flex-col gap-4">
            {/* Income Breakdown Pie */}
            <div className="rounded-xl border border-border/60 bg-card p-4 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <IconChartPie className="h-4 w-4 text-violet-500" />
                </div>
                <h2 className="text-sm font-semibold">Income Breakdown</h2>
              </div>
              {monthlyIncome > 0 && pieData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={true} animationDuration={400} animationBegin={0}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground min-h-48">Enter your income to see the breakdown</div>
              )}
              {monthlyIncome > 0 && (
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground truncate">{d.name}</p>
                        <p className="text-xs font-semibold tabular-nums">{formatCompact(d.value)}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{formatPct(d.value, monthlyIncome)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Investment Split Pie */}
            {investmentPieData.length > 1 && (
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                    <IconBuildingBank className="h-4 w-4 text-indigo-500" />
                  </div>
                  <h2 className="text-sm font-semibold">Investment Split</h2>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={investmentPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={true} animationDuration={400} animationBegin={0}>
                        {investmentPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {investmentPieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium tabular-nums">{formatPct(d.value, totalInvestments)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Savings / Needs / Wants */}
        <motion.div variants={fadeUpSmall} className="grid gap-4 lg:grid-cols-3">
          {/* Savings */}
          <div className="rounded-xl border border-border/60 bg-card p-4 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <IconPigMoney className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-tight">Savings</h3>
                <p className="text-[11px] text-muted-foreground leading-snug">Emergency fund, liquid cash</p>
              </div>
              {linked.budgetConfig?.savings != null && (
                <Badge variant="outline" className="text-[11px] tabular-nums shrink-0">Budget: {linked.budgetConfig.savings}%</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">\u20B9</span>
                <Input type="number" value={savings || ""} onChange={(e) => { setSavings(Number(e.target.value) || 0); setSaved(false) }} placeholder="0" className="pl-6 text-sm tabular-nums h-8" />
              </div>
              {monthlyIncome > 0 && savings > 0 && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[11px] tabular-nums shrink-0">{formatPct(savings, monthlyIncome)}</Badge>
              )}
            </div>
            {linked.goals && linked.goals.length > 0 && (
              <div className="border-t border-border/40 pt-2.5 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground">Allocate to goals</p>
                {linked.goals.map((goal) => {
                  const alloc = goalAllocations[goal.name] || 0
                  return (
                    <div key={goal.name} className="flex items-center gap-2">
                      <IconTarget className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{goal.name}</span>
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">\u20B9</span>
                        <Input
                          type="number"
                          value={alloc || ""}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0
                            setGoalAllocations((prev) => ({ ...prev, [goal.name]: v }))
                            setSaved(false)
                          }}
                          placeholder="0"
                          className="pl-5 text-xs tabular-nums h-7"
                        />
                      </div>
                    </div>
                  )
                })}
                {(() => {
                  const totalGoalAlloc = Object.values(goalAllocations).reduce((s, v) => s + v, 0)
                  const remaining = savings - totalGoalAlloc
                  return totalGoalAlloc > 0 ? (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/30">
                      <span className="text-muted-foreground">Unassigned savings</span>
                      <span className={`font-medium tabular-nums ${remaining < 0 ? "text-destructive" : "text-emerald-500"}`}>
                        {formatINR(Math.abs(remaining))}{remaining < 0 ? " over" : ""}
                      </span>
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </div>
          <AllocationCard
            icon={IconHome} iconBg="bg-amber-500/10" iconColor="text-amber-500"
            label="Needs" hint="Rent, bills, groceries, EMIs" value={needs}
            onChange={(v) => { setNeeds(v); setSaved(false) }}
            pctStr={monthlyIncome > 0 ? formatPct(needs, monthlyIncome) : undefined}
            badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            budgetPct={linked.budgetConfig?.needs}
          />
          <AllocationCard
            icon={IconShoppingCart} iconBg="bg-pink-500/10" iconColor="text-pink-500"
            label="Wants" hint="Entertainment, dining, shopping" value={wants}
            onChange={(v) => { setWants(v); setSaved(false) }}
            pctStr={monthlyIncome > 0 ? formatPct(wants, monthlyIncome) : undefined}
            badgeColor="bg-pink-500/10 text-pink-600 dark:text-pink-400"
            budgetPct={linked.budgetConfig?.wants}
          />
        </motion.div>

        {/* Allocation Summary */}
        {monthlyIncome > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Allocation Summary</h3>
              {overAllocated > 0 ? (
                <Badge variant="destructive" className="text-xs tabular-nums">Over by {formatINR(overAllocated)}</Badge>
              ) : unallocated > 0 ? (
                <Badge variant="secondary" className="text-xs tabular-nums">{formatINR(unallocated)} unallocated</Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-xs">Fully allocated</Badge>
              )}
            </div>
            <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden flex">
              {totalInvestments > 0 && <div className="h-full transition-all duration-300" style={{ width: `${Math.min(pct(totalInvestments, monthlyIncome), 100)}%`, backgroundColor: CATEGORY_COLORS.investments }} />}
              {savings > 0 && <div className="h-full transition-all duration-300" style={{ width: `${Math.min(pct(savings, monthlyIncome), 100)}%`, backgroundColor: CATEGORY_COLORS.savings }} />}
              {needs > 0 && <div className="h-full transition-all duration-300" style={{ width: `${Math.min(pct(needs, monthlyIncome), 100)}%`, backgroundColor: CATEGORY_COLORS.needs }} />}
              {wants > 0 && <div className="h-full transition-all duration-300" style={{ width: `${Math.min(pct(wants, monthlyIncome), 100)}%`, backgroundColor: CATEGORY_COLORS.wants }} />}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {[
                { label: "Investments", color: CATEGORY_COLORS.investments, value: totalInvestments },
                { label: "Savings", color: CATEGORY_COLORS.savings, value: savings },
                { label: "Needs", color: CATEGORY_COLORS.needs, value: needs },
                { label: "Wants", color: CATEGORY_COLORS.wants, value: wants },
              ].filter((l) => l.value > 0).map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-medium tabular-nums">{formatINR(l.value)}</span>
                  <span className="text-muted-foreground/60 tabular-nums">({formatPct(l.value, monthlyIncome)})</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Plan vs Actual */}
        {planVsActual.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                <IconBulb className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Plan vs Actual</h2>
                <p className="text-[11px] text-muted-foreground">This month&apos;s reality check</p>
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planVsActual} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={55} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="planned" fill="var(--chart-4)" radius={[4, 4, 0, 0]} barSize={20} name="Planned" />
                  <Bar dataKey="actual" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={20} name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-chart-4" />Planned</div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-chart-1" />Actual (this month)</div>
            </div>
          </motion.div>
        )}

        {/* Portfolio Summary + Tips */}
        <div className={`grid gap-5 ${(linked.sips || linked.stocks) ? "lg:grid-cols-2" : ""}`}>
          {(linked.sips || linked.stocks) && (
            <motion.div variants={fadeUpSmall} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                    <IconBuildingBank className="h-4 w-4 text-teal-500" />
                  </div>
                  <h2 className="text-sm font-semibold">Current Portfolio</h2>
                </div>
                <Link href="/investments" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Details <IconArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {linked.sips && (
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Active SIPs</p>
                    <p className="text-lg font-bold tabular-nums">{linked.sips.count}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatINR(linked.sips.totalMonthly)}/mo</p>
                  </div>
                )}
                {linked.stocks && (
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Stocks Held</p>
                    <p className="text-lg font-bold tabular-nums">{linked.stocks.count}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatINR(linked.stocks.totalInvested)} invested</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Quick Tips */}
          <motion.div variants={fadeUpSmall} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-start gap-2.5">
              <IconInfoCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {linked.budgetConfig ? (
                  <p>
                    <strong className="text-foreground">Your budget ratios:</strong> Needs {linked.budgetConfig.needs}%, Wants {linked.budgetConfig.wants}%, Investments {linked.budgetConfig.investments}%, Savings {linked.budgetConfig.savings}%. Click &quot;Use Budget Ratios&quot; to auto-fill.
                  </p>
                ) : (
                  <p>
                    <strong className="text-foreground">50/30/20 Rule:</strong> Allocate 50% to needs, 30% to wants, and 20% to savings + investments.
                  </p>
                )}
                <p>
                  <strong className="text-foreground">Tip:</strong> Try to invest at least 10-15% of your income for long-term wealth building.
                </p>
                {linked.actualSpending && linked.actualSpending.savingsRate < 10 && (
                  <p className="text-amber-600 dark:text-amber-400">
                    <strong>Warning:</strong> Your actual savings rate is only {linked.actualSpending.savingsRate.toFixed(0)}%. Consider reducing wants to boost savings.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

      </motion.div>
    </div>
  )
}

// ── Sub-components ──

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }: {
  icon: React.ElementType; iconBg: string; iconColor: string; label: string; value: string; sub: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-sm font-bold tabular-nums truncate">{value}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums truncate">{sub}</p>
        </div>
      </div>
    </div>
  )
}

interface AllocationCardProps {
  icon: React.ElementType; iconBg: string; iconColor: string; label: string; hint: string
  value: number; onChange: (v: number) => void; pctStr?: string; badgeColor: string
  budgetPct?: number
}

function AllocationCard({ icon: Icon, iconBg, iconColor, label, hint, value, onChange, pctStr, badgeColor, budgetPct }: AllocationCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-tight">{label}</h3>
          <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
        </div>
        {budgetPct != null && (
          <Badge variant="outline" className="text-[11px] tabular-nums shrink-0">Budget: {budgetPct}%</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">\u20B9</span>
          <Input type="number" value={value || ""} onChange={(e) => onChange(Number(e.target.value) || 0)} placeholder="0" className="pl-6 text-sm tabular-nums h-8" />
        </div>
        {pctStr && <Badge className={`${badgeColor} border-0 text-[11px] tabular-nums shrink-0`}>{pctStr}</Badge>}
      </div>
    </div>
  )
}
