/**
 * Spotlight navigation provider: matches user queries against app pages.
 *
 * When the query is empty, returns the first 6 pages as suggestions.
 * When a query is provided, scores pages by label and keyword match quality.
 *
 * @module lib/spotlight/providers/navigation-provider
 */

import type { SpotlightProvider, SpotlightResult } from "../types"
import { pages } from "../data/pages"
import { fuzzyCorrectInput } from "../data/parsers"

export const navigationProvider: SpotlightProvider = {
  category: "navigation",

  search(query: string): SpotlightResult[] {
    const lower = fuzzyCorrectInput(query.toLowerCase().trim())

    if (!lower) {
      return pages.slice(0, 6).map((page) => ({
        id: `nav-${page.url}`,
        category: "navigation" as const,
        title: page.label,
        icon: page.icon,
        score: 50,
        url: page.url,
      }))
    }

    const results: SpotlightResult[] = []

    for (const page of pages) {
      const label = page.label.toLowerCase()
      const keywords = page.keywords.join(" ").toLowerCase()
      const searchable = `${label} ${keywords}`

      let score = 0
      if (label === lower) score = 100
      else if (label.startsWith(lower)) score = 90
      else if (label.includes(lower)) score = 75
      else if (keywords.includes(lower)) score = 60
      else if (searchable.includes(lower)) score = 50
      else continue

      results.push({
        id: `nav-${page.url}`,
        category: "navigation",
        title: page.label,
        icon: page.icon,
        score,
        url: page.url,
      })
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 4)
  },
}
