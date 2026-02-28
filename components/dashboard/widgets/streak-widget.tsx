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
    <Link href="/gamification" className="block p-5 h-full">
      <div className="flex items-center justify-center size-9 rounded-lg bg-orange-100 mb-2">
        <IconFlame className="size-4 text-orange-500" />
      </div>
      <p className="text-[13px] font-medium text-neutral-500 mb-1">Streak</p>
      {gamification ? (
        <>
          <p className="text-sm font-black tracking-tight truncate">{gamification.levelName}</p>
          <p className="text-[10px] text-muted-foreground">{gamification.streak > 0 ? `${gamification.streak}-day` : "No streak"}</p>
        </>
      ) : <Skeleton className="h-4 w-16" />}
    </Link>
  )
}
