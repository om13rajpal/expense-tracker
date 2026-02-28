"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useDashboardData } from "@/lib/dashboard-context"
import { formatINR, formatCompact } from "@/lib/format"
import type { WidgetComponentProps } from "@/lib/widget-registry"

// Indian new tax regime slabs (FY 2025-26)
const TAX_SLABS = [
  { min: 0,        max: 400000,   rate: 0 },
  { min: 400000,   max: 800000,   rate: 5 },
  { min: 800000,   max: 1200000,  rate: 10 },
  { min: 1200000,  max: 1600000,  rate: 15 },
  { min: 1600000,  max: 2000000,  rate: 20 },
  { min: 2000000,  max: 2400000,  rate: 25 },
  { min: 2400000,  max: Infinity, rate: 30 },
]

function calculateTax(annualIncome: number) {
  let remaining = annualIncome
  let tax = 0
  let bracket = "0%"

  for (const slab of TAX_SLABS) {
    if (remaining <= 0) break
    const taxableInSlab = Math.min(remaining, slab.max - slab.min)
    tax += taxableInSlab * (slab.rate / 100)
    remaining -= taxableInSlab
    if (slab.rate > 0) bracket = `${slab.rate}%`
  }

  // Rebate u/s 87A: nil tax if income <= 12L
  if (annualIncome <= 1200000) tax = 0

  // Health & Education Cess: 4%
  const cess = tax * 0.04
  return { tax: tax + cess, bracket, cess }
}

export default function TaxOverviewWidget({}: WidgetComponentProps) {
  const { totalIncome } = useDashboardData()

  const taxData = useMemo(() => {
    // Annualize: project current month income to 12 months
    const now = new Date()
    const monthsElapsed = now.getMonth() + 1
    const annualProjected = (totalIncome / Math.max(1, monthsElapsed)) * 12
    const { tax, bracket } = calculateTax(annualProjected)
    const effectiveRate = annualProjected > 0 ? (tax / annualProjected) * 100 : 0

    return { annualProjected, tax, bracket, effectiveRate }
  }, [totalIncome])

  return (
    <Link href="/bills?tab=tax" className="block p-6 h-full">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Tax Overview</p>
      <p className="text-[11px] text-muted-foreground mb-3">New Regime (projected)</p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Projected Annual Income</span>
          <span className="text-xs font-black tabular-nums">{formatCompact(taxData.annualProjected)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Est. Tax Liability</span>
          <span className="text-xs font-black tabular-nums text-destructive">{formatCompact(taxData.tax)}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tax Bracket</span>
          <span className="text-sm font-black tabular-nums">{taxData.bracket}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Effective Rate</span>
          <span className="text-sm font-black tabular-nums">{taxData.effectiveRate.toFixed(1)}%</span>
        </div>
      </div>
    </Link>
  )
}
