import type { SpotlightProvider, SpotlightResult } from "../types"
import { parseExpense } from "../data/parsers"
import { formatINR } from "@/lib/format"
import { IconCoinRupee } from "@tabler/icons-react"

export const expenseProvider: SpotlightProvider = {
  category: "expense",

  search(query: string): SpotlightResult[] {
    const parsed = parseExpense(query)
    if (!parsed) return []

    return [{
      id: "expense-add",
      category: "expense",
      title: `Add expense: ${parsed.description}`,
      subtitle: `${parsed.category} · ${parsed.paymentMethod}`,
      icon: IconCoinRupee,
      score: 90,
      amount: parsed.amount,
      amountType: "expense",
      expenseData: parsed,
    }]
  },
}
