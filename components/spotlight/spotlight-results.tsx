/**
 * Scrollable results container for the Spotlight command palette.
 * Renders grouped results and auto-scrolls the active item into view
 * when the user navigates with arrow keys.
 * @module components/spotlight/spotlight-results
 */
"use client"

import { useEffect, useRef } from "react"
import type { ResultGroup, SpotlightResult } from "@/lib/spotlight/types"
import { SpotlightGroup } from "./spotlight-group"

/**
 * Props for {@link SpotlightResults}.
 * @property groups       - Grouped search results to display.
 * @property activeIndex  - Currently highlighted flat index.
 * @property onMouseEnter - Callback when the mouse enters a result row.
 * @property onSelect     - Callback when a result is selected.
 */
interface SpotlightResultsProps {
  groups: ResultGroup[]
  activeIndex: number
  onMouseEnter: (index: number) => void
  onSelect: (result: SpotlightResult) => void
}

/**
 * Renders all result groups inside a scrollable listbox with
 * automatic scroll-into-view for keyboard-navigated items.
 */
export function SpotlightResults({
  groups,
  activeIndex,
  onMouseEnter,
  onSelect,
}: SpotlightResultsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll active item into view
  useEffect(() => {
    const el = document.getElementById(`spotlight-item-${activeIndex}`)
    if (el && containerRef.current) {
      el.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  let runningIndex = 0

  return (
    <div
      ref={containerRef}
      id="spotlight-listbox"
      role="listbox"
      className="max-h-[360px] overflow-y-auto overflow-x-hidden px-1"
    >
      {groups.map((group) => {
        const startIndex = runningIndex
        runningIndex += group.results.length
        return (
          <SpotlightGroup
            key={group.category}
            group={group}
            startIndex={startIndex}
            activeIndex={activeIndex}
            onMouseEnter={onMouseEnter}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
