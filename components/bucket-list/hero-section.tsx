"use client"

import { motion } from "motion/react"
import {
  IconTarget,
  IconCircleCheck,
  IconCoin,
  IconChartLine,
} from "@tabler/icons-react"
import { stagger, fadeUp, fadeUpSmall, numberPop } from "@/lib/motion"
import { formatCompact } from "@/lib/format"
import type { BucketListItem, BucketListSummary } from "@/lib/types"

interface HeroSectionProps {
  summary: BucketListSummary
  items: BucketListItem[]
}

const STAT_CONFIG = [
  {
    key: "items",
    label: "Total Items",
    icon: IconTarget,
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "from-blue-500/5",
  },
  {
    key: "completed",
    label: "Completed",
    icon: IconCircleCheck,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "from-emerald-500/5",
  },
  {
    key: "saved",
    label: "Saved",
    icon: IconCoin,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "from-amber-500/5",
  },
  {
    key: "progress",
    label: "Overall Progress",
    icon: IconChartLine,
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    accent: "from-violet-500/5",
  },
] as const

export function HeroSection({ summary }: HeroSectionProps) {
  const statValues = [
    String(summary.totalItems),
    String(summary.completedItems),
    `${formatCompact(summary.totalSavedAmount)}`,
    `${summary.overallProgress}%`,
  ]

  const statSuffixes = [
    undefined,
    `of ${summary.totalItems}`,
    `of ${formatCompact(summary.totalTargetAmount)}`,
    undefined,
  ]

  const statValueColors = [
    "text-blue-600 dark:text-blue-400",
    "text-emerald-600 dark:text-emerald-400",
    "text-amber-600 dark:text-amber-400",
    "text-violet-600 dark:text-violet-400",
  ]

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 overflow-hidden"
    >
      {STAT_CONFIG.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.key}
            variants={fadeUpSmall}
            className={`card-elevated rounded-xl bg-card relative overflow-hidden p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:scale-[1.01]`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.accent} to-transparent pointer-events-none`} />
            <div className={`relative flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-xl ${stat.iconBg} shrink-0`}>
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} strokeWidth={1.8} />
            </div>
            <div className="relative min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                {stat.label}
              </p>
              <motion.p
                variants={numberPop}
                className={`text-base sm:text-xl font-bold tabular-nums truncate ${statValueColors[i]}`}
              >
                {statValues[i]}
                {statSuffixes[i] && (
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground"> {statSuffixes[i]}</span>
                )}
              </motion.p>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
