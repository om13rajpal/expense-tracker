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

interface SummaryCardsProps {
  summary: BucketListSummary
}

const cards = [
  {
    key: "total",
    label: "Total Items",
    icon: IconChecklist,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    getValue: (s: BucketListSummary) => String(s.totalItems),
  },
  {
    key: "completed",
    label: "Completed",
    icon: IconCircleCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    getValue: (s: BucketListSummary) => String(s.completedItems),
  },
  {
    key: "target",
    label: "Total Target",
    icon: IconTargetArrow,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    getValue: (s: BucketListSummary) => formatINR(s.totalTargetAmount),
  },
  {
    key: "progress",
    label: "Overall Progress",
    icon: IconChartBar,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    getValue: (s: BucketListSummary) => `${Math.round(s.overallProgress)}%`,
  },
] as const

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
          <Card className="py-4 gap-3">
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
