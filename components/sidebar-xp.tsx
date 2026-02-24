/**
 * Compact XP progress widget shown in the sidebar footer.
 * Links to the full gamification page when clicked.
 * @module components/sidebar-xp
 */
"use client"

import Link from "next/link"
import { useGamification } from "@/hooks/use-gamification"
import { XPProgressBar } from "@/components/xp-progress-bar"

/**
 * Renders a compact XP progress bar inside the app sidebar.
 * Fetches the current gamification state (level, XP, progress) and
 * links through to `/gamification` for the full experience.
 * Hidden while loading or when gamification data is unavailable.
 */
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
