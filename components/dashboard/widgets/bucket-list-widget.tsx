"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { IconStar } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

interface BucketData { monthlyAllocation: number; count: number; completedCount: number; totalCount: number }

export default function BucketListWidget({}: WidgetComponentProps) {
  const [bucket, setBucket] = useState<BucketData | null>(null)
  const ref = useRef<HTMLAnchorElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  useEffect(() => {
    fetch("/api/bucket-list").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const items = data.items || []
      const completed = items.filter((it: Record<string, unknown>) => it.status === "completed" || it.completed).length
      setBucket({
        monthlyAllocation: items.reduce((sum: number, it: Record<string, unknown>) => sum + ((it.monthlyAllocation as number) || 0), 0),
        count: items.length,
        completedCount: completed,
        totalCount: items.length,
      })
    }).catch(() => {})
  }, [])

  const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)
  const progress = bucket && bucket.totalCount > 0 ? (bucket.completedCount / bucket.totalCount) * 100 : 0

  return (
    <Link ref={ref} href="/goals?tab=bucket-list" className="block p-5 h-full relative overflow-hidden widget-accent-amber">
      <div className="relative flex flex-col h-full">
        <motion.div
          className="flex items-center justify-center size-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 mb-3"
          initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
          animate={{ scale: isInView ? 1 : 0.8, opacity: isInView ? 1 : 0, rotate: isInView ? 0 : -10 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        >
          <IconStar className="size-5 text-amber-500 dark:text-amber-400 icon-glow-amber" />
        </motion.div>

        {bucket ? (
          <motion.div
            className="mt-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 8 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <p className="text-lg font-black tracking-tight tabular-nums text-foreground truncate">
              {fmt(bucket.monthlyAllocation)}<span className="text-xs font-semibold text-muted-foreground">/mo</span>
            </p>

            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                {bucket.count} item{bucket.count !== 1 ? "s" : ""}
              </span>
              {bucket.totalCount > 0 && (
                <div className="flex-1 h-1.5 rounded-full bg-muted-foreground/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-amber-500/60 dark:bg-amber-400/50"
                    initial={{ width: 0 }}
                    animate={{ width: isInView ? `${Math.max(progress, 2)}%` : 0 }}
                    transition={{ delay: 0.5, duration: 0.6, ease: [0, 0, 0.2, 1] }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="mt-auto space-y-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        )}
      </div>
    </Link>
  )
}
