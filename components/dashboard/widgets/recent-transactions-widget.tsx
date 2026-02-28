"use client"

import { useMemo } from "react"
import Link from "next/link"
import { IconReceipt2 } from "@tabler/icons-react"
import { formatINR } from "@/lib/format"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

const CATEGORY_DOT_COLORS: Record<string, string> = {
  "Food & Dining": "bg-amber-400",
  "Shopping": "bg-blue-400",
  "Transport": "bg-indigo-400",
  "Entertainment": "bg-pink-400",
  "Utilities": "bg-cyan-400",
  "Health": "bg-red-400",
  "Salary": "bg-lime-400",
  "Investment Income": "bg-lime-400",
}

export default function RecentTransactionsWidget({}: WidgetComponentProps) {
  const { monthTransactions } = useDashboardData()

  const recent = useMemo(() => {
    return [...monthTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [monthTransactions])

  return (
    <Link href="/money" className="block p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center size-7 rounded-lg bg-neutral-100">
          <IconReceipt2 className="size-3.5 text-neutral-600" />
        </div>
        <p className="text-[13px] font-medium text-neutral-500">Recent Transactions</p>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <div className="space-y-2.5">
          {recent.map((t, i) => {
            const isExpense = t.type === "expense"
            const dotColor = CATEGORY_DOT_COLORS[t.category] || "bg-zinc-400"
            return (
              <div key={t.id || i} className="flex items-center gap-2.5">
                <span className={`size-2 rounded-full ${dotColor} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.merchant || t.description}</p>
                </div>
                <span className={`text-xs font-black tabular-nums shrink-0 ${isExpense ? "text-neutral-900" : "text-emerald-600"}`}>
                  {isExpense ? "-" : "+"}{formatINR(t.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Link>
  )
}
