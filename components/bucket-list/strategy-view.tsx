/**
 * Structured AI savings strategy renderer for bucket list items.
 *
 * Parses the `aiStrategy` field as JSON (AiStrategyData) and renders it
 * as rich UI components: summary card, monthly plan timeline, milestone
 * progress, saving tips cards, and price optimization highlight box.
 *
 * Backwards-compatible: if the strategy is a plain markdown string (old
 * format), it falls back to the InsightMarkdown renderer.
 *
 * @module components/bucket-list/strategy-view
 */
"use client"

import {
  IconCalendar,
  IconCheck,
  IconCoin,
  IconDiscount2,
  IconFlame,
  IconPigMoney,
  IconShieldCheck,
  IconShoppingCart,
  IconTrendingUp,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { InsightMarkdown } from "@/components/insight-markdown"
import { formatINR } from "@/lib/format"
import type { AiStrategyData } from "@/lib/types"

interface StrategyViewProps {
  /** The raw strategy string — either JSON (new) or markdown (old). */
  strategy: string
  /** Current saved amount for computing milestone completion. */
  savedAmount: number
  /** Target amount for the bucket list item. */
  targetAmount: number
}

/**
 * Attempt to parse a strategy string as AiStrategyData JSON.
 * Returns the parsed object or null if it is legacy markdown.
 */
function parseStrategy(strategy: string): AiStrategyData | null {
  try {
    const cleaned = strategy
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim()
    const parsed = JSON.parse(cleaned)
    // Validate minimum required fields
    if (parsed.monthlyPlan && parsed.milestones && parsed.summary) {
      return parsed as AiStrategyData
    }
    return null
  } catch {
    return null
  }
}

const confidenceColors: Record<string, string> = {
  high: "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
  medium: "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-800 dark:text-amber-400",
  low: "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-800 dark:text-rose-400",
}

const riskColors: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
  medium: "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-800 dark:text-amber-400",
  high: "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-800 dark:text-rose-400",
}

/**
 * Renders a structured AI strategy as beautiful components, or falls
 * back to markdown rendering for legacy strategies.
 */
export function StrategyView({ strategy, savedAmount, targetAmount }: StrategyViewProps) {
  const data = parseStrategy(strategy)

  // Fallback: render as markdown if it is not valid JSON
  if (!data) {
    return (
      <div className="text-muted-foreground">
        <InsightMarkdown content={strategy} />
      </div>
    )
  }

  const progressPercent = targetAmount > 0
    ? Math.min(100, Math.round((savedAmount / targetAmount) * 100))
    : 0

  return (
    <div className="space-y-3">
      {/* Summary Card */}
      <div className="rounded-lg bg-gradient-to-r from-primary/5 via-blue-500/5 to-violet-500/5 border border-border/40 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <IconFlame className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-relaxed">{data.summary}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 font-medium ${confidenceColors[data.confidence] ?? confidenceColors.medium}`}
              >
                <IconShieldCheck className="mr-0.5 size-2.5" />
                {data.confidence} confidence
              </Badge>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 font-medium ${riskColors[data.riskLevel] ?? riskColors.medium}`}
              >
                {data.riskLevel} risk
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Plan */}
      <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <IconCalendar className="size-3 text-blue-500" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Monthly Plan</p>
        </div>
        <p className="text-xs font-medium">
          Save{" "}
          <span className="text-primary font-bold">{formatINR(data.monthlyPlan.amount)}</span>/mo for{" "}
          <span className="font-semibold">{data.monthlyPlan.duration}</span>{" "}
          starting <span className="font-semibold">{data.monthlyPlan.startDate}</span>
        </p>
        {/* Visual timeline bar */}
        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: 4 }).map((_, i) => {
            const milestonePercent = (i + 1) * 25
            const isReached = progressPercent >= milestonePercent
            return (
              <div key={i} className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-1 rounded-full overflow-hidden bg-border/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isReached
                        ? "bg-emerald-500"
                        : progressPercent > milestonePercent - 25
                          ? "bg-blue-500"
                          : ""
                    }`}
                    style={{
                      width: isReached
                        ? "100%"
                        : progressPercent > milestonePercent - 25
                          ? `${((progressPercent - (milestonePercent - 25)) / 25) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                <div
                  className={`size-1.5 rounded-full shrink-0 ${
                    isReached ? "bg-emerald-500" : "bg-border"
                  }`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-lg border border-border/40 px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <IconTrendingUp className="size-3 text-violet-500" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Milestones</p>
        </div>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border/60" />
          <div className="space-y-2.5">
            {data.milestones.map((milestone) => {
              const milestoneTarget = (milestone.percent / 100) * targetAmount
              const isCompleted = savedAmount >= milestoneTarget
              return (
                <div key={milestone.percent} className="flex items-start gap-2.5 relative">
                  {/* Dot */}
                  <div
                    className={`size-[15px] rounded-full border-2 shrink-0 flex items-center justify-center z-10 ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-card border-border"
                    }`}
                  >
                    {isCompleted && <IconCheck className="size-2 text-white" strokeWidth={3} />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold tabular-nums ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        {milestone.percent}% -- {formatINR(milestone.amount)}
                      </span>
                      {isCompleted && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{milestone.tip}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Saving Tips */}
      {data.savingTips && data.savingTips.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <IconPigMoney className="size-3 text-emerald-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Saving Tips</p>
          </div>
          <div className="grid gap-1.5">
            {data.savingTips.map((tip, i) => (
              <div key={i} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold">{tip.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{tip.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 font-bold border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 shrink-0 whitespace-nowrap"
                  >
                    <IconCoin className="mr-0.5 size-2.5" />
                    {formatINR(tip.potentialSaving)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Optimization */}
      {data.priceOptimization && (
        <div className="rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <IconDiscount2 className="size-3 text-amber-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Price Optimization</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Best Time</p>
              <p className="text-[11px] font-medium mt-0.5">{data.priceOptimization.bestTimeToBuy}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Platform</p>
              <div className="flex items-center gap-1 mt-0.5">
                <IconShoppingCart className="size-2.5 text-muted-foreground" />
                <p className="text-[11px] font-medium">{data.priceOptimization.bestPlatform}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Discount</p>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {data.priceOptimization.estimatedDiscount}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
