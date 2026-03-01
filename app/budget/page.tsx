/**
 * @module app/budget/page
 * @description Budget management page for Finova. Provides a full budgeting experience
 * with NWI (Needs-Wants-Investments) split configuration, per-category budget allocation,
 * real-time spend tracking against budgets with progress bars, overspend alerts,
 * budget history comparison, auto-suggest budgets from past spending, and bar chart
 * visualizations. Includes a "Ghost Budget" feature that tracks how much a perfect
 * budgeter would have saved. Data is sourced from the `useTransactions` hook and
 * NWI configuration from `useNWIConfig`. Supports partial month detection and
 * context banners for data edge cases.
 */
"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  IconPlus,
  IconTrash,
  IconX,
  IconWallet,
  IconArrowDown,
  IconTrendingUp,
  IconGauge,
  IconHome,
  IconShoppingCart,
  IconChartPie,
  IconPigMoney,
  IconMinus,
  IconHistory,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
  IconBell,
  IconCalculator,
  IconAdjustments,
} from "@tabler/icons-react"
import { motion, useInView } from "motion/react"

import { toast } from "sonner"
import { useTransactions } from "@/hooks/use-transactions"
import { useAuth } from "@/hooks/use-auth"
import { useNWIConfig, useUpdateNWIConfig } from "@/hooks/use-nwi-config"
import { calculateNWISplit } from "@/lib/nwi"
import type { NWIConfig, NWISplit } from "@/lib/types"
import { calculateCategoryBreakdown } from "@/lib/analytics"
import {
  getCurrentMonth,
  getMonthTransactions,
  isPartialMonth,
} from "@/lib/monthly-utils"
import { AppSidebar } from "@/components/app-sidebar"
import { ContextBanner } from "@/components/context-banner"
import { InfoTooltip } from "@/components/info-tooltip"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  calculateAllBudgetSpending,
  type BudgetPeriod,
  type BudgetSpending,
} from "@/lib/budget-utils"
import { DEFAULT_BUDGETS } from "@/lib/budget-mapping"
import { generateBudgetAlerts, type BudgetAlert } from "@/lib/budget-alerts"
import { stagger, fadeUp, fadeUpSmall, numberPop } from "@/lib/motion"
import { BudgetSuggestions } from "@/components/planning/budget-suggestions"
import { PlanAllocateView } from "@/components/budget/plan-allocate-view"
import { WhatIfView } from "@/components/budget/what-if-view"
import { SpendingDial } from "@/components/budget/spending-dial"
import { GhostBudgetCard } from "@/components/ghost-budget-card"

interface BudgetCategoryItem {
  id: string
  name: string
  transactionCategories: string[]
  description: string
  budgetAmount: number
}

interface BudgetHistoryEntry {
  id: string
  month: number
  year: number
  categories: {
    name: string
    budget: number
    spent: number
    percentage: number
  }[]
  totals: {
    totalBudget: number
    totalSpent: number
    overallPercentage: number
  }
  snapshotDate: string
}

import { formatINR as formatCurrency } from "@/lib/format"

const CHART_BUDGET = "var(--muted-foreground)"
const CHART_SPENT = "var(--chart-2)"

function getUsageColor(pct: number): string {
  if (pct >= 90) return "text-destructive"
  if (pct >= 70) return "text-amber-600 dark:text-amber-500"
  return "text-primary"
}

function getProgressClass(pct: number): string {
  if (pct >= 90) return "[&>div]:bg-destructive"
  if (pct >= 70) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-primary"
}

function getProgressGradient(pct: number): string {
  if (pct >= 90) return "from-red-500 to-red-600 dark:from-red-500 dark:to-red-600"
  if (pct >= 70) return "from-amber-400 to-amber-500 dark:from-amber-400 dark:to-amber-500"
  return "from-primary/80 to-primary"
}

const BUCKET_CONFIG = {
  needs: {
    label: "Needs",
    desc: "Rent, bills, groceries",
    icon: IconHome,
    color: "bg-foreground/70",
  },
  wants: {
    label: "Wants",
    desc: "Dining, shopping, fun",
    icon: IconShoppingCart,
    color: "bg-foreground/45",
  },
  investments: {
    label: "Invest",
    desc: "SIPs, stocks, loans",
    icon: IconChartPie,
    color: "bg-primary",
  },
  savings: {
    label: "Savings",
    desc: "Emergency, goals",
    icon: IconPigMoney,
    color: "bg-primary/50",
  },
} as const

// Custom tooltip for the chart
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const fullName = (item as unknown as { payload: { fullName: string } })?.payload?.fullName || label
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <p className="text-xs font-semibold mb-1.5">{fullName}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.dataKey === "budget" ? CHART_BUDGET : CHART_SPENT }}
            />
            <span className="text-muted-foreground">{entry.dataKey === "budget" ? "Budget" : "Spent"}</span>
          </div>
          <span className="font-semibold tabular-nums">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Budget page component. Renders a tabbed interface with Overview (NWI split,
 * category budgets, spend progress, ghost budget), Manage (add/edit/delete budget
 * categories, auto-suggest), and History (month-over-month comparison). Features
 * include overspend alerts, bar chart visualizations, and partial-month awareness.
 * Auth-guarded -- redirects to `/login` if unauthenticated.
 * @returns The budget page wrapped in the app sidebar layout.
 */
export default function BudgetPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { transactions, isLoading: transactionsLoading } = useTransactions()

  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS)
  const [categories, setCategories] = useState<BudgetCategoryItem[]>([])
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod | null>(null)
  const [budgetSpending, setBudgetSpending] = useState<BudgetSpending[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [budgetUpdatedAt, setBudgetUpdatedAt] = useState<string | null>(null)

  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const [nwiConfig, setNwiConfig] = useState<{
    needs: { percentage: number; categories: string[] }
    wants: { percentage: number; categories: string[] }
    investments: { percentage: number; categories: string[] }
    savings: { percentage: number; categories: string[] }
  } | null>(null)
  const [nwiDraft, setNwiDraft] = useState<{ needs: number; wants: number; investments: number; savings: number }>({ needs: 50, wants: 30, investments: 10, savings: 10 })
  const [nwiSaving, setNwiSaving] = useState(false)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dialogTarget, setDialogTarget] = useState<BudgetCategoryItem | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryAmount, setNewCategoryAmount] = useState("")
  const [newCategoryDesc, setNewCategoryDesc] = useState("")
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)

  // Rollover state
  const [rolloverFlags, setRolloverFlags] = useState<Record<string, boolean>>({})
  const [rolloverAmounts, setRolloverAmounts] = useState<Record<string, number>>({})

  // Budget history state
  const [budgetHistory, setBudgetHistory] = useState<BudgetHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedHistoryMonth, setExpandedHistoryMonth] = useState<string | null>(null)

  // Bucket list monthly allocation (for savings bucket display)
  const [bucketListAlloc, setBucketListAlloc] = useState<number>(0)

  // Alert state
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])

  // Active tab (supports deep linking via ?tab=plan etc.)
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabFromUrl || "current")

  const LOCAL_BUDGETS_KEY = "finance:budgets"
  const hasLocalEditsRef = useRef(false)

  type StoredBudgets = {
    budgets: Record<string, unknown>
    updatedAt?: string | null
  }

  const normalizeBudgets = useCallback((raw: Record<string, unknown>, validKeys?: string[]) => {
    const keys = validKeys || Object.keys(raw)
    const normalized: Record<string, number> = {}
    for (const key of keys) {
      const val = raw[key]
      const numeric = typeof val === "number" ? val : Number(val)
      normalized[key] = !Number.isNaN(numeric) && numeric >= 0 ? numeric : 0
    }
    return normalized
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/budget-categories")
      if (!res.ok) return
      const data = await res.json()
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories)
        const derived: Record<string, number> = {}
        for (const cat of data.categories as BudgetCategoryItem[]) {
          derived[cat.name] = cat.budgetAmount
        }
        setBudgets(derived)
        if (typeof window !== "undefined") {
          localStorage.setItem(
            LOCAL_BUDGETS_KEY,
            JSON.stringify({ budgets: derived, updatedAt: new Date().toISOString() })
          )
        }
      }
    } catch (err) {
      console.error("Failed to load budget categories:", err)
    }
  }, [])

  const loadBudgets = useCallback(async () => {
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
          // ignore
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
          // Load rollover flags from server response
          if (data.rolloverFlags) {
            setRolloverFlags(data.rolloverFlags)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load budgets:", error)
    }
  }, [normalizeBudgets])

  // Load budget history
  const loadBudgetHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/budgets/history?months=12")
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.history)) {
          setBudgetHistory(data.history)
        }
      }
    } catch (err) {
      console.error("Failed to load budget history:", err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Toggle rollover for a category
  const handleToggleRollover = useCallback(async (categoryName: string, enabled: boolean) => {
    // Optimistic update
    setRolloverFlags(prev => ({ ...prev, [categoryName]: enabled }))
    try {
      const res = await fetch("/api/budgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryName, rollover: enabled }),
      })
      const data = await res.json()
      if (!data.success) {
        // Revert on failure
        setRolloverFlags(prev => ({ ...prev, [categoryName]: !enabled }))
        toast.error(`Failed to update rollover for ${categoryName}`)
      } else {
        toast.success(`Rollover ${enabled ? "enabled" : "disabled"} for ${categoryName}`)
      }
    } catch {
      setRolloverFlags(prev => ({ ...prev, [categoryName]: !enabled }))
      toast.error("Network error updating rollover")
    }
  }, [])

  // Compute rollover amounts from previous month's history
  const computedRolloverAmounts = useMemo(() => {
    const amounts: Record<string, number> = {}
    if (budgetHistory.length < 2) return amounts
    // budgetHistory is sorted newest first, so index 1 is the previous month
    const prevMonth = budgetHistory[1]
    if (!prevMonth) return amounts
    for (const cat of prevMonth.categories) {
      if (rolloverFlags[cat.name]) {
        const unspent = cat.budget - cat.spent
        // Carry forward positive unspent, capped at 100% of base budget
        if (unspent > 0) {
          amounts[cat.name] = Math.min(unspent, cat.budget)
        }
      }
    }
    return amounts
  }, [budgetHistory, rolloverFlags])

  // Update rolloverAmounts when computed values change
  useEffect(() => {
    setRolloverAmounts(computedRolloverAmounts)
  }, [computedRolloverAmounts])

  const { data: nwiConfigData } = useNWIConfig()
  const updateNWIMutation = useUpdateNWIConfig()

  useEffect(() => {
    if (nwiConfigData?.success && nwiConfigData.config) {
      setNwiConfig(nwiConfigData.config)
      setNwiDraft({
        needs: nwiConfigData.config.needs.percentage,
        wants: nwiConfigData.config.wants.percentage,
        investments: nwiConfigData.config.investments.percentage,
        savings: nwiConfigData.config.savings?.percentage ?? 0,
      })
    }
  }, [nwiConfigData])

  const saveNwiPercentages = async () => {
    if (nwiDraft.needs + nwiDraft.wants + nwiDraft.investments + nwiDraft.savings !== 100) return
    setNwiSaving(true)
    try {
      await updateNWIMutation.mutateAsync({
        needs: { percentage: nwiDraft.needs, categories: nwiConfig?.needs.categories || [] },
        wants: { percentage: nwiDraft.wants, categories: nwiConfig?.wants.categories || [] },
        investments: { percentage: nwiDraft.investments, categories: nwiConfig?.investments.categories || [] },
        savings: { percentage: nwiDraft.savings, categories: nwiConfig?.savings?.categories || ['Savings'] },
      })
      toast.success("Spending split updated", { description: `${nwiDraft.needs}/${nwiDraft.wants}/${nwiDraft.investments}/${nwiDraft.savings}` })
      setSaveMessage("Split updated")
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (error) {
      console.error("Failed to save NWI config:", error)
      toast.error("Failed to save spending split")
    } finally {
      setNwiSaving(false)
    }
  }

  // Compute actual NWI split from transactions
  const nwiSplit: NWISplit | null = useMemo(() => {
    if (!nwiConfig || transactions.length === 0) return null
    const { year, month } = getCurrentMonth()
    const monthTxns = getMonthTransactions(transactions, year, month)
    const config: NWIConfig = {
      userId: "",
      needs: nwiConfig.needs as NWIConfig["needs"],
      wants: nwiConfig.wants as NWIConfig["wants"],
      investments: nwiConfig.investments as NWIConfig["investments"],
      savings: nwiConfig.savings as NWIConfig["savings"],
    }
    return calculateNWISplit(monthTxns, config)
  }, [nwiConfig, transactions])

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories()
      loadBudgets()
      loadBudgetHistory()
    }
  }, [isAuthenticated, loadCategories, loadBudgets, loadBudgetHistory])

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

    // Generate budget alerts
    const budgetInputs = Object.entries(budgets).map(([category, limit]) => ({
      category,
      limit: limit + (rolloverAmounts[category] ?? 0),
    }))
    const spendingInputs = spending.map(s => ({
      category: s.budgetCategory,
      total: s.actualSpent,
    }))
    const newAlerts = generateBudgetAlerts(budgetInputs, spendingInputs)
    setAlerts(newAlerts)
  }, [transactions, budgets, rolloverAmounts])

  // Show alert toasts on mount (once per session per month)
  useEffect(() => {
    if (!alerts.length) return
    const { year, month } = getCurrentMonth()
    const currentMonthKey = `${year}-${month}`
    const shown = typeof window !== "undefined" ? sessionStorage.getItem("budget-alerts-shown") : null
    if (shown === currentMonthKey) return

    alerts.slice(0, 3).forEach((alert, i) => {
      setTimeout(() => {
        if (alert.level === "exceeded") toast.error(alert.message)
        else if (alert.level === "critical") toast.warning(alert.message)
        else toast.info(alert.message)
      }, i * 500)
    })
    if (typeof window !== "undefined") {
      sessionStorage.setItem("budget-alerts-shown", currentMonthKey)
    }
  }, [alerts])

  // Fetch bucket list monthly allocation for savings display
  useEffect(() => {
    fetch("/api/bucket-list")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success) {
          const total = (data.items || []).reduce(
            (sum: number, it: Record<string, unknown>) => sum + ((it.monthlyAllocation as number) || 0),
            0
          )
          setBucketListAlloc(total)
        }
      })
      .catch(() => {})
  }, [])

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
        toast.success("Budget saved")
      }
    } catch {
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify({ budgets: newBudgets, updatedAt }))
      }
      setSaveMessage("Saved locally")
      toast.warning("Saved locally", { description: "Could not reach server. Changes saved to browser." })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) { setDialogError("Name is required"); return }
    const amount = parseFloat(newCategoryAmount) || 0
    if (amount < 0) { setDialogError("Amount must be >= 0"); return }
    setDialogLoading(true)
    setDialogError(null)
    try {
      const res = await fetch("/api/budget-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, budgetAmount: amount, description: newCategoryDesc.trim(), transactionCategories: [] }),
      })
      const data = await res.json()
      if (!data.success) { setDialogError(data.error || "Failed to create category"); return }
      await loadCategories()
      setShowAddDialog(false)
      resetDialogState()
      toast.success("Category added", { description: `"${name}" created with budget ${formatCurrency(amount)}` })
    } catch { setDialogError("Network error") } finally { setDialogLoading(false) }
  }

  const handleRenameCategory = async () => {
    if (!dialogTarget) return
    const name = newCategoryName.trim()
    if (!name) { setDialogError("Name is required"); return }
    setDialogLoading(true)
    setDialogError(null)
    try {
      const res = await fetch("/api/budget-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dialogTarget.id, name }),
      })
      const data = await res.json()
      if (!data.success) { setDialogError(data.error || "Failed to rename"); return }
      await loadCategories()
      setShowRenameDialog(false)
      resetDialogState()
      toast.success("Category renamed")
    } catch { setDialogError("Network error") } finally { setDialogLoading(false) }
  }

  const handleDeleteCategory = async () => {
    if (!dialogTarget) return
    setDialogLoading(true)
    setDialogError(null)
    try {
      const res = await fetch(`/api/budget-categories?id=${dialogTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) { setDialogError(data.error || "Failed to delete"); return }
      await loadCategories()
      setShowDeleteDialog(false)
      resetDialogState()
      toast.success("Category deleted")
    } catch { setDialogError("Network error") } finally { setDialogLoading(false) }
  }

  const resetDialogState = () => {
    setDialogTarget(null)
    setNewCategoryName("")
    setNewCategoryAmount("")
    setNewCategoryDesc("")
    setDialogError(null)
    setDialogLoading(false)
  }

  const openRenameDialog = (cat: BudgetCategoryItem) => {
    setDialogTarget(cat)
    setNewCategoryName(cat.name)
    setDialogError(null)
    setShowRenameDialog(true)
  }

  const openDeleteDialog = (cat: BudgetCategoryItem) => {
    setDialogTarget(cat)
    setDialogError(null)
    setShowDeleteDialog(true)
  }

  const totalMonthlyBudget = Object.values(budgets).reduce((sum, b) => sum + b, 0)
  const totalSpent = budgetSpending.reduce((sum, b) => sum + b.actualSpent, 0)
  const totalProjected = budgetSpending.reduce((sum, b) => sum + b.projectedSpent, 0)
  const totalPercentage = totalMonthlyBudget > 0 ? (totalSpent / totalMonthlyBudget) * 100 : 0
  const totalRemaining = totalMonthlyBudget - totalSpent

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

  const chartData = budgetSpending
    .filter((item) => item.actualSpent > 0 || item.monthlyBudget > 0)
    .map((item) => ({
      category: item.budgetCategory.length > 12 ? item.budgetCategory.substring(0, 10) + "..." : item.budgetCategory,
      fullName: item.budgetCategory,
      budget: Math.round(item.monthlyBudget),
      spent: Math.round(item.actualSpent),
    }))

  const isLoading = authLoading || transactionsLoading

  // Helper: get NWI bucket for a category (inline for useMemo below)
  const getBucket = (categoryName: string): "needs" | "wants" | "investments" | "savings" | null => {
    if (!nwiConfig) return null
    for (const key of ["needs", "wants", "investments", "savings"] as const) {
      if (nwiConfig[key]?.categories.includes(categoryName)) return key
    }
    return null
  }

  // Compute Needs vs Wants usage for the summary bar
  const nwiUsageSummary = useMemo(() => {
    if (!nwiConfig || budgetSpending.length === 0) return null
    const buckets = { needs: { budget: 0, spent: 0 }, wants: { budget: 0, spent: 0 }, investments: { budget: 0, spent: 0 }, savings: { budget: 0, spent: 0 } }
    for (const item of budgetSpending) {
      const bucket = getBucket(item.budgetCategory)
      if (bucket) {
        buckets[bucket].budget += item.monthlyBudget
        buckets[bucket].spent += item.actualSpent
      }
    }
    return buckets
  }, [nwiConfig, budgetSpending]) // eslint-disable-line react-hooks/exhaustive-deps

  // Budget dialogs (rendered outside shell to avoid nesting issues)
  const budgetDialogs = (
    <>
      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetDialogState() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget Category</DialogTitle>
            <DialogDescription>Create a new budget category to track spending.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Category Name</Label>
              <Input id="add-name" placeholder="e.g. Subscriptions" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-amount">Monthly Budget (INR)</Label>
              <Input id="add-amount" type="number" placeholder="5000" value={newCategoryAmount} onChange={(e) => setNewCategoryAmount(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-desc">Description (optional)</Label>
              <Input id="add-desc" placeholder="What this category covers..." value={newCategoryDesc} onChange={(e) => setNewCategoryDesc(e.target.value)} />
            </div>
            {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetDialogState() }} disabled={dialogLoading}>Cancel</Button>
            <Button onClick={handleAddCategory} disabled={dialogLoading}>{dialogLoading ? "Adding..." : "Add Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Category Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={(open) => { if (!open) { setShowRenameDialog(false); resetDialogState() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>Rename &quot;{dialogTarget?.name}&quot; to a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-name">New Name</Label>
              <Input id="rename-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleRenameCategory() }} autoFocus />
            </div>
            {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRenameDialog(false); resetDialogState() }} disabled={dialogLoading}>Cancel</Button>
            <Button onClick={handleRenameCategory} disabled={dialogLoading}>{dialogLoading ? "Renaming..." : "Rename"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) { setShowDeleteDialog(false); resetDialogState() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>Are you sure you want to delete &quot;{dialogTarget?.name}&quot;? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); resetDialogState() }} disabled={dialogLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={dialogLoading}>{dialogLoading ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  // ── Shell wrapper (sidebar + header) ──

  const shell = (children: React.ReactNode) => (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title="Budget"
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
        {/* Ambient glow orbs (dark mode only) */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
        </div>
        <div className="relative z-[1]">
          {children}
        </div>
      </SidebarInset>
      {budgetDialogs}
    </SidebarProvider>
  )

  if (authLoading) {
    return shell(
      <div className="flex min-h-[200px] items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  const findCat = (name: string) => categories.find((c) => c.name === name)
  const nwiTotal = nwiDraft.needs + nwiDraft.wants + nwiDraft.investments + nwiDraft.savings

  const attentionItems = [...budgetSpending]
    .sort((a, b) => b.percentageUsed - a.percentageUsed)
    .slice(0, 5)

  // Helper: get alert for a specific category
  const getAlertForCategory = (categoryName: string) =>
    alerts.find(a => a.category === categoryName)

  // Handler: reassign a category to a different NWI bucket
  const handleChangeBucket = async (categoryName: string, newBucket: "needs" | "wants" | "investments" | "savings") => {
    if (!nwiConfig) return
    // Remove from old bucket, add to new
    const updated = {
      needs: { percentage: nwiDraft.needs, categories: nwiConfig.needs.categories.filter(c => c !== categoryName) },
      wants: { percentage: nwiDraft.wants, categories: nwiConfig.wants.categories.filter(c => c !== categoryName) },
      investments: { percentage: nwiDraft.investments, categories: nwiConfig.investments.categories.filter(c => c !== categoryName) },
      savings: { percentage: nwiDraft.savings, categories: nwiConfig.savings?.categories.filter(c => c !== categoryName) || [] },
    }
    updated[newBucket].categories.push(categoryName)
    try {
      await updateNWIMutation.mutateAsync(updated)
      setNwiConfig({
        needs: updated.needs,
        wants: updated.wants,
        investments: updated.investments,
        savings: updated.savings,
      })
      toast.success(`${categoryName} moved to ${BUCKET_CONFIG[newBucket].label}`)
    } catch {
      toast.error("Failed to update category type")
    }
  }

  // Month name helper for history tab
  const getMonthLabel = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  // Adherence color for history
  const getAdherenceColor = (pct: number) => {
    if (pct > 100) return "text-destructive"
    if (pct >= 80) return "text-amber-600 dark:text-amber-500"
    return "text-primary"
  }
  const getAdherenceBg = (pct: number) => {
    if (pct > 100) return "bg-destructive/[0.06]"
    if (pct >= 80) return "bg-amber-500/[0.04]"
    return ""
  }

  return shell(
    <>
      <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
        {isLoading ? (
          <BudgetLoadingSkeleton />
        ) : (
          <motion.div
            className="page-content"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            {/* ─── Tabs: Current / History ─── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <motion.div variants={fadeUpSmall} className="border-b border-border/50 -mx-4 px-4">
                <div className="tab-scroll">
                  <TabsList variant="line" className="h-10 w-max min-w-full">
                    <TabsTrigger value="current">
                      Current Month
                    </TabsTrigger>
                    <TabsTrigger value="plan">
                      <IconCalculator className="h-3.5 w-3.5" />
                      Plan & Allocate
                    </TabsTrigger>
                    <TabsTrigger value="whatif">
                      <IconAdjustments className="h-3.5 w-3.5" />
                      What-If
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      <IconHistory className="h-3.5 w-3.5" />
                      History
                    </TabsTrigger>
                  </TabsList>
                </div>
              </motion.div>

                <TabsContent value="current" className="space-y-4 mt-0">

              {/* ─── Alert Banner ─── */}
              {alerts.length > 0 && (
                <motion.div initial={fadeUpSmall.hidden} animate={fadeUpSmall.show}>
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] dark:bg-destructive/[0.06] backdrop-blur-xl relative overflow-hidden p-4">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-destructive/20 to-transparent" />
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                        <IconBell className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-destructive mb-1">Budget Alerts</p>
                        <div className="space-y-1">
                          {alerts.map((alert) => (
                            <div key={alert.category} className="flex items-center gap-2 text-xs">
                              {alert.level === "exceeded" ? (
                                <IconAlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                              ) : alert.level === "critical" ? (
                                <IconAlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                              ) : (
                                <IconAlertTriangle className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-muted-foreground">{alert.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Stat Bar ─── */}
              <motion.div initial={fadeUp.hidden} animate={fadeUp.show}>
                <div className="metric-grid">
                  {[
                    {
                      label: "Total Spent",
                      value: formatCurrency(totalSpent),
                      sub: `of ${formatCurrency(totalMonthlyBudget)} budget`,
                      icon: IconWallet,
                      color: "",
                      iconBg: "bg-blue-500/15 dark:bg-blue-400/15",
                      iconColor: "text-blue-600 dark:text-blue-400",
                      glowColor: "oklch(0.6 0.15 240)",
                    },
                    {
                      label: "Budget Left",
                      value: `${totalRemaining < 0 ? "-" : ""}${formatCurrency(Math.abs(totalRemaining))}`,
                      sub: "Remaining this period",
                      icon: IconArrowDown,
                      color: totalRemaining >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive",
                      iconBg: totalRemaining >= 0 ? "bg-lime-500/15 dark:bg-lime-400/15" : "bg-destructive/15",
                      iconColor: totalRemaining >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive",
                      glowColor: totalRemaining >= 0 ? "oklch(0.7 0.19 145)" : "oklch(0.6 0.2 27)",
                    },
                    {
                      label: "Projected",
                      value: formatCurrency(totalProjected),
                      sub: "On track to spend",
                      icon: IconTrendingUp,
                      color: totalProjected <= totalMonthlyBudget ? "text-lime-600 dark:text-lime-400" : "text-destructive",
                      iconBg: "bg-violet-500/15 dark:bg-violet-400/15",
                      iconColor: "text-violet-600 dark:text-violet-400",
                      glowColor: "oklch(0.6 0.15 300)",
                    },
                    {
                      label: "Usage",
                      value: `${Math.min(totalPercentage, 999).toFixed(0)}%`,
                      sub: null as string | null,
                      icon: IconGauge,
                      color: getUsageColor(totalPercentage),
                      iconBg: "bg-amber-500/15 dark:bg-amber-400/15",
                      iconColor: "text-amber-600 dark:text-amber-400",
                      glowColor: "oklch(0.7 0.15 70)",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.06, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                      className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden"
                    >
                      {/* Ambient glow */}
                      <div
                        className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.08] blur-2xl"
                        style={{ background: stat.glowColor }}
                      />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                      <div className="flex items-start gap-3">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                          <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] sm:text-[13px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-1.5">
                            {stat.label}
                          </p>
                          <motion.p
                            initial={numberPop.hidden}
                            animate={numberPop.show}
                            className={`text-lg sm:text-2xl font-black tracking-tight tabular-nums leading-tight truncate ${stat.color}`}
                          >
                            {stat.value}
                          </motion.p>
                          {stat.sub ? (
                            <p className="text-[11px] text-muted-foreground mt-1">{stat.sub}</p>
                          ) : (
                            <div className="mt-2">
                              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(totalPercentage, 100)}%` }}
                                  transition={{ delay: 0.3, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                                  className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient(totalPercentage)}`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* ─── Pro-rating banner ─── */}
              {budgetPeriod && budgetPeriod.isPartialMonth && (
                <motion.div initial={fadeUpSmall.hidden} animate={fadeUpSmall.show}>
                  <ContextBanner
                    variant="info"
                    title={`${budgetPeriod.elapsedDays} of ${budgetPeriod.totalDays} days passed this month`}
                    description="Progress and remaining amounts are based on the full monthly budget."
                  />
                </motion.div>
              )}

              {/* ─── Spending Split (NWI) ─── */}
              {nwiConfig && (
                <SpendingDial
                  nwiDraft={nwiDraft}
                  setNwiDraft={setNwiDraft}
                  nwiSplit={nwiSplit}
                  nwiConfig={nwiConfig}
                  nwiTotal={nwiTotal}
                  nwiSaving={nwiSaving}
                  saveNwiPercentages={saveNwiPercentages}
                  bucketListAlloc={bucketListAlloc}
                  formatCurrency={formatCurrency}
                />
              )}

              {/* ─── Ghost Budget ─── */}
              <GhostBudgetCard />

              {/* ─── Chart + Attention ─── */}
              <motion.div initial={fadeUp.hidden} animate={fadeUp.show}>
                <div className="grid gap-4 lg:grid-cols-5">
                  {/* Budget vs Spending chart */}
                  <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5 lg:col-span-3">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                    {/* Ambient glow behind chart */}
                    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-primary/[0.04] blur-[80px]" />
                    <div className="relative mb-4">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold">Budget vs Spending</h3>
                        <InfoTooltip text="Gray bars show your full monthly budget. Dark olive bars show actual spending. If olive exceeds gray, you are over budget." />
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-0.5">Monthly budget compared to actual spend</p>
                    </div>
                    {chartData.length > 0 ? (
                      <div className="relative">
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barGap={4}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.3} />
                              <XAxis
                                dataKey="category"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                width={40}
                              />
                              <Tooltip
                                content={<ChartTooltip />}
                                cursor={{ fill: "var(--color-muted)", opacity: 0.3, radius: 4 }}
                              />
                              <Bar dataKey="budget" fill={CHART_BUDGET} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                              <Bar dataKey="spent" fill={CHART_SPENT} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <div className="size-2.5 rounded-full" style={{ backgroundColor: CHART_BUDGET }} />
                            Budget
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="size-2.5 rounded-full" style={{ backgroundColor: CHART_SPENT }} />
                            Spent
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-[200px] sm:h-[280px] lg:h-[320px] items-center justify-center text-sm text-muted-foreground">
                        No spending data yet.
                      </div>
                    )}
                  </div>

                  {/* Attention Needed */}
                  <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5 lg:col-span-2">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold">Attention Needed</h3>
                        <InfoTooltip text="Top 5 categories by usage. Categories at 90%+ need immediate attention." />
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-0.5">Categories closest to or over limit</p>
                    </div>
                    <div className="space-y-1.5">
                      {attentionItems.map((item, idx) => {
                        const isUrgent = item.percentageUsed >= 90
                        const isWarning = item.percentageUsed >= 70 && item.percentageUsed < 90
                        return (
                          <motion.div
                            key={item.budgetCategory}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + idx * 0.05, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                            className={`rounded-xl px-3 py-2.5 transition-colors ${
                              isUrgent
                                ? "bg-destructive/[0.06] dark:bg-destructive/[0.08]"
                                : isWarning
                                  ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.06]"
                                  : "hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                {isUrgent && (
                                  <IconAlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                                )}
                                <span className="text-sm font-medium">{item.budgetCategory}</span>
                              </div>
                              {item.percentageUsed > 100 ? (
                                <Badge variant="destructive" className="text-[11px] px-1.5 py-0 h-4">Over</Badge>
                              ) : (
                                <span className={`text-xs font-semibold tabular-nums ${getUsageColor(item.percentageUsed)}`}>
                                  {item.percentageUsed.toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden mb-1">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(item.percentageUsed, 100)}%` }}
                                transition={{ delay: 0.2 + idx * 0.05, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                                className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient(item.percentageUsed)}`}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              {formatCurrency(item.actualSpent)}
                              <span className="text-muted-foreground/50"> / </span>
                              {formatCurrency(item.monthlyBudget)}
                            </p>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ─── Needs vs Wants Usage ─── */}
              {nwiUsageSummary && (
                <motion.div initial={fadeUp.hidden} animate={fadeUp.show}>
                  <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                    <div className="flex items-center gap-1.5 mb-4">
                      <h3 className="text-sm font-semibold">Needs vs Wants Usage</h3>
                      <InfoTooltip text="Shows how much of your Needs and Wants budget has been spent this month. Based on category classifications in the table below." />
                    </div>
                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                      {(["needs", "wants", "investments", "savings"] as const).map((key, idx) => {
                        const cfg = BUCKET_CONFIG[key]
                        const BIcon = cfg.icon
                        const { budget, spent } = nwiUsageSummary[key]
                        const pct = budget > 0 ? (spent / budget) * 100 : 0
                        const left = budget - spent
                        const isOver = left < 0
                        const accentColors: Record<string, string> = {
                          needs: "border-l-foreground/50",
                          wants: "border-l-foreground/30",
                          investments: "border-l-primary",
                          savings: "border-l-primary/50",
                        }
                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                            className={`bg-muted/30 dark:bg-muted/20 rounded-xl p-3 space-y-2`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="flex size-6 items-center justify-center rounded-lg bg-card/60">
                                  <BIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <span className="text-xs font-semibold">{cfg.label}</span>
                              </div>
                              <span className={`text-[11px] font-semibold tabular-nums ${isOver ? "text-destructive" : pct >= 80 ? "text-amber-500" : "text-muted-foreground"}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(pct, 100)}%` }}
                                transition={{ delay: 0.2 + idx * 0.06, duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                                className={`h-full rounded-full ${
                                  isOver ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"
                                }`}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                              <span>{formatCurrency(spent)} spent</span>
                              <span className={isOver ? "text-destructive font-medium" : ""}>
                                {isOver ? `-${formatCurrency(Math.abs(left))} over` : `${formatCurrency(left)} left`}
                              </span>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Category Breakdown Table ─── */}
              <motion.div initial={fadeUp.hidden} animate={fadeUp.show}>
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden overflow-x-auto">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <h3 className="text-sm font-semibold">Category Breakdown</h3>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">Click edit to adjust a budget. Use + to add new categories.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BudgetSuggestions
                        currentBudgets={budgets}
                        onApply={saveBudgets}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => { resetDialogState(); setShowAddDialog(true) }}
                      >
                        <IconPlus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Category</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium w-[100px] hidden lg:table-cell">Type</TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wider font-medium">Budget</TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wider font-medium">Spent</TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wider font-medium hidden sm:table-cell">Left</TableHead>
                        <TableHead className="w-[180px] text-[11px] uppercase tracking-wider font-medium">Progress</TableHead>
                        <TableHead className="w-[120px] text-[11px] uppercase tracking-wider font-medium hidden md:table-cell">Rollover</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetSpending.map((item) => {
                        const isEditing = editingCategory === item.budgetCategory
                        const catItem = findCat(item.budgetCategory)
                        const catAlert = getAlertForCategory(item.budgetCategory)
                        const isRollover = rolloverFlags[item.budgetCategory] ?? false
                        const rolloverAmt = rolloverAmounts[item.budgetCategory] ?? 0
                        const effectiveBudget = item.monthlyBudget + (isRollover ? rolloverAmt : 0)
                        const effectiveLeft = effectiveBudget - item.actualSpent
                        const effectivePct = effectiveBudget > 0 ? (item.actualSpent / effectiveBudget) * 100 : 0
                        return (
                          <TableRow
                            key={item.budgetCategory}
                            className={`border-border group transition-colors hover:bg-muted/30 ${
                              catAlert?.level === "exceeded"
                                ? "bg-destructive/[0.03]"
                                : catAlert?.level === "critical"
                                  ? "bg-amber-500/[0.02]"
                                  : ""
                            }`}
                          >
                            <TableCell className="font-medium text-sm">
                              <div className="flex items-center gap-2">
                                {item.budgetCategory}
                                {catAlert?.level === "exceeded" && (
                                  <IconAlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                )}
                                {catAlert?.level === "critical" && (
                                  <IconAlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                )}
                                {catAlert?.level === "warning" && (
                                  <IconAlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                              {isRollover && rolloverAmt > 0 && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Base: {formatCurrency(item.monthlyBudget)} + Rollover: {formatCurrency(rolloverAmt)} = {formatCurrency(effectiveBudget)}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {nwiConfig ? (
                                <Select
                                  value={getBucket(item.budgetCategory) || ""}
                                  onValueChange={(val) => handleChangeBucket(item.budgetCategory, val as "needs" | "wants" | "investments" | "savings")}
                                >
                                  <SelectTrigger className="h-6 w-[90px] text-[11px] px-2 border-0 bg-muted/40 hover:bg-muted/60">
                                    <SelectValue placeholder="--" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="needs" className="text-xs">Needs</SelectItem>
                                    <SelectItem value="wants" className="text-xs">Wants</SelectItem>
                                    <SelectItem value="investments" className="text-xs">Invest</SelectItem>
                                    <SelectItem value="savings" className="text-xs">Savings</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">--</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-24 h-7 text-right text-sm"
                                    disabled={isSaving}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveEdit(item.budgetCategory)
                                      if (e.key === "Escape") handleCancelEdit()
                                    }}
                                  />
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(item.budgetCategory)} disabled={isSaving}>
                                    <IconCheck className="h-3.5 w-3.5 text-primary" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit} disabled={isSaving}>
                                    <IconX className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">{formatCurrency(effectiveBudget)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-sm">
                              {formatCurrency(item.actualSpent)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold tabular-nums text-sm hidden sm:table-cell ${effectiveLeft < 0 ? "text-destructive" : "text-primary"}`}>
                              {effectiveLeft < 0 ? "-" : ""}{formatCurrency(Math.abs(effectiveLeft))}
                            </TableCell>
                            <TableCell>
                              <div
                                className="relative"
                                title={`Budget: ${formatCurrency(effectiveBudget)} | Projected: ${formatCurrency(item.projectedSpent)}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${getProgressGradient(effectivePct)}`}
                                      style={{ width: `${Math.min(effectivePct, 100)}%` }}
                                    />
                                  </div>
                                  {effectivePct > 100 ? (
                                    <Badge variant="destructive" className="text-[11px] px-1.5 py-0 h-4 shrink-0">Over</Badge>
                                  ) : (
                                    <span className={`text-[11px] font-semibold w-9 text-right tabular-nums shrink-0 ${getUsageColor(effectivePct)}`}>
                                      {effectivePct.toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={isRollover}
                                  onCheckedChange={(checked) => handleToggleRollover(item.budgetCategory, checked)}
                                />
                                <span className="text-[11px] text-muted-foreground hidden lg:inline">Rollover</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isEditing && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleStartEdit(item.budgetCategory, item.monthlyBudget)}
                                    title="Edit budget"
                                  >
                                    <IconEdit className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {catItem && !isEditing && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground/60 hover:text-foreground"
                                      onClick={() => openRenameDialog(catItem)}
                                      title="Rename"
                                    >
                                      <IconEdit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground/60 hover:text-destructive"
                                      onClick={() => openDeleteDialog(catItem)}
                                      title="Delete"
                                    >
                                      <IconTrash className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      <TableRow className="border-t-2 border-border font-semibold hover:bg-transparent">
                        <TableCell className="text-sm">Total</TableCell>
                        <TableCell className="hidden lg:table-cell" />
                        <TableCell className="text-right tabular-nums text-sm">{formatCurrency(totalMonthlyBudget)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatCurrency(totalSpent)}</TableCell>
                        <TableCell className={`text-right tabular-nums text-sm hidden sm:table-cell ${totalMonthlyBudget - totalSpent > 0 ? "text-primary" : "text-destructive"}`}>
                          {totalMonthlyBudget - totalSpent < 0 ? "-" : ""}{formatCurrency(Math.abs(totalMonthlyBudget - totalSpent))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient(totalPercentage)}`}
                                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                              />
                            </div>
                            {totalPercentage > 100 ? (
                              <Badge variant="destructive" className="text-[11px] px-1.5 py-0 h-4 shrink-0">Over</Badge>
                            ) : (
                              <span className={`text-[11px] font-semibold w-9 text-right tabular-nums shrink-0 ${getUsageColor(totalPercentage)}`}>
                                {totalPercentage.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell" />
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </motion.div>

                </TabsContent>

                {/* ─── Plan & Allocate Tab ─── */}
                <TabsContent value="plan" className="space-y-4 mt-0">
                  <PlanAllocateView />
                </TabsContent>

                {/* ─── What-If Tab ─── */}
                <TabsContent value="whatif" className="space-y-4 mt-0">
                  <WhatIfView />
                </TabsContent>

                {/* ─── History Tab ─── */}
                <TabsContent value="history" className="space-y-4 mt-0">
                  <motion.div initial={fadeUp.hidden} animate={fadeUp.show}>
                    <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                      <div className="flex items-center justify-between px-5 py-4">
                        <div>
                          <h3 className="text-sm font-semibold">Budget History</h3>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">Monthly budget snapshots with spending comparison</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={async () => {
                            try {
                              await fetch("/api/budgets/history", { method: "POST" })
                              await loadBudgetHistory()
                              toast.success("Snapshot updated")
                            } catch {
                              toast.error("Failed to create snapshot")
                            }
                          }}
                        >
                          <IconRefresh className="h-3.5 w-3.5" />
                          Refresh Snapshot
                        </Button>
                      </div>
                      {historyLoading ? (
                        <div className="px-5 pb-5 space-y-3">
                          {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                          ))}
                        </div>
                      ) : budgetHistory.length === 0 ? (
                        <div className="px-5 pb-8 text-center text-sm text-muted-foreground">
                          No budget history yet. Visit this page each month to build history.
                        </div>
                      ) : (
                        <div className="px-4 sm:px-5 pb-5 space-y-2">
                          {budgetHistory.map((entry, hIdx) => {
                            const monthKey = `${entry.year}-${entry.month}`
                            const isExpanded = expandedHistoryMonth === monthKey
                            const adherencePct = entry.totals.overallPercentage
                            return (
                              <motion.div
                                key={monthKey}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: hIdx * 0.04, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                                className="rounded-xl border border-border/50 overflow-hidden"
                              >
                                <button
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${getAdherenceBg(adherencePct)}`}
                                  onClick={() => setExpandedHistoryMonth(isExpanded ? null : monthKey)}
                                >
                                  <div className="shrink-0">
                                    {isExpanded ? (
                                      <IconChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <IconChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold">{getMonthLabel(entry.month, entry.year)}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {formatCurrency(entry.totals.totalSpent)} of {formatCurrency(entry.totals.totalBudget)}
                                    </p>
                                  </div>
                                  {/* Mini sparkline (6-point inline SVG) */}
                                  <div className="hidden sm:block shrink-0 w-20 h-6">
                                    <MiniSparkline
                                      data={budgetHistory
                                        .slice(0, 6)
                                        .reverse()
                                        .map(h => h.totals.overallPercentage)}
                                      highlightIndex={budgetHistory.slice(0, 6).reverse().findIndex(
                                        h => h.year === entry.year && h.month === entry.month
                                      )}
                                    />
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className={`text-sm font-semibold tabular-nums ${getAdherenceColor(adherencePct)}`}>
                                      {adherencePct.toFixed(0)}%
                                    </span>
                                    <p className="text-[11px] text-muted-foreground">adherence</p>
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="border-t border-border">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent">
                                          <TableHead className="text-[11px] uppercase tracking-wider font-medium">Category</TableHead>
                                          <TableHead className="text-right text-[11px] uppercase tracking-wider font-medium">Budget</TableHead>
                                          <TableHead className="text-right text-[11px] uppercase tracking-wider font-medium">Spent</TableHead>
                                          <TableHead className="w-[120px] text-[11px] uppercase tracking-wider font-medium">Usage</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {entry.categories.map((cat) => (
                                          <TableRow key={cat.name} className="border-border hover:bg-muted/20">
                                            <TableCell className="text-xs font-medium">{cat.name}</TableCell>
                                            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                              {formatCurrency(cat.budget)}
                                            </TableCell>
                                            <TableCell className="text-right text-xs tabular-nums font-semibold">
                                              {formatCurrency(cat.spent)}
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                                                  <div
                                                    className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient(cat.percentage)}`}
                                                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                                  />
                                                </div>
                                                <span className={`text-[11px] font-semibold tabular-nums w-8 text-right ${getUsageColor(cat.percentage)}`}>
                                                  {cat.percentage.toFixed(0)}%
                                                </span>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </div>
    </>
  )
}

/**
 * Tiny inline SVG sparkline showing budget adherence trend.
 * data: array of percentage values (e.g. [85, 92, 78, 110, 95])
 * highlightIndex: optional index to highlight with a dot
 */
function MiniSparkline({ data, highlightIndex }: { data: number[]; highlightIndex?: number }) {
  if (data.length < 2) return null
  const w = 80
  const h = 24
  const padding = 2
  const maxVal = Math.max(...data, 100)
  const minVal = Math.min(...data, 0)
  const range = maxVal - minVal || 1

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * (w - padding * 2),
    y: padding + ((maxVal - val) / range) * (h - padding * 2),
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ")

  const avgPct = data.reduce((s, v) => s + v, 0) / data.length
  const strokeColor = avgPct > 100 ? "var(--destructive)" : avgPct >= 80 ? "var(--chart-3)" : "var(--chart-2)"

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      {highlightIndex !== undefined && highlightIndex >= 0 && highlightIndex < points.length && (
        <circle
          cx={points[highlightIndex].x}
          cy={points[highlightIndex].y}
          r={2.5}
          fill={strokeColor}
          stroke="var(--color-card)"
          strokeWidth={1}
        />
      )}
    </svg>
  )
}

function BudgetLoadingSkeleton() {
  return (
    <div className="page-content">
      {/* Tab bar placeholder */}
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />

      {/* Stat cards grid */}
      <div className="metric-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Attention cards grid */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5 lg:col-span-3 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-[200px] sm:h-[280px] lg:h-[320px] w-full rounded-lg" />
        </div>
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5 lg:col-span-2 space-y-3">
          <div className="space-y-1.5 mb-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <Skeleton className="h-5 w-5 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
