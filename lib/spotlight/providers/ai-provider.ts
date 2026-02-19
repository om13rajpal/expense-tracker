import type { SpotlightProvider, SpotlightResult } from "../types"
import { isAIQuery } from "../data/parsers"
import { IconRobot } from "@tabler/icons-react"

export const aiProvider: SpotlightProvider = {
  category: "ai",

  search(query: string): SpotlightResult[] {
    const trimmed = query.trim()
    if (trimmed.length < 3) return []

    // Show "Ask AI" for explicit AI queries or for any input 5+ words
    if (!isAIQuery(trimmed) && trimmed.split(/\s+/).length < 4) return []

    return [{
      id: "ai-ask",
      category: "ai",
      title: `Ask AI: ${trimmed}`,
      subtitle: "Get an AI-powered answer",
      icon: IconRobot,
      score: 40,
      aiQuery: trimmed,
    }]
  },
}
