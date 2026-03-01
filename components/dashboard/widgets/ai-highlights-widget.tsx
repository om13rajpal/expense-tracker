"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconSparkles,
  IconRefresh,
  IconBolt,
  IconBulb,
  IconAlertTriangle,
  IconCircleCheck,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from "@tabler/icons-react"
import { useAiInsight } from "@/hooks/use-ai-insights"
import { formatCompact } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

/* ─── Inline structured data shape ─── */
interface SpendingAnalysis {
  healthScore: number
  keyInsight: string
  summary: {
    income: number
    expenses: number
    savings: number
    savingsRate: number
    verdict: string
  }
  actionItems: {
    title: string
    description: string
    impact: "high" | "medium" | "low"
    savingAmount: number
    category: string
  }[]
  alerts: {
    type: "warning" | "critical" | "positive"
    title: string
    message: string
  }[]
}

const IMPACT_COLORS = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-border",
} as const

const ALERT_ICONS = {
  warning: IconAlertTriangle,
  critical: IconAlertTriangle,
  positive: IconCircleCheck,
} as const

const ALERT_COLORS = {
  warning: "text-amber-500",
  critical: "text-red-500",
  positive: "text-emerald-500 dark:text-emerald-400",
} as const

/* ─── Health score ring ─── */
function HealthRing({ score }: { score: number }) {
  const size = 52
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const color =
    score >= 70
      ? "oklch(0.65 0.2 155)"
      : score >= 40
        ? "oklch(0.75 0.15 55)"
        : "oklch(0.65 0.22 15)"
  const label = score >= 70 ? "Healthy" : score >= 40 ? "Needs Work" : "At Risk"

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="currentColor"
            className="text-muted-foreground/10"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color}
            strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.25, 0.1, 0.25, 1)",
              filter: `drop-shadow(0 0 4px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black tabular-nums" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">Health Score</p>
      </div>
    </div>
  )
}

export default function AiHighlightsWidget({}: WidgetComponentProps) {
  const insight = useAiInsight("spending_analysis")

  const data = React.useMemo(() => {
    if (!insight.structuredData) return null
    const sd = insight.structuredData as unknown as SpendingAnalysis
    if (typeof sd.healthScore === "number" && sd.actionItems) return sd
    return null
  }, [insight.structuredData])

  const isWorking = insight.isLoading || insight.isRegenerating

  return (
    <div className="p-5 sm:p-6 h-full flex flex-col widget-accent-purple relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/[0.04] dark:bg-purple-500/[0.08] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-xl bg-purple-500/15 dark:bg-purple-500/20">
            <IconSparkles className="size-4 text-purple-500 dark:text-purple-400 icon-glow-purple" />
          </div>
          <h3 className="text-sm font-semibold bg-gradient-to-r from-purple-500 to-blue-500 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
            AI Highlights
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={insight.regenerate}
            disabled={isWorking}
            className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-40"
          >
            <IconRefresh className={`size-3.5 text-muted-foreground ${isWorking ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/ai?tab=reports"
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 transition-colors"
          >
            View all &rarr;
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {insight.isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-[52px] rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : insight.error && !data ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <IconSparkles className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">AI insights unavailable</p>
            <button
              onClick={insight.regenerate}
              className="mt-2 text-[11px] text-primary hover:underline font-medium"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <div className="space-y-3">
            {/* Health ring + key insight */}
            <div className="flex items-start gap-3">
              <HealthRing score={data.healthScore} />
              {data.keyInsight && (
                <div className="flex items-start gap-1.5 min-w-0 flex-1 pt-1">
                  <IconBulb className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    {data.keyInsight}
                  </p>
                </div>
              )}
            </div>

            {/* Summary stats row */}
            {data.summary && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10">
                  <IconTrendingUp className="size-3 text-emerald-500" />
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCompact(data.summary.income)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted">
                  <IconTrendingDown className="size-3 text-muted-foreground" />
                  <span className="font-bold text-foreground/70 tabular-nums">
                    {formatCompact(data.summary.expenses)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                  <span className="font-bold text-primary tabular-nums">
                    {data.summary.savingsRate.toFixed(0)}%
                  </span>
                  <span className="text-muted-foreground">saved</span>
                </span>
              </div>
            )}

            {/* Alerts (critical only) */}
            {data.alerts?.filter(a => a.type === "critical").slice(0, 1).map((alert, i) => {
              const AlertIcon = ALERT_ICONS[alert.type]
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-xl border border-red-500/15 bg-red-500/5 dark:bg-red-500/10 px-3 py-2"
                >
                  <AlertIcon className={`size-3.5 mt-0.5 shrink-0 ${ALERT_COLORS[alert.type]}`} />
                  <p className="text-[11px] font-medium text-foreground leading-relaxed">
                    {alert.title}
                  </p>
                </div>
              )
            })}

            {/* Action items */}
            {data.actionItems?.slice(0, 2).map((action, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/50 dark:bg-card/30 backdrop-blur-sm px-3 py-2.5 transition-colors hover:bg-muted/40 hover:border-border cursor-pointer"
              >
                <div className="flex items-center justify-center size-6 rounded-lg bg-primary/10 shrink-0">
                  <IconBolt className="size-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">{action.title}</p>
                  {action.savingAmount > 0 && (
                    <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      Save {formatCompact(action.savingAmount)}
                    </p>
                  )}
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 uppercase ${IMPACT_COLORS[action.impact]}`}>
                  {action.impact}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <IconSparkles className="size-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">Generating insights...</p>
          </div>
        )}
      </div>
    </div>
  )
}
