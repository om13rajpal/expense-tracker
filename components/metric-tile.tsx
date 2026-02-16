"use client"

import * as React from "react"
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InfoTooltip } from "@/components/info-tooltip"

interface MetricTileProps {
  label: string
  value: string
  change?: number
  trendLabel?: string
  icon?: React.ReactNode
  tone?: "neutral" | "positive" | "negative"
  tooltip?: string
}

export function MetricTile({
  label,
  value,
  change,
  trendLabel,
  icon,
  tone = "neutral",
  tooltip,
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
      <CardContent className="flex items-center justify-between gap-3 p-3.5">
        <div className="space-y-1">
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
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
