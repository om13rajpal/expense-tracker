/**
 * @module app/splits/share/[token]/page
 * @description Public share page for expense split balances. Accessed via a unique
 * token URL (no authentication required). Displays the group name, member list,
 * per-person balance breakdown (who owes whom), and recent activity (expenses and
 * settlements). Data is fetched from `/api/splits/share/[token]`. Used to share
 * split balances with non-app users. Shows an error state if the token is invalid
 * or expired.
 */
"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { motion } from "motion/react"
import {
  IconArrowsExchange,
  IconPigMoney,
  IconReceipt,
} from "@tabler/icons-react"

import { stagger, fadeUp, listItem } from "@/lib/motion"
import { formatINR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface ShareData {
  group: { name: string; members: string[]; description: string } | null
  balances: { person: string; netBalance: number; youOwe: number; theyOwe: number }[]
  recentActivity: {
    type: "expense" | "settlement"
    description: string
    amount: number
    paidBy: string
    date: string
  }[]
}

/**
 * Public share page component. Fetches shared split data by token from the API
 * and renders group info, per-person balance cards (color-coded by owe direction),
 * and a recent activity timeline. No authentication required. Shows loading skeleton,
 * error state, or empty state as appropriate.
 * @returns The public share view with group balances and activity, or an error message.
 */
export default function SharePage() {
  const params = useParams<{ token: string }>()
  const [data, setData] = React.useState<ShareData | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/splits/share/${params.token}`)
        const json = await res.json()
        if (!json.success) {
          setError(json.message || "Link not found or expired.")
          return
        }
        setData(json)
      } catch {
        setError("Failed to load shared data.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-lg space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <IconPigMoney className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h1 className="text-xl font-bold">Link Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          {error || "This share link may have expired or does not exist."}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg p-6">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          {/* Header */}
          <motion.div variants={fadeUp}>
            {data.group ? (
              <div>
                <h1 className="text-2xl font-bold">{data.group.name}</h1>
                {data.group.description && (
                  <p className="text-muted-foreground">{data.group.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {data.group.members.map((m) => (
                    <Badge key={m} variant="secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-bold">Shared Balances</h1>
            )}
          </motion.div>

          {/* Balances */}
          {data.balances.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Balances
              </h2>
              {data.balances.map((b, i) => {
                const isPositive = b.netBalance > 0
                return (
                  <motion.div
                    key={b.person}
                    {...listItem(i)}
                    className={cn(
                      "rounded-xl border p-4",
                      isPositive
                        ? "border-lime-500/20 bg-lime-500/5"
                        : "border-destructive/20 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{b.person}</span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isPositive
                            ? "text-lime-600 dark:text-lime-400"
                            : "text-destructive"
                        )}
                      >
                        {isPositive
                          ? `owes ${formatINR(b.netBalance)}`
                          : `is owed ${formatINR(Math.abs(b.netBalance))}`}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* Recent Activity */}
          {data.recentActivity.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Activity
              </h2>
              {data.recentActivity.map((item, i) => {
                const isExpense = item.type === "expense"
                return (
                  <motion.div
                    key={`${item.date}-${i}`}
                    {...listItem(i)}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        isExpense
                          ? "bg-muted/80 dark:bg-muted text-muted-foreground"
                          : "bg-lime-500/10 text-lime-600 dark:text-lime-400"
                      )}
                    >
                      {isExpense ? (
                        <IconReceipt className="h-4 w-4" />
                      ) : (
                        <IconArrowsExchange className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {isExpense ? `Paid by ${item.paidBy}` : ""} &middot;{" "}
                        {new Date(item.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{formatINR(item.amount)}</span>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {data.balances.length === 0 && data.recentActivity.length === 0 && (
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center"
            >
              <p className="text-muted-foreground">No data to display.</p>
            </motion.div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <IconPigMoney className="h-4 w-4" />
          <span>Powered by Finova</span>
        </div>
      </div>
    </div>
  )
}
