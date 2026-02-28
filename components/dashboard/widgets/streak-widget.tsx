"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { IconFlame } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

interface GamificationData { levelName: string; streak: number }

export default function StreakWidget({}: WidgetComponentProps) {
  const [gamification, setGamification] = useState<GamificationData | null>(null)

  useEffect(() => {
    fetch("/api/gamification").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      setGamification({ levelName: data.levelName || data.level?.name || "Beginner", streak: data.streak?.currentStreak || data.currentStreak || 0 })
    }).catch(() => {})
  }, [])

  return (
    <Link href="/gamification" className="block p-5 h-full bg-gradient-to-br from-lime-500/[0.04] to-transparent">
      <div className="flex items-center justify-center size-9 rounded-lg bg-lime-500/10 shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)] mb-2">
        <IconFlame className="size-4 text-lime-600 dark:text-lime-300" />
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Streak</p>
      {gamification ? (
        <>
          <p className="text-sm font-black tracking-tight truncate">{gamification.levelName}</p>
          <p className="text-[10px] text-muted-foreground">{gamification.streak > 0 ? `${gamification.streak}-day` : "No streak"}</p>
        </>
      ) : <Skeleton className="h-4 w-16" />}
    </Link>
  )
}
