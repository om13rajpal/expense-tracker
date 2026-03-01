"use client"

import { useMemo, useRef } from "react"
import { motion, useInView } from "motion/react"
import { IconTrendingUp, IconTrendingDown, IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react"
import { formatINR, formatCompact } from "@/lib/format"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function CashFlowForecastWidget({}: WidgetComponentProps) {
  const { totalIncome, totalExpenses, closingBalance, dailySummary } = useDashboardData()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  const forecast = useMemo(() => {
    const avgDailyIncome = totalIncome / Math.max(1, dailySummary.daysElapsed)
    const avgDailyExpense = totalExpenses / Math.max(1, dailySummary.daysElapsed)
    const netDailyFlow = avgDailyIncome - avgDailyExpense
    const projectedBalance30d = closingBalance + (netDailyFlow * 30)
    const monthlyBurn = avgDailyExpense * 30
    const monthlyEarn = avgDailyIncome * 30
    const runwayDays = avgDailyExpense > 0 ? Math.floor(closingBalance / avgDailyExpense) : 999

    return { netDailyFlow, projectedBalance30d, monthlyBurn, monthlyEarn, runwayDays }
  }, [totalIncome, totalExpenses, closingBalance, dailySummary.daysElapsed])

  const isPositiveFlow = forecast.netDailyFlow >= 0

  return (
    <div ref={ref} className="p-6 h-full flex flex-col relative overflow-hidden">
      {/* Ambient glow */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
        isPositiveFlow ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]" : "bg-red-500/[0.04] dark:bg-red-500/[0.06]"
      }`} />

      <motion.p
        className="text-[13px] font-medium text-muted-foreground mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        Cash Flow Forecast
      </motion.p>

      <motion.div
        className="flex items-baseline gap-2 mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 8 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <span className="text-3xl font-black tracking-tight tabular-nums text-foreground">{formatINR(forecast.projectedBalance30d)}</span>
        <div className="flex items-center gap-1">
          {isPositiveFlow
            ? <IconTrendingUp className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            : <IconTrendingDown className="size-3.5 text-red-500 dark:text-red-400" />
          }
          <span className="text-[11px] text-muted-foreground font-medium">in 30d</span>
        </div>
      </motion.div>

      <div className="space-y-2.5 flex-1">
        {[
          {
            icon: IconArrowUpRight,
            label: "Monthly Income",
            value: formatCompact(forecast.monthlyEarn),
            accent: "border-emerald-500 dark:border-emerald-400 bg-emerald-500/5 dark:bg-emerald-400/5",
            iconColor: "text-emerald-500 dark:text-emerald-400",
            valueColor: "text-emerald-500 dark:text-emerald-400",
            delay: 0.3,
          },
          {
            icon: IconArrowDownRight,
            label: "Monthly Expenses",
            value: formatCompact(forecast.monthlyBurn),
            accent: "border-muted-foreground/20 bg-muted/40",
            iconColor: "text-muted-foreground",
            valueColor: "text-foreground/70",
            delay: 0.4,
          },
          {
            icon: isPositiveFlow ? IconTrendingUp : IconTrendingDown,
            label: "Net Daily Flow",
            value: `${isPositiveFlow ? "+" : ""}${formatCompact(forecast.netDailyFlow)}/day`,
            accent: isPositiveFlow
              ? "border-emerald-500 dark:border-emerald-400 bg-emerald-500/5 dark:bg-emerald-400/5"
              : "border-red-500 dark:border-red-400 bg-red-500/5 dark:bg-red-400/5",
            iconColor: isPositiveFlow ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
            valueColor: isPositiveFlow ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
            delay: 0.5,
          },
        ].map((row, i) => (
          <motion.div
            key={i}
            className={`flex items-center justify-between rounded-xl px-3 py-2 border-l-[3px] ${row.accent}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -12 }}
            transition={{ delay: row.delay, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex items-center gap-1.5">
              <row.icon className={`size-3.5 ${row.iconColor}`} />
              <span className="text-xs text-muted-foreground">{row.label}</span>
            </div>
            <span className={`text-xs font-black tabular-nums ${row.valueColor}`}>{row.value}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-auto pt-3 border-t border-border/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ delay: 0.7, duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">Runway</span>
          <span className={`text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full ${
            forecast.runwayDays > 60
              ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
              : forecast.runwayDays > 30
              ? "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"
              : "bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-400"
          }`}>
            {forecast.runwayDays > 365 ? "1y+" : `${forecast.runwayDays}d`}
          </span>
        </div>
      </motion.div>
    </div>
  )
}
