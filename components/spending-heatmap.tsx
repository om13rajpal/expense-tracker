"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import { formatINR } from "@/lib/format"
import { toDate } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SpendingHeatmapProps {
  transactions: Array<{ date: Date | string; amount: number; type: string }>
  months?: number // default 3
}

interface DayData {
  date: string // YYYY-MM-DD
  amount: number
  count: number
  dayOfWeek: number // 0=Sun, 6=Sat
}

function getHeatmapColor(amount: number, max: number): string {
  if (amount === 0) return "bg-muted/30"
  const intensity = Math.min(amount / max, 1)
  if (intensity < 0.25) return "bg-emerald-200 dark:bg-emerald-900/60"
  if (intensity < 0.5) return "bg-amber-200 dark:bg-amber-800/60"
  if (intensity < 0.75) return "bg-orange-300 dark:bg-orange-800/60"
  return "bg-rose-400 dark:bg-rose-700/60"
}

function getHeatmapBorder(amount: number, max: number): string {
  if (amount === 0) return ""
  const intensity = Math.min(amount / max, 1)
  if (intensity < 0.25) return "ring-1 ring-emerald-300/40 dark:ring-emerald-700/40"
  if (intensity < 0.5) return "ring-1 ring-amber-300/40 dark:ring-amber-700/40"
  if (intensity < 0.75) return "ring-1 ring-orange-400/40 dark:ring-orange-700/40"
  return "ring-1 ring-rose-500/40 dark:ring-rose-600/40"
}

export function SpendingHeatmap({ transactions, months = 3 }: SpendingHeatmapProps) {
  const { weeks, maxDaily, monthLabels, summary } = useMemo(() => {
    // Calculate start/end dates
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    // Align start to the beginning of the week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    // Build a map of daily spending (expenses only)
    const dailyMap = new Map<string, { amount: number; count: number }>()
    for (const txn of transactions) {
      if (txn.type !== "expense") continue
      const d = toDate(txn.date)
      if (d < startDate || d > endDate) continue
      const key = d.toISOString().split("T")[0]
      const existing = dailyMap.get(key) || { amount: 0, count: 0 }
      existing.amount += txn.amount
      existing.count += 1
      dailyMap.set(key, existing)
    }

    // Find max daily spending for color scaling
    let max = 0
    for (const entry of dailyMap.values()) {
      if (entry.amount > max) max = entry.amount
    }

    // Build week columns
    const allWeeks: DayData[][] = []
    let currentWeek: DayData[] = []
    const current = new Date(startDate)
    const allDays: DayData[] = []

    while (current <= endDate) {
      const key = current.toISOString().split("T")[0]
      const entry = dailyMap.get(key) || { amount: 0, count: 0 }
      const dayData: DayData = {
        date: key,
        amount: entry.amount,
        count: entry.count,
        dayOfWeek: current.getDay(),
      }
      currentWeek.push(dayData)
      allDays.push(dayData)

      if (current.getDay() === 6) {
        // Saturday, end of week
        allWeeks.push(currentWeek)
        currentWeek = []
      }

      current.setDate(current.getDate() + 1)
    }

    // Push remaining partial week
    if (currentWeek.length > 0) {
      allWeeks.push(currentWeek)
    }

    // Generate month labels positioned at the right column
    const labels: { label: string; colStart: number }[] = []
    let lastMonthKey = ""
    for (let weekIdx = 0; weekIdx < allWeeks.length; weekIdx++) {
      const firstDay = allWeeks[weekIdx][0]
      if (!firstDay) continue
      const d = new Date(firstDay.date)
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`
      if (monthKey !== lastMonthKey) {
        labels.push({
          label: d.toLocaleDateString("en-US", { month: "short" }),
          colStart: weekIdx,
        })
        lastMonthKey = monthKey
      }
    }

    // Compute summary stats
    let totalSpending = 0
    let highestAmount = 0
    let highestDate = ""
    let zeroSpendDays = 0
    let totalDays = 0

    for (const day of allDays) {
      totalDays++
      totalSpending += day.amount
      if (day.amount > highestAmount) {
        highestAmount = day.amount
        highestDate = day.date
      }
      if (day.amount === 0) {
        zeroSpendDays++
      }
    }

    const avgDaily = totalDays > 0 ? totalSpending / totalDays : 0

    return {
      weeks: allWeeks,
      maxDaily: max || 1,
      monthLabels: labels,
      summary: {
        totalSpending,
        avgDaily,
        highestAmount,
        highestDate,
        zeroSpendDays,
        totalDays,
      },
    }
  }, [transactions, months])

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col @xl/main:flex-row gap-6"
    >
      {/* Left: Heatmap Grid */}
      <div className="min-w-0 flex-shrink-0">
        {/* Month labels */}
        <div className="flex text-[10px] text-muted-foreground/70 font-medium mb-1">
          {/* Spacer for day labels column */}
          <div className="w-5 shrink-0" />
          <div className="flex">
            {monthLabels.map((ml, i) => {
              const nextStart = i < monthLabels.length - 1 ? monthLabels[i + 1].colStart : weeks.length
              const span = nextStart - ml.colStart
              // Each column is 13px cell + 2px gap = 15px
              const width = span * 15
              return (
                <div
                  key={i}
                  style={{ width: `${width}px` }}
                  className="text-left truncate"
                >
                  {ml.label}
                </div>
              )
            })}
          </div>
        </div>

        {/* Grid with fixed-size cells */}
        <div className="overflow-x-auto">
          <div className="flex gap-[2px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] shrink-0">
              {dayLabels.map((day, i) => (
                <div
                  key={i}
                  className="w-4 h-[13px] text-[9px] text-muted-foreground/60 flex items-center justify-center leading-none"
                >
                  {i % 2 === 1 ? day : ""}
                </div>
              ))}
            </div>

            {/* Week columns with fixed-size cells */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[2px]">
                {/* Pad the first week if it doesn't start on Sunday */}
                {weekIdx === 0 &&
                  week[0] &&
                  week[0].dayOfWeek > 0 &&
                  Array.from({ length: week[0].dayOfWeek }).map((_, i) => (
                    <div key={`pad-${i}`} className="w-[13px] h-[13px]" />
                  ))}
                {week.map((day) => (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-[13px] h-[13px] rounded-[3px] cursor-default transition-colors ${getHeatmapColor(day.amount, maxDaily)} ${getHeatmapBorder(day.amount, maxDaily)}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {day.amount > 0 ? (
                        <p className="text-muted-foreground">
                          {formatINR(day.amount)} ({day.count} txn{day.count !== 1 ? "s" : ""})
                        </p>
                      ) : (
                        <p className="text-muted-foreground">No spending</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mt-2.5">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-[13px] h-[13px] rounded-[3px] bg-muted/30" />
            <div className="w-[13px] h-[13px] rounded-[3px] bg-emerald-200 dark:bg-emerald-900/60" />
            <div className="w-[13px] h-[13px] rounded-[3px] bg-amber-200 dark:bg-amber-800/60" />
            <div className="w-[13px] h-[13px] rounded-[3px] bg-orange-300 dark:bg-orange-800/60" />
            <div className="w-[13px] h-[13px] rounded-[3px] bg-rose-400 dark:bg-rose-700/60" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Right: Summary Stats */}
      <div className="flex-1 min-w-[200px]">
        <div className="grid grid-cols-2 @xl/main:grid-cols-1 gap-3 @xl/main:gap-4">
          {/* Total Spending */}
          <div className="rounded-xl bg-muted/30 px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest leading-none mb-1.5">
              Total Spending
            </p>
            <p className="text-base font-bold tabular-nums leading-tight truncate">
              {formatINR(summary.totalSpending)}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              last {months} months
            </p>
          </div>

          {/* Average Daily */}
          <div className="rounded-xl bg-muted/30 px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest leading-none mb-1.5">
              Daily Average
            </p>
            <p className="text-base font-bold tabular-nums leading-tight truncate">
              {formatINR(Math.round(summary.avgDaily))}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              per day
            </p>
          </div>

          {/* Highest Spend Day */}
          <div className="rounded-xl bg-muted/30 px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest leading-none mb-1.5">
              Peak Day
            </p>
            <p className="text-base font-bold tabular-nums leading-tight truncate">
              {formatINR(summary.highestAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {summary.highestDate
                ? new Date(summary.highestDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
          </div>

          {/* Zero-Spend Days */}
          <div className="rounded-xl bg-muted/30 px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest leading-none mb-1.5">
              No-Spend Days
            </p>
            <p className="text-base font-bold tabular-nums leading-tight">
              {summary.zeroSpendDays}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              of {summary.totalDays} days ({summary.totalDays > 0 ? Math.round((summary.zeroSpendDays / summary.totalDays) * 100) : 0}%)
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
