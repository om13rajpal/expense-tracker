/**
 * Spotlight search orchestrator that coordinates all search providers.
 *
 * Runs synchronous providers (navigation, actions, calculator, expense, AI)
 * immediately for instant results, then dispatches async providers (transaction
 * search via API) and merges results. Groups and orders results by category
 * priority: Pages > Transactions > Actions > Calculator > Quick Expense > Ask AI.
 *
 * @module lib/spotlight/orchestrator
 */

import type { SpotlightProvider, SpotlightResult, ResultGroup, SpotlightCategory } from "./types"
import { navigationProvider } from "./providers/navigation-provider"
import { transactionProvider } from "./providers/transaction-provider"
import { actionProvider } from "./providers/action-provider"
import { calculatorProvider } from "./providers/calculator-provider"
import { expenseProvider } from "./providers/expense-provider"
import { aiProvider } from "./providers/ai-provider"

/** Display order for result group sections in the Spotlight overlay. */
const GROUP_ORDER: SpotlightCategory[] = [
  "navigation",
  "transaction",
  "action",
  "calculator",
  "expense",
  "ai",
]

/** Human-readable section headings for each result category. */
const GROUP_LABELS: Record<SpotlightCategory, string> = {
  navigation: "Pages",
  transaction: "Transactions",
  action: "Actions",
  calculator: "Calculator",
  expense: "Quick Expense",
  ai: "Ask AI",
}

/** Providers that execute synchronously and return results instantly. */
const syncProviders: SpotlightProvider[] = [
  navigationProvider,
  actionProvider,
  calculatorProvider,
  expenseProvider,
  aiProvider,
]

/** Providers that require async API calls (debounced, run after sync results). */
const asyncProviders: SpotlightProvider[] = [
  transactionProvider,
]

/**
 * Merge and group an array of search results by category.
 *
 * Groups results, orders groups by `GROUP_ORDER`, sorts results within
 * each group by score descending, and applies section labels.
 *
 * @param allResults - Flat array of results from all providers.
 * @returns Ordered array of `ResultGroup` objects.
 */
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

/** Result of a synchronous search pass, indicating whether async results are pending. */
export interface SearchResult {
  /** Grouped and sorted search results from sync providers. */
  groups: ResultGroup[]
  /** Whether async providers should also be invoked (true when query is 2+ chars). */
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
