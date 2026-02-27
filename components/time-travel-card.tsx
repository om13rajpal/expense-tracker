/**
 * Financial Time Travel card — shows what the user was spending
 * "on this day last year" and compares month-to-date spending
 * against the same period in the previous month.
 * @module components/time-travel-card
 */
"use client"

import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import { IconCalendarTime, IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { formatINR } from "@/lib/format"
import { spring } from "@/lib/motion"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shape of the time-travel API response.
 * @property success         - Whether the API call succeeded.
 * @property lastYear        - Transactions from the same calendar date one year ago.
 * @property monthComparison - Month-to-date spending comparison with the previous month.
 */
interface TimeTravelData {
  success: boolean
  lastYear: {
    date: string
    transactions: Array<{ description: string; amount: number; category: string }>
    totalSpent: number
  }
  monthComparison: {
    thisMonth: number
    lastMonth: number
    change: number
    changePercent: number
    daysCompared: number
  }
}

/**
 * Fetches time-travel comparison data from the API.
 * @returns Parsed TimeTravelData JSON response.
 */
async function fetchTimeTravel(): Promise<TimeTravelData> {
  const res = await fetch("/api/time-travel", { credentials: "include" })
  return res.json()
}

/**
 * Renders a dashboard card with two sections:
 * 1. **On this day last year** – list of transactions from the same date 12 months ago.
 * 2. **Month comparison** – spending delta (amount and %) vs the same point last month.
 * Returns null when the API returns no data.
 */
export function TimeTravelCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["time-travel"],
    queryFn: fetchTimeTravel,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl bg-card p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    )
  }

  if (!data?.success) return null

  const hasLastYear = data.lastYear.transactions.length > 0
  const comparison = data.monthComparison
  const isUp = comparison.change > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
      className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500/15 to-blue-500/15">
          <IconCalendarTime className="h-4 w-4 text-cyan-500" />
        </div>
        <h3 className="text-sm font-semibold">Financial Time Travel</h3>
      </div>

      <div className="space-y-3">
        {hasLastYear ? (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              On this day last year ({new Date(data.lastYear.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })})
            </p>
            <div className="space-y-1.5">
              {data.lastYear.transactions.slice(0, 3).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80 truncate">{t.description}</span>
                  <span className="tabular-nums font-medium shrink-0 ml-2">{formatINR(t.amount)}</span>
                </div>
              ))}
              {data.lastYear.transactions.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{data.lastYear.transactions.length - 3} more ({formatINR(data.lastYear.totalSpent)} total)
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data from this day last year</p>
        )}

        {/* Month comparison */}
        <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
          <p className="text-xs text-muted-foreground mb-1">
            vs last month (first {comparison.daysCompared} days)
          </p>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 text-sm font-semibold",
              isUp ? "text-destructive" : "text-lime-600 dark:text-lime-400"
            )}>
              {isUp ? (
                <IconArrowUpRight className="h-4 w-4" />
              ) : (
                <IconArrowDownRight className="h-4 w-4" />
              )}
              {comparison.changePercent !== 0
                ? `${Math.abs(comparison.changePercent)}%`
                : "Same"}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatINR(comparison.thisMonth)} vs {formatINR(comparison.lastMonth)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
