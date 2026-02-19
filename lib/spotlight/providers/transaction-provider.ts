import type { SpotlightProvider, SpotlightResult } from "../types"
import { CATEGORY_COLORS } from "../data/categories"
import { IconReceipt } from "@tabler/icons-react"

export const transactionProvider: SpotlightProvider = {
  category: "transaction",

  async search(query: string, signal?: AbortSignal): Promise<SpotlightResult[]> {
    const trimmed = query.trim()
    if (trimmed.length < 2) return []

    const res = await fetch(
      `/api/transactions/search?q=${encodeURIComponent(trimmed)}&limit=5`,
      { credentials: "include", signal }
    )

    if (!res.ok) return []

    const json = await res.json()
    const transactions: Array<{
      _id: string
      description: string
      merchant?: string
      category: string
      amount: number
      type: string
      date: string
    }> = json.transactions || []

    return transactions.map((txn, i) => {
      const colorClass = CATEGORY_COLORS[txn.category] || "bg-muted text-muted-foreground"
      return {
        id: `txn-${txn._id}`,
        category: "transaction" as const,
        title: txn.description || txn.merchant || "Transaction",
        subtitle: txn.merchant && txn.merchant !== txn.description ? txn.merchant : undefined,
        icon: IconReceipt,
        score: 80 - i * 5,
        badge: { label: txn.category, className: colorClass },
        amount: txn.amount,
        amountType: txn.type as "income" | "expense",
        date: txn.date,
        url: `/transactions?search=${encodeURIComponent(trimmed)}`,
      }
    })
  },
}
