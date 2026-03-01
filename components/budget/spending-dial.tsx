/**
 * @module components/budget/spending-dial
 * @description Interactive donut/ring chart for NWI spending split allocation.
 * Renders a SVG-based ring with 4 colored segments (Needs, Wants, Invest, Savings)
 * plus compact legend/controls below. Supports hover tooltips, smooth CSS transitions,
 * +/- stepper controls, and dark mode.
 */
"use client"

import * as React from "react"
import { useState, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  IconHome,
  IconShoppingCart,
  IconChartPie,
  IconPigMoney,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react"

import type { NWIConfig, NWISplit } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { InfoTooltip } from "@/components/info-tooltip"
import { fadeUp } from "@/lib/motion"

// ─── Constants ───

const BUCKETS = ["needs", "wants", "investments", "savings"] as const
type BucketKey = (typeof BUCKETS)[number]

const BUCKET_META: Record<
  BucketKey,
  {
    label: string
    desc: string
    icon: React.ComponentType<any>
    /** Tailwind text color class for the label dot / accent */
    ringColor: string
    /** Raw hex/hsl for SVG stroke */
    svgColor: string
    /** Darker variant for hover */
    svgHover: string
  }
> = {
  needs: {
    label: "Needs",
    desc: "Rent, bills, groceries",
    icon: IconHome,
    ringColor: "bg-orange-500",
    svgColor: "var(--color-orange-500, #f97316)",
    svgHover: "var(--color-orange-600, #ea580c)",
  },
  wants: {
    label: "Wants",
    desc: "Dining, shopping, fun",
    icon: IconShoppingCart,
    ringColor: "bg-rose-500",
    svgColor: "var(--color-rose-500, #f43f5e)",
    svgHover: "var(--color-rose-600, #e11d48)",
  },
  investments: {
    label: "Invest",
    desc: "SIPs, stocks, loans",
    icon: IconChartPie,
    ringColor: "bg-blue-500",
    svgColor: "var(--color-blue-500, #3b82f6)",
    svgHover: "var(--color-blue-600, #2563eb)",
  },
  savings: {
    label: "Savings",
    desc: "Emergency, goals",
    icon: IconPigMoney,
    ringColor: "bg-emerald-500",
    svgColor: "var(--color-emerald-500, #10b981)",
    svgHover: "var(--color-emerald-600, #059669)",
  },
}

// Ring geometry
const SIZE = 220
const STROKE = 30
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP_DEGREES = 2 // visual gap between segments
const GAP_LENGTH = (GAP_DEGREES / 360) * CIRCUMFERENCE
const CENTER = SIZE / 2

// ─── Props ───

interface SpendingDialProps {
  nwiDraft: { needs: number; wants: number; investments: number; savings: number }
  setNwiDraft: React.Dispatch<
    React.SetStateAction<{ needs: number; wants: number; investments: number; savings: number }>
  >
  nwiSplit: NWISplit | null
  nwiConfig: {
    needs: { percentage: number; categories: string[] }
    wants: { percentage: number; categories: string[] }
    investments: { percentage: number; categories: string[] }
    savings: { percentage: number; categories: string[] }
  } | null
  nwiTotal: number
  nwiSaving: boolean
  saveNwiPercentages: () => void
  bucketListAlloc: number
  formatCurrency: (n: number) => string
}

// ─── Component ───

export function SpendingDial({
  nwiDraft,
  setNwiDraft,
  nwiSplit,
  nwiConfig,
  nwiTotal,
  nwiSaving,
  saveNwiPercentages,
  bucketListAlloc,
  formatCurrency,
}: SpendingDialProps) {
  const [hoveredBucket, setHoveredBucket] = useState<BucketKey | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Total income for display
  const totalIncome = nwiSplit?.totalIncome ?? 0

  // ─── Compute segment arcs ───
  const segments = useMemo(() => {
    const totalGap = GAP_LENGTH * BUCKETS.length
    const usable = CIRCUMFERENCE - totalGap
    let offset = 0

    return BUCKETS.map((key) => {
      const pct = nwiDraft[key] / 100
      const length = usable * pct
      const seg = { key, offset, length }
      offset += length + GAP_LENGTH
      return seg
    })
  }, [nwiDraft])

  // ─── Hover handlers ───
  const handleSegmentEnter = useCallback(
    (key: BucketKey, e: React.MouseEvent<SVGCircleElement>) => {
      setHoveredBucket(key)
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        setTooltipPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    },
    [],
  )

  const handleSegmentMove = useCallback(
    (e: React.MouseEvent<SVGCircleElement>) => {
      if (svgRef.current && hoveredBucket) {
        const rect = svgRef.current.getBoundingClientRect()
        setTooltipPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    },
    [hoveredBucket],
  )

  const handleSegmentLeave = useCallback(() => {
    setHoveredBucket(null)
  }, [])

  // ─── Stepper ───
  const step = useCallback(
    (key: BucketKey, delta: number) => {
      setNwiDraft((prev) => ({
        ...prev,
        [key]: Math.max(0, Math.min(100, prev[key] + delta)),
      }))
    },
    [setNwiDraft],
  )

  return (
    <motion.div initial={fadeUp.hidden} animate={fadeUp.show}>
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl relative overflow-hidden p-4 sm:p-5">
        {/* Top edge light line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold">Spending Split</h3>
            <InfoTooltip text="Divide your spending into Needs (rent, groceries, bills), Wants (dining, shopping, entertainment), Investments (SIPs, stocks), and Savings (emergency fund, goals)." />
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium tabular-nums ${nwiTotal === 100 ? "text-primary" : "text-destructive"}`}
            >
              {nwiTotal}%{nwiTotal !== 100 && " (need 100%)"}
            </span>
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              onClick={saveNwiPercentages}
              disabled={nwiSaving || nwiTotal !== 100}
            >
              {nwiSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* ─── Ring + Center ─── */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg
              ref={svgRef}
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="block"
              role="img"
              aria-label={`Spending split: Needs ${nwiDraft.needs}%, Wants ${nwiDraft.wants}%, Invest ${nwiDraft.investments}%, Savings ${nwiDraft.savings}%`}
            >
              {/* Background track */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="var(--color-muted, hsl(var(--muted)))"
                strokeWidth={STROKE}
                opacity={0.25}
              />

              {/* Segments - rotated -90deg so 0% starts at 12 o'clock */}
              <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                {segments.map((seg) => {
                  const meta = BUCKET_META[seg.key]
                  const isHovered = hoveredBucket === seg.key
                  return (
                    <circle
                      key={seg.key}
                      cx={CENTER}
                      cy={CENTER}
                      r={RADIUS}
                      fill="none"
                      stroke={isHovered ? meta.svgHover : meta.svgColor}
                      strokeWidth={isHovered ? STROKE + 6 : STROKE}
                      strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
                      strokeDashoffset={-seg.offset}
                      strokeLinecap="butt"
                      style={{
                        transition:
                          "stroke-dasharray 500ms cubic-bezier(.25,.1,.25,1), stroke-dashoffset 500ms cubic-bezier(.25,.1,.25,1), stroke-width 200ms ease, stroke 200ms ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => handleSegmentEnter(seg.key, e)}
                      onMouseMove={handleSegmentMove}
                      onMouseLeave={handleSegmentLeave}
                    />
                  )
                })}
              </g>
            </svg>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className={`text-2xl font-black tracking-tight tabular-nums ${nwiTotal === 100 ? "text-foreground" : "text-destructive"}`}
              >
                {nwiTotal}%
              </span>
              {totalIncome > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                  {formatCurrency(totalIncome)}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/60 mt-0.5">total income</span>
            </div>

            {/* Hover tooltip */}
            <AnimatePresence>
              {hoveredBucket && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 pointer-events-none rounded-xl border border-border bg-card/95 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
                  style={{
                    left: tooltipPos.x,
                    top: tooltipPos.y,
                    transform: "translate(-50%, -120%)",
                  }}
                >
                  {(() => {
                    const meta = BUCKET_META[hoveredBucket]
                    const bucket = nwiSplit?.[hoveredBucket]
                    const actual = bucket?.actualAmount ?? 0
                    const target = bucket?.targetAmount ?? 0
                    const catCount = nwiConfig?.[hoveredBucket]?.categories.length ?? 0
                    return (
                      <div className="space-y-1 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${meta.ringColor}`} />
                          <span className="text-xs font-semibold">{meta.label}</span>
                          <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                            {nwiDraft[hoveredBucket]}%
                          </span>
                        </div>
                        {nwiSplit && (
                          <>
                            <div className="flex items-center justify-between text-[11px] tabular-nums">
                              <span className="text-muted-foreground">Spent</span>
                              <span className="font-medium">{formatCurrency(actual)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] tabular-nums">
                              <span className="text-muted-foreground">Target</span>
                              <span className="font-medium">{formatCurrency(target)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Categories</span>
                          <span className="font-medium">{catCount}</span>
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Legend / Control Strip ─── */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {BUCKETS.map((key) => {
              const meta = BUCKET_META[key]
              const BucketIcon = meta.icon
              const bucket = nwiSplit?.[key]
              const actual = bucket?.actualAmount ?? 0
              const target = bucket?.targetAmount ?? 0
              const isOver = actual > target && target > 0

              return (
                <div
                  key={key}
                  className={`rounded-xl border border-border/50 bg-card/60 backdrop-blur-lg p-3 space-y-2 transition-all duration-200 ${
                    hoveredBucket === key ? "border-primary/30 -translate-y-0.5 shadow-sm bg-card/80" : ""
                  }`}
                  onMouseEnter={() => setHoveredBucket(key)}
                  onMouseLeave={() => setHoveredBucket(null)}
                >
                  {/* Label row */}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${meta.ringColor}`} />
                    <BucketIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold truncate">{meta.label}</span>
                  </div>

                  {/* Amounts */}
                  {nwiSplit && (
                    <div className="flex items-baseline justify-between gap-1">
                      <span
                        className={`text-sm font-black tracking-tight tabular-nums truncate ${isOver ? "text-destructive" : ""}`}
                      >
                        {formatCurrency(actual)}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        / {formatCurrency(target)}
                      </span>
                    </div>
                  )}

                  {/* +/- stepper */}
                  <div className="flex items-center gap-1 pt-1 border-t border-border">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 rounded-md hover:bg-muted/60"
                      onClick={() => step(key, -5)}
                      disabled={nwiDraft[key] <= 0}
                      aria-label={`Decrease ${meta.label} by 5%`}
                    >
                      <IconMinus className="h-3 w-3" />
                    </Button>
                    <span className="flex-1 text-center text-xs font-bold tabular-nums">
                      {nwiDraft[key]}%
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 rounded-md hover:bg-muted/60"
                      onClick={() => step(key, 5)}
                      disabled={nwiDraft[key] >= 100}
                      aria-label={`Increase ${meta.label} by 5%`}
                    >
                      <IconPlus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Bucket list savings note */}
                  {key === "savings" && bucketListAlloc > 0 && (
                    <p className="text-[10px] text-primary/80 font-medium tabular-nums leading-tight">
                      Bucket List: {formatCurrency(bucketListAlloc)}/mo
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
