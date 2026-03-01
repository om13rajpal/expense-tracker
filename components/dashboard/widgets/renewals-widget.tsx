"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { IconRepeat, IconCheck } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

interface SubData { name: string; amount: number; nextExpected: string }

export default function RenewalsWidget({}: WidgetComponentProps) {
  const [subs, setSubs] = useState<{ nearest: SubData | null; dueCount: number } | null>(null)
  const ref = useRef<HTMLAnchorElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

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

  const hasDue = subs ? subs.dueCount > 0 : false

  const getDaysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return "Today"
    if (diff === 1) return "Tomorrow"
    return `${diff}d`
  }

  return (
    <Link ref={ref} href="/bills" className={`block p-5 h-full relative overflow-hidden ${hasDue ? "widget-accent-purple" : ""}`}>
      <div className="relative flex flex-col h-full">
        <motion.div
          className={`flex items-center justify-center size-10 rounded-xl mb-3 ${
            hasDue ? "bg-purple-500/15 dark:bg-purple-500/20" : "bg-emerald-500/15 dark:bg-emerald-500/20"
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: isInView ? 1 : 0.8, opacity: isInView ? 1 : 0 }}
          transition={{ delay: 0.1, type: "spring" }}
        >
          {hasDue ? (
            <IconRepeat className="size-5 text-purple-500 dark:text-purple-400" />
          ) : (
            <IconCheck className="size-5 text-emerald-500 dark:text-emerald-400" />
          )}
        </motion.div>

        {subs ? (
          <motion.div
            className="mt-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 8 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {hasDue ? (
              <>
                <p className="text-lg font-black tracking-tight text-foreground">
                  {subs.dueCount} due
                </p>
                {subs.nearest && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[70%]">
                      {subs.nearest.name}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-500/10 text-[9px] font-bold text-purple-500 dark:text-purple-400 shrink-0">
                      {getDaysUntil(subs.nearest.nextExpected)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-lg font-black tracking-tight text-emerald-500 dark:text-emerald-400">
                  All clear
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">No renewals this week</p>
              </>
            )}
          </motion.div>
        ) : (
          <div className="mt-auto space-y-1.5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        )}
      </div>
    </Link>
  )
}
