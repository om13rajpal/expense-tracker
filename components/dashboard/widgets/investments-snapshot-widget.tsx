"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { IconTrendingUp, IconTrendingDown, IconChartLine } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatINR, formatCompact } from "@/lib/format"
import type { WidgetComponentProps } from "@/lib/widget-registry"

interface PortfolioData {
  totalValue: number
  totalInvested: number
  pnl: number
  pnlPct: number
  topHoldings: { name: string; value: number; change: number }[]
}

export default function InvestmentsSnapshotWidget({}: WidgetComponentProps) {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLAnchorElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  useEffect(() => {
    Promise.all([
      fetch("/api/stocks").then(r => r.ok ? r.json() : null),
      fetch("/api/mutual-funds").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([stocksData, mfData]) => {
      let totalValue = 0
      let totalInvested = 0
      const holdings: { name: string; value: number; change: number }[] = []

      if (stocksData?.success) {
        const stocks = stocksData.stocks || stocksData.holdings || []
        for (const s of stocks) {
          const val = (s.currentValue || s.value || 0)
          const inv = (s.investedValue || s.invested || 0)
          totalValue += val
          totalInvested += inv
          holdings.push({ name: s.symbol || s.name || "Stock", value: val, change: inv > 0 ? ((val - inv) / inv) * 100 : 0 })
        }
      }

      if (mfData?.success) {
        const funds = mfData.funds || mfData.holdings || []
        for (const f of funds) {
          const val = (f.currentValue || f.value || 0)
          const inv = (f.investedValue || f.invested || 0)
          totalValue += val
          totalInvested += inv
          holdings.push({ name: f.schemeName || f.name || "MF", value: val, change: inv > 0 ? ((val - inv) / inv) * 100 : 0 })
        }
      }

      const pnl = totalValue - totalInvested
      const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0

      holdings.sort((a, b) => b.value - a.value)
      setData({ totalValue, totalInvested, pnl, pnlPct, topHoldings: holdings.slice(0, 3) })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-full" />
      </div>
    )
  }

  if (!data || data.totalValue === 0) {
    return (
      <Link href="/investments" className="block p-6 h-full">
        <div className="flex items-center gap-2 mb-2">
          <IconChartLine className="size-4 text-muted-foreground" />
          <p className="text-[13px] font-medium text-muted-foreground">Investments</p>
        </div>
        <p className="text-sm text-muted-foreground">No portfolio data. Add your holdings &#8594;</p>
      </Link>
    )
  }

  const isPositive = data.pnl >= 0

  return (
    <Link ref={ref} href="/investments" className={`block p-6 h-full relative overflow-hidden ${isPositive ? "widget-accent-money" : ""}`}>
      {/* Gradient overlay */}
      <div className={`absolute inset-0 pointer-events-none ${
        isPositive
          ? "bg-gradient-to-br from-emerald-500/[0.03] dark:from-emerald-500/[0.06] to-transparent"
          : "bg-gradient-to-br from-red-500/[0.03] dark:from-red-500/[0.06] to-transparent"
      }`} />

      <div className="relative">
        <motion.p
          className="text-[13px] font-medium text-muted-foreground mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          Portfolio Value
        </motion.p>
        <motion.p
          className="text-2xl font-black tracking-tight tabular-nums text-foreground"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 6 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {formatINR(data.totalValue)}
        </motion.p>

        {/* P&L badge */}
        <motion.div
          className={`inline-flex items-center gap-1.5 mt-2 mb-4 px-2.5 py-1 rounded-full ${
            isPositive
              ? "bg-emerald-500/10 dark:bg-emerald-500/20"
              : "bg-red-500/10 dark:bg-red-500/20"
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.9 }}
          transition={{ delay: 0.3, duration: 0.3, type: "spring" }}
        >
          {isPositive
            ? <IconTrendingUp className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            : <IconTrendingDown className="size-3.5 text-red-500 dark:text-red-400" />
          }
          <span className={`text-xs font-bold tabular-nums ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {isPositive ? "+" : ""}{formatCompact(data.pnl)} ({data.pnlPct.toFixed(1)}%)
          </span>
        </motion.div>

        {data.topHoldings.length > 0 && (
          <div className="space-y-1.5">
            {data.topHoldings.map((h, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2 text-xs"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -8 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
              >
                <div className={`w-0.5 h-4 rounded-full shrink-0 ${
                  h.change >= 0
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-red-500 dark:bg-red-400"
                }`} />
                <span className="text-muted-foreground truncate flex-1">{h.name}</span>
                <span className={`font-bold tabular-nums shrink-0 ${h.change >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {h.change >= 0 ? "+" : ""}{h.change.toFixed(1)}%
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
