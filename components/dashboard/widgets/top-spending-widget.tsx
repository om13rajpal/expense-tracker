"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { formatINR as formatCurrency } from "@/lib/format"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

const CATEGORY_COLORS = [
  "bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-violet-500",
]
const CATEGORY_BAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
]

const VISIBLE_CATEGORIES = 4

export default function TopSpendingWidget({}: WidgetComponentProps) {
  const { categoryBreakdown } = useDashboardData()

  const visibleCategories = categoryBreakdown.slice(0, VISIBLE_CATEGORIES)
  const hiddenCount = Math.max(0, categoryBreakdown.length - VISIBLE_CATEGORIES)

  return (
    <div className="p-6">
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
              <div className="w-16 h-2 rounded-full bg-neutral-100 overflow-hidden shrink-0">
                <motion.div
                  className={`h-full rounded-full ${CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length]}`}
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
