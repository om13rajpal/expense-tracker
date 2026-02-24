/**
 * Reusable KPI tile showing a label, formatted value, optional trend badge, and icon.
 * @module components/metric-tile
 */
"use client"

import * as React from "react"
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InfoTooltip } from "@/components/info-tooltip"

/**
 * Props for the MetricTile component.
 * @property label      - Short metric name (e.g. "Total Balance").
 * @property value      - Pre-formatted display value (e.g. "Rs 1,25,000").
 * @property change     - Percentage change shown as a coloured trend badge.
 * @property trendLabel - Optional text alongside the trend badge (e.g. "vs last month").
 * @property icon       - Icon node rendered in a coloured square to the left.
 * @property tone       - Controls badge colour: "positive" (green), "negative" (red), "neutral" (grey).
 * @property tooltip    - Hover tooltip explaining the metric.
 * @property iconBg     - Custom Tailwind background class for the icon container.
 * @property iconColor  - Custom Tailwind text-color class for the icon.
 */
interface MetricTileProps {
  label: string
  value: string
  change?: number
  trendLabel?: string
  icon?: React.ReactNode
  tone?: "neutral" | "positive" | "negative"
  tooltip?: string
  iconBg?: string
  iconColor?: string
}

/**
 * Renders a compact metric card with value, change percentage, and optional icon.
 * @param label - Metric name.
 * @param value - Pre-formatted display value.
 * @param change - Percentage change shown as a trend badge.
 * @param tone - Controls badge coloring: positive (green), negative (red), or neutral.
 */
export function MetricTile({
  label,
  value,
  change,
  trendLabel,
  icon,
  tone = "neutral",
  tooltip,
  iconBg,
  iconColor,
}: MetricTileProps) {
  const isPositive = typeof change === "number" && change >= 0
  const badgeTone =
    tone === "positive"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      : tone === "negative"
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
        : "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800"

  return (
    <Card className="border border-border/70 bg-card/80 shadow-sm">
      <CardContent className="flex items-start gap-3.5 p-3.5">
        {icon && (
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg || "bg-primary/10"} ${iconColor || "text-primary"}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1">
            {label}
            {tooltip && <InfoTooltip text={tooltip} iconClassName="h-3 w-3" />}
          </p>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {(typeof change === "number" || trendLabel) && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {typeof change === "number" && (
                <Badge variant="outline" className={`gap-1 ${badgeTone}`}>
                  {isPositive ? (
                    <IconArrowUpRight className="h-3 w-3" />
                  ) : (
                    <IconArrowDownRight className="h-3 w-3" />
                  )}
                  {isPositive ? "+" : ""}{change.toFixed(1)}%
                </Badge>
              )}
              {trendLabel && <span>{trendLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
