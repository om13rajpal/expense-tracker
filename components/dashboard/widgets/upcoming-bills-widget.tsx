"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
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
  const ref = useRef<HTMLAnchorElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

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

  const totalDue = bills.reduce((sum, b) => sum + b.amount, 0)

  return (
    <Link ref={ref} href="/bills" className="block p-6 h-full relative overflow-hidden">
      <motion.div
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : -4 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-lg bg-muted">
            <IconReceipt2 className="size-3.5 text-muted-foreground" />
          </div>
          <p className="text-[13px] font-medium text-muted-foreground">Upcoming Bills</p>
        </div>
        {bills.length > 0 && (
          <motion.p
            className="text-sm font-black tabular-nums text-foreground"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.9 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            {formatINR(totalDue)}
          </motion.p>
        )}
      </motion.div>

      {bills.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming bills</p>
      ) : (
        <div className="space-y-1.5">
          {bills.map((bill, i) => {
            const accentColor =
              bill.daysUntil <= 2 ? "bg-red-500 dark:bg-red-400" :
              bill.daysUntil <= 7 ? "bg-amber-500 dark:bg-amber-400" :
              "bg-muted-foreground/20"

            return (
              <motion.div
                key={i}
                className="flex items-center gap-2.5 py-1"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -8 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
              >
                <div className={`w-0.5 h-5 rounded-full shrink-0 ${accentColor}`} />
                <div className="flex items-center justify-center size-6 rounded-md bg-muted shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground">{bill.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{bill.name}</p>
                </div>
                <span className="text-xs font-black tabular-nums text-foreground shrink-0">{formatINR(bill.amount)}</span>
                <span className={`text-[10px] font-semibold tabular-nums shrink-0 px-1.5 py-0.5 rounded-full ${
                  bill.daysUntil <= 2 ? "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400" :
                  bill.daysUntil <= 7 ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {bill.daysUntil === 0 ? "Today" : bill.daysUntil === 1 ? "1d" : `${bill.daysUntil}d`}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </Link>
  )
}
