/**
 * @module app/goals/page
 * @description Financial Goals page for Finova. Provides a comprehensive goal tracking
 * system with multiple tabs: Overview (active goals grid with progress), Savings Goals
 * (target-based savings with milestone tracking and area charts), Net Worth tracking
 * (historical net worth with asset breakdown charts), and FIRE calculator (Financial
 * Independence Retire Early with projections, SWP analysis, and line charts).
 * Supports adding/editing/deleting goals with icons, linking goals to investment accounts,
 * and computing FIRE numbers based on expenses and corpus targets. Data is fetched via
 * React Query from `/api/goals` and `/api/financial-health` endpoints.
 */
"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  IconCalendarEvent,
  IconCash,
  IconChartLine,
  IconCheck,
  IconChecklist,
  IconChevronDown,
  IconChevronUp,
  IconClockHour4,
  IconCoin,
  IconEdit,
  IconFlame,
  IconHomeDollar,
  IconLink,
  IconPigMoney,
  IconPlane,
  IconPlus,
  IconSchool,
  IconShieldCheck,
  IconTarget,
  IconTrendingUp,
  IconTrash,
  IconCar,
  IconHeart,
  IconDots,
  IconHeartbeat,
  IconBuildingBank,
  IconStar,
  IconX,
  IconArrowRight,
} from "@tabler/icons-react"

import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { AppSidebar } from "@/components/app-sidebar"
import { InfoTooltip } from "@/components/info-tooltip"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { stagger, fadeUp, fadeUpSmall, scaleIn, numberPop, listItem } from "@/lib/motion"
import { IncomeGoalTracker } from "@/components/wealth/income-goal-tracker"
import { HealthOverview } from "@/components/goals/health-overview"
import { NetWorthView } from "@/components/goals/net-worth-view"
import { BucketListTab } from "@/components/bucket-list/bucket-list-tab"

// ─── Types ───

interface LinkedTransaction {
  id: string
  date: string
  amount: number
  description: string
  matchReason: string
}

interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  monthlyContribution: number
  autoTrack: boolean
  category?: string
  linkedCategories?: string[]
  linkedKeywords?: string[]
  createdAt: string
  updatedAt: string
  percentageComplete: number
  onTrack: boolean
  requiredMonthly: number
  projectedCompletionDate: string | null
  monthsRemaining: number
  autoLinkedAmount?: number
  linkedTransactions?: LinkedTransaction[]
}

interface SipProjection {
  name: string
  current: number
  projected3y: number
  projected5y: number
  projected10y: number
}

interface EmergencyFundProgress {
  currentMonths: number
  targetMonths: number
  monthsToTarget: number
}

interface NetWorthProjectionPoint {
  year: number
  invested: number
  projected: number
}

interface FireData {
  fireNumber: number
  annualExpenses: number
  currentNetWorth: number
  progressPercent: number
  yearsToFIRE: number
  monthlyRequired: number
  projectionData: { year: number; netWorth: number; fireTarget: number }[]
}

interface PortfolioProjectionPoint {
  year: number
  stocks: number
  mutualFunds: number
  sips: number
  total: number
}

interface Projections {
  sipProjections: SipProjection[]
  emergencyFundProgress: EmergencyFundProgress
  netWorthProjection: NetWorthProjectionPoint[]
  fire: FireData
  portfolioProjection: PortfolioProjectionPoint[]
}

interface GoalFormData {
  name: string
  targetAmount: string
  targetDate: string
  monthlyContribution: string
  currentAmount: string
  category: string
}

interface AutoLinkSuggestion {
  goalId: string
  goalName: string
  transactionId: string
  transactionDesc: string
  transactionDate: string
  amount: number
  matchReason: string
}

// ─── Helpers ───

import { formatINR as formatCurrency, formatCompact, formatCompactAxis } from "@/lib/format"

const GOAL_CATEGORIES = [
  "Emergency Fund",
  "Car",
  "Vacation",
  "House",
  "Education",
  "Wedding",
  "Other",
]

// Transaction categories available for linking (from TransactionCategory enum)
const LINKABLE_CATEGORIES = [
  "Savings",
  "Investment",
  "Education",
  "Insurance",
  "Loan Payment",
  "Investment Income",
  "Other Income",
]

// Default linking config based on goal category
const LINK_DEFAULTS: Record<string, { categories: string[]; keywords: string[] }> = {
  "Emergency Fund": {
    categories: ["Savings"],
    keywords: ["savings", "FD", "RD", "emergency"],
  },
  "Investment": {
    categories: ["Investment"],
    keywords: ["mutual fund", "SIP", "ELSS", "PPF"],
  },
  "Education": {
    categories: ["Education"],
    keywords: ["education", "course", "tuition"],
  },
  "House": {
    categories: ["Savings", "Investment"],
    keywords: ["house", "home loan", "down payment"],
  },
  "Car": {
    categories: ["Savings"],
    keywords: ["car", "vehicle", "auto"],
  },
  "Vacation": {
    categories: ["Savings"],
    keywords: ["travel", "vacation", "trip"],
  },
  "Wedding": {
    categories: ["Savings"],
    keywords: ["wedding", "marriage"],
  },
  "default": {
    categories: ["Savings"],
    keywords: [],
  },
}

const EMPTY_FORM: GoalFormData = {
  name: "",
  targetAmount: "",
  targetDate: "",
  monthlyContribution: "",
  currentAmount: "",
  category: "",
}

function formatTimeline(dateStr: string): string | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) return "Date is in the past"
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const years = Math.floor(totalDays / 365)
  const remainingAfterYears = totalDays - years * 365
  const months = Math.floor(remainingAfterYears / 30)
  const days = remainingAfterYears - months * 30
  const parts: string[] = []
  if (years > 0) parts.push(`${years}y`)
  if (months > 0) parts.push(`${months}mo`)
  if (days > 0 && years === 0) parts.push(`${days}d`)
  return parts.join(" ") || "Today"
}

// Category color + icon mapping
const CATEGORY_CONFIG: Record<string, { color: string; ring: string; bg: string; icon: React.ComponentType<any>; border: string }> = {
  "Emergency Fund": {
    color: "text-lime-600 dark:text-lime-400",
    ring: "stroke-lime-500",
    bg: "bg-lime-500/10",
    border: "border-lime-500/20",
    icon: IconShieldCheck,
  },
  Car: {
    color: "text-blue-600 dark:text-blue-400",
    ring: "stroke-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: IconCar,
  },
  Vacation: {
    color: "text-amber-600 dark:text-amber-400",
    ring: "stroke-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: IconPlane,
  },
  House: {
    color: "text-primary",
    ring: "stroke-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    icon: IconHomeDollar,
  },
  Education: {
    color: "text-cyan-600 dark:text-cyan-400",
    ring: "stroke-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    icon: IconSchool,
  },
  Wedding: {
    color: "text-pink-600 dark:text-pink-400",
    ring: "stroke-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    icon: IconHeart,
  },
  Other: {
    color: "text-slate-600 dark:text-slate-400",
    ring: "stroke-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    icon: IconTarget,
  },
}

function getCategoryConfig(category?: string) {
  return CATEGORY_CONFIG[category || "Other"] || CATEGORY_CONFIG.Other
}

// ─── Circular Progress Ring (Apple-style with gradient stroke + glow) ───

function ProgressRing({
  percent,
  size = 56,
  strokeWidth = 4,
  className = "",
  ringClass = "stroke-primary",
  gradientId,
  glowColor,
  delay = 0,
}: {
  percent: number
  size?: number
  strokeWidth?: number
  className?: string
  ringClass?: string
  gradientId?: string
  glowColor?: string
  delay?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(percent, 0), 100)

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {glowColor && (
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-20"
          style={{ background: glowColor }}
        />
      )}
      <svg width={size} height={size} className="-rotate-90 relative">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeOpacity={0.5}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={gradientId ? undefined : ringClass}
          stroke={gradientId ? `url(#${gradientId})` : undefined}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ delay, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xs font-black tracking-tight tabular-nums">{Math.round(clamped)}%</span>
      </div>
    </div>
  )
}

// ─── Component ───

/**
 * Goals page component. Renders a four-tab interface: Overview (goal cards with progress),
 * Savings (savings goals with milestones, contribution history charts), Net Worth
 * (historical tracking with area charts), and FIRE (retirement calculator with
 * projection charts). Supports full CRUD for goals and FIRE configuration. Auth-guarded.
 * @returns The goals page wrapped in the app sidebar layout.
 */
export default function GoalsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Tab state from URL
  const tabParam = searchParams.get("tab")
  const validTabs = ["overview", "savings", "fire", "networth", "bucket-list"]
  const activeTab = validTabs.includes(tabParam || "") ? tabParam! : "overview"

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`/goals?${params.toString()}`, { scroll: false })
  }

  // Data state
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [projections, setProjections] = useState<Projections | null>(null)
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showContributionDialog, setShowContributionDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLinkSettingsDialog, setShowLinkSettingsDialog] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null)
  const [formData, setFormData] = useState<GoalFormData>(EMPTY_FORM)
  const [contributionAmount, setContributionAmount] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Link settings state
  const [linkCategories, setLinkCategories] = useState<string[]>([])
  const [linkKeywords, setLinkKeywords] = useState("")

  // Expanded linked transactions per goal
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())

  // Auto-link state
  const [autoLinkSuggestions, setAutoLinkSuggestions] = useState<AutoLinkSuggestion[]>([])
  const [showAutoLinkDialog, setShowAutoLinkDialog] = useState(false)
  const [dismissedAutoLinks, setDismissedAutoLinks] = useState<Set<string>>(new Set())
  const [confirmingAutoLink, setConfirmingAutoLink] = useState<string | null>(null)

  // ─── Data Loading ───

  const loadGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/savings-goals")
      const data = await res.json()
      if (data.success) setGoals(data.goals)
    } catch (err) {
      console.error("Failed to load goals:", err)
    }
  }, [])

  const loadProjections = useCallback(async () => {
    try {
      const res = await fetch("/api/projections")
      const data = await res.json()
      if (data.success) setProjections(data.projections)
    } catch (err) {
      console.error("Failed to load projections:", err)
    }
  }, [])

  const loadAutoLinkSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/savings-goals/auto-link")
      const data = await res.json()
      if (data.success) setAutoLinkSuggestions(data.suggestions || [])
    } catch (err) {
      console.error("Failed to load auto-link suggestions:", err)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return
    Promise.all([loadGoals(), loadProjections(), loadAutoLinkSuggestions()]).finally(() =>
      setLoading(false)
    )
  }, [isAuthenticated, loadGoals, loadProjections, loadAutoLinkSuggestions])

  // ─── CRUD Operations ───

  const createGoal = async () => {
    if (!formData.name || !formData.targetAmount || !formData.targetDate) return
    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        targetAmount: Number(formData.targetAmount),
        targetDate: formData.targetDate,
      }
      if (formData.monthlyContribution)
        payload.monthlyContribution = Number(formData.monthlyContribution)
      if (formData.currentAmount)
        payload.currentAmount = Number(formData.currentAmount)
      if (formData.category) payload.category = formData.category

      const res = await fetch("/api/savings-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        await loadGoals()
        setShowAddDialog(false)
        setFormData(EMPTY_FORM)
        toast.success("Goal created", { description: `"${formData.name}" added to your goals` })
      } else {
        toast.error("Failed to create goal")
      }
    } catch (err) {
      console.error("Failed to create goal:", err)
      toast.error("Network error creating goal")
    } finally {
      setIsSaving(false)
    }
  }

  const updateGoal = async () => {
    if (!selectedGoal || !formData.name || !formData.targetAmount || !formData.targetDate) return
    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        id: selectedGoal.id,
        name: formData.name,
        targetAmount: Number(formData.targetAmount),
        targetDate: formData.targetDate,
      }
      if (formData.monthlyContribution)
        payload.monthlyContribution = Number(formData.monthlyContribution)
      if (formData.currentAmount)
        payload.currentAmount = Number(formData.currentAmount)
      if (formData.category) payload.category = formData.category

      const res = await fetch("/api/savings-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        await loadGoals()
        setShowEditDialog(false)
        setSelectedGoal(null)
        setFormData(EMPTY_FORM)
        toast.success("Goal updated")
      } else {
        toast.error("Failed to update goal")
      }
    } catch (err) {
      console.error("Failed to update goal:", err)
      toast.error("Network error updating goal")
    } finally {
      setIsSaving(false)
    }
  }

  const deleteGoal = async () => {
    if (!selectedGoal) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/savings-goals?id=${selectedGoal.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        await loadGoals()
        setShowDeleteDialog(false)
        toast.success("Goal deleted", { description: `"${selectedGoal.name}" has been removed` })
        setSelectedGoal(null)
      } else {
        toast.error("Failed to delete goal")
      }
    } catch (err) {
      console.error("Failed to delete goal:", err)
      toast.error("Network error deleting goal")
    } finally {
      setIsSaving(false)
    }
  }

  const addContribution = async () => {
    if (!selectedGoal || !contributionAmount) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/savings-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedGoal.id,
          addAmount: Number(contributionAmount),
        }),
      })
      const data = await res.json()
      if (data.success) {
        await loadGoals()
        setShowContributionDialog(false)
        toast.success("Contribution added", { description: `${formatCurrency(Number(contributionAmount))} added to "${selectedGoal.name}"` })
        setSelectedGoal(null)
        setContributionAmount("")
      } else {
        toast.error("Failed to add contribution")
      }
    } catch (err) {
      console.error("Failed to add contribution:", err)
      toast.error("Network error adding contribution")
    } finally {
      setIsSaving(false)
    }
  }

  const saveLinkSettings = async () => {
    if (!selectedGoal) return
    setIsSaving(true)
    try {
      const keywords = linkKeywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)

      const res = await fetch("/api/savings-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedGoal.id,
          linkedCategories: linkCategories,
          linkedKeywords: keywords,
        }),
      })
      const data = await res.json()
      if (data.success) {
        await loadGoals()
        setShowLinkSettingsDialog(false)
        setSelectedGoal(null)
        toast.success("Link settings saved", {
          description: `Auto-contribution linking updated for "${selectedGoal.name}"`,
        })
      } else {
        toast.error("Failed to save link settings")
      }
    } catch (err) {
      console.error("Failed to save link settings:", err)
      toast.error("Network error saving link settings")
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Auto-Link Operations ───

  const acceptAutoLink = async (suggestion: AutoLinkSuggestion) => {
    setConfirmingAutoLink(suggestion.transactionId)
    try {
      const res = await fetch("/api/savings-goals/auto-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: suggestion.goalId,
          transactionId: suggestion.transactionId,
          amount: suggestion.amount,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Remove from suggestions
        setAutoLinkSuggestions((prev) =>
          prev.filter((s) => s.transactionId !== suggestion.transactionId)
        )
        await loadGoals()
        toast.success("Transaction linked", {
          description: `${formatCurrency(suggestion.amount)} added to "${suggestion.goalName}"`,
        })
      } else {
        toast.error("Failed to link transaction")
      }
    } catch (err) {
      console.error("Failed to accept auto-link:", err)
      toast.error("Network error linking transaction")
    } finally {
      setConfirmingAutoLink(null)
    }
  }

  const dismissAutoLink = (suggestion: AutoLinkSuggestion) => {
    setDismissedAutoLinks((prev) => new Set([...prev, suggestion.transactionId]))
    setAutoLinkSuggestions((prev) =>
      prev.filter((s) => s.transactionId !== suggestion.transactionId)
    )
  }

  // Filter out dismissed suggestions
  const pendingSuggestions = autoLinkSuggestions.filter(
    (s) => !dismissedAutoLinks.has(s.transactionId)
  )

  // ─── Dialog Helpers ───

  const openEditDialog = (goal: SavingsGoal) => {
    setSelectedGoal(goal)
    setFormData({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      targetDate: goal.targetDate.split("T")[0],
      monthlyContribution: String(goal.monthlyContribution),
      currentAmount: String(goal.currentAmount),
      category: goal.category || "",
    })
    setShowEditDialog(true)
  }

  const openContributionDialog = (goal: SavingsGoal) => {
    setSelectedGoal(goal)
    setContributionAmount("")
    setShowContributionDialog(true)
  }

  const openDeleteDialog = (goal: SavingsGoal) => {
    setSelectedGoal(goal)
    setShowDeleteDialog(true)
  }

  const openAddDialog = () => {
    setFormData(EMPTY_FORM)
    setShowAddDialog(true)
  }

  const openLinkSettingsDialog = (goal: SavingsGoal) => {
    setSelectedGoal(goal)
    setLinkCategories(goal.linkedCategories || [])
    setLinkKeywords((goal.linkedKeywords || []).join(", "))
    setShowLinkSettingsDialog(true)
  }

  const toggleLinkCategory = (cat: string, checked: boolean | "indeterminate") => {
    if (checked === true) {
      setLinkCategories((prev) => [...prev, cat])
    } else {
      setLinkCategories((prev) => prev.filter((c) => c !== cat))
    }
  }

  const applyLinkDefaults = () => {
    if (!selectedGoal) return
    const goalCat = selectedGoal.category || "default"
    const defaults = LINK_DEFAULTS[goalCat] || LINK_DEFAULTS["default"]
    setLinkCategories(defaults.categories)
    setLinkKeywords(defaults.keywords.join(", "))
  }

  const toggleExpandedGoal = (goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) {
        next.delete(goalId)
      } else {
        next.add(goalId)
      }
      return next
    })
  }

  // ─── Derived Values ───

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount + (g.autoLinkedAmount || 0), 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0)
  const onTrackCount = goals.filter((g) => g.onTrack).length
  const overallProgress =
    totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  // ─── Auth guards ───

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // ─── Render ───

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title="Goals & Financial Health"
        />
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto min-h-0">
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
          </div>
          <div className="relative z-[1] @container/main flex flex-1 flex-col gap-5 p-4 md:p-6">
            <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="goals-skeleton"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <GoalsLoadingSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="goals-content"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.15 } },
                }}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-5"
              >
                {/* ─── Stat Cards (Apple glassmorphism grid) ─── */}
                <motion.div
                  variants={fadeUp}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
                >
                  {[
                    {
                      label: "Total Saved",
                      value: formatCurrency(totalSaved),
                      sub: `${goals.length} active goal${goals.length !== 1 ? "s" : ""}`,
                      icon: IconCoin,
                      iconBg: "bg-lime-500/15",
                      iconColor: "text-lime-600 dark:text-lime-400",
                      glowColor: "oklch(0.72 0.19 135)",
                    },
                    {
                      label: "Total Target",
                      value: formatCurrency(totalTarget),
                      sub: `${overallProgress.toFixed(1)}% overall`,
                      icon: IconTarget,
                      iconBg: "bg-blue-500/15",
                      iconColor: "text-blue-600 dark:text-blue-400",
                      glowColor: "oklch(0.6 0.15 240)",
                    },
                    {
                      label: "On Track",
                      value: `${onTrackCount} / ${goals.length}`,
                      sub: goals.length > 0
                        ? `${((onTrackCount / goals.length) * 100).toFixed(0)}% on track`
                        : "No goals yet",
                      icon: IconCheck,
                      iconBg: "bg-emerald-500/15",
                      iconColor: "text-emerald-600 dark:text-emerald-400",
                      glowColor: "oklch(0.65 0.17 155)",
                    },
                    {
                      label: "FIRE Progress",
                      value: projections?.fire
                        ? `${projections.fire.progressPercent.toFixed(1)}%`
                        : "N/A",
                      sub: projections?.fire
                        ? `${projections.fire.yearsToFIRE.toFixed(1)} years to goal`
                        : "No projection data",
                      icon: IconFlame,
                      iconBg: "bg-orange-500/15",
                      iconColor: "text-orange-500",
                      glowColor: "oklch(0.7 0.18 50)",
                    },
                  ].map((stat, i) => {
                    const StatIcon = stat.icon
                    return (
                      <motion.div
                        key={stat.label}
                        variants={fadeUp}
                        className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden"
                      >
                        <div
                          className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.07] blur-2xl"
                          style={{ background: stat.glowColor }}
                        />
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} mb-3`}>
                          <StatIcon className={`h-4 w-4 ${stat.iconColor}`} />
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
                        <motion.p
                          variants={numberPop}
                          className="text-lg sm:text-xl font-black tracking-tight tabular-nums leading-tight truncate"
                        >
                          {stat.value}
                        </motion.p>
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">{stat.sub}</p>
                      </motion.div>
                    )
                  })}
                </motion.div>

                {/* ─── Income Goal Tracker ─── */}
                <IncomeGoalTracker />

                {/* ─── Tabs ─── */}
                <motion.div variants={fadeUpSmall}>
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
                    <div className="tab-scroll border-b border-border/50 pb-px -mx-1 px-1">
                      <TabsList variant="line" className="h-10 min-w-max">
                        <TabsTrigger value="overview">
                          <IconHeartbeat className="h-4 w-4" />
                          <span className="hidden sm:inline">Overview</span>
                          <span className="sm:hidden">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="savings">
                          <IconPigMoney className="h-4 w-4" />
                          <span className="hidden sm:inline">Savings Goals</span>
                          <span className="sm:hidden">Savings</span>
                        </TabsTrigger>
                        <TabsTrigger value="fire">
                          <IconFlame className="h-4 w-4" />
                          <span className="hidden sm:inline">Retire Early</span>
                          <span className="sm:hidden">FIRE</span>
                        </TabsTrigger>
                        <TabsTrigger value="networth">
                          <IconBuildingBank className="h-4 w-4" />
                          <span className="hidden sm:inline">Net Worth & Debt</span>
                          <span className="sm:hidden">Net Worth</span>
                        </TabsTrigger>
                        <TabsTrigger value="bucket-list">
                          <IconChecklist className="h-4 w-4" />
                          <span className="hidden sm:inline">Bucket List</span>
                          <span className="sm:hidden">Bucket</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* ─── Tab 0: Overview ─── */}
                    <TabsContent value="overview" className="space-y-5">
                      <HealthOverview />

                      {/* Auto-link suggestions banner (overview) */}
                      {pendingSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-card/80 backdrop-blur-xl border border-primary/20 rounded-2xl px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center size-8 rounded-xl bg-lime-500/10">
                                <IconLink className="size-4 text-lime-600 dark:text-lime-400" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">
                                  {pendingSuggestions.length} transaction{pendingSuggestions.length !== 1 ? "s" : ""} may be goal contributions
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  We found recent transactions that match your savings goal criteria
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="gap-1.5 shrink-0"
                              onClick={() => setShowAutoLinkDialog(true)}
                            >
                              Review
                              <IconArrowRight className="size-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {/* Goals summary */}
                      {goals.length > 0 ? (
                        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-5">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="flex size-8 items-center justify-center rounded-xl bg-lime-500/15">
                                <IconPigMoney className="h-4 w-4 text-lime-600 dark:text-lime-400" />
                              </div>
                              <h3 className="text-sm font-semibold">Savings Goals</h3>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs gap-1"
                              onClick={() => handleTabChange("savings")}
                            >
                              View All
                              <IconArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {goals.slice(0, 4).map((goal) => {
                              const autoLinked = goal.autoLinkedAmount || 0
                              const totalAmount = goal.currentAmount + autoLinked
                              const totalPct = Math.min(
                                goal.targetAmount > 0
                                  ? (totalAmount / goal.targetAmount) * 100
                                  : 0,
                                100
                              )
                              const config = getCategoryConfig(goal.category)
                              const CategoryIcon = config.icon
                              return (
                                <div key={goal.id} className="flex items-center gap-3">
                                  <div className={`rounded-lg p-1.5 ${config.bg} ${config.border} border`}>
                                    <CategoryIcon className={`h-3.5 w-3.5 ${config.color}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium truncate">{goal.name}</span>
                                      <span className="text-xs tabular-nums text-muted-foreground ml-2 shrink-0">
                                        {Math.round(totalPct)}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                                      <div
                                        className="h-1.5 rounded-full transition-all"
                                        style={{
                                          width: `${Math.max(totalPct, 1)}%`,
                                          background: totalPct >= 100 ? '#10b981' : totalPct >= 50 ? '#3b82f6' : '#f59e0b',
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[11px] text-muted-foreground">
                                        {formatCurrency(totalAmount)} of {formatCurrency(goal.targetAmount)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] px-1.5 py-0 font-medium ${
                                          goal.onTrack
                                            ? "border-lime-200 bg-lime-500/10 text-lime-700 dark:border-lime-800 dark:text-lime-400"
                                            : "border-destructive/20 bg-destructive/10 text-destructive"
                                        }`}
                                      >
                                        {goal.onTrack ? "On Track" : "Behind"}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {goals.length > 4 && (
                            <p className="text-[11px] text-muted-foreground mt-3 text-center">
                              + {goals.length - 4} more goal{goals.length - 4 !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-5">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="rounded-2xl bg-primary/10 p-3 mb-3">
                              <IconTarget className="h-6 w-6 text-primary/40" />
                            </div>
                            <p className="text-sm font-medium text-foreground mb-1">No savings goals yet</p>
                            <p className="text-xs text-muted-foreground mb-3">Set your first goal to start tracking progress</p>
                            <Button size="sm" className="gap-1.5" onClick={() => { handleTabChange("savings"); setTimeout(() => openAddDialog(), 100) }}>
                              <IconPlus className="h-4 w-4" />
                              Create Goal
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Bucket List Targets */}
                      <BucketListTargets />
                    </TabsContent>

                    {/* ─── Tab 1: Savings Goals ─── */}
                    <TabsContent value="savings" className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <IconPigMoney className="h-4 w-4 text-muted-foreground" />
                            <h2 className="text-sm font-semibold">Savings Goals</h2>
                            <InfoTooltip text="Set a target amount and date for each financial milestone. The app tracks whether you're saving enough each month to reach your goal on time." />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Track progress toward your financial milestones
                          </p>
                        </div>
                        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
                          <IconPlus className="h-4 w-4" />
                          Add Goal
                        </Button>
                      </div>

                      {/* Auto-link suggestions banner */}
                      {pendingSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-card/80 backdrop-blur-xl border border-primary/20 rounded-2xl px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center size-8 rounded-xl bg-lime-500/10">
                                <IconLink className="size-4 text-lime-600 dark:text-lime-400" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">
                                  {pendingSuggestions.length} transaction{pendingSuggestions.length !== 1 ? "s" : ""} may be goal contributions
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  We found recent transactions that match your savings goal criteria
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="gap-1.5 shrink-0"
                              onClick={() => setShowAutoLinkDialog(true)}
                            >
                              Review
                              <IconArrowRight className="size-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {goals.length === 0 ? (
                        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                          <div className="bg-gradient-to-br from-primary/5 via-lime-500/5 to-transparent">
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                              <div className="relative mb-6">
                                <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
                                <div className="relative rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 p-5">
                                  <IconTarget className="h-10 w-10 text-primary" />
                                </div>
                              </div>
                              <h3 className="text-lg font-black tracking-tight text-foreground">
                                Set Your First Savings Goal
                              </h3>
                              <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
                                Whether it is an emergency fund, a dream vacation, or a down payment on a house -- set a target and track your progress month by month.
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 mb-6">
                                {["Emergency Fund", "Vacation", "House", "Car", "Education"].map((example) => {
                                  const exConfig = getCategoryConfig(example)
                                  const ExIcon = exConfig.icon
                                  return (
                                    <span key={example} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ${exConfig.bg} ${exConfig.color} backdrop-blur-sm`}>
                                      <ExIcon className="h-3 w-3" />
                                      {example}
                                    </span>
                                  )
                                })}
                              </div>
                              <Button
                                onClick={openAddDialog}
                                size="sm"
                                className="gap-1.5"
                              >
                                <IconPlus className="h-4 w-4" />
                                Create Your First Goal
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                          {goals.map((goal, i) => {
                            const autoLinked = goal.autoLinkedAmount || 0
                            const totalAmount = goal.currentAmount + autoLinked
                            const totalPct = Math.min(
                              goal.targetAmount > 0
                                ? (totalAmount / goal.targetAmount) * 100
                                : 0,
                              100
                            )
                            const config = getCategoryConfig(goal.category)
                            const CategoryIcon = config.icon
                            const hasLinkedConfig =
                              (goal.linkedCategories && goal.linkedCategories.length > 0) ||
                              (goal.linkedKeywords && goal.linkedKeywords.length > 0)
                            const isExpanded = expandedGoals.has(goal.id)
                            const linkedTxns = goal.linkedTransactions || []

                            return (
                              <motion.div
                                key={goal.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                                className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
                              >
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                                <div className="p-4 sm:p-5">
                                  {/* Header */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-3">
                                      <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                                        <CategoryIcon className={`h-4 w-4 ${config.color}`} />
                                      </div>
                                      <div className="space-y-1">
                                        <h3 className="text-sm font-semibold leading-tight">{goal.name}</h3>
                                        <div className="flex items-center gap-1.5">
                                          {goal.category && (
                                            <Badge
                                              variant="secondary"
                                              className={`text-[11px] px-1.5 py-0 font-medium ${config.bg} ${config.color} border-0`}
                                            >
                                              {goal.category}
                                            </Badge>
                                          )}
                                          <Badge
                                            variant="outline"
                                            className={`text-[11px] px-2 py-0.5 font-medium ${
                                              goal.onTrack
                                                ? "border-lime-200 bg-lime-500/10 text-lime-700 dark:border-lime-800 dark:text-lime-400"
                                                : "border-destructive/20 bg-destructive/10 text-destructive"
                                            }`}
                                          >
                                            {goal.onTrack ? (
                                              <><IconCheck className="mr-0.5 h-3 w-3" /> On Track</>
                                            ) : (
                                              <><IconClockHour4 className="mr-0.5 h-3 w-3" /> Behind</>
                                            )}
                                          </Badge>
                                          {hasLinkedConfig && (
                                            <Badge
                                              variant="outline"
                                              className="text-[11px] px-1.5 py-0.5 font-medium border-lime-200 bg-lime-500/10 text-lime-700 dark:border-lime-800 dark:text-lime-400"
                                            >
                                              <IconLink className="mr-0.5 h-3 w-3" /> Linked
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        title="Link Settings"
                                        onClick={() => openLinkSettingsDialog(goal)}
                                      >
                                        <IconLink className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEditDialog(goal)}
                                      >
                                        <IconEdit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => openDeleteDialog(goal)}
                                      >
                                        <IconTrash className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Progress ring + amounts */}
                                  <div className="flex items-center gap-4 mb-4">
                                    <ProgressRing
                                      percent={totalPct}
                                      size={60}
                                      strokeWidth={5}
                                      ringClass={config.ring}
                                      delay={0.1 + i * 0.04}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline justify-between">
                                        <span className="text-lg font-black tracking-tight tabular-nums">
                                          {formatCurrency(totalAmount)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        of {formatCurrency(goal.targetAmount)} target
                                      </p>

                                      {/* Auto-linked breakdown */}
                                      {autoLinked > 0 && (
                                        <div className="text-[11px] text-muted-foreground mt-1.5 space-y-0.5">
                                          <div className="flex items-center gap-1">
                                            <IconCash className="h-3 w-3 shrink-0" />
                                            <span>Manual: {formatCurrency(goal.currentAmount)}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <IconLink className="h-3 w-3 shrink-0 text-lime-600 dark:text-lime-400" />
                                            <span>Auto-linked: {formatCurrency(autoLinked)}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Linear progress bar with gradient */}
                                  <div className="mb-4">
                                    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                                      <motion.div
                                        className="h-2 rounded-full"
                                        style={{
                                          background: `linear-gradient(90deg, ${
                                            totalPct >= 100 ? '#10b981, #34d399'
                                              : totalPct >= 50 ? '#3b82f6, #60a5fa'
                                              : '#f59e0b, #fbbf24'
                                          })`,
                                        }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(totalPct, 1)}%` }}
                                        transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                                      />
                                    </div>
                                    {/* Time-based progress */}
                                    {(() => {
                                      const timeline = formatTimeline(goal.targetDate)
                                      return timeline ? (
                                        <div className="flex items-center justify-between mt-1.5">
                                          <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                                            <IconClockHour4 className="h-3 w-3" />
                                            {timeline} remaining
                                          </span>
                                          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                                            {formatCurrency(goal.targetAmount - totalAmount)} to go
                                          </span>
                                        </div>
                                      ) : null
                                    })()}
                                  </div>

                                  {/* Details grid */}
                                  <div className="grid grid-cols-2 gap-2 mb-4">
                                    {[
                                      {
                                        label: "Target Date",
                                        value: new Date(goal.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
                                      },
                                      {
                                        label: "Months Left",
                                        value: goal.monthsRemaining > 0 ? `${goal.monthsRemaining}` : "Overdue",
                                      },
                                      {
                                        label: "Required/mo",
                                        value: formatCurrency(goal.requiredMonthly),
                                      },
                                      {
                                        label: "Projected",
                                        value: goal.projectedCompletionDate
                                          ? new Date(goal.projectedCompletionDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                                          : "N/A",
                                      },
                                    ].map((detail) => (
                                      <div key={detail.label} className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
                                        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{detail.label}</p>
                                        <p className="text-sm font-black tracking-tight mt-0.5 tabular-nums">{detail.value}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Add Contribution */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                                    onClick={() => openContributionDialog(goal)}
                                  >
                                    <IconCash className="h-4 w-4" />
                                    Add Contribution
                                  </Button>

                                  {/* Linked Transactions Expandable */}
                                  {linkedTxns.length > 0 && (
                                    <div className="mt-3">
                                      <button
                                        onClick={() => toggleExpandedGoal(goal.id)}
                                        className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                                      >
                                        <IconLink className="h-3 w-3 text-lime-600 dark:text-lime-400" />
                                        <span>
                                          {isExpanded ? "Hide" : "Show"} {linkedTxns.length} linked transaction{linkedTxns.length !== 1 ? "s" : ""}
                                        </span>
                                        {isExpanded ? (
                                          <IconChevronUp className="h-3 w-3 ml-auto" />
                                        ) : (
                                          <IconChevronDown className="h-3 w-3 ml-auto" />
                                        )}
                                      </button>
                                      <AnimatePresence>
                                        {isExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                                            className="overflow-hidden"
                                          >
                                            <div className="mt-2 rounded-lg border border-border overflow-hidden">
                                              <div className="max-h-48 overflow-y-auto">
                                                {linkedTxns.map((txn, idx) => (
                                                  <div
                                                    key={txn.id}
                                                    className={`flex items-center justify-between px-3 py-2 text-[11px] ${
                                                      idx !== linkedTxns.length - 1 ? "border-b border-border" : ""
                                                    }`}
                                                  >
                                                    <div className="flex-1 min-w-0 mr-2">
                                                      <p className="font-medium truncate">{txn.description}</p>
                                                      <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                                                        <span>
                                                          {new Date(txn.date).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "2-digit",
                                                          })}
                                                        </span>
                                                        <Badge
                                                          variant="outline"
                                                          className="text-[9px] px-1 py-0 font-normal border-lime-200/50 text-lime-600 dark:text-lime-400"
                                                        >
                                                          {txn.matchReason}
                                                        </Badge>
                                                      </div>
                                                    </div>
                                                    <span className="font-semibold tabular-nums text-lime-600 dark:text-lime-400 shrink-0">
                                                      {formatCurrency(txn.amount)}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* ─── Tab 2: FIRE Calculator ─── */}
                    <TabsContent value="fire" className="space-y-5">
                      {/* FIRE Info Banner */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden bg-card/80 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-5"
                      >
                        <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-orange-500/[0.06] blur-2xl" />
                        <div className="absolute top-3 right-3 opacity-[0.05]">
                          <IconFlame className="h-24 w-24" />
                        </div>
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/15">
                              <IconFlame className="h-4 w-4 text-orange-500" />
                            </div>
                            <p className="text-sm font-semibold">What is Early Retirement?</p>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                            Early Retirement means having enough invested that you can live off the returns without working. Your target amount = 25x your annual expenses. This is based on the 4% safe withdrawal rate -- if you withdraw 4% of your portfolio each year, it should last indefinitely.
                          </p>
                        </div>
                      </motion.div>

                      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden px-5 py-3">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-1">Assumptions</p>
                        <p className="text-xs text-muted-foreground">
                          12% annual return for equities, 8% for debt instruments, 6% inflation rate, 4% safe withdrawal rate.
                        </p>
                      </div>

                      {projections?.fire ? (
                        <>
                          {/* FIRE stat cards */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {[
                              {
                                label: "Target Amount",
                                value: formatCompact(projections.fire.fireNumber),
                                sub: "25x annual expenses",
                                icon: IconTarget,
                                iconBg: "bg-orange-500/15",
                                iconColor: "text-orange-500",
                              },
                              {
                                label: "Current Progress",
                                value: `${projections.fire.progressPercent.toFixed(1)}%`,
                                sub: formatCompact(projections.fire.currentNetWorth),
                                icon: IconTrendingUp,
                                iconBg: "bg-lime-500/15",
                                iconColor: "text-lime-600 dark:text-lime-400",
                              },
                              {
                                label: "Years to Goal",
                                value: projections.fire.yearsToFIRE < 100
                                  ? `${projections.fire.yearsToFIRE.toFixed(1)}`
                                  : "100+",
                                sub: "At current rate",
                                icon: IconCalendarEvent,
                                iconBg: "bg-blue-500/15",
                                iconColor: "text-blue-600 dark:text-blue-400",
                              },
                              {
                                label: "Monthly Required",
                                value: formatCompact(projections.fire.monthlyRequired),
                                sub: "To stay on track",
                                icon: IconCash,
                                iconBg: "bg-amber-500/15",
                                iconColor: "text-amber-600 dark:text-amber-400",
                              },
                            ].map((stat, i) => {
                              const FireStatIcon = stat.icon
                              return (
                                <motion.div
                                  key={stat.label}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                                  className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden"
                                >
                                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} mb-3`}>
                                    <FireStatIcon className={`h-4 w-4 ${stat.iconColor}`} />
                                  </div>
                                  <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
                                  <p className="text-lg sm:text-xl font-black tracking-tight tabular-nums leading-tight">{stat.value}</p>
                                  <p className="text-[11px] text-muted-foreground mt-1">{stat.sub}</p>
                                </motion.div>
                              )
                            })}
                          </div>

                          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
                            {/* FIRE Chart */}
                            <div className="lg:col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5">
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconFlame className="h-4 w-4 text-orange-500" />
                                <h3 className="text-sm font-semibold">Early Retirement Projection</h3>
                                <InfoTooltip text="Financial Independence means having 25x your annual expenses invested, so you can live off 4% annual returns." />
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">
                                Projected net worth vs retirement target over time
                              </p>
                              {projections.fire.projectionData.length > 0 ? (
                                <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={projections.fire.projectionData}>
                                    <defs>
                                      <linearGradient id="fireNwFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                                      </linearGradient>
                                      <linearGradient id="fireTargetFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="var(--border)" />
                                    <XAxis
                                      dataKey="year"
                                      tickLine={false}
                                      axisLine={false}
                                      tickMargin={8}
                                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                    />
                                    <YAxis
                                      tickLine={false}
                                      axisLine={false}
                                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                      tickFormatter={formatCompactAxis}
                                    />
                                    <Tooltip
                                      formatter={(value: number) => formatCurrency(value)}
                                      contentStyle={{
                                        backgroundColor: "color-mix(in srgb, var(--card) 95%, transparent)",
                                        color: "var(--card-foreground)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 16,
                                        backdropFilter: "blur(24px)",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                                      }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="netWorth"
                                      name="Net Worth"
                                      stroke="var(--chart-2)"
                                      fill="url(#fireNwFill)"
                                      strokeWidth={3}
                                      strokeOpacity={0.95}
                                      isAnimationActive={false}
                                      dot={false}
                                      activeDot={{ r: 5, fill: "var(--chart-2)" }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="fireTarget"
                                      name="Retirement Target"
                                      stroke="var(--chart-5)"
                                      fill="url(#fireTargetFill)"
                                      strokeWidth={2}
                                      strokeDasharray="8 4"
                                      strokeOpacity={0.8}
                                      isAnimationActive={false}
                                      dot={false}
                                      activeDot={{ r: 5, fill: "var(--chart-5)" }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="flex h-[200px] sm:h-[280px] items-center justify-center text-sm text-muted-foreground">
                                  No retirement projection data available.
                                </div>
                              )}
                            </div>

                            {/* Retirement Breakdown */}
                            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5">
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconTarget className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">Retirement Breakdown</h3>
                                <InfoTooltip text="The 25x rule: if you can accumulate 25 times your annual expenses and withdraw 4% per year, you can sustain your lifestyle indefinitely." />
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">
                                Key financial independence metrics
                              </p>

                              <div className="space-y-3">
                                {[
                                  {
                                    label: "Annual Expenses",
                                    value: formatCurrency(projections.fire.annualExpenses),
                                    icon: IconCash,
                                    iconColor: "text-foreground/70",
                                  },
                                  {
                                    label: "Current Net Worth",
                                    value: formatCurrency(projections.fire.currentNetWorth),
                                    icon: IconTrendingUp,
                                    iconColor: "text-lime-600 dark:text-lime-400",
                                  },
                                  {
                                    label: "Remaining to Goal",
                                    value: formatCurrency(projections.fire.fireNumber - projections.fire.currentNetWorth),
                                    icon: IconTarget,
                                    iconColor: "text-orange-500",
                                  },
                                ].map((item, idx) => {
                                  const BreakdownIcon = item.icon
                                  return (
                                    <motion.div
                                      key={item.label}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.1 + idx * 0.05, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                                      className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <BreakdownIcon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                                        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{item.label}</p>
                                      </div>
                                      <p className="text-lg sm:text-xl font-black tracking-tight mt-0.5 tabular-nums">{item.value}</p>
                                    </motion.div>
                                  )
                                })}

                                <div className="pt-1">
                                  <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="text-muted-foreground">Progress to FIRE</span>
                                    <span className="font-semibold tabular-nums">{projections.fire.progressPercent.toFixed(1)}%</span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-muted/70 overflow-hidden">
                                    <motion.div
                                      className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min(projections.fire.progressPercent, 100)}%` }}
                                      transition={{ delay: 0.2, duration: 0.5, ease: [0, 0, 0.2, 1] as const }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                          <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="mb-5 rounded-2xl bg-orange-500/10 p-4">
                              <IconFlame className="h-10 w-10 text-orange-400/40" />
                            </div>
                            <p className="text-base font-semibold text-foreground">
                              No retirement projection data available
                            </p>
                            <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                              Add investments and expense data to generate retirement projections
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ─── Projections (merged into Retire Early) ─── */}
                      {projections && (
                        <>
                          {/* SIP Projections Table */}
                          {projections.sipProjections.length > 0 && (
                            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5">
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconChartLine className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">SIP Projections</h3>
                                <InfoTooltip text="SIP (Systematic Investment Plan) projections estimate how your recurring mutual fund investments will grow, assuming historical average returns." />
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">
                                Projected growth of your SIP investments
                              </p>
                              <div className="rounded-lg border border-border/50 overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                                      <TableHead className="font-semibold whitespace-nowrap">Name</TableHead>
                                      <TableHead className="text-right font-semibold whitespace-nowrap">Current Value</TableHead>
                                      <TableHead className="text-right font-semibold whitespace-nowrap">3Y Projection</TableHead>
                                      <TableHead className="text-right font-semibold whitespace-nowrap">5Y Projection</TableHead>
                                      <TableHead className="text-right font-semibold whitespace-nowrap">10Y Projection</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {projections.sipProjections.map((sip, idx) => (
                                      <motion.tr
                                        key={sip.name}
                                        {...listItem(idx)}
                                        className="border-b border-border last:border-0"
                                      >
                                        <TableCell className="font-medium">
                                          {sip.name.length > 40
                                            ? `${sip.name.substring(0, 40)}...`
                                            : sip.name}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{formatCurrency(sip.current)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-lime-600 dark:text-lime-400">{formatCurrency(sip.projected3y)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-lime-600 dark:text-lime-400">{formatCurrency(sip.projected5y)}</TableCell>
                                        <TableCell className="text-right tabular-nums font-semibold text-lime-600 dark:text-lime-400">{formatCurrency(sip.projected10y)}</TableCell>
                                      </motion.tr>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}

                          {/* Portfolio Projection Chart */}
                          {projections.portfolioProjection.length > 0 && (
                            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5">
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconChartLine className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">Portfolio Projection</h3>
                                <InfoTooltip text="Projects how your total portfolio (stocks, mutual funds, SIPs) may grow over the next several years based on historical return assumptions." />
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">
                                Projected growth by asset class over time
                              </p>
                              <div className="chart-container">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projections.portfolioProjection}>
                                  <defs>
                                    <linearGradient id="stocksFill" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.4} />
                                      <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="mfFill" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="sipsFill" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid vertical={false} stroke="var(--border)" />
                                  <XAxis
                                    dataKey="year"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                  />
                                  <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                    tickFormatter={formatCompactAxis}
                                  />
                                  <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{
                                      backgroundColor: "color-mix(in srgb, var(--card) 95%, transparent)",
                                      color: "var(--card-foreground)",
                                      border: "1px solid var(--border)",
                                      borderRadius: 16,
                                      backdropFilter: "blur(24px)",
                                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="stocks"
                                    name="Stocks"
                                    stackId="1"
                                    stroke="var(--chart-4)"
                                    fill="url(#stocksFill)"
                                    strokeWidth={2}
                                    strokeOpacity={0.95}
                                    isAnimationActive={false}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="mutualFunds"
                                    name="Mutual Funds"
                                    stackId="1"
                                    stroke="var(--chart-1)"
                                    fill="url(#mfFill)"
                                    strokeWidth={2}
                                    strokeOpacity={0.95}
                                    isAnimationActive={false}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="sips"
                                    name="SIPs"
                                    stackId="1"
                                    stroke="var(--chart-2)"
                                    fill="url(#sipsFill)"
                                    strokeWidth={2}
                                    strokeOpacity={0.95}
                                    isAnimationActive={false}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {/* Net Worth Trajectory + Emergency Fund */}
                          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
                            {/* Net Worth Chart */}
                            <div className="lg:col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5">
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconChartLine className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">Net Worth Trajectory</h3>
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">
                                Invested amount vs projected growth over time
                              </p>
                              {projections.netWorthProjection.length > 0 ? (
                                <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={projections.netWorthProjection}>
                                    <defs>
                                      <linearGradient id="investedFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0.02} />
                                      </linearGradient>
                                      <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="var(--border)" />
                                    <XAxis
                                      dataKey="year"
                                      tickLine={false}
                                      axisLine={false}
                                      tickMargin={8}
                                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                    />
                                    <YAxis
                                      tickLine={false}
                                      axisLine={false}
                                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                      tickFormatter={formatCompactAxis}
                                    />
                                    <Tooltip
                                      formatter={(value: number) => formatCurrency(value)}
                                      contentStyle={{
                                        backgroundColor: "color-mix(in srgb, var(--card) 95%, transparent)",
                                        color: "var(--card-foreground)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 16,
                                        backdropFilter: "blur(24px)",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                                      }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="invested"
                                      name="Invested"
                                      stroke="var(--muted-foreground)"
                                      fill="url(#investedFill)"
                                      strokeWidth={2}
                                      strokeOpacity={0.8}
                                      isAnimationActive={false}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="projected"
                                      name="Projected"
                                      stroke="var(--chart-2)"
                                      fill="url(#projectedFill)"
                                      strokeWidth={3}
                                      strokeOpacity={0.95}
                                      isAnimationActive={false}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="flex h-[200px] sm:h-[280px] items-center justify-center text-sm text-muted-foreground">
                                  No net worth projection data available.
                                </div>
                              )}
                            </div>

                            {/* Emergency Fund Progress */}
                            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5">
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconPigMoney className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">Emergency Fund</h3>
                                <InfoTooltip text="An emergency fund covers unexpected expenses. The target is typically 3-6 months of your average monthly expenses held in liquid savings." />
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">
                                Progress toward your safety net
                              </p>
                              {projections.emergencyFundProgress ? (
                                <div className="space-y-5">
                                  <div className="flex flex-col items-center justify-center py-2">
                                    <div className="relative flex h-36 w-36 items-center justify-center">
                                      <div
                                        className="absolute inset-0 rounded-full opacity-20 blur-xl"
                                        style={{
                                          background:
                                            projections.emergencyFundProgress.currentMonths >= projections.emergencyFundProgress.targetMonths
                                              ? "var(--chart-2)"
                                              : "var(--chart-3)",
                                        }}
                                      />
                                      <svg
                                        className="h-36 w-36 -rotate-90 relative"
                                        viewBox="0 0 120 120"
                                      >
                                        <circle
                                          cx="60"
                                          cy="60"
                                          r="52"
                                          fill="none"
                                          stroke="var(--border)"
                                          strokeWidth="8"
                                        />
                                        <motion.circle
                                          cx="60"
                                          cy="60"
                                          r="52"
                                          fill="none"
                                          stroke={
                                            projections.emergencyFundProgress.currentMonths >=
                                            projections.emergencyFundProgress.targetMonths
                                              ? "var(--chart-2)"
                                              : "var(--chart-3)"
                                          }
                                          strokeWidth="8"
                                          strokeLinecap="round"
                                          initial={{ strokeDasharray: "0 326.73" }}
                                          animate={{
                                            strokeDasharray: `${Math.min(
                                              (projections.emergencyFundProgress.currentMonths /
                                                projections.emergencyFundProgress.targetMonths) *
                                                326.73,
                                              326.73
                                            )} 326.73`,
                                          }}
                                          transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                                        />
                                      </svg>
                                      <div className="absolute flex flex-col items-center">
                                        <motion.span
                                          variants={numberPop}
                                          className="text-2xl font-black tracking-tight tabular-nums"
                                        >
                                          {Math.min(
                                            Math.round((projections.emergencyFundProgress.currentMonths / projections.emergencyFundProgress.targetMonths) * 100),
                                            100
                                          )}%
                                        </motion.span>
                                        <span className="text-[11px] text-muted-foreground font-medium">
                                          {projections.emergencyFundProgress.currentMonths.toFixed(1)} of {projections.emergencyFundProgress.targetMonths} mo
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    {[
                                      { label: "Target", value: `${projections.emergencyFundProgress.targetMonths} months` },
                                      { label: "Current", value: `${projections.emergencyFundProgress.currentMonths.toFixed(1)} months` },
                                      {
                                        label: "Remaining",
                                        value: projections.emergencyFundProgress.monthsToTarget > 0
                                          ? `${projections.emergencyFundProgress.monthsToTarget} months to build`
                                          : "Target reached",
                                      },
                                    ].map((row, idx) => (
                                      <motion.div
                                        key={row.label}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + idx * 0.05, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                                        className="flex items-center justify-between text-xs rounded-xl border border-border/50 bg-muted/30 px-3 py-2"
                                      >
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className="font-black tracking-tight tabular-nums">{row.value}</span>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                                  No emergency fund data available.
                                </div>
                              )}
                            </div>
                          </div>

                          {projections.sipProjections.length === 0 &&
                            projections.portfolioProjection.length === 0 &&
                            projections.netWorthProjection.length === 0 && (
                              <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden">
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                  <div className="mb-5 rounded-2xl bg-primary/10 p-4">
                                    <IconChartLine className="h-10 w-10 text-primary/40" />
                                  </div>
                                  <p className="text-base font-semibold text-foreground">
                                    No projection data available
                                  </p>
                                  <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                                    Add stocks, mutual funds, or SIPs to see projections
                                  </p>
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    </TabsContent>

                    {/* ─── Tab 3: Net Worth & Debt ─── */}
                    <TabsContent value="networth" className="space-y-5">
                      <NetWorthView />
                    </TabsContent>

                    {/* ─── Tab 4: Bucket List ─── */}
                    <TabsContent value="bucket-list" className="space-y-5">
                      <BucketListTab />
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </SidebarInset>

      {/* ─── Add Goal Dialog ─── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Savings Goal</DialogTitle>
            <DialogDescription>
              Create a new savings goal to track your progress
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="goal-name">Name</Label>
              <Input
                id="goal-name"
                placeholder="e.g. Emergency Fund, New Car"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="goal-target">Target Amount</Label>
                <Input
                  id="goal-target"
                  type="number"
                  placeholder="500000"
                  value={formData.targetAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="goal-current">Current Amount</Label>
                <Input
                  id="goal-current"
                  type="number"
                  placeholder="0"
                  value={formData.currentAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="goal-date">Target Date</Label>
                <Input
                  id="goal-date"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetDate: e.target.value,
                    }))
                  }
                />
                {formData.targetDate && (
                  <p className={`text-[11px] font-medium ${
                    formatTimeline(formData.targetDate) === "Date is in the past"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}>
                    <IconClockHour4 className="inline h-3 w-3 mr-0.5 -mt-px" />
                    {formatTimeline(formData.targetDate)}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="goal-monthly">Monthly Contribution</Label>
                <Input
                  id="goal-monthly"
                  type="number"
                  placeholder="10000"
                  value={formData.monthlyContribution}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      monthlyContribution: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger id="goal-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createGoal}
              disabled={
                isSaving ||
                !formData.name ||
                !formData.targetAmount ||
                !formData.targetDate
              }
            >
              {isSaving ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Goal Dialog ─── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your savings goal details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-target">Target Amount</Label>
                <Input
                  id="edit-target"
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-current">Current Amount</Label>
                <Input
                  id="edit-current"
                  type="number"
                  value={formData.currentAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-date">Target Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetDate: e.target.value,
                    }))
                  }
                />
                {formData.targetDate && (
                  <p className={`text-[11px] font-medium ${
                    formatTimeline(formData.targetDate) === "Date is in the past"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}>
                    <IconClockHour4 className="inline h-3 w-3 mr-0.5 -mt-px" />
                    {formatTimeline(formData.targetDate)}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-monthly">Monthly Contribution</Label>
                <Input
                  id="edit-monthly"
                  type="number"
                  value={formData.monthlyContribution}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      monthlyContribution: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={updateGoal}
              disabled={
                isSaving ||
                !formData.name ||
                !formData.targetAmount ||
                !formData.targetDate
              }
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Contribution Dialog ─── */}
      <Dialog
        open={showContributionDialog}
        onOpenChange={setShowContributionDialog}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              {selectedGoal
                ? `Add funds to "${selectedGoal.name}"`
                : "Add funds to your goal"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedGoal && (
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-medium">
                    {formatCurrency(selectedGoal.currentAmount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-medium">
                    {formatCurrency(
                      selectedGoal.targetAmount - selectedGoal.currentAmount
                    )}
                  </span>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="contribution-amount">Amount</Label>
              <Input
                id="contribution-amount"
                type="number"
                placeholder="5000"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContributionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={addContribution}
              disabled={isSaving || !contributionAmount}
            >
              {isSaving ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Link Settings Dialog ─── */}
      <Dialog open={showLinkSettingsDialog} onOpenChange={setShowLinkSettingsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Settings{selectedGoal ? `: ${selectedGoal.name}` : ""}</DialogTitle>
            <DialogDescription>
              Auto-detect contributions from your transactions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Categories</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Transactions in these categories will count as contributions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {LINKABLE_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={linkCategories.includes(cat)}
                      onCheckedChange={(checked) => toggleLinkCategory(cat, checked)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="link-keywords" className="text-sm">Keywords</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Match transactions where description or merchant contains these terms
              </p>
              <Input
                id="link-keywords"
                placeholder="PPF, FD, savings (comma-separated)"
                value={linkKeywords}
                onChange={(e) => setLinkKeywords(e.target.value)}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={applyLinkDefaults}
            >
              <IconTarget className="h-3.5 w-3.5" />
              Apply Defaults for {selectedGoal?.category || "General"}
            </Button>

            {(linkCategories.length > 0 || linkKeywords.trim().length > 0) && (
              <div className="rounded-lg bg-lime-500/5 border border-lime-500/20 px-3 py-2">
                <p className="text-[11px] font-medium text-lime-600 dark:text-lime-400 mb-1">
                  Current linking config
                </p>
                {linkCategories.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Categories: {linkCategories.join(", ")}
                  </p>
                )}
                {linkKeywords.trim().length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Keywords: {linkKeywords}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveLinkSettings} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedGoal?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteGoal}
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Auto-Link Review Dialog ─── */}
      <Dialog open={showAutoLinkDialog} onOpenChange={setShowAutoLinkDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconLink className="h-4 w-4 text-lime-600 dark:text-lime-400" />
              Review Transaction Links
            </DialogTitle>
            <DialogDescription>
              These transactions match your savings goal criteria. Accept to add
              the amount to your goal, or dismiss to skip.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto -mx-1 px-1">
            {pendingSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-2xl bg-lime-500/10 p-3 mb-3">
                  <IconCheck className="h-6 w-6 text-lime-500" />
                </div>
                <p className="text-sm font-medium">All caught up</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No pending transaction suggestions
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingSuggestions.map((suggestion) => {
                  const goalConfig = getCategoryConfig(
                    goals.find((g) => g.id === suggestion.goalId)?.category
                  )
                  const isConfirming = confirmingAutoLink === suggestion.transactionId

                  return (
                    <div
                      key={`${suggestion.goalId}-${suggestion.transactionId}`}
                      className="rounded-lg border border-border p-3 transition-all hover:border-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {suggestion.transactionDesc}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 font-medium ${goalConfig.bg} ${goalConfig.color} border-0`}
                            >
                              {suggestion.goalName}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 font-normal border-lime-200/50 text-lime-600 dark:text-lime-400"
                            >
                              {suggestion.matchReason}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            <span>
                              {new Date(suggestion.transactionDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              })}
                            </span>
                            <span className="font-semibold text-foreground tabular-nums">
                              {formatCurrency(suggestion.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 hover:bg-lime-500/10 hover:border-lime-500/30 hover:text-lime-700 dark:hover:text-lime-400"
                            onClick={() => acceptAutoLink(suggestion)}
                            disabled={isConfirming}
                          >
                            {isConfirming ? (
                              <IconCoin className="h-3 w-3 animate-pulse" />
                            ) : (
                              <IconCheck className="h-3 w-3" />
                            )}
                            {isConfirming ? "Linking..." : "Accept"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => dismissAutoLink(suggestion)}
                            disabled={isConfirming}
                          >
                            <IconX className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAutoLinkDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

// ─── Loading Skeleton ───

function GoalsLoadingSkeleton() {
  return (
    <div className="space-y-5">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5">
            <Skeleton className="size-9 rounded-xl mb-3" />
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-24 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* Tabs skeleton */}
      <div className="space-y-5">
        <div className="border-b border-border/50">
          <div className="flex items-center gap-2 h-10">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-22 rounded" />
            <Skeleton className="h-5 w-28 rounded" />
          </div>
        </div>
        <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-[60px] w-[60px] rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2 space-y-1.5">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Bucket List Targets (shown in Overview tab) ─── */

interface BucketListItem {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  monthlyAllocation: number
  status: string
}

function BucketListTargets() {
  const [items, setItems] = React.useState<BucketListItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/bucket-list")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success) {
          const saving = (data.items || []).filter(
            (it: BucketListItem) => it.status === "saving"
          )
          setItems(saving.slice(0, 4))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15">
            <IconStar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold">Bucket List Targets</h3>
        </div>
        <Link href="/goals?tab=bucket-list" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all
          <IconArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const pct = item.targetAmount > 0
            ? Math.min((item.savedAmount / item.targetAmount) * 100, 100)
            : 0
          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="rounded-lg p-1.5 bg-amber-500/10 border border-amber-500/20">
                <IconStar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground ml-2 shrink-0">
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.max(pct, 1)}%`,
                      background: pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#3b82f6',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {formatCurrency(item.savedAmount)} of {formatCurrency(item.targetAmount)}
                  </span>
                  {item.monthlyAllocation > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {formatCurrency(item.monthlyAllocation)}/mo
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
