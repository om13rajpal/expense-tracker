/**
 * Gamification challenge card with animated progress ring, status
 * badges, XP rewards, and join/skip actions. Each challenge type
 * has its own themed colour and icon.
 * @module components/challenge-card
 */
"use client"

import * as React from "react"
import { motion } from "motion/react"
import {
  IconCalendarCheck,
  IconPigMoney,
  IconChartBar,
  IconShieldCheck,
  IconTags,
  IconFlame,
  IconChartLine,
  IconToolsKitchen2,
  IconCheck,
  IconBolt,
  IconChevronRight,
  IconX,
  IconTarget,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Visual theme configuration for each challenge type.
 * Keys are challenge IDs (e.g. "log_30", "save_20") and values contain
 * the Tabler icon component, Tailwind colour classes for text, ring
 * stroke, background, and border.
 */
const CHALLENGE_CONFIG: Record<string, {
  icon: React.ComponentType<any>
  color: string
  ring: string
  bg: string
  border: string
}> = {
  log_30: {
    icon: IconCalendarCheck,
    color: "text-blue-600 dark:text-blue-400",
    ring: "stroke-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  save_20: {
    icon: IconPigMoney,
    color: "text-lime-600 dark:text-lime-400",
    ring: "stroke-lime-500",
    bg: "bg-lime-500/10",
    border: "border-lime-500/20",
  },
  under_budget: {
    icon: IconChartBar,
    color: "text-foreground/70",
    ring: "stroke-muted-foreground",
    bg: "bg-muted/80 dark:bg-muted",
    border: "border-border",
  },
  no_impulse: {
    icon: IconShieldCheck,
    color: "text-amber-600 dark:text-amber-400",
    ring: "stroke-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  categorize_50: {
    icon: IconTags,
    color: "text-pink-600 dark:text-pink-400",
    ring: "stroke-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
  streak_15: {
    icon: IconFlame,
    color: "text-orange-600 dark:text-orange-400",
    ring: "stroke-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  invest_check: {
    icon: IconChartLine,
    color: "text-lime-600 dark:text-lime-400",
    ring: "stroke-lime-500",
    bg: "bg-lime-500/10",
    border: "border-lime-500/20",
  },
  reduce_dining: {
    icon: IconToolsKitchen2,
    color: "text-cyan-600 dark:text-cyan-400",
    ring: "stroke-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
}

/** Fallback theme used when a challenge ID has no entry in CHALLENGE_CONFIG. */
const DEFAULT_CONFIG = {
  icon: IconTarget,
  color: "text-primary",
  ring: "stroke-primary",
  bg: "bg-primary/10",
  border: "border-primary/20",
}

/**
 * Resolves the visual theme config for a given challenge ID.
 * Falls back to {@link DEFAULT_CONFIG} for unknown IDs.
 */
function getConfig(challengeId: string) {
  return CHALLENGE_CONFIG[challengeId] ?? DEFAULT_CONFIG
}

/**
 * Animated SVG circular progress indicator.
 * @param percent     - Completion percentage (clamped 0-100).
 * @param size        - Diameter in pixels (default 56).
 * @param strokeWidth - Ring stroke width in pixels (default 4).
 * @param className   - Optional CSS class for the wrapper.
 * @param ringClass   - Tailwind stroke class for the filled arc.
 * @param delay       - Animation delay in seconds before the arc animates in.
 */
function ProgressRing({
  percent,
  size = 56,
  strokeWidth = 4,
  className = "",
  ringClass = "stroke-primary",
  delay = 0,
}: {
  percent: number
  size?: number
  strokeWidth?: number
  className?: string
  ringClass?: string
  delay?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(percent, 0), 100)

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={ringClass}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ delay, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xs font-black tracking-tight tabular-nums">{Math.round(clamped)}%</span>
      </div>
    </div>
  )
}

/**
 * Props for {@link ChallengeCard}.
 * @property challengeId - Unique key used to look up visual theme config.
 * @property name        - Human-readable challenge title.
 * @property description - Short description of the challenge objective.
 * @property target      - Numeric target the user must reach to complete.
 * @property current     - User's current progress value toward the target.
 * @property progress    - Completion percentage (0-100).
 * @property xpReward    - XP awarded upon completion.
 * @property status      - Current status string (e.g. "active", "completed").
 * @property joined      - Whether the user has joined this challenge.
 * @property onJoin      - Callback fired when the user clicks "Join Challenge".
 * @property onSkip      - Callback fired when the user clicks "Skip Challenge".
 * @property isJoining   - Disables the join button while the mutation is in flight.
 * @property isSkipping  - Disables the skip button while the mutation is in flight.
 * @property className   - Optional CSS class for the card wrapper.
 */
interface ChallengeCardProps {
  challengeId: string
  name: string
  description: string
  target: number
  current: number
  progress: number
  xpReward: number
  status: string
  joined?: boolean
  onJoin?: (challengeId: string) => void
  onSkip?: (challengeId: string) => void
  isJoining?: boolean
  isSkipping?: boolean
  className?: string
}

/**
 * Renders a gamification challenge card with:
 * - Themed icon and colour based on the challenge type
 * - Status badge (Available / Active / Completed)
 * - XP reward pill
 * - Animated progress ring and linear progress bar (when joined)
 * - Join / Skip action buttons
 */
export function ChallengeCard({
  challengeId,
  name,
  description,
  target,
  current,
  progress,
  xpReward,
  status,
  joined = true,
  onJoin,
  onSkip,
  isJoining,
  isSkipping,
  className,
}: ChallengeCardProps) {
  const isCompleted = status === "completed"
  const config = getConfig(challengeId)
  const ChallengeIcon = config.icon
  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <div
      className={cn(
        "card-elevated rounded-xl bg-card overflow-hidden transition-all duration-300",
        isCompleted
          ? "border border-lime-500/20 hover:shadow-lg hover:shadow-lime-500/5"
          : joined
            ? "border border-border/60 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
            : "border border-dashed border-border/60 hover:border-border hover:shadow-md",
        className,
      )}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "mt-0.5 rounded-lg p-2 border",
              isCompleted
                ? "bg-lime-500/10 border-lime-500/20"
                : `${config.bg} ${config.border}`,
            )}>
              {isCompleted ? (
                <IconCheck className="h-4 w-4 text-lime-600 dark:text-lime-400" stroke={2} />
              ) : (
                <ChallengeIcon className={cn("h-4 w-4", config.color)} />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold leading-tight">{name}</h3>
              <div className="flex items-center gap-1.5">
                {isCompleted ? (
                  <Badge
                    variant="outline"
                    className="text-[11px] px-2 py-0.5 font-medium border-lime-200 bg-lime-500/10 text-lime-700 dark:border-lime-800 dark:text-lime-400"
                  >
                    <IconCheck className="mr-0.5 h-3 w-3" /> Completed
                  </Badge>
                ) : joined ? (
                  <Badge
                    variant="outline"
                    className={cn("text-[11px] px-2 py-0.5 font-medium border-0", config.bg, config.color)}
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[11px] px-2 py-0.5 font-medium"
                  >
                    Available
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-[11px] px-1.5 py-0.5 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                >
                  <IconBolt className="mr-0.5 h-3 w-3" />
                  {isCompleted ? "" : "+"}{xpReward} XP
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {description}
        </p>

        {/* Progress ring + amounts (matches goals card pattern) */}
        {joined && (
          <div className="flex items-center gap-4 mb-4">
            <ProgressRing
              percent={clampedProgress}
              size={60}
              strokeWidth={5}
              ringClass={isCompleted ? "stroke-lime-500" : config.ring}
              delay={0.1}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black tracking-tight tabular-nums">
                  {current}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  of {target}
                </span>
              </div>

              {/* Linear progress bar (matches dashboard/goals pattern) */}
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-2 rounded-full",
                      isCompleted ? "bg-lime-500" : "bg-primary",
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedProgress}%` }}
                    transition={{ delay: 0.15, duration: 0.45, ease: [0, 0, 0.2, 1] }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {!joined && onJoin && (
          <Button
            size="sm"
            onClick={() => onJoin(challengeId)}
            disabled={isJoining}
            className="w-full"
          >
            {isJoining ? (
              "Joining..."
            ) : (
              <>
                Join Challenge
                <IconChevronRight className="ml-1 size-3.5" />
              </>
            )}
          </Button>
        )}
        {joined && !isCompleted && onSkip && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSkip(challengeId)}
            disabled={isSkipping}
            className="w-full text-xs text-muted-foreground hover:text-destructive/80 h-7"
          >
            <IconX className="mr-1 size-3" />
            {isSkipping ? "Skipping..." : "Skip Challenge"}
          </Button>
        )}
      </div>
    </div>
  )
}
