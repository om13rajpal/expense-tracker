"use client"

import { useRef } from "react"
import { motion, useInView } from "motion/react"
import { formatINR as formatCurrency } from "@/lib/format"
import { MoneyInHours } from "@/components/money-in-hours"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function DailyBudgetWidget({}: WidgetComponentProps) {
  const { dailySummary, totalIncome, year, month } = useDashboardData()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  const effectiveDailyLimit = totalIncome > 0
    ? totalIncome / new Date(year, month, 0).getDate() : 0
  const spentPct = effectiveDailyLimit > 0
    ? Math.min((dailySummary.todaySpent / effectiveDailyLimit) * 100, 100) : 0

  const ringSize = 72
  const strokeWidth = 7
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - spentPct / 100)

  const isWarning = spentPct >= 80
  const isDanger = spentPct >= 100
  const ringColor = isDanger ? "oklch(0.65 0.22 15)" : isWarning ? "oklch(0.75 0.15 55)" : "oklch(0.72 0.19 135)"
  const glowColor = isDanger ? "oklch(0.65 0.22 15 / 30%)" : isWarning ? "oklch(0.75 0.15 55 / 25%)" : "oklch(0.72 0.19 135 / 25%)"

  return (
    <div ref={ref} className={`p-4 flex flex-col items-center justify-center h-full text-center relative overflow-hidden ${isDanger ? "widget-accent-fire" : ""}`}>
      {/* Background glow based on status */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-60 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${glowColor}, transparent 70%)`,
        }}
      />

      <div className="relative mb-1.5" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
          {/* Track */}
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius}
            fill="none" stroke="currentColor"
            className="text-muted-foreground/8"
            strokeWidth={strokeWidth}
          />
          {/* Tick marks */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * 360 - 90
            const rad = (angle * Math.PI) / 180
            const inner = radius - strokeWidth / 2 - 2
            const outer = radius + strokeWidth / 2 + 2
            return (
              <line
                key={i}
                x1={ringSize / 2 + Math.cos(rad) * inner}
                y1={ringSize / 2 + Math.sin(rad) * inner}
                x2={ringSize / 2 + Math.cos(rad) * outer}
                y2={ringSize / 2 + Math.sin(rad) * outer}
                stroke="currentColor"
                className="text-muted-foreground/[0.06]"
                strokeWidth="1"
                strokeLinecap="round"
              />
            )
          })}
          {/* Progress ring */}
          <motion.circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
            stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: isInView ? strokeDashoffset : circumference }}
            transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-lg font-black tabular-nums"
            style={{ color: ringColor }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.8 }}
            transition={{ delay: 0.8, duration: 0.4, type: "spring" }}
          >
            {Math.round(spentPct)}%
          </motion.span>
          <span className="text-[9px] text-muted-foreground font-medium mt-0.5">spent today</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 6 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <p className="text-[11px] font-medium text-muted-foreground">Daily Budget</p>
        <p className="text-base font-black tabular-nums text-foreground leading-tight">{formatCurrency(Math.max(0, dailySummary.dailyBudget))}</p>
        <p className="text-[9px] text-muted-foreground font-medium">per day remaining</p>
      </motion.div>
    </div>
  )
}
