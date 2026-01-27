"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
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
  IconAlertTriangle,
  IconCheck,
  IconEdit,
  IconPigMoney,
  IconReceipt2,
  IconTarget,
  IconTrendingDown,
  IconX,
} from "@tabler/icons-react"

import { useTransactions } from "@/hooks/use-transactions"
import { useAuth } from "@/hooks/use-auth"
import { calculateCategoryBreakdown } from "@/lib/analytics"
import {
  getCurrentMonth,
  getMonthTransactions,
  isPartialMonth,
} from "@/lib/monthly-utils"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { MetricTile } from "@/components/metric-tile"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  calculateAllBudgetSpending,
  type BudgetPeriod,
  type BudgetSpending,
} from "@/lib/budget-utils"
import { DEFAULT_BUDGETS } from "@/lib/budget-mapping"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function BudgetPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { transactions, isLoading: transactionsLoading } = useTransactions()

  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS)
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod | null>(null)
  const [budgetSpending, setBudgetSpending] = useState<BudgetSpending[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [budgetUpdatedAt, setBudgetUpdatedAt] = useState<string | null>(null)

  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const LOCAL_BUDGETS_KEY = "finance:budgets"
  const hasLocalEditsRef = useRef(false)

  type StoredBudgets = {
    budgets: Record<string, unknown>
    updatedAt?: string | null
  }

  const normalizeBudgets = (raw: Record<string, unknown>) => {
    const normalized: Record<string, number> = { ...DEFAULT_BUDGETS }
    Object.entries(raw).forEach(([category, amount]) => {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_BUDGETS, category)) return
      const numeric = typeof amount === "number" ? amount : Number(amount)
      if (!Number.isNaN(numeric) && numeric >= 0) {
        normalized[category] = numeric
      }
    })
    return normalized
  }

  useEffect(() => {
    if (isAuthenticated) loadBudgets()
  }, [isAuthenticated])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const { year, month } = getCurrentMonth()
    const monthTransactions = getMonthTransactions(transactions, year, month)
    const isPartial = transactions.length > 0 ? isPartialMonth(transactions, year, month) : false
    const today = new Date()
    const daysInMonth = new Date(year, month, 0).getDate()
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
    const periodDays = isCurrentMonth ? today.getDate() : daysInMonth
    const isPartialPeriod = isCurrentMonth ? periodDays < daysInMonth : isPartial

    const period: BudgetPeriod = {
      startDate: new Date(year, month - 1, 1),
      endDate: isCurrentMonth ? today : new Date(year, month, 0),
      totalDays: daysInMonth,
      elapsedDays: periodDays,
      remainingDays: daysInMonth - periodDays,
      isPartialMonth: isPartialPeriod,
      periodLabel: isPartialPeriod
        ? `${getCurrentMonth().label} (${periodDays} of ${daysInMonth} days)`
        : getCurrentMonth().label,
    }

    setBudgetPeriod(period)
    const categoryBreakdown = calculateCategoryBreakdown(monthTransactions)
    const spending = calculateAllBudgetSpending(budgets, categoryBreakdown, period)
    setBudgetSpending(spending)
  }, [transactions, budgets])

  const loadBudgets = async () => {
    let localUpdatedAt: string | null = null
    let hasLocalBudgets = false
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_BUDGETS_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoredBudgets | Record<string, unknown>
          const storedBudgets = "budgets" in parsed ? (parsed as StoredBudgets).budgets : parsed
          const storedUpdatedAt = "updatedAt" in parsed ? (parsed as StoredBudgets).updatedAt : null
          const normalized = normalizeBudgets(storedBudgets as Record<string, unknown>)
          setBudgets(normalized)
          setBudgetUpdatedAt(storedUpdatedAt || null)
          localUpdatedAt = storedUpdatedAt || null
          hasLocalBudgets = true
        } catch {
          // ignore parse error
        }
      }
    }
    try {
      const response = await fetch("/api/budgets")
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.budgets) {
          if (hasLocalEditsRef.current) return
          if (hasLocalBudgets && !localUpdatedAt) return
          const normalized = normalizeBudgets(data.budgets)
          const remoteUpdatedAt = data.updatedAt || null
          const localDate = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0
          const remoteDate = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : 0
          const normalizedLocalDate = Number.isFinite(localDate) ? localDate : 0
          const normalizedRemoteDate = Number.isFinite(remoteDate) ? remoteDate : 0
          if (!localUpdatedAt || normalizedRemoteDate > normalizedLocalDate) {
            setBudgets(normalized)
            setBudgetUpdatedAt(remoteUpdatedAt)
            if (typeof window !== "undefined") {
              localStorage.setItem(
                LOCAL_BUDGETS_KEY,
                JSON.stringify({ budgets: normalized, updatedAt: remoteUpdatedAt })
              )
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load budgets:", error)
    }
  }

  const saveBudgets = async (newBudgets: Record<string, number>) => {
    setIsSaving(true)
    setSaveMessage(null)
    hasLocalEditsRef.current = true
    setBudgets(newBudgets)
    const updatedAt = new Date().toISOString()
    setBudgetUpdatedAt(updatedAt)
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgets: newBudgets }),
      })
      if (!response.ok) throw new Error("Failed to save budgets")
      const data = await response.json()
      if (data.success) {
        const normalized = normalizeBudgets(data.budgets)
        setBudgets(normalized)
        setBudgetUpdatedAt(data.updatedAt || updatedAt)
        if (typeof window !== "undefined") {
          localStorage.setItem(
            LOCAL_BUDGETS_KEY,
            JSON.stringify({ budgets: normalized, updatedAt: data.updatedAt || updatedAt })
          )
        }
        hasLocalEditsRef.current = false
        setSaveMessage("Saved")
      }
    } catch {
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify({ budgets: newBudgets, updatedAt }))
      }
      setSaveMessage("Saved locally")
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const totalMonthlyBudget = Object.values(budgets).reduce((sum, b) => sum + b, 0)
  const totalProratedBudget = budgetSpending.reduce((sum, b) => sum + b.proratedBudget, 0)
  const totalSpent = budgetSpending.reduce((sum, b) => sum + b.actualSpent, 0)
  const totalProjected = budgetSpending.reduce((sum, b) => sum + b.projectedSpent, 0)
  const totalPercentage = totalProratedBudget > 0 ? (totalSpent / totalProratedBudget) * 100 : 0
  const totalRemaining = Math.max(totalProratedBudget - totalSpent, 0)
  const overspentCount = budgetSpending.filter((b) => b.isOverspent).length

  const handleStartEdit = (category: string, currentBudget: number) => {
    hasLocalEditsRef.current = true
    setSaveMessage(null)
    setEditingCategory(category)
    setEditValue(currentBudget.toString())
  }

  const handleSaveEdit = (category: string) => {
    const newBudget = parseFloat(editValue)
    if (!isNaN(newBudget) && newBudget >= 0) {
      saveBudgets({ ...budgets, [category]: newBudget })
      setEditingCategory(null)
      return
    }
    setSaveMessage("Enter a valid amount")
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditValue("")
    hasLocalEditsRef.current = false
  }

  // Chart data for budget vs spending
  const chartData = budgetSpending
    .filter((item) => item.actualSpent > 0 || item.monthlyBudget > 0)
    .map((item) => ({
      category: item.budgetCategory.split(" ")[0],
      fullName: item.budgetCategory,
      budget: Math.round(item.proratedBudget),
      spent: Math.round(item.actualSpent),
    }))

  const isLoading = authLoading || transactionsLoading

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
          title="Budget Studio"
          subtitle="Monitor budgets against real-time spend"
          actions={
            <>
              {budgetPeriod && (
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {budgetPeriod.periodLabel}
                </Badge>
              )}
              {saveMessage && (
                <Badge variant="outline" className="text-xs">
                  {saveMessage}
                </Badge>
              )}
            </>
          }
        />
        <div className="flex flex-1 flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Skeleton className="h-96 w-full max-w-4xl mx-6" />
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {/* Metric tiles */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label="Total Spent"
                  value={formatCurrency(totalSpent)}
                  change={totalPercentage > 0 ? -(100 - totalPercentage) : 0}
                  trendLabel="of budget used"
                  tone={totalPercentage >= 90 ? "negative" : totalPercentage >= 70 ? "negative" : "positive"}
                  icon={<IconReceipt2 className="h-5 w-5" />}
                />
                <MetricTile
                  label="Budget Remaining"
                  value={formatCurrency(totalRemaining)}
                  trendLabel="pro-rated budget"
                  tone={totalRemaining > 0 ? "positive" : "negative"}
                  icon={<IconPigMoney className="h-5 w-5" />}
                />
                <MetricTile
                  label="Projected Spend"
                  value={formatCurrency(totalProjected)}
                  change={totalMonthlyBudget > 0 ? ((totalProjected - totalMonthlyBudget) / totalMonthlyBudget) * 100 : 0}
                  trendLabel="vs full budget"
                  tone={totalProjected <= totalMonthlyBudget ? "positive" : "negative"}
                  icon={<IconTrendingDown className="h-5 w-5" />}
                />
                <MetricTile
                  label="Categories Over"
                  value={`${overspentCount} / ${budgetSpending.length}`}
                  trendLabel="categories overspent"
                  tone={overspentCount === 0 ? "positive" : "negative"}
                  icon={<IconTarget className="h-5 w-5" />}
                />
              </div>

              {/* Overall progress */}
              <Card className="border border-border/70">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">Overall Usage</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(totalSpent)} of {formatCurrency(totalProratedBudget)} pro-rated
                      </p>
                    </div>
                    <span className={`text-2xl font-semibold ${
                      totalPercentage >= 90 ? "text-rose-600" :
                      totalPercentage >= 70 ? "text-amber-600" :
                      "text-emerald-600"
                    }`}>
                      {totalPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(totalPercentage, 100)}
                    className={`h-2.5 ${
                      totalPercentage >= 90 ? "[&>div]:bg-rose-500" :
                      totalPercentage >= 70 ? "[&>div]:bg-amber-500" :
                      "[&>div]:bg-emerald-500"
                    }`}
                  />
                </CardContent>
              </Card>

              {/* Chart + Table side by side */}
              <div className="grid gap-4 lg:grid-cols-5">
                {/* Budget vs Spending chart */}
                <Card className="border border-border/70 lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Budget vs Spending</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Pro-rated budget compared to actual spend by category
                    </p>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} barGap={4}>
                          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              formatCurrency(value),
                              name === "budget" ? "Budget" : "Spent",
                            ]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 12,
                            }}
                          />
                          <Bar dataKey="budget" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="spent" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                        No spending data yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top overspent / closest to limit */}
                <Card className="border border-border/70 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Attention Needed</CardTitle>
                    <p className="text-sm text-muted-foreground">Categories closest to or over limit</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[...budgetSpending]
                      .sort((a, b) => b.percentageUsed - a.percentageUsed)
                      .slice(0, 5)
                      .map((item) => (
                        <div key={item.budgetCategory} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{item.budgetCategory}</span>
                            <span className={`text-xs font-semibold ${
                              item.percentageUsed >= 90 ? "text-rose-600" :
                              item.percentageUsed >= 70 ? "text-amber-600" :
                              "text-emerald-600"
                            }`}>
                              {item.percentageUsed.toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(item.percentageUsed, 100)}
                            className={`h-1.5 ${
                              item.percentageUsed >= 90 ? "[&>div]:bg-rose-500" :
                              item.percentageUsed >= 70 ? "[&>div]:bg-amber-500" :
                              "[&>div]:bg-emerald-500"
                            }`}
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(item.actualSpent)}</span>
                            <span>{formatCurrency(item.proratedBudget)}</span>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>

              {/* Category breakdown table */}
              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Click the edit icon to adjust a category budget
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Monthly Budget</TableHead>
                        <TableHead className="text-right">Pro-rated</TableHead>
                        <TableHead className="text-right">Spent</TableHead>
                        <TableHead className="text-right">Projected</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-center w-[100px]">Usage</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetSpending.map((item) => {
                        const isEditing = editingCategory === item.budgetCategory
                        return (
                          <TableRow key={item.budgetCategory} className="h-[56px]">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {item.budgetCategory}
                                {item.isOverspent && (
                                  <IconAlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-24 h-8 text-right text-sm"
                                    disabled={isSaving}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveEdit(item.budgetCategory)
                                      if (e.key === "Escape") handleCancelEdit()
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => handleSaveEdit(item.budgetCategory)}
                                    disabled={isSaving}
                                  >
                                    <IconCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                  >
                                    <IconX className="h-3.5 w-3.5 text-rose-600" />
                                  </Button>
                                </div>
                              ) : (
                                formatCurrency(item.monthlyBudget)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(item.proratedBudget)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.actualSpent)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(item.projectedSpent)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${
                              item.remaining < 0 ? "text-rose-600" : "text-emerald-600"
                            }`}>
                              {item.remaining < 0 ? "-" : ""}{formatCurrency(Math.abs(item.remaining))}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  item.percentageUsed >= 90
                                    ? "bg-rose-500/10 text-rose-700 border-rose-200"
                                    : item.percentageUsed >= 70
                                      ? "bg-amber-500/10 text-amber-700 border-amber-200"
                                      : "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {item.percentageUsed.toFixed(0)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {!isEditing && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleStartEdit(item.budgetCategory, item.monthlyBudget)}
                                >
                                  <IconEdit className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {/* Totals row */}
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalMonthlyBudget)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(totalProratedBudget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalSpent)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(totalProjected)}</TableCell>
                        <TableCell className={`text-right ${totalRemaining > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatCurrency(totalRemaining)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              totalPercentage >= 90
                                ? "bg-rose-500/10 text-rose-700 border-rose-200"
                                : totalPercentage >= 70
                                  ? "bg-amber-500/10 text-amber-700 border-amber-200"
                                  : "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {totalPercentage.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
