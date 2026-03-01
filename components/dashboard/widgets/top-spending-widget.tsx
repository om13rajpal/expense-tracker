"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { IconChartBar } from "@tabler/icons-react"
import { formatINR as formatCurrency } from "@/lib/format"
import { MoneyInHours } from "@/components/money-in-hours"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

const CATEGORY_COLORS = [
  { dot: "bg-emerald-500", bar: "from-emerald-500 to-emerald-400", ring: "ring-emerald-500/30", glow: "shadow-emerald-500/20" },
  { dot: "bg-sky-500", bar: "from-sky-500 to-sky-400", ring: "ring-sky-500/30", glow: "shadow-sky-500/20" },
  { dot: "bg-amber-500", bar: "from-amber-500 to-amber-400", ring: "ring-amber-500/30", glow: "shadow-amber-500/20" },
  { dot: "bg-violet-500", bar: "from-violet-500 to-violet-400", ring: "ring-violet-500/30", glow: "shadow-violet-500/20" },
]

const VISIBLE_CATEGORIES = 4

export default function TopSpendingWidget({}: WidgetComponentProps) {
  const { categoryBreakdown } = useDashboardData()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  const visibleCategories = categoryBreakdown.slice(0, VISIBLE_CATEGORIES)
  const hiddenCount = Math.max(0, categoryBreakdown.length - VISIBLE_CATEGORIES)

  return (
    <div ref={ref} className="p-6 relative overflow-hidden">
      <motion.div
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : -6 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <IconChartBar className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Categories</h3>
        </div>
        <Link href="/money?tab=analytics" className="text-[11px] text-primary hover:underline font-medium">
          {categoryBreakdown.length} categories &rarr;
        </Link>
      </motion.div>

      {visibleCategories.length > 0 ? (
        <>
          {/* Segmented overview bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-muted-foreground/[0.06] mb-5">
            {visibleCategories.map((cat, i) => {
              const colors = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
              return (
                <motion.div
                  key={cat.category}
                  className={`h-full bg-gradient-to-r ${colors.bar} first:rounded-l-full last:rounded-r-full`}
                  initial={{ width: 0 }}
                  animate={{ width: isInView ? `${Math.max(cat.percentage, 2)}%` : 0 }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.7, ease: [0, 0, 0.2, 1] }}
                />
              )
            })}
          </div>

          <div className="space-y-3">
            {visibleCategories.map((cat, i) => {
              const colors = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
              return (
                <motion.div
                  key={cat.category}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -10 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <span className={`size-3 rounded-full ${colors.dot} ring-2 ${colors.ring} ring-offset-1 ring-offset-card shrink-0 dark:shadow-[0_0_6px] dark:${colors.glow}`} />
                  <span className="text-sm font-medium text-foreground/80 flex-1 min-w-0 truncate">{cat.category}</span>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-black tracking-tight tabular-nums text-foreground">{formatCurrency(cat.amount)}</span>
                    <MoneyInHours amount={cat.amount} />
                  </div>
                  <div className="w-16 h-2 rounded-full bg-muted-foreground/[0.06] overflow-hidden shrink-0 relative">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${colors.bar} relative overflow-hidden`}
                      initial={{ width: 0 }}
                      animate={{ width: isInView ? `${Math.max(cat.percentage, 2)}%` : 0 }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: [0, 0, 0.2, 1] }}
                    >
                      <div className="shimmer-bar absolute inset-0" />
                    </motion.div>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-7 text-right shrink-0">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </motion.div>
              )
            })}
            {hiddenCount > 0 && (
              <p className="text-[10px] text-muted-foreground pl-5">+{hiddenCount} more</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">No expenses this month.</p>
      )}
    </div>
  )
}
