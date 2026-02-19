"use client"

import Link from "next/link"
import { useGamification } from "@/hooks/use-gamification"
import { XPProgressBar } from "@/components/xp-progress-bar"

export function SidebarXP() {
  const { xp, isLoading } = useGamification()

  if (isLoading || !xp) return null

  return (
    <Link href="/gamification" className="block px-2 hover:opacity-80 transition-opacity">
      <XPProgressBar
        compact
        totalXP={xp.totalXP}
        level={xp.level}
        levelName={xp.levelName}
        progress={xp.progress}
        nextLevelXP={xp.nextLevelXP}
      />
    </Link>
  )
}
