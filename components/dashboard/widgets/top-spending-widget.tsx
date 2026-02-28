"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { formatINR as formatCurrency } from "@/lib/format"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

const CATEGORY_COLORS = [
  "bg-lime-400", "bg-lime-500/80", "bg-lime-600/60", "bg-lime-700/40",
]
const CATEGORY_BAR_GRADIENTS = [
  "from-lime-400/80 to-lime-400/20",
  "from-lime-500/60 to-lime-500/15",
  "from-lime-600/50 to-lime-600/10",
  "from-lime-700/40 to-lime-700/10",
]

const VISIBLE_CATEGORIES = 4

export default function TopSpendingWidget({}: WidgetComponentProps) {
  const { categoryBreakdown } = useDashboardData()

  const visibleCategories = categoryBreakdown.slice(0, VISIBLE_CATEGORIES)
  const hiddenCount = Math.max(0, categoryBreakdown.length - VISIBLE_CATEGORIES)

  return (
    <div className="p-6 bg-gradient-to-br from-lime-500/[0.04] to-transparent">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Top Spending</h3>
        <Link href="/money?tab=analytics" className="text-[11px] text-primary hover:underline font-medium">
          {categoryBreakdown.length} categories &rarr;
        </Link>
      </div>

      {visibleCategories.length > 0 ? (
        <div className="space-y-3">
          {visibleCategories.map((cat, i) => (
            <div key={cat.category} className="flex items-center gap-3">
              <span className={`size-2 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} shrink-0`} />
              <span className="text-sm font-medium text-foreground/80 flex-1 min-w-0 truncate">{cat.category}</span>
              <span className="text-xs font-black tracking-tight tabular-nums shrink-0">{formatCurrency(cat.amount)}</span>
              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${CATEGORY_BAR_GRADIENTS[i % CATEGORY_BAR_GRADIENTS.length]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(cat.percentage, 2)}%` }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.5, ease: [0, 0, 0.2, 1] }}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-7 text-right shrink-0">
                {cat.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="text-[10px] text-muted-foreground pl-5">+{hiddenCount} more</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">No expenses this month.</p>
      )}
    </div>
  )
}
