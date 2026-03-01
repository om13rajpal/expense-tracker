"use client"

import { useMemo, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { useDashboardData } from "@/lib/dashboard-context"
import { formatCompact } from "@/lib/format"
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

  if (annualIncome <= 1200000) tax = 0
  const cess = tax * 0.04
  return { tax: tax + cess, bracket, cess }
}

export default function TaxOverviewWidget({}: WidgetComponentProps) {
  const { totalIncome } = useDashboardData()
  const ref = useRef<HTMLAnchorElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  const taxData = useMemo(() => {
    const now = new Date()
    const monthsElapsed = now.getMonth() + 1
    const annualProjected = (totalIncome / Math.max(1, monthsElapsed)) * 12
    const { tax, bracket } = calculateTax(annualProjected)
    const effectiveRate = annualProjected > 0 ? (tax / annualProjected) * 100 : 0

    return { annualProjected, tax, bracket, effectiveRate }
  }, [totalIncome])

  return (
    <Link ref={ref} href="/bills?tab=tax" className="block p-6 h-full relative overflow-hidden widget-accent-amber">
      {/* Top accent border gradient */}
      <motion.div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-orange-500/40 to-amber-500/60"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isInView ? 1 : 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0, 0, 0.2, 1] }}
        style={{ transformOrigin: "left" }}
      />

      <div className="relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-[13px] font-medium text-muted-foreground mb-0.5">Tax Overview</p>
          <p className="text-[11px] text-muted-foreground/60 mb-4">New Regime (projected)</p>
        </motion.div>

        {/* Bracket hero */}
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.9 }}
          transition={{ delay: 0.2, duration: 0.4, type: "spring" }}
        >
          <p className="text-3xl font-black tabular-nums text-foreground tracking-tight">{taxData.bracket}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Tax Bracket</p>
        </motion.div>

        {/* Effective rate */}
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 4 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        >
          <p className="text-lg font-black tabular-nums text-foreground">{taxData.effectiveRate.toFixed(1)}%</p>
          <p className="text-[11px] text-muted-foreground">Effective Rate</p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <div className="h-px bg-border/50 mb-3" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground mb-0.5">Projected Income</p>
              <p className="text-xs font-black tabular-nums text-foreground">{formatCompact(taxData.annualProjected)}</p>
            </div>
            <div className="text-right min-w-0">
              <p className="text-[11px] text-muted-foreground mb-0.5">Est. Liability</p>
              <p className="text-xs font-black tabular-nums text-red-500 dark:text-red-400">{formatCompact(taxData.tax)}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </Link>
  )
}
