/**
 * Financial Health Overview dashboard section.
 * Displays a composite health score ring (0-100), stat bar with key
 * metrics, and a score breakdown with animated progress bars for
 * balance growth, safety net, spending balance, and investment rate.
 * @module components/goals/health-overview
 */
"use client"

import { motion, AnimatePresence } from "motion/react"
import {
  IconHeartbeat,
  IconShieldCheck,
  IconTrendingDown,
  IconTrendingUp,
  IconTargetArrow,
  IconChartLine,
  IconChartDonut,
  IconActivity,
  IconWallet,
} from "@tabler/icons-react"

import { useFinancialHealth } from "@/hooks/use-financial-health"
import { InfoTooltip } from "@/components/info-tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { stagger, fadeUp, fadeUpSmall, scaleIn, numberPop, listItem } from "@/lib/motion"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Tailwind text colour class based on the health score tier (green/amber/orange/red). */
function getScoreColor(score: number): string {
  if (score >= 75) return "text-lime-600 dark:text-lime-400"
  if (score >= 50) return "text-amber-500"
  if (score >= 25) return "text-orange-500"
  return "text-destructive"
}

/** Returns a hex stroke colour for the SVG score ring based on the score tier. */
function getScoreRingColor(score: number): string {
  if (score >= 75) return "#84cc16"
  if (score >= 50) return "#f59e0b"
  if (score >= 25) return "#f97316"
  return "hsl(var(--destructive))"
}

/** Returns an RGBA glow colour for the drop-shadow around the score ring. */
function getScoreGlowColor(score: number): string {
  if (score >= 75) return "rgba(132, 204, 22, 0.25)"
  if (score >= 50) return "rgba(245, 158, 11, 0.2)"
  if (score >= 25) return "rgba(249, 115, 22, 0.2)"
  return "rgba(220, 38, 38, 0.2)"
}

/** Returns Tailwind badge classes (bg + text) for the score label pill. */
function getScoreBadgeBg(score: number): string {
  if (score >= 75) return "bg-lime-500/10 text-lime-600 dark:bg-lime-500/15 dark:text-lime-400"
  if (score >= 50) return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
  if (score >= 25) return "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
  return "bg-destructive/10 text-destructive dark:bg-destructive/15"
}

/** Maps a numeric score to a human-readable label (Excellent/Good/Needs Work/Critical). */
function getScoreLabel(score: number): string {
  if (score >= 75) return "Excellent"
  if (score >= 50) return "Good"
  if (score >= 25) return "Needs Work"
  return "Critical"
}

/** Returns hex gradient endpoints for a breakdown bar based on its fill percentage. */
function getBarGradient(pct: number): { from: string; to: string } {
  if (pct >= 75) return { from: "#a3e635", to: "#84cc16" }
  if (pct >= 50) return { from: "#fbbf24", to: "#f59e0b" }
  if (pct >= 25) return { from: "#fb923c", to: "#f97316" }
  return { from: "#f87171", to: "#dc2626" }
}

// ---------------------------------------------------------------------------
// Score Ring
// ---------------------------------------------------------------------------

/**
 * Animated SVG circular ring showing the overall financial health score (0-100).
 * Includes a gradient stroke and glow shadow that change colour by score tier.
 */
function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(score, 100) / 100
  const strokeDashoffset = circumference * (1 - progress)
  const color = getScoreRingColor(score)
  const glowColor = getScoreGlowColor(score)
  const gradientId = "health-overview-ring-gradient"
  const center = size / 2

  return (
    <motion.div
      variants={scaleIn}
      className="relative inline-flex items-center justify-center"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 16px ${glowColor})`,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeOpacity={0.4}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${center} ${center})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ delay: 0.3, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          variants={numberPop}
          className={`text-3xl font-black tracking-tight tabular-nums ${getScoreColor(score)}`}
        >
          {Math.round(score)}
        </motion.span>
        <span className="text-[11px] font-medium text-muted-foreground/70 tracking-wide">
          of 100
        </span>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Stat Item
// ---------------------------------------------------------------------------

/**
 * Single stat item in the horizontal stat bar (icon + label + value).
 * Stagger-animated with index-based delay.
 */
function StatItem({
  icon: Icon,
  label,
  value,
  suffix,
  colorClass,
  index,
}: {
  icon: React.ElementType
  label: string
  value: string
  suffix?: string
  colorClass?: string
  index: number
}) {
  const anim = listItem(index)
  return (
    <motion.div
      initial={anim.initial}
      animate={anim.animate}
      transition={anim.transition}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4"
    >
      <div className="flex size-7 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 dark:bg-muted">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-0.5 truncate">
          {label}
        </p>
        <p className={`text-base sm:text-lg font-black tracking-tight tabular-nums leading-tight ${colorClass || ""}`}>
          {value}
          {suffix && (
            <span className="text-xs sm:text-sm font-normal text-muted-foreground"> {suffix}</span>
          )}
        </p>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Breakdown Bar
// ---------------------------------------------------------------------------

/**
 * Single row in the score breakdown section showing a label, score/max,
 * and an animated gradient bar. Hoverable with icon and tooltip.
 */
function BreakdownBar({
  label,
  score,
  maxScore,
  tooltip,
  index,
  icon: Icon,
}: {
  label: string
  score: number
  maxScore: number
  tooltip?: string
  index: number
  icon: React.ElementType
}) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
  const gradientId = `health-overview-bar-gradient-${index}`
  const gradient = getBarGradient(percentage)
  const anim = listItem(index)

  return (
    <motion.div
      initial={anim.initial}
      animate={anim.animate}
      transition={anim.transition}
      className="group rounded-xl px-3 py-2.5 -mx-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="flex items-center gap-2 font-medium text-foreground/90">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
          {tooltip && <InfoTooltip text={tooltip} iconClassName="h-3 w-3" />}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black tracking-tight tabular-nums">
            {score.toFixed(1)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right">
            / {maxScore}
          </span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
        <svg width="100%" height="100%" className="rounded-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradient.from} stopOpacity={0.8} />
              <stop offset="100%" stopColor={gradient.to} />
            </linearGradient>
          </defs>
          <motion.rect
            x={0}
            y={0}
            height="100%"
            rx={4}
            ry={4}
            fill={`url(#${gradientId})`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(percentage, 1)}%` }}
            transition={{ delay: 0.15 + index * 0.06, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </svg>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

/** Pulse skeleton placeholder shown while health data is loading. */
function HealthOverviewSkeleton() {
  return (
    <div className="space-y-5">
      {/* Stat bar */}
      <div className="card-elevated rounded-2xl border border-border grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-3">
            <Skeleton className="size-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
      {/* Score + Breakdown */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2 card-elevated rounded-2xl border border-border p-6 flex flex-col items-center space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-[140px] w-[140px] rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="lg:col-span-3 card-elevated rounded-2xl border border-border p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Renders the complete Financial Health Overview dashboard section:
 * a 4-column stat bar, an animated score ring with label, and a
 * 4-row breakdown of the score components (25 points each).
 * Shows skeleton during loading and an error card on failure.
 */
export function HealthOverview() {
  const { data, isLoading, error: queryError } = useFinancialHealth()
  const metrics = data?.metrics ?? null

  if (queryError && !metrics) {
    return (
      <div className="card-elevated rounded-xl flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Failed to load financial health data
        </p>
      </div>
    )
  }

  const stabilityPercent = metrics
    ? Math.round(metrics.incomeProfile.incomeStability * 100)
    : 0

  return (
    <AnimatePresence mode="wait">
    {isLoading || !metrics ? (
      <motion.div
        key="health-skeleton"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <HealthOverviewSkeleton />
      </motion.div>
    ) : (
    <motion.div key="health-content" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
      {/* Stat Bar */}
      <motion.div
        variants={fadeUp}
        className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-x divide-border"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <StatItem
          icon={IconChartDonut}
          label="Score"
          value={String(Math.round(metrics.financialFreedomScore))}
          suffix="/ 100"
          colorClass={getScoreColor(metrics.financialFreedomScore)}
          index={0}
        />
        <StatItem
          icon={IconShieldCheck}
          label="Safety Net"
          value={metrics.emergencyFundMonths.toFixed(1)}
          suffix="mo"
          index={1}
        />
        <div className="max-sm:border-t max-sm:border-border">
          <StatItem
            icon={
              metrics.expenseVelocity.trend === "decreasing"
                ? IconTrendingDown
                : IconTrendingUp
            }
            label="Spending Trend"
            value={`${metrics.expenseVelocity.changePercent >= 0 ? "+" : ""}${metrics.expenseVelocity.changePercent.toFixed(1)}%`}
            colorClass={
              metrics.expenseVelocity.trend === "decreasing"
                ? "text-lime-600 dark:text-lime-400"
                : metrics.expenseVelocity.trend === "increasing"
                  ? "text-destructive"
                  : ""
            }
            index={2}
          />
        </div>
        <div className="max-sm:border-t max-sm:border-border">
          <StatItem
            icon={IconActivity}
            label="Income Consistency"
            value={`${stabilityPercent}%`}
            colorClass={stabilityPercent >= 70 ? "text-primary" : ""}
            index={3}
          />
        </div>
      </motion.div>

      {/* Score Ring + Score Breakdown */}
      <motion.div variants={fadeUp} className="grid gap-5 lg:grid-cols-5">
        {/* Score Ring */}
        <div className="lg:col-span-2 card-elevated rounded-2xl border border-border bg-card relative overflow-hidden p-6 flex flex-col items-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex items-center gap-2 self-start mb-6">
            <IconHeartbeat className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Health Score</h3>
            <InfoTooltip text="A 0-100 composite score measuring your overall financial health. It combines balance growth, safety net, spending balance, and investment rate (25 points each)." />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <ScoreRing score={metrics.financialFreedomScore} />
            <motion.span
              variants={fadeUpSmall}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getScoreBadgeBg(metrics.financialFreedomScore)}`}
            >
              {getScoreLabel(metrics.financialFreedomScore)}
            </motion.span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="lg:col-span-3 card-elevated rounded-2xl border border-border bg-card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <IconChartLine className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Score Breakdown</h3>
            </div>
            <span className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-0.5">
              25 pts each
            </span>
          </div>
          <div className="space-y-1">
            <BreakdownBar
              label="Balance Growth"
              score={metrics.scoreBreakdown.savingsRate}
              maxScore={25}
              tooltip="How much your balance grows each month. Positive growth = more points."
              index={0}
              icon={IconWallet}
            />
            <BreakdownBar
              label="Safety Net"
              score={metrics.scoreBreakdown.emergencyFund}
              maxScore={25}
              tooltip="How many months of expenses your bank balance can cover. Target: 6 months."
              index={1}
              icon={IconShieldCheck}
            />
            <BreakdownBar
              label="Spending Balance"
              score={metrics.scoreBreakdown.nwiAdherence}
              maxScore={25}
              tooltip="How closely your Needs/Wants/Investments/Savings split matches your targets."
              index={2}
              icon={IconTargetArrow}
            />
            <BreakdownBar
              label="Investment Rate"
              score={metrics.scoreBreakdown.investmentRate}
              maxScore={25}
              tooltip="Percentage of income allocated to investments (stocks, mutual funds, SIPs)."
              index={3}
              icon={IconChartLine}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  )
}
