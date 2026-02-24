/**
 * What-If budget simulator — lets the user adjust spending category
 * percentages with plus/minus buttons and instantly see the projected
 * impact on monthly savings and budget balance.
 * @module components/budget/what-if-view
 */
"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import {
  IconAdjustments,
  IconMinus,
  IconPlus,
  IconRefresh,
} from "@tabler/icons-react"
import { motion } from "motion/react"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatINR } from "@/lib/format"

// ── Types ──

interface LinkedData {
  actualSpending: { monthlyIncome: number; monthlyExpenses: number; savingsRate: number } | null
}

const CATEGORY_COLORS: Record<string, string> = {
  investments: "var(--chart-4)",
  savings: "var(--chart-1)",
  needs: "var(--chart-3)",
  wants: "var(--chart-5)",
}

/**
 * Top-level What-If simulator page for the `/budget` route.
 * Renders category sliders with +/- controls, real-time impact cards
 * (savings delta, new balance projection), and a reset button.
 */
export function WhatIfView() {
  const { isAuthenticated } = useAuth()

  const [loading, setLoading] = useState(true)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [needs, setNeeds] = useState(0)
  const [wants, setWants] = useState(0)
  const [savings, setSavings] = useState(0)
  const [totalInvestments, setTotalInvestments] = useState(0)
  const [linked, setLinked] = useState<LinkedData>({ actualSpending: null })

  // Load plan data
  const loadPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/planner", { credentials: "include" })
      const data = await res.json()
      if (data.success && data.plan) {
        const p = data.plan
        setMonthlyIncome(p.monthlyIncome || 0)
        setSavings(p.savings || 0)
        setNeeds(p.needs || 0)
        setWants(p.wants || 0)
        if (p.investments && typeof p.investments === "object") {
          const total = Object.values(p.investments as Record<string, number>).reduce((s: number, v) => s + (Number(v) || 0), 0)
          setTotalInvestments(total)
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

  // ── What-If Simulator ──

  const [whatIfAdjustments, setWhatIfAdjustments] = useState<Record<string, number>>({})

  const whatIfCategories = useMemo(() => {
    const cats = [
      { name: "Needs", actual: needs, color: CATEGORY_COLORS.needs },
      { name: "Wants", actual: wants, color: CATEGORY_COLORS.wants },
      { name: "Savings", actual: savings, color: CATEGORY_COLORS.savings },
      { name: "Investments", actual: totalInvestments, color: CATEGORY_COLORS.investments },
    ].filter((c) => c.actual > 0)

    return cats.map((c) => ({
      ...c,
      adjusted: whatIfAdjustments[c.name] ?? c.actual,
    }))
  }, [needs, wants, savings, totalInvestments, whatIfAdjustments])

  const whatIfMonthlySavingsChange = useMemo(() => {
    return whatIfCategories.reduce((sum, cat) => {
      if (cat.name === "Savings" || cat.name === "Investments") {
        return sum + (cat.adjusted - cat.actual)
      }
      return sum + (cat.actual - cat.adjusted)
    }, 0)
  }, [whatIfCategories])

  const whatIfCurrentSavingsRate = useMemo(() => {
    if (monthlyIncome <= 0) return 0
    return ((savings + totalInvestments) / monthlyIncome) * 100
  }, [monthlyIncome, savings, totalInvestments])

  const whatIfNewSavingsRate = useMemo(() => {
    if (monthlyIncome <= 0) return 0
    const currentSavingsInvestments = savings + totalInvestments
    const newSavingsInvestments = currentSavingsInvestments + whatIfMonthlySavingsChange
    return (newSavingsInvestments / monthlyIncome) * 100
  }, [monthlyIncome, savings, totalInvestments, whatIfMonthlySavingsChange])

  const whatIfEmergencyMonths = useMemo(() => {
    const currentMonthlySaved = savings + totalInvestments
    const newMonthlySaved = currentMonthlySaved + whatIfMonthlySavingsChange
    const monthlyExpensesActual = linked.actualSpending?.monthlyExpenses || (needs + wants)
    if (monthlyExpensesActual <= 0) return 0
    const targetFund = monthlyExpensesActual * 6
    if (currentMonthlySaved <= 0 && newMonthlySaved <= 0) return 0
    const currentMonths = currentMonthlySaved > 0 ? targetFund / currentMonthlySaved : Infinity
    const newMonths = newMonthlySaved > 0 ? targetFund / newMonthlySaved : Infinity
    const monthsSaved = currentMonths - newMonths
    return isFinite(monthsSaved) ? monthsSaved : 0
  }, [savings, totalInvestments, whatIfMonthlySavingsChange, needs, wants, linked.actualSpending])

  const handleWhatIfAdjust = useCallback((name: string, value: number) => {
    setWhatIfAdjustments((prev) => ({ ...prev, [name]: Math.max(0, value) }))
  }, [])

  const nudgeWhatIf = useCallback((name: string, delta: number) => {
    setWhatIfAdjustments((prev) => {
      const cat = whatIfCategories.find((c) => c.name === name)
      const current = prev[name] ?? cat?.actual ?? 0
      return { ...prev, [name]: Math.max(0, current + delta) }
    })
  }, [whatIfCategories])

  const resetWhatIf = useCallback(() => {
    setWhatIfAdjustments({})
  }, [])

  const whatIfHasChanges = useMemo(() => {
    return whatIfCategories.some((c) => c.adjusted !== c.actual)
  }, [whatIfCategories])

  // ── Render ──

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (monthlyIncome <= 0 || whatIfCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
          <IconAdjustments className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <p className="text-sm font-medium">No plan data yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Set up your income and allocations in the Plan & Allocate tab first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-violet-500/10">
            <IconAdjustments className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold">What-If Simulator</h3>
          <Badge variant="outline" className="ml-auto text-xs">Interactive</Badge>
        </div>

        {/* Category adjustments */}
        <div className="space-y-4 mb-6">
          {whatIfCategories.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Current: {formatINR(cat.actual)}</span>
                  <span className="text-sm font-bold tabular-nums">{formatINR(cat.adjusted)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={Math.max(cat.actual * 2, 1000)}
                  step={500}
                  value={cat.adjusted}
                  onChange={(e) => handleWhatIfAdjust(cat.name, Number(e.target.value))}
                  className="flex-1 h-1.5 accent-primary cursor-pointer"
                />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => nudgeWhatIf(cat.name, -500)}>
                    <IconMinus className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => nudgeWhatIf(cat.name, 500)}>
                    <IconPlus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {cat.adjusted !== cat.actual && (
                <p className={`text-xs ${
                  (cat.name === "Savings" || cat.name === "Investments")
                    ? (cat.adjusted > cat.actual ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600")
                    : (cat.adjusted < cat.actual ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600")
                }`}>
                  {cat.adjusted < cat.actual ? "\u2193" : "\u2191"} {formatINR(Math.abs(cat.adjusted - cat.actual))}{" "}
                  ({cat.adjusted < cat.actual ? "saving" : "spending"}{" "}
                  {cat.actual > 0 ? ((Math.abs(cat.adjusted - cat.actual) / cat.actual) * 100).toFixed(0) : 0}%{" "}
                  {cat.adjusted < cat.actual ? "less" : "more"})
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Impact Summary */}
        {whatIfHasChanges && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Impact Summary</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ImpactCard
                label="Monthly Savings Change"
                value={whatIfMonthlySavingsChange}
                isPositive={whatIfMonthlySavingsChange > 0}
              />
              <ImpactCard
                label="Annual Impact"
                value={whatIfMonthlySavingsChange * 12}
                isPositive={whatIfMonthlySavingsChange > 0}
              />
              <ImpactCard
                label="New Savings Rate"
                value={`${whatIfNewSavingsRate.toFixed(1)}%`}
                subtitle={`was ${whatIfCurrentSavingsRate.toFixed(1)}%`}
                isPositive={whatIfNewSavingsRate > whatIfCurrentSavingsRate}
              />
              <ImpactCard
                label="Emergency Fund"
                value={whatIfEmergencyMonths > 0 ? `${whatIfEmergencyMonths.toFixed(1)} mo faster` : whatIfEmergencyMonths < 0 ? `${Math.abs(whatIfEmergencyMonths).toFixed(1)} mo slower` : "No change"}
                subtitle="toward 6-month target"
                isPositive={whatIfEmergencyMonths > 0}
              />
            </div>
          </div>
        )}

        {/* Reset button */}
        {whatIfHasChanges && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={resetWhatIf} className="gap-1.5">
              <IconRefresh className="h-4 w-4" /> Reset All
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

/** Small card showing a single impact metric (e.g. savings delta or projected balance). */

function ImpactCard({ label, value, isPositive, subtitle }: {
  label: string; value: number | string; isPositive?: boolean; subtitle?: string
}) {
  const displayValue = typeof value === "number"
    ? `${value >= 0 ? "+" : ""}${formatINR(value)}`
    : value
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${
        isPositive === true ? "text-emerald-600 dark:text-emerald-400" :
        isPositive === false ? "text-rose-600" : ""
      }`}>{displayValue}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
