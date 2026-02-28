"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"
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
        <p className="text-[13px] font-medium text-neutral-500 mb-2">Investments</p>
        <p className="text-sm text-muted-foreground">No portfolio data. Add your holdings →</p>
      </Link>
    )
  }

  const isPositive = data.pnl >= 0

  return (
    <Link href="/investments" className="block p-6 h-full">
      <p className="text-[13px] font-medium text-neutral-500 mb-1">Portfolio Value</p>
      <p className="text-2xl font-black tracking-tight tabular-nums text-neutral-900">{formatINR(data.totalValue)}</p>
      <div className="flex items-center gap-1.5 mt-1 mb-4">
        {isPositive ? <IconTrendingUp className="size-3.5 text-emerald-600" /> : <IconTrendingDown className="size-3.5 text-red-500" />}
        <span className={`text-xs font-semibold tabular-nums ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
          {isPositive ? "+" : ""}{formatCompact(data.pnl)} ({data.pnlPct.toFixed(1)}%)
        </span>
      </div>

      {data.topHoldings.length > 0 && (
        <div className="space-y-2">
          {data.topHoldings.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate mr-2">{h.name}</span>
              <span className={`font-semibold tabular-nums shrink-0 ${h.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {h.change >= 0 ? "+" : ""}{h.change.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
  )
}
