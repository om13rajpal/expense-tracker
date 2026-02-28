"use client"

import { motion } from "motion/react"
import { IconCalendar } from "@tabler/icons-react"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function MonthProgressWidget({}: WidgetComponentProps) {
  const { dailySummary } = useDashboardData()

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center size-9 rounded-xl bg-neutral-100">
          <IconCalendar className="size-4 text-neutral-600" strokeWidth={2} />
        </div>
        <p className="text-[13px] font-medium text-neutral-500">Month Progress</p>
      </div>

      <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full bg-lime-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round((dailySummary.daysElapsed / dailySummary.totalDaysInMonth) * 100)}%` }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0, 0, 0.2, 1] }}
        />
      </div>
      <p className="text-[11px] text-neutral-400 font-medium mb-3">
        Day {dailySummary.daysElapsed} of {dailySummary.totalDaysInMonth} — {dailySummary.remainingDays}d left
      </p>

      <div className="mt-auto">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-medium">Savings Rate</span>
          <span className={`text-lg font-black tabular-nums ${dailySummary.savingsRate >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {dailySummary.savingsRate}%
          </span>
        </div>
      </div>
    </div>
  )
}
