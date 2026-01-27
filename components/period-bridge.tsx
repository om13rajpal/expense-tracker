"use client"

import * as React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PeriodBridgeProps {
  title: string
  periodLabel: string
  openingBalance: number
  inflow: number
  outflow: number
  closingBalance: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PeriodBridge({
  title,
  periodLabel,
  openingBalance,
  inflow,
  outflow,
  closingBalance,
}: PeriodBridgeProps) {
  const netChange = closingBalance - openingBalance
  const isPositive = netChange >= 0

  return (
    <Card className="border border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <Badge
          variant="outline"
          className={isPositive ? "border-emerald-200 bg-emerald-500/10 text-emerald-700" : "border-rose-200 bg-rose-500/10 text-rose-700"}
        >
          {isPositive ? "+" : ""}{formatCurrency(netChange)}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Opening</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(openingBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inflow</p>
            <p className="text-lg font-semibold text-emerald-600">{formatCurrency(inflow)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outflow</p>
            <p className="text-lg font-semibold text-rose-600">{formatCurrency(outflow)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Closing</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(closingBalance)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
