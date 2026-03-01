"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { IconUsers } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function SplitsWidget({}: WidgetComponentProps) {
  const [splits, setSplits] = useState<{ net: number } | null>(null)
  const ref = useRef<HTMLAnchorElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  useEffect(() => {
    fetch("/api/splits/balances").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const balances = data.balances || []
      setSplits({ net: balances.reduce((sum: number, b: Record<string, unknown>) => sum + ((b.amount as number) || 0), 0) })
    }).catch(() => {})
  }, [])

  const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)
  const isPositive = splits ? splits.net >= 0 : true

  return (
    <Link ref={ref} href="/bills?tab=splits" className="block p-5 h-full relative overflow-hidden widget-accent-blue">
      {/* Status-colored gradient at bottom */}
      {splits && (
        <div className={`absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t to-transparent pointer-events-none ${
          isPositive ? "from-emerald-500/5 dark:from-emerald-500/8" : "from-red-500/5 dark:from-red-500/8"
        }`} />
      )}

      <div className="relative flex flex-col h-full">
        <motion.div
          className="flex items-center justify-center size-10 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 mb-3"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: isInView ? 1 : 0.8, opacity: isInView ? 1 : 0 }}
          transition={{ delay: 0.1, type: "spring" }}
        >
          <IconUsers className="size-5 text-blue-500 dark:text-blue-400" />
        </motion.div>

        {splits ? (
          <motion.div
            className="mt-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 8 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <p className={`text-lg font-black tracking-tight tabular-nums truncate ${
              isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}>
              {isPositive ? `+${fmt(splits.net)}` : fmt(splits.net)}
            </p>
            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}>
              {isPositive ? "Owed to you" : "You owe"}
            </span>
          </motion.div>
        ) : (
          <div className="mt-auto space-y-1.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        )}
      </div>
    </Link>
  )
}
