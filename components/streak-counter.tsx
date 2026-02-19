"use client"

import { IconFlame } from "@tabler/icons-react"
import { useStreak } from "@/hooks/use-gamification"
import { cn } from "@/lib/utils"

export function StreakCounter({ className }: { className?: string }) {
  const { streak, isLoading } = useStreak()

  if (isLoading || !streak) return null

  const count = streak.currentStreak

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        count > 0
          ? "bg-orange-500/10 text-orange-500"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <IconFlame
        className={cn("size-3.5", count > 0 && "text-orange-500")}
        stroke={2}
      />
      <span>{count}</span>
    </div>
  )
}
