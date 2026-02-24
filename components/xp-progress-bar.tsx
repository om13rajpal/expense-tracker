/**
 * Animated XP progress bar used in the gamification system.
 * Displays current level, XP earned, and an animated gradient fill
 * with a shimmer effect toward the next level threshold.
 * @module components/xp-progress-bar
 */
"use client"

import { motion } from "motion/react"
import { IconBolt } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

/**
 * Props for {@link XPProgressBar}.
 * @property totalXP     - Cumulative experience points earned by the user.
 * @property level       - Current gamification level number.
 * @property levelName   - Human-readable label for the level (e.g. "Budget Ninja").
 * @property progress    - Percentage (0-100) toward the next level.
 * @property nextLevelXP - XP threshold for the next level, or null if at max level.
 * @property className   - Optional CSS class for the wrapper div.
 * @property compact     - When true, hides the level label row (used in sidebar).
 */
interface XPProgressBarProps {
  totalXP: number
  level: number
  levelName: string
  progress: number
  nextLevelXP: number | null
  className?: string
  /** Show compact version without the label row */
  compact?: boolean
}

/**
 * Renders an animated gradient progress bar (amber-to-rose) with a shimmer
 * overlay, showing level info and XP remaining until the next level.
 */
export function XPProgressBar({
  totalXP,
  level,
  levelName,
  progress,
  nextLevelXP,
  className,
  compact = false,
}: XPProgressBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {!compact && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">
            Level {level} &mdash; {levelName}
          </span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <IconBolt className="size-3.5 text-amber-500" stroke={2} />
            <span>
              {totalXP.toLocaleString()} XP
              {nextLevelXP ? ` / ${nextLevelXP.toLocaleString()} XP` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Custom animated progress bar with gradient */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary/60">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(progress, 2)}%` }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
        />
        {/* Shimmer effect on top of the bar */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(progress, 2)}%` }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
        />
      </div>

      {nextLevelXP && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {(nextLevelXP - totalXP).toLocaleString()} XP
          </span>{" "}
          to next level
        </p>
      )}
    </div>
  )
}
