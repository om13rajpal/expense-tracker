"use client"

import { toast } from "sonner"

export function showBadgeToast(badgeName: string, xpEarned: number) {
  toast.success(`Badge Unlocked: ${badgeName}`, {
    description: `+${xpEarned} XP earned`,
    duration: 5000,
  })
}
