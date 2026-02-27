/**
 * Smart Roundup Savings card.
 * Calculates how much the user could save if every expense were rounded
 * up to the nearest Rs 100, and displays the total, per-transaction
 * average, and top individual roundups.
 * @module components/roundup-savings-card
 */
"use client"

import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import { IconCoinRupee } from "@tabler/icons-react"

import { formatINR } from "@/lib/format"
import { spring } from "@/lib/motion"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shape of the roundup savings API response.
 * @property success          - Whether the API call succeeded.
 * @property totalRoundup     - Total hypothetical savings from rounding up all expenses.
 * @property transactionCount - Number of transactions included in the calculation.
 * @property averageRoundup   - Mean roundup amount per transaction.
 * @property topRoundups      - Top individual transactions with the largest roundup deltas.
 */
interface RoundupData {
  success: boolean
  totalRoundup: number
  transactionCount: number
  averageRoundup: number
  topRoundups: Array<{ description: string; amount: number; roundup: number }>
}

/**
 * Fetches roundup savings data from the API.
 * @returns Parsed RoundupData JSON response.
 */
async function fetchRoundup(): Promise<RoundupData> {
  const res = await fetch("/api/roundup-savings", { credentials: "include" })
  return res.json()
}

/**
 * Renders a dashboard card showing potential savings from rounding up
 * every expense to the nearest Rs 100. Includes the aggregate amount,
 * transaction count, average roundup, and a list of the top 3 roundups.
 * Hidden when no savings data is available or the total is zero.
 */
export function RoundupSavingsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["roundup-savings"],
    queryFn: fetchRoundup,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl bg-card p-5 space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    )
  }

  if (!data?.success || data.totalRoundup === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
      className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15">
          <IconCoinRupee className="h-4 w-4 text-lime-500" />
        </div>
        <h3 className="text-sm font-semibold">Smart Roundup Savings</h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">If you rounded up every expense to the nearest 100</p>
          <p className="text-2xl font-bold tabular-nums text-lime-600 dark:text-lime-400">
            {formatINR(data.totalRoundup)}
          </p>
          <p className="text-xs text-muted-foreground">
            extra saved from {data.transactionCount} transactions (avg {formatINR(data.averageRoundup)} each)
          </p>
        </div>

        {data.topRoundups.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Top roundups</p>
            {data.topRoundups.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">{r.description}</span>
                <span className="tabular-nums text-lime-600 dark:text-lime-400 font-medium shrink-0 ml-2">
                  +{formatINR(r.roundup)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
