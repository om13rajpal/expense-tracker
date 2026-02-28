"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { IconRepeat } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

interface SubData { name: string; amount: number; nextExpected: string }

export default function RenewalsWidget({}: WidgetComponentProps) {
  const [subs, setSubs] = useState<{ nearest: SubData | null; dueCount: number } | null>(null)

  useEffect(() => {
    fetch("/api/subscriptions").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const items = data.subscriptions || data.items || []
      const now = new Date(); const weekOut = new Date(); weekOut.setDate(weekOut.getDate() + 7)
      const nowStr = now.toISOString().split("T")[0]; const weekStr = weekOut.toISOString().split("T")[0]
      const upcoming = items.filter((s: Record<string, unknown>) => s.status === "active" && s.nextExpected && (s.nextExpected as string) >= nowStr && (s.nextExpected as string) <= weekStr)
      const sorted = upcoming.sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((a.nextExpected as string) || "").localeCompare((b.nextExpected as string) || ""))
      setSubs({ dueCount: sorted.length, nearest: sorted[0] ? { name: sorted[0].name as string, amount: sorted[0].amount as number, nextExpected: sorted[0].nextExpected as string } : null })
    }).catch(() => {})
  }, [])

  return (
    <Link href="/bills" className="block p-5 h-full bg-gradient-to-br from-lime-500/[0.04] to-transparent">
      <div className="flex items-center justify-center size-9 rounded-lg bg-lime-500/10 shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)] mb-2">
        <IconRepeat className="size-4 text-lime-600 dark:text-lime-300" />
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Renewals</p>
      {subs ? (
        <>
          <p className="text-sm font-black tracking-tight truncate">{subs.dueCount > 0 ? `${subs.dueCount} due` : "None"}</p>
          {subs.nearest && <p className="text-[10px] text-muted-foreground truncate">{subs.nearest.name}</p>}
        </>
      ) : <Skeleton className="h-4 w-16" />}
    </Link>
  )
}
