"use client"

import { useMemo, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { IconReceipt2, IconWallet } from "@tabler/icons-react"
import { formatINR } from "@/lib/format"
import { MoneyInHours } from "@/components/money-in-hours"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

const CATEGORY_DOT_COLORS: Record<string, string> = {
  "Food & Dining": "bg-amber-400 shadow-amber-400/30",
  "Shopping": "bg-blue-400 shadow-blue-400/30",
  "Transport": "bg-indigo-400 shadow-indigo-400/30",
  "Entertainment": "bg-pink-400 shadow-pink-400/30",
  "Utilities": "bg-cyan-400 shadow-cyan-400/30",
  "Health": "bg-red-400 shadow-red-400/30",
  "Salary": "bg-lime-400 shadow-lime-400/30",
  "Investment Income": "bg-lime-400 shadow-lime-400/30",
}

export default function RecentTransactionsWidget({}: WidgetComponentProps) {
  const { monthTransactions } = useDashboardData()
  const ref = useRef<HTMLAnchorElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  const recent = useMemo(() => {
    return [...monthTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [monthTransactions])

  return (
    <Link ref={ref} href="/money" className="block p-6 h-full">
      <motion.div
        className="flex items-center gap-2 mb-4"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : -4 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-center size-7 rounded-lg bg-muted">
          <IconReceipt2 className="size-3.5 text-muted-foreground" />
        </div>
        <p className="text-[13px] font-medium text-muted-foreground">Recent Transactions</p>
      </motion.div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <IconWallet className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recent.map((t, i) => {
            const isExpense = t.type === "expense"
            const dotColors = CATEGORY_DOT_COLORS[t.category] || "bg-zinc-400 shadow-zinc-400/30"
            return (
              <motion.div
                key={t.id || i}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60 ${!isExpense ? "border-l-2 border-emerald-500/50 dark:border-emerald-400/50" : "border-l-2 border-transparent"}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -10 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <span className={`size-3 rounded-full ${dotColors} shrink-0 dark:shadow-[0_0_6px]`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.merchant || t.description}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-[13px] font-black tabular-nums ${isExpense ? "text-foreground" : "text-emerald-500 dark:text-emerald-400"}`}>
                    {isExpense ? "-" : "+"}{formatINR(t.amount)}
                  </span>
                  {isExpense && <MoneyInHours amount={t.amount} />}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </Link>
  )
}
