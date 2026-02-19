import type { SpotlightProvider, SpotlightResult, ResultGroup, SpotlightCategory } from "./types"
import { navigationProvider } from "./providers/navigation-provider"
import { transactionProvider } from "./providers/transaction-provider"
import { actionProvider } from "./providers/action-provider"
import { calculatorProvider } from "./providers/calculator-provider"
import { expenseProvider } from "./providers/expense-provider"
import { aiProvider } from "./providers/ai-provider"

const GROUP_ORDER: SpotlightCategory[] = [
  "navigation",
  "transaction",
  "action",
  "calculator",
  "expense",
  "ai",
]

const GROUP_LABELS: Record<SpotlightCategory, string> = {
  navigation: "Pages",
  transaction: "Transactions",
  action: "Actions",
  calculator: "Calculator",
  expense: "Quick Expense",
  ai: "Ask AI",
}

const syncProviders: SpotlightProvider[] = [
  navigationProvider,
  actionProvider,
  calculatorProvider,
  expenseProvider,
  aiProvider,
]

const asyncProviders: SpotlightProvider[] = [
  transactionProvider,
]

function mergeResults(allResults: SpotlightResult[]): ResultGroup[] {
  const grouped = new Map<SpotlightCategory, SpotlightResult[]>()

  for (const result of allResults) {
    const existing = grouped.get(result.category) || []
    existing.push(result)
    grouped.set(result.category, existing)
  }

  return GROUP_ORDER
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({
      category: cat,
      label: GROUP_LABELS[cat],
      results: grouped.get(cat)!.sort((a, b) => b.score - a.score),
    }))
}

export interface SearchResult {
  groups: ResultGroup[]
  hasAsync: boolean
}

/** Run all sync providers immediately and return groups. */
export function searchSync(query: string): SearchResult {
  const results: SpotlightResult[] = []

  for (const provider of syncProviders) {
    const providerResults = provider.search(query) as SpotlightResult[]
    results.push(...providerResults)
  }

  return {
    groups: mergeResults(results),
    hasAsync: query.trim().length >= 2,
  }
}

/** Run async providers (transactions) and merge with existing sync results. */
export async function searchAsync(
  query: string,
  syncResults: SpotlightResult[],
  signal: AbortSignal
): Promise<ResultGroup[]> {
  const settled = await Promise.allSettled(
    asyncProviders.map((p) => p.search(query, signal))
  )

  if (signal.aborted) return []

  const asyncResults = settled
    .filter((r): r is PromiseFulfilledResult<SpotlightResult[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)

  return mergeResults([...syncResults, ...asyncResults])
}

/** Flatten all results from groups into a single ordered array (for keyboard navigation). */
export function flattenResults(groups: ResultGroup[]): SpotlightResult[] {
  return groups.flatMap((g) => g.results)
}
