/**
 * Gamification badge unlock toast notification.
 * Displays a success toast when the user earns a new achievement badge.
 * @module components/badge-toast
 */
"use client"

import { toast } from "sonner"

/**
 * Fires a success toast announcing a newly unlocked gamification badge.
 * @param badgeName - Display name of the earned badge (e.g. "Budget Master").
 * @param xpEarned - Amount of XP the user received for earning the badge.
 */
export function showBadgeToast(badgeName: string, xpEarned: number) {
  toast.success(`Badge Unlocked: ${badgeName}`, {
    description: `+${xpEarned} XP earned`,
    duration: 5000,
  })
}
