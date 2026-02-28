"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { IconReceipt2 } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatINR } from "@/lib/format"
import type { WidgetComponentProps } from "@/lib/widget-registry"

interface Bill {
  name: string
  amount: number
  nextExpected: string
  daysUntil: number
}

export default function UpcomingBillsWidget({}: WidgetComponentProps) {
  const [bills, setBills] = useState<Bill[] | null>(null)

  useEffect(() => {
    fetch("/api/subscriptions").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const items = data.subscriptions || data.items || []
      const now = new Date()
      const upcoming = items
        .filter((s: Record<string, unknown>) => s.status === "active" && s.nextExpected)
        .map((s: Record<string, unknown>) => {
          const nextDate = new Date(s.nextExpected as string)
          const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return { name: s.name as string, amount: s.amount as number, nextExpected: s.nextExpected as string, daysUntil }
        })
        .filter((b: Bill) => b.daysUntil >= 0)
        .sort((a: Bill, b: Bill) => a.daysUntil - b.daysUntil)
        .slice(0, 5)
      setBills(upcoming)
    }).catch(() => {})
  }, [])

  if (!bills) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-4 w-24" />
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-full" />)}
      </div>
    )
  }

  return (
    <Link href="/bills" className="block p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center size-7 rounded-lg bg-neutral-100">
          <IconReceipt2 className="size-3.5 text-neutral-600" />
        </div>
        <p className="text-[13px] font-medium text-neutral-500">Upcoming Bills</p>
      </div>

      {bills.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming bills</p>
      ) : (
        <div className="space-y-2.5">
          {bills.map((bill, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{bill.name}</p>
              </div>
              <span className="text-xs font-black tabular-nums shrink-0">{formatINR(bill.amount)}</span>
              <span className={`text-[10px] font-semibold tabular-nums shrink-0 px-1.5 py-0.5 rounded-full ${
                bill.daysUntil <= 2 ? "bg-red-50 text-red-600" :
                bill.daysUntil <= 7 ? "bg-amber-50 text-amber-600" :
                "bg-neutral-100 text-neutral-500"
              }`}>
                {bill.daysUntil === 0 ? "Today" : bill.daysUntil === 1 ? "1d" : `${bill.daysUntil}d`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
  )
}
