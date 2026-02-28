"use client"

import { motion } from "motion/react"
import { IconCalendar } from "@tabler/icons-react"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function MonthProgressWidget({}: WidgetComponentProps) {
  const { dailySummary } = useDashboardData()

  return (
    <div className="p-6 flex flex-col h-full bg-gradient-to-br from-lime-500/[0.04] to-transparent">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center size-9 rounded-xl bg-lime-500/10 shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)]">
          <IconCalendar className="size-4 text-lime-600 dark:text-lime-300" strokeWidth={2} />
        </div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Month Progress</p>
      </div>

      <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round((dailySummary.daysElapsed / dailySummary.totalDaysInMonth) * 100)}%` }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0, 0, 0.2, 1] }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground font-medium mb-3">
        Day {dailySummary.daysElapsed} of {dailySummary.totalDaysInMonth} — {dailySummary.remainingDays}d left
      </p>

      <div className="mt-auto">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">Savings Rate</span>
          <span className={`text-lg font-black tabular-nums ${dailySummary.savingsRate >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive"}`}>
            {dailySummary.savingsRate}%
          </span>
        </div>
      </div>
    </div>
  )
}
