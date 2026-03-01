"use client"

import { useRef } from "react"
import { motion, useInView } from "motion/react"
import { IconCalendar } from "@tabler/icons-react"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function MonthProgressWidget({}: WidgetComponentProps) {
  const { dailySummary } = useDashboardData()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })
  const progressPct = Math.round((dailySummary.daysElapsed / dailySummary.totalDaysInMonth) * 100)

  return (
    <div ref={ref} className="p-4 flex flex-col h-full relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/[0.04] dark:bg-primary/[0.06] rounded-full blur-2xl pointer-events-none" />

      <motion.div
        className="flex items-center gap-2 mb-2"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -8 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 dark:bg-primary/20">
          <IconCalendar className="size-3.5 text-primary" strokeWidth={2} />
        </div>
        <p className="text-[12px] font-medium text-muted-foreground">Month Progress</p>
      </motion.div>

      {/* Progress bar with animated fill */}
      <div className="relative w-full h-2 rounded-full bg-muted-foreground/[0.06] overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary relative overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: isInView ? `${progressPct}%` : 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0, 0, 0.2, 1] }}
        >
          {/* Shimmer overlay */}
          <div className="shimmer-bar absolute inset-0 rounded-full" />
        </motion.div>
        {/* Day marker dot */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary/40 border-2 border-card"
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: isInView ? `${Math.max(progressPct - 1, 0)}%` : "0%", opacity: isInView ? 1 : 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0, 0, 0.2, 1] }}
        />
      </div>

      <motion.p
        className="text-[11px] text-muted-foreground font-medium mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <span className="text-foreground font-bold">Day {dailySummary.daysElapsed}</span> of {dailySummary.totalDaysInMonth} — {dailySummary.remainingDays}d left
      </motion.p>

      <motion.div
        className="mt-auto"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 6 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">Savings Rate</span>
          <span className={`text-xl font-black tabular-nums ${dailySummary.savingsRate >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {dailySummary.savingsRate > 0 ? "+" : ""}{dailySummary.savingsRate}%
          </span>
        </div>
      </motion.div>
    </div>
  )
}
