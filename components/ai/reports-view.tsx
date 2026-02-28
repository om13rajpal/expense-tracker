/**
 * AI Reports view — tabbed dashboard of AI-generated financial reports.
 * Provides four report types: Spending Analysis, Monthly Budget,
 * Weekly Budget, and Investment Insights, each with structured data
 * visualisations and markdown narrative sections.
 * @module components/ai/reports-view
 */
"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  IconSparkles,
  IconRefresh,
  IconReportAnalytics,
  IconTargetArrow,
  IconChartPie,
  IconLoader2,
  IconAlertTriangle,
  IconClock,
  IconBolt,
  IconArrowUpRight,
  IconArrowDownRight,
  IconInfoCircle,
  IconCircleCheck,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconBulb,
  IconShieldCheck,
} from "@tabler/icons-react"

import { useAuth } from "@/hooks/use-auth"
import { useAiInsight } from "@/hooks/use-ai-insights"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { InsightMarkdown } from "@/components/insight-markdown"
import { fadeUp } from "@/lib/motion"
import { formatINR as formatCurrency } from "@/lib/format"
import type { AiInsightType, InsightSection, MonthlyBudgetData, WeeklyBudgetData, InvestmentInsightsData } from "@/lib/ai-types"

/**
 * Metadata for each AI insight report type — controls the tab title,
 * description, icon, and colour theme.
 * @property type        - Discriminator matching the AiInsightType enum value.
 * @property title       - Human-readable tab label.
 * @property description - Short tagline shown in the report header.
 * @property icon        - Tabler icon component rendered next to the title.
 * @property iconBg      - Tailwind background class for the icon container.
 * @property iconColor   - Tailwind text colour class for the icon.
 */
interface InsightMeta {
  type: AiInsightType
  title: string
  description: string
  icon: React.ComponentType<any>
  iconBg: string
  iconColor: string
}

/** Configuration array for the four AI report tabs. */
const insightConfig: InsightMeta[] = [
  {
    type: "spending_analysis",
    title: "Spending Analysis",
    description: "AI-powered analysis of your spending patterns and financial health",
    icon: IconReportAnalytics,
    iconBg: "bg-muted/80 dark:bg-muted",
    iconColor: "text-foreground/70",
  },
  {
    type: "monthly_budget",
    title: "Monthly Budget",
    description: "Personalized budget allocation for the upcoming month",
    icon: IconTargetArrow,
    iconBg: "bg-muted/80 dark:bg-muted",
    iconColor: "text-foreground/70",
  },
  {
    type: "weekly_budget",
    title: "Weekly Budget",
    description: "Short-term spending targets for the coming week",
    icon: IconTargetArrow,
    iconBg: "bg-muted/80 dark:bg-muted",
    iconColor: "text-foreground/70",
  },
  {
    type: "investment_insights",
    title: "Investment Insights",
    description: "AI analysis of your SIPs, stocks, and mutual fund portfolio",
    icon: IconChartPie,
    iconBg: "bg-muted/80 dark:bg-muted",
    iconColor: "text-foreground/70",
  },
]

/**
 * Formats an ISO date string as a human-readable relative timestamp
 * (e.g. "3m ago", "Yesterday", "12 Jan").
 * @param iso - ISO 8601 date string.
 * @returns Relative time label.
 */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

/** Tailwind theme tokens (border, bg, icon, badge) for each insight severity level. */
const severityStyles: Record<string, { border: string; bg: string; icon: React.ComponentType<any>; iconColor: string; badge: string; badgeText: string }> = {
  positive: {
    border: "border-lime-200/70 dark:border-lime-800/50",
    bg: "bg-lime-50/50 dark:bg-lime-950/20",
    icon: IconArrowUpRight,
    iconColor: "text-lime-600 dark:text-lime-400",
    badge: "bg-lime-100 dark:bg-lime-900/40",
    badgeText: "text-lime-700 dark:text-lime-300",
  },
  warning: {
    border: "border-amber-200/70 dark:border-amber-800/50",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    icon: IconAlertTriangle,
    iconColor: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  critical: {
    border: "border-destructive/30 dark:border-destructive/40",
    bg: "bg-destructive/5 dark:bg-destructive/10",
    icon: IconArrowDownRight,
    iconColor: "text-destructive",
    badge: "bg-destructive/10",
    badgeText: "text-destructive",
  },
  neutral: {
    border: "border-border",
    bg: "bg-muted/30",
    icon: IconInfoCircle,
    iconColor: "text-muted-foreground",
    badge: "bg-muted",
    badgeText: "text-muted-foreground",
  },
}

/** Resolves the severity style config, defaulting to "neutral". */
function getSeverityStyle(severity?: string) {
  return severityStyles[severity || "neutral"] || severityStyles.neutral
}

/** Colour and label mapping for budget category status (on_track / over / under). */
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  on_track: { label: "On track", color: "text-lime-700 dark:text-lime-300", bg: "bg-lime-100 dark:bg-lime-900/40" },
  over: { label: "Over", color: "text-destructive", bg: "bg-destructive/10" },
  under: { label: "Under", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-900/40" },
}

/** Pill badge showing the budget category's status (On track / Over / Under). */
function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.on_track
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  )
}

/** Dot and text colour classes for action item priority levels (high / medium / low). */
const priorityColors: Record<string, { dot: string; text: string }> = {
  high: { dot: "bg-destructive", text: "text-destructive" },
  medium: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  low: { dot: "bg-lime-500", text: "text-lime-600 dark:text-lime-400" },
}

/**
 * Return shape of the {@link useAiInsight} hook, providing both raw
 * content and structured data for a single report type.
 * @property content        - Raw markdown string (null when not yet loaded).
 * @property sections       - Parsed InsightSection array from the AI response.
 * @property structuredData - Typed JSON payload for structured visualisations.
 * @property generatedAt    - ISO timestamp of when the insight was generated.
 * @property fromCache      - Whether the data was served from cache.
 * @property stale          - Whether the cached data is considered stale.
 * @property isLoading      - True during the initial fetch.
 * @property isRegenerating - True while a forced regeneration is in flight.
 * @property error          - Error message string, or null if no error.
 * @property regenerate     - Callback to force-regenerate the insight.
 */
interface InsightHookReturn {
  content: string | null
  sections: InsightSection[] | null
  structuredData: Record<string, unknown> | null
  generatedAt: string | null
  fromCache: boolean
  stale: boolean
  isLoading: boolean
  isRegenerating: boolean
  error: string | null
  regenerate: () => void
}

/**
 * Structured data shape returned by the spending_analysis AI report.
 * @property healthScore    - 0-100 composite financial health score.
 * @property summary        - Monthly income/expense/savings summary with a verdict.
 * @property topCategories  - Top spending categories with amounts, trends, and suggestions.
 * @property actionItems    - Prioritised money-saving recommendations.
 * @property alerts         - Financial warnings and positive highlights.
 * @property keyInsight     - One-sentence headline insight.
 */
interface SpendingAnalysisData {
  healthScore: number
  summary: { income: number; expenses: number; savings: number; savingsRate: number; verdict: string }
  topCategories: Array<{ name: string; amount: number; percentage: number; trend: "up" | "down" | "stable"; suggestion?: string }>
  actionItems: Array<{ title: string; description: string; impact: "high" | "medium" | "low"; savingAmount: number; category: string }>
  alerts: Array<{ type: "warning" | "critical" | "positive"; title: string; message: string }>
  keyInsight: string
}

/**
 * Shared wrapper that handles loading skeleton, error state, and
 * regenerating indicator for every report dashboard tab.
 */
function DashboardShell({
  meta,
  insight,
  children,
}: {
  meta: InsightMeta
  insight: InsightHookReturn
  children: React.ReactNode
}) {
  const isWorking = insight.isLoading || insight.isRegenerating
  const Icon = meta.icon

  const isApiKeyError =
    insight.error &&
    /api.?key|openrouter|unauthorized|401/i.test(insight.error)

  if (insight.isLoading) {
    return (
      <div className="space-y-4">
        <DashboardHeader meta={meta} insight={insight} isWorking={isWorking} Icon={Icon} />
        <LoadingSkeleton featured />
      </div>
    )
  }

  if (insight.error && !insight.content) {
    return (
      <div className="space-y-4">
        <DashboardHeader meta={meta} insight={insight} isWorking={isWorking} Icon={Icon} />
        <ErrorState error={insight.error} isApiKeyError={!!isApiKeyError} onRetry={insight.regenerate} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DashboardHeader meta={meta} insight={insight} isWorking={isWorking} Icon={Icon} />

      {insight.isRegenerating && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-accent px-3 py-2">
          <IconRefresh className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs font-medium text-primary">
            Regenerating with latest data...
          </span>
        </div>
      )}

      {children}
    </div>
  )
}

/**
 * SVG circular health score indicator with colour that shifts from
 * green (>=70) to amber (>=40) to red (<40).
 * @param score - Financial health score (0-100).
 */
function HealthScoreRing({ score }: { score: number }) {
  const radius = 54
  const stroke = 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 70 ? "text-lime-500" : score >= 40 ? "text-amber-500" : "text-destructive"

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: 128, height: 128 }}>
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${color} transition-all duration-1000 ease-out`}
            style={{ stroke: "currentColor" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black tracking-tight tabular-nums ${color}`}>{score}</span>
          <span className="text-[11px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Financial Health</span>
    </div>
  )
}

/**
 * Spending Analysis dashboard tab. Renders health score ring, summary
 * stats, top categories with trends, alerts, action items, and a
 * markdown key insight.
 */
function SpendingDashboard({
  meta,
  insight,
}: {
  meta: InsightMeta
  insight: InsightHookReturn
}) {
  const data = insight.structuredData as unknown as SpendingAnalysisData

  if (!data) {
    return <InsightCard meta={meta} insight={insight} featured />
  }

  const maxCategoryAmount = Math.max(...(data.topCategories?.map((c) => c.amount) ?? []), 1)

  return (
    <DashboardShell meta={meta} insight={insight}>
      {/* 1. Health Score + Summary */}
      <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 items-center justify-center">
            <HealthScoreRing score={data.healthScore} />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3">
            <StatTile label="Income" value={data.summary.income} color="text-lime-600 dark:text-lime-400" />
            <StatTile label="Expenses" value={data.summary.expenses} color="text-destructive" />
            <StatTile label="Savings" value={data.summary.savings} color="text-foreground/70" />
            <StatTile label="Savings Rate" value={data.summary.savingsRate} isPercent color="text-foreground/70" />
          </div>
        </div>
        {data.summary.verdict && (
          <p className="mt-3 text-sm text-muted-foreground">{data.summary.verdict}</p>
        )}
      </div>

      {/* 2. Top Categories */}
      {data.topCategories && data.topCategories.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Top Spending Categories
          </h4>
          <div className="space-y-2.5">
            {data.topCategories.map((cat) => {
              const TrendIcon =
                cat.trend === "up"
                  ? IconTrendingUp
                  : cat.trend === "down"
                    ? IconTrendingDown
                    : IconMinus
              const trendColor =
                cat.trend === "up"
                  ? "text-destructive"
                  : cat.trend === "down"
                    ? "text-lime-500"
                    : "text-muted-foreground"

              return (
                <div key={cat.name}>
                  <div className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm font-medium">
                      {cat.name}
                    </span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary/20 transition-all duration-700"
                        style={{ width: `${(cat.amount / maxCategoryAmount) * 100}%` }}
                      />
                    </div>
                    <TrendIcon className={`h-3.5 w-3.5 shrink-0 ${trendColor}`} />
                    <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                  {cat.suggestion && (
                    <p className="ml-[7.75rem] mt-0.5 text-[11px] italic text-muted-foreground">
                      {cat.suggestion}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Action Items */}
      {data.actionItems && data.actionItems.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Action Items
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.actionItems.map((item, i) => {
              const impact = priorityColors[item.impact] || priorityColors.low
              return (
                <div key={i} className="relative rounded-2xl border border-border bg-card p-4 overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="absolute right-3 top-3 flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${impact.dot}`} />
                    <span className={`text-[11px] font-medium ${impact.text}`}>
                      {item.impact}
                    </span>
                  </div>
                  <p className="pr-16 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {item.category}
                    </span>
                    {item.savingAmount > 0 && (
                      <span className="inline-flex rounded-full bg-lime-500/10 px-2 py-0.5 text-[11px] font-medium text-lime-600 dark:text-lime-400">
                        Save {formatCurrency(item.savingAmount)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => {
            const style = getSeverityStyle(alert.type)
            const AlertIcon = style.icon
            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} p-3.5`}
              >
                <AlertIcon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 5. Key Insight Callout */}
      {data.keyInsight && (
        <div className="rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex items-start gap-3">
            <IconSparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest text-primary">
                Key Insight
              </p>
              <p className="mt-1 text-sm leading-relaxed">{data.keyInsight}</p>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

/**
 * Monthly Budget dashboard tab. Renders suggested category budgets
 * with allocated amounts, percentages, and status badges, plus
 * a narrative AI summary.
 */
function MonthlyBudgetDashboard({
  meta,
  insight,
}: {
  meta: InsightMeta
  insight: InsightHookReturn
}) {
  const data = insight.structuredData as unknown as MonthlyBudgetData

  if (!data) {
    return <InsightCard meta={meta} insight={insight} featured />
  }

  const buckets = [
    { label: "Needs", data: data.needs, color: "bg-blue-500", trackColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-600 dark:text-blue-400", target: 50 },
    { label: "Wants", data: data.wants, color: "bg-amber-500", trackColor: "bg-amber-100 dark:bg-amber-900/30", textColor: "text-amber-600 dark:text-amber-400", target: 30 },
    { label: "Savings", data: data.savingsInvestments, color: "bg-lime-500", trackColor: "bg-lime-100 dark:bg-lime-900/30", textColor: "text-lime-600 dark:text-lime-400", target: 20 },
  ]

  return (
    <DashboardShell meta={meta} insight={insight}>
      {/* 1. Overview stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Income" value={data.totalIncome} color="text-lime-600 dark:text-lime-400" />
        <StatTile label="Budget" value={data.totalBudget} color="text-foreground/70" />
        <StatTile label="Surplus" value={data.surplus} color={data.surplus >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive"} />
      </div>

      {/* 2. 50/30/20 Bucket breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {buckets.map((bucket) => {
          const pct = bucket.data.percentage
          return (
            <div key={bucket.label} className="rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{bucket.label}</h4>
                <span className={`text-xs font-medium ${bucket.textColor}`}>
                  {pct.toFixed(0)}% <span className="text-muted-foreground">/ {bucket.target}%</span>
                </span>
              </div>
              {/* Percentage bar */}
              <div className={`mt-2 h-2 w-full overflow-hidden rounded-full ${bucket.trackColor}`}>
                <div
                  className={`h-full rounded-full ${bucket.color} transition-all duration-700`}
                  style={{ width: `${Math.min(pct / bucket.target * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs font-medium tabular-nums text-muted-foreground">
                {formatCurrency(bucket.data.total)}
              </p>
              {/* Categories */}
              <div className="mt-3 space-y-2">
                {bucket.data.categories.map((cat) => {
                  const computedCatStatus = cat.budgeted > 0
                    ? (cat.actual > cat.budgeted ? "over" : cat.actual < cat.budgeted * 0.8 ? "under" : "on_track")
                    : (cat.actual > 0 ? "over" : "on_track")
                  return (
                    <div key={cat.name} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs text-foreground/80">{cat.name}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(cat.actual)} / {formatCurrency(cat.budgeted)}
                        </span>
                        <StatusBadge status={computedCatStatus} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. Savings opportunities */}
      {data.savingsOpportunities && data.savingsOpportunities.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Savings Opportunities
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.savingsOpportunities.map((opp, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-lime-500/10">
                  <IconBulb className="h-4 w-4 text-lime-600 dark:text-lime-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{opp.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opp.description}</p>
                  <span className="mt-2 inline-flex rounded-full bg-lime-500/10 px-2 py-0.5 text-[11px] font-medium text-lime-600 dark:text-lime-400">
                    Save {formatCurrency(opp.amount)}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="space-y-2">
          {data.warnings.map((w, i) => {
            const style = getSeverityStyle(w.severity)
            const WarnIcon = style.icon
            return (
              <div key={i} className={`flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} p-3.5`}>
                <WarnIcon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{w.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{w.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 5. Positive note */}
      {data.positiveNote && (
        <div className="rounded-2xl border border-lime-200/70 bg-lime-50/50 p-4 dark:border-lime-800/50 dark:bg-lime-950/20 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex items-start gap-3">
            <IconCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime-600 dark:text-lime-400" />
            <p className="text-sm leading-relaxed">{data.positiveNote}</p>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

/**
 * Weekly Budget dashboard tab. Displays weekly spending targets
 * with daily allowances, focus areas, and an AI-written narrative.
 */
function WeeklyBudgetDashboard({
  meta,
  insight,
}: {
  meta: InsightMeta
  insight: InsightHookReturn
}) {
  const data = insight.structuredData as unknown as WeeklyBudgetData

  if (!data) {
    return <InsightCard meta={meta} insight={insight} featured />
  }

  const spentPct = data.weeklyTarget > 0 ? (data.spent / data.weeklyTarget) * 100 : 0

  return (
    <DashboardShell meta={meta} insight={insight}>
      {/* 1. Overview stat tiles + on-track indicator */}
      <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${data.onTrack ? "bg-lime-500" : "bg-destructive"}`} />
            <span className={`text-sm font-semibold ${data.onTrack ? "text-lime-600 dark:text-lime-400" : "text-destructive"}`}>
              {data.onTrack ? "On Track" : "Over Budget"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{data.daysRemaining} days remaining</span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${data.onTrack ? "bg-lime-500" : "bg-destructive"}`}
            style={{ width: `${Math.min(spentPct, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Spent: <span className="font-medium text-foreground">{formatCurrency(data.spent)}</span></span>
          <span>Target: <span className="font-medium text-foreground">{formatCurrency(data.weeklyTarget)}</span></span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatTile label="Remaining" value={data.remaining} color={data.remaining >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive"} />
          <StatTile label="Daily Limit" value={data.dailyLimit} color="text-foreground/70" />
          <StatTile label="Days Left" value={data.daysRemaining} color="text-foreground/70" isRaw />
        </div>
      </div>

      {/* 2. Category progress */}
      {data.categories && data.categories.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Category Budgets
          </h4>
          <div className="space-y-3">
            {data.categories.map((cat) => {
              const pct = cat.weeklyBudget > 0 ? (cat.spent / cat.weeklyBudget) * 100 : 0
              // Compute status from actual numbers instead of trusting AI label
              const computedStatus = cat.weeklyBudget > 0
                ? (cat.spent > cat.weeklyBudget ? "over" : cat.spent < cat.weeklyBudget * 0.8 ? "under" : "on_track")
                : (cat.spent > 0 ? "over" : "on_track")
              const barColor = computedStatus === "over" ? "bg-destructive" : computedStatus === "under" ? "bg-blue-500" : "bg-lime-500"
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(cat.spent)} / {formatCurrency(cat.weeklyBudget)}
                      </span>
                      <StatusBadge status={computedStatus} />
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Quick wins */}
      {data.quickWins && data.quickWins.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Quick Wins
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.quickWins.map((qw, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-500/10 text-xs font-bold text-lime-600 dark:text-lime-400">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{qw.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{qw.description}</p>
                  {qw.savingAmount > 0 && (
                    <span className="mt-2 inline-flex rounded-full bg-lime-500/10 px-2 py-0.5 text-[11px] font-medium text-lime-600 dark:text-lime-400">
                      Save {formatCurrency(qw.savingAmount)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="space-y-2">
          {data.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3.5 dark:border-amber-800/50 dark:bg-amber-950/20">
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{w.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{w.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Weekly rule callout */}
      {data.weeklyRule && (
        <div className="rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex items-start gap-3">
            <IconSparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest text-primary">
                Rule of the Week
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed">{data.weeklyRule}</p>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

/**
 * Investment Insights dashboard tab. Shows portfolio summary (total value,
 * returns, XIRR), sector allocation breakdown, individual holding cards,
 * and AI-generated recommendations.
 */

function InvestmentDashboard({
  meta,
  insight,
}: {
  meta: InsightMeta
  insight: InsightHookReturn
}) {
  const data = insight.structuredData as unknown as InvestmentInsightsData

  if (!data) {
    return <InsightCard meta={meta} insight={insight} featured />
  }

  const returnColor = data.totalReturns >= 0
    ? "text-lime-600 dark:text-lime-400"
    : "text-destructive"

  return (
    <DashboardShell meta={meta} insight={insight}>
      {/* 1. Portfolio overview */}
      <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Portfolio Value" value={data.portfolioValue} color="text-foreground" />
          <StatTile label="Total Invested" value={data.totalInvested} color="text-foreground/70" />
          <StatTile label="Returns" value={data.totalReturns} color={returnColor} />
          <StatTile label={data.xirr != null ? "XIRR" : "Return %"} value={data.xirr ?? data.returnPercentage} isPercent color={returnColor} />
        </div>
        {data.verdict && (
          <p className="mt-3 text-sm text-muted-foreground">{data.verdict}</p>
        )}
      </div>

      {/* 2. Stock holdings */}
      {data.stocks && data.stocks.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Stock Holdings
          </h4>
          <div className="space-y-3">
            {data.stocks.map((stock) => {
              const retColor = stock.returns >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive"
              const RetIcon = stock.returns >= 0 ? IconTrendingUp : IconTrendingDown
              return (
                <div key={stock.symbol} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{stock.symbol}</span>
                      <span className="truncate text-xs text-muted-foreground">{stock.name}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{stock.recommendation}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{formatCurrency(stock.currentValue)}</p>
                      <div className={`flex items-center justify-end gap-1 ${retColor}`}>
                        <RetIcon className="h-3 w-3" />
                        <span className="text-xs font-medium tabular-nums">
                          {stock.returnPercentage >= 0 ? "+" : ""}{stock.returnPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Mutual fund holdings */}
      {data.mutualFunds && data.mutualFunds.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Mutual Funds
          </h4>
          <div className="space-y-3">
            {data.mutualFunds.map((fund, i) => {
              const retColor = fund.returns >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive"
              const RetIcon = fund.returns >= 0 ? IconTrendingUp : IconTrendingDown
              return (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{fund.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {fund.sipAmount > 0 && (
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          SIP {formatCurrency(fund.sipAmount)}/mo
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{fund.recommendation}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{formatCurrency(fund.currentValue)}</p>
                      <div className={`flex items-center justify-end gap-1 ${retColor}`}>
                        <RetIcon className="h-3 w-3" />
                        <span className="text-xs font-medium tabular-nums">
                          {fund.returnPercentage >= 0 ? "+" : ""}{fund.returnPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Diversification */}
      {data.diversification && (
        <div className={`rounded-xl border ${getSeverityStyle(data.diversification.severity).border} ${getSeverityStyle(data.diversification.severity).bg} p-4`}>
          <div className="flex items-start gap-3">
            <IconShieldCheck className={`mt-0.5 h-4 w-4 shrink-0 ${getSeverityStyle(data.diversification.severity).iconColor}`} />
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
                Diversification
              </p>
              <p className="text-sm leading-relaxed">{data.diversification.assessment}</p>
              {data.diversification.suggestions.length > 0 && (
                <ul className="space-y-1">
                  {data.diversification.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-foreground/80">
                      <span className="shrink-0 text-muted-foreground">{"\u2022"}</span>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Action items */}
      {data.actionItems && data.actionItems.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Action Items
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.actionItems.map((item, i) => {
              const prio = priorityColors[item.priority] || priorityColors.low
              return (
                <div key={i} className="relative rounded-2xl border border-border bg-card p-4 overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="absolute right-3 top-3 flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${prio.dot}`} />
                    <span className={`text-[11px] font-medium ${prio.text}`}>{item.priority}</span>
                  </div>
                  <p className="pr-16 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 6. Market context + Goal alignment */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.marketContext && (
          <div className="rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Market Context</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{data.marketContext}</p>
          </div>
        )}
        {data.goalAlignment && (
          <div className="rounded-2xl border border-lime-200/70 bg-lime-50/50 p-4 dark:border-lime-800/50 dark:bg-lime-950/20 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Goal Alignment</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{data.goalAlignment}</p>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

/** Shared header bar for each report tab showing title, description, cache/stale status, and regenerate button. */
function DashboardHeader({
  meta,
  insight,
  isWorking,
  Icon,
}: {
  meta: InsightMeta
  insight: InsightHookReturn
  isWorking: boolean
  Icon: React.ComponentType<any>
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}
        >
          <Icon className={`h-[18px] w-[18px] ${meta.iconColor}`} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight">{meta.title}</h3>
          <p className="text-xs text-muted-foreground leading-snug">
            {meta.description}
          </p>
        </div>
        {insight.generatedAt && (
          <div className="flex items-center gap-1">
            <IconClock className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-[11px] text-muted-foreground/70">
              {relativeTime(insight.generatedAt)}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {insight.fromCache && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Cached
          </span>
        )}
        {insight.stale && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            <IconAlertTriangle className="h-3 w-3" />
            Stale
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={insight.regenerate}
          disabled={isWorking}
          className="h-8 shrink-0 gap-1 px-2.5 text-xs"
        >
          {isWorking ? (
            <IconRefresh className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <IconSparkles className="h-3.5 w-3.5" />
          )}
          <span>Regenerate</span>
        </Button>
      </div>
    </div>
  )
}

/**
 * Small stat tile used inside report dashboards to display a single
 * metric (currency, percentage, or raw number) with a coloured value.
 */
function StatTile({
  label,
  value,
  color,
  isPercent = false,
  isRaw = false,
}: {
  label: string
  value: number
  color: string
  isPercent?: boolean
  isRaw?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{label}</p>
      <p className={`mt-0.5 text-lg font-black tracking-tight tabular-nums ${color}`}>
        {isRaw ? value : isPercent ? `${value.toFixed(1)}%` : formatCurrency(value)}
      </p>
    </div>
  )
}

/**
 * Fallback insight card used when a report has no structured data
 * visualisation available. Renders the markdown content and parsed
 * section cards with loading/error/stale handling.
 */
function InsightCard({
  meta,
  insight,
  featured = false,
}: {
  meta: InsightMeta
  insight: InsightHookReturn
  featured?: boolean
}) {
  const isWorking = insight.isLoading || insight.isRegenerating
  const Icon = meta.icon

  const isApiKeyError =
    insight.error &&
    /api.?key|openrouter|unauthorized|401/i.test(insight.error)

  return (
    <div className="space-y-4">
      {/* Compact header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}
          >
            <Icon className={`h-[18px] w-[18px] ${meta.iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">{meta.title}</h3>
            <p className="text-xs text-muted-foreground leading-snug">
              {meta.description}
            </p>
          </div>
          {insight.generatedAt && (
            <div className="flex items-center gap-1">
              <IconClock className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground/70">
                {relativeTime(insight.generatedAt)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {insight.fromCache && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Cached
            </span>
          )}
          {insight.stale && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
              <IconAlertTriangle className="h-3 w-3" />
              Stale
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={insight.regenerate}
            disabled={isWorking}
            className="h-8 shrink-0 gap-1 px-2.5 text-xs"
          >
            {isWorking ? (
              <IconRefresh className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <IconSparkles className="h-3.5 w-3.5" />
            )}
            <span>Regenerate</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {insight.isLoading ? (
        <LoadingSkeleton featured={featured} />
      ) : insight.error && !insight.content ? (
        <ErrorState
          error={insight.error}
          isApiKeyError={!!isApiKeyError}
          onRetry={insight.regenerate}
        />
      ) : insight.content ? (
        <div className="space-y-3">
          {insight.isRegenerating && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-accent px-3 py-2">
              <IconRefresh className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs font-medium text-primary">
                Regenerating with latest data...
              </span>
            </div>
          )}

          {insight.sections && insight.sections.length > 0 ? (
            <SectionRenderer sections={insight.sections} />
          ) : (
            <InsightMarkdown content={insight.content} />
          )}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

/** Renders an array of InsightSection objects as a grid of SectionCard components. */
function SectionRenderer({ sections }: { sections: InsightSection[] }) {
  return (
    <div className="grid gap-3">
      {sections.map((section) => (
        <SectionCard key={section.id} section={section} />
      ))}
    </div>
  )
}

/**
 * Renders a single InsightSection as a styled card. Supports
 * "highlight", "action", and general section types with severity-based
 * colouring and optional key-value detail rows.
 */
function SectionCard({ section }: { section: InsightSection }) {
  const style = getSeverityStyle(section.severity)
  const SeverityIcon = style.icon

  if (section.type === "highlight") {
    return (
      <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${style.badge}`}>
            <IconCircleCheck className={`h-4 w-4 ${style.iconColor}`} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {section.title}
            </p>
            <div className="text-sm font-medium leading-relaxed">
              <InsightMarkdown content={section.highlight || ""} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (section.type === "summary") {
    return (
      <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${style.badge}`}>
            <SeverityIcon className={`h-4 w-4 ${style.iconColor}`} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {section.title}
            </p>
            <div className="text-sm leading-relaxed text-foreground/90">
              <InsightMarkdown content={section.text || ""} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // list or numbered_list
  const isNumbered = section.type === "numbered_list"
  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${style.badge}`}>
          <SeverityIcon className={`h-4 w-4 ${style.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
            {section.title}
          </p>
          {section.text && (
            <div className="text-sm leading-relaxed text-foreground/90">
              <InsightMarkdown content={section.text} />
            </div>
          )}
          {section.items && section.items.length > 0 && (
            <ul className="space-y-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-0.5 shrink-0 text-xs font-medium text-muted-foreground/70">
                    {isNumbered ? `${i + 1}.` : "\u2022"}
                  </span>
                  <span className="text-foreground/90">
                    <InsightMarkdown content={item} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/** Pulse skeleton placeholder shown while an AI report is being generated. */
function LoadingSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      {featured && (
        <>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full rounded-2xl border border-border" />
        </>
      )}
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  )
}

/** Error state banner with specific messaging for API key issues and a Retry button. */
function ErrorState({
  error,
  isApiKeyError,
  onRetry,
}: {
  error: string
  isApiKeyError: boolean
  onRetry: () => void
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 dark:border-destructive/40 dark:bg-destructive/10">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
          <IconAlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0 space-y-2">
          {isApiKeyError ? (
            <p className="text-sm font-medium text-destructive">
              AI Insights requires an OpenRouter API key. Add{" "}
              <code className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs">
                OPENROUTER_API_KEY
              </code>{" "}
              to your environment variables.
            </p>
          ) : (
            <p className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 gap-1 text-xs"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Placeholder shown when there is no generated content or sections for a report. */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground/70">
        Generating insight...
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        This may take a moment
      </p>
    </div>
  )
}

/**
 * Top-level AI Reports page exported for the `/ai` route's "Reports" tab.
 * Renders a tab bar with four AI-generated report dashboards:
 * Spending Analysis, Monthly Budget, Weekly Budget, and Investment Insights.
 * Auth-guarded: redirects to `/login` when not authenticated.
 */
export function ReportsView() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const analysis = useAiInsight("spending_analysis")
  const monthlyRecs = useAiInsight("monthly_budget")
  const weeklyRecs = useAiInsight("weekly_budget")
  const investmentInsights = useAiInsight("investment_insights")

  const allInsights = [analysis, monthlyRecs, weeklyRecs, investmentInsights]
  const isAnyRegenerating = allInsights.some((i) => i.isRegenerating)

  const regenerateAll = () => {
    for (const insight of allInsights) {
      insight.regenerate()
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const renderDashboard = (config: InsightMeta, insight: InsightHookReturn) => {
    if (config.type === "spending_analysis" && insight.structuredData) {
      return <SpendingDashboard meta={config} insight={insight} />
    }
    if (config.type === "monthly_budget" && insight.structuredData) {
      return <MonthlyBudgetDashboard meta={config} insight={insight} />
    }
    if (config.type === "weekly_budget" && insight.structuredData) {
      return <WeeklyBudgetDashboard meta={config} insight={insight} />
    }
    if (config.type === "investment_insights" && insight.structuredData) {
      return <InvestmentDashboard meta={config} insight={insight} />
    }
    return <InsightCard meta={config} insight={insight} featured />
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-5 p-5">
        <Tabs defaultValue="spending_analysis" className="flex flex-col gap-4">
          {/* Tab bar with regenerate all */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <TabsList className="h-auto w-full justify-start gap-1 bg-muted/50 p-1 sm:w-auto">
              {insightConfig.map((config) => {
                const Icon = config.icon
                return (
                  <TabsTrigger
                    key={config.type}
                    value={config.type}
                    className="gap-1.5 rounded-lg px-3 py-2 text-xs data-[state=active]:shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{config.title}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <div className="flex items-center gap-3">
              {allInsights.every((i) => i.isLoading) ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {allInsights.filter((i) => i.content).length}/{allInsights.length} ready
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateAll}
                disabled={isAnyRegenerating}
                className="h-8 gap-1.5 text-xs"
              >
                {isAnyRegenerating ? (
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <IconBolt className="h-3.5 w-3.5" />
                )}
                Regenerate All
              </Button>
            </div>
          </motion.div>

          {/* Tab content panels */}
          {insightConfig.map((config, idx) => (
            <TabsContent key={config.type} value={config.type} className="mt-0">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
              >
                {renderDashboard(config, allInsights[idx])}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
