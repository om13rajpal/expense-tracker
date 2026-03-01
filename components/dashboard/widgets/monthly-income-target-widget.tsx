/**
 * Monthly Income Target dashboard widget — circular progress ring
 * showing income earned vs the user's monthly target, with status
 * badge and inline target-setting.
 * @module components/dashboard/widgets/monthly-income-target-widget
 */
"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { IconTarget, IconCheck, IconAlertTriangle } from "@tabler/icons-react"
import { formatINR } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useMonthlyIncomeTarget,
  useSetMonthlyIncomeTarget,
} from "@/hooks/use-monthly-income-target"
import type { WidgetComponentProps } from "@/lib/widget-registry"

function ProgressRing({
  percent,
  size = 90,
  strokeWidth = 7,
}: {
  percent: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(percent, 0), 100)

  const ringColor =
    clamped >= 80
      ? "stroke-lime-500"
      : clamped >= 50
        ? "stroke-amber-500"
        : "stroke-red-500"

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference - (clamped / 100) * circumference,
          }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-0.5">
        <span className="text-lg font-black tabular-nums tracking-tight">
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  )
}

export default function MonthlyIncomeTargetWidget({}: WidgetComponentProps) {
  const { data, isLoading } = useMonthlyIncomeTarget()
  const setTargetMutation = useSetMonthlyIncomeTarget()
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState("")

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
        <Skeleton className="h-[90px] w-[90px] rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    )
  }

  const handleSetTarget = async () => {
    const val = Number(inputValue)
    if (!val || val <= 0) return
    await setTargetMutation.mutateAsync(val)
    setShowInput(false)
    setInputValue("")
  }

  // No target set — show prompt
  if (!data?.target) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
          <IconTarget className="h-5 w-5 text-primary" />
        </div>
        {showInput ? (
          <div className="flex flex-col gap-2 w-full max-w-[200px]">
            <Input
              type="number"
              placeholder="e.g. 100000"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetTarget()}
              autoFocus
              className="text-center"
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => setShowInput(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={handleSetTarget}
                disabled={setTargetMutation.isPending}
              >
                {setTargetMutation.isPending ? "..." : "Set"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground text-center">
              Set a monthly income target
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setShowInput(true)}
            >
              Set Target
            </Button>
          </>
        )}
      </div>
    )
  }

  // Has target — show progress
  const { target, actualIncome, percentage, status } = data

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-full gap-2 p-4"
    >
      <ProgressRing percent={percentage ?? 0} />

      <div className="text-center space-y-0.5">
        <p className="text-sm font-bold tabular-nums text-foreground">
          {formatINR(actualIncome)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          of {formatINR(target!)} target
        </p>
      </div>

      {status === "achieved" && (
        <Badge
          variant="outline"
          className="gap-1 bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-800 text-[10px] h-5"
        >
          <IconCheck className="h-3 w-3" />
          Achieved
        </Badge>
      )}
      {status === "on-track" && (
        <Badge
          variant="outline"
          className="gap-1 bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-800 text-[10px] h-5"
        >
          <IconCheck className="h-3 w-3" />
          On Track
        </Badge>
      )}
      {status === "behind" && (
        <Badge
          variant="outline"
          className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px] h-5"
        >
          <IconAlertTriangle className="h-3 w-3" />
          Behind
        </Badge>
      )}
    </motion.div>
  )
}
