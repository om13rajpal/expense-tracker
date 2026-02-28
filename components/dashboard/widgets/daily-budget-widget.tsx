"use client"

import { motion } from "motion/react"
import { formatINR as formatCurrency } from "@/lib/format"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function DailyBudgetWidget({}: WidgetComponentProps) {
  const { dailySummary, totalIncome, year, month } = useDashboardData()

  const effectiveDailyLimit = totalIncome > 0
    ? totalIncome / new Date(year, month, 0).getDate() : 0
  const spentPct = effectiveDailyLimit > 0
    ? Math.min((dailySummary.todaySpent / effectiveDailyLimit) * 100, 100) : 0
  const ringSize = 100
  const strokeWidth = 6
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - spentPct / 100)
  const ringColor = spentPct >= 100 ? "#f43f5e" : spentPct >= 80 ? "#fb923c" : "#a3e635"

  return (
    <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gradient-to-br from-lime-500/[0.04] to-transparent">
      <div className="relative mb-3" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
          <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/60" strokeWidth={strokeWidth} />
          <motion.circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
            stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ delay: 0.5, duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black tabular-nums" style={{ color: ringColor }}>{Math.round(spentPct)}%</span>
        </div>
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Daily Budget</p>
      <p className="text-lg font-black tabular-nums text-lime-600 dark:text-lime-400">{formatCurrency(Math.max(0, dailySummary.dailyBudget))}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">per day remaining</p>
    </div>
  )
}
