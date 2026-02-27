/**
 * Ghost Budget card — a behavioural nudge showing how much richer
 * a hypothetical "ghost self" who stayed perfectly on budget would be.
 * Displays cumulative overspend, current-month gap, top overspend
 * categories, and a mini sparkline history bar chart.
 * @module components/ghost-budget-card
 */
"use client"

import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import { IconGhost } from "@tabler/icons-react"

import { formatINR } from "@/lib/format"
import { spring } from "@/lib/motion"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shape of the ghost budget API response.
 * @property success           - Whether the API call succeeded.
 * @property enabled           - Whether the ghost budget feature is turned on.
 * @property currentMonth      - This month's actual vs budgeted spending and gap.
 * @property cumulativeGap     - Running total overspend across all tracked months.
 * @property history           - Per-month ghost savings and cumulative gap over time.
 * @property categoryBreakdown - Per-category actual vs budget breakdown for the current month.
 */
interface GhostBudgetData {
  success: boolean
  enabled: boolean
  currentMonth?: { actual: number; budgeted: number; gap: number }
  cumulativeGap?: number
  history?: Array<{ month: string; ghostSavings: number; cumulativeGap: number }>
  categoryBreakdown?: Array<{ category: string; actual: number; budgeted: number; gap: number }>
}

/**
 * Fetches ghost budget data from the API.
 * @returns Parsed GhostBudgetData JSON response.
 */
async function fetchGhostBudget(): Promise<GhostBudgetData> {
  const res = await fetch("/api/ghost-budget", { credentials: "include" })
  return res.json()
}

/**
 * Renders the Ghost Budget card. Shows the cumulative gap between the
 * user's actual spending and their budgeted amounts, broken down by
 * current month and top over-budget categories. Includes a mini bar
 * chart of historical ghost savings. Returns null when the feature
 * is disabled or the user is perfectly on budget.
 */
export function GhostBudgetCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["ghost-budget"],
    queryFn: fetchGhostBudget,
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

  if (!data?.success || !data.enabled) return null

  const cumulative = data.cumulativeGap ?? 0
  const currentGap = data.currentMonth?.gap ?? 0
  const topOverspend = data.categoryBreakdown
    ?.filter(c => c.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
      className="card-elevated rounded-xl bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 border border-purple-500/10"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500/15 to-violet-500/15">
          <IconGhost className="h-4 w-4 text-foreground/70" />
        </div>
        <h3 className="text-sm font-semibold">Ghost Budget</h3>
      </div>

      <div className="space-y-3">
        {cumulative > 0 ? (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your ghost self has</p>
            <p className="text-2xl font-bold tabular-nums text-foreground/70">
              {formatINR(cumulative)}
            </p>
            <p className="text-xs text-muted-foreground">more than you right now</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              You are on budget. Your ghost self has nothing on you.
            </p>
          </div>
        )}

        {currentGap > 0 && (
          <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3">
            <p className="text-xs text-muted-foreground">This month&apos;s overspend</p>
            <p className="text-sm font-semibold tabular-nums text-foreground/70">
              {formatINR(currentGap)}
            </p>
          </div>
        )}

        {topOverspend && topOverspend.length > 0 && (
          <div className="space-y-1.5">
            {topOverspend.map(c => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">{c.category}</span>
                <span className="tabular-nums text-foreground/70 font-medium shrink-0 ml-2">
                  +{formatINR(c.gap)}
                </span>
              </div>
            ))}
          </div>
        )}

        {data.history && data.history.length > 0 && (
          <div className="flex items-end gap-1 h-8 mt-2">
            {data.history.slice(0, 6).reverse().map((h, i) => {
              const maxSavings = Math.max(...data.history!.slice(0, 6).map(s => s.ghostSavings), 1);
              const height = Math.max(4, (h.ghostSavings / maxSavings) * 32);
              return (
                <div
                  key={h.month}
                  className="flex-1 rounded-sm bg-primary/30"
                  style={{ height: `${height}px` }}
                  title={`${h.month}: ${formatINR(h.ghostSavings)}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
