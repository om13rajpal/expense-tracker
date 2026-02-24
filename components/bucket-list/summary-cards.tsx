/**
 * Summary cards for the bucket list page header.
 *
 * Displays four animated stat cards showing aggregate bucket list metrics:
 * - **Total Items** — count of all items across all statuses
 * - **Completed** — count of items marked as completed
 * - **Total Target** — sum of all target amounts formatted in INR
 * - **Overall Progress** — weighted savings progress as a percentage
 *
 * Each card features a colored icon background, stagger-animated entrance
 * via Framer Motion, and a subtle gradient accent bar at the top.
 *
 * @module components/bucket-list/summary-cards
 */
"use client"

import { motion } from "motion/react"
import {
  IconChecklist,
  IconCircleCheck,
  IconTargetArrow,
  IconChartBar,
} from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatINR } from "@/lib/format"
import { stagger, fadeUp } from "@/lib/motion"
import type { BucketListSummary } from "@/lib/types"

/**
 * Props for the BucketListSummaryCards component.
 *
 * @property summary - Aggregate bucket list stats computed by the API
 */
interface SummaryCardsProps {
  summary: BucketListSummary
}

/**
 * Configuration array for the four summary stat cards.
 *
 * Each entry defines the visual appearance (icon, colors, gradient accent)
 * and a getValue function that extracts the display value from the summary.
 */
const cards = [
  {
    key: "total",
    label: "Total Items",
    icon: IconChecklist,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    accent: "from-blue-500 to-indigo-500",
    getValue: (s: BucketListSummary) => String(s.totalItems),
  },
  {
    key: "completed",
    label: "Completed",
    icon: IconCircleCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    accent: "from-emerald-500 to-teal-500",
    getValue: (s: BucketListSummary) => String(s.completedItems),
  },
  {
    key: "target",
    label: "Total Target",
    icon: IconTargetArrow,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    accent: "from-orange-500 to-amber-500",
    getValue: (s: BucketListSummary) => formatINR(s.totalTargetAmount),
  },
  {
    key: "progress",
    label: "Overall Progress",
    icon: IconChartBar,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    accent: "from-purple-500 to-pink-500",
    getValue: (s: BucketListSummary) => `${Math.round(s.overallProgress)}%`,
  },
] as const

/**
 * Renders four animated summary statistic cards for the bucket list.
 *
 * Uses Framer Motion stagger animation so cards appear sequentially.
 * Each card has a gradient accent bar, icon, label, and computed stat value.
 *
 * @param props - Component props containing the bucket list summary data
 */
export function BucketListSummaryCards({ summary }: SummaryCardsProps) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {cards.map((c) => (
        <motion.div key={c.key} variants={fadeUp}>
          <Card className="py-4 gap-3 relative overflow-hidden">
            {/* Top accent gradient bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.accent}`}
            />
            <CardContent className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${c.bg}`}>
                <c.icon className={`size-5 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {c.label}
                </p>
                <p className="text-lg font-bold tracking-tight truncate">
                  {c.getValue(summary)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
