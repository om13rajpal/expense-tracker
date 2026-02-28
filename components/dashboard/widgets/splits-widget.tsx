"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { IconUsers } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function SplitsWidget({}: WidgetComponentProps) {
  const [splits, setSplits] = useState<{ net: number } | null>(null)

  useEffect(() => {
    fetch("/api/splits/balances").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const balances = data.balances || []
      setSplits({ net: balances.reduce((sum: number, b: Record<string, unknown>) => sum + ((b.amount as number) || 0), 0) })
    }).catch(() => {})
  }, [])

  const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)

  return (
    <Link href="/bills?tab=splits" className="block p-5 h-full bg-gradient-to-br from-lime-500/[0.04] to-transparent">
      <div className="flex items-center justify-center size-9 rounded-lg bg-lime-500/10 shadow-[0_0_12px_-2px_rgba(163,230,53,0.15)] mb-2">
        <IconUsers className="size-4 text-lime-600 dark:text-lime-300" />
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Splits</p>
      {splits ? (
        <>
          <p className={`text-sm font-black tracking-tight tabular-nums truncate ${splits.net >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive"}`}>
            {splits.net >= 0 ? `+${fmt(splits.net)}` : fmt(splits.net)}
          </p>
          <p className="text-[10px] text-muted-foreground">{splits.net >= 0 ? "Owed to you" : "You owe"}</p>
        </>
      ) : <Skeleton className="h-4 w-16" />}
    </Link>
  )
}
