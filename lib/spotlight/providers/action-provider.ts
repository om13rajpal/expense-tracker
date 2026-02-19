import type { SpotlightProvider, SpotlightResult } from "../types"
import { actions } from "../data/pages"
import { fuzzyCorrectInput } from "../data/parsers"

export const actionProvider: SpotlightProvider = {
  category: "action",

  search(query: string): SpotlightResult[] {
    const lower = fuzzyCorrectInput(query.toLowerCase().trim())
    if (!lower) return []

    const results: SpotlightResult[] = []

    for (const action of actions) {
      const label = action.label.toLowerCase()
      const keywords = action.keywords.join(" ").toLowerCase()
      const searchable = `${label} ${keywords}`

      let score = 0
      if (label.startsWith(lower)) score = 90
      else if (label.includes(lower)) score = 75
      else if (keywords.includes(lower)) score = 60
      else if (searchable.includes(lower)) score = 50
      else continue

      results.push({
        id: `action-${action.url}`,
        category: "action",
        title: action.label,
        icon: action.icon,
        score,
        url: action.url,
      })
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 3)
  },
}
