"use client"

import * as React from "react"
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MetricTileProps {
  label: string
  value: string
  change?: number
  trendLabel?: string
  icon?: React.ReactNode
  tone?: "neutral" | "positive" | "negative"
}

export function MetricTile({
  label,
  value,
  change,
  trendLabel,
  icon,
  tone = "neutral",
}: MetricTileProps) {
  const isPositive = typeof change === "number" && change >= 0
  const badgeTone =
    tone === "positive"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
      : tone === "negative"
        ? "bg-rose-500/10 text-rose-700 border-rose-200"
        : "bg-slate-500/10 text-slate-700 border-slate-200"

  return (
    <Card className="border border-border/70 bg-card/80 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {typeof change === "number" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={`gap-1 ${badgeTone}`}>
                {isPositive ? (
                  <IconArrowUpRight className="h-3 w-3" />
                ) : (
                  <IconArrowDownRight className="h-3 w-3" />
                )}
                {isPositive ? "+" : ""}{change.toFixed(1)}%
              </Badge>
              {trendLabel && <span>{trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
