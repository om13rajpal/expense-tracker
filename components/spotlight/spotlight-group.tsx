/**
 * Labelled group of Spotlight search results.
 * Renders a section header (e.g. "Pages", "Actions") followed by its
 * child result items with correct flat-index tracking for keyboard navigation.
 * @module components/spotlight/spotlight-group
 */
"use client"

import type { ResultGroup, SpotlightResult } from "@/lib/spotlight/types"
import { SpotlightResultItem } from "./spotlight-result-item"

/**
 * Props for {@link SpotlightGroup}.
 * @property group        - The result group containing a label and result items.
 * @property startIndex   - Flat index offset so keyboard navigation spans all groups.
 * @property activeIndex  - Currently highlighted flat index.
 * @property onMouseEnter - Callback when the mouse enters a result row.
 * @property onSelect     - Callback when a result is selected (click or Enter).
 */
interface SpotlightGroupProps {
  group: ResultGroup
  startIndex: number
  activeIndex: number
  onMouseEnter: (index: number) => void
  onSelect: (result: SpotlightResult) => void
}

/** Renders a labelled group of SpotlightResultItem rows with a section header. */
export function SpotlightGroup({
  group,
  startIndex,
  activeIndex,
  onMouseEnter,
  onSelect,
}: SpotlightGroupProps) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          {group.label}
        </span>
      </div>
      {group.results.map((result, i) => {
        const flatIndex = startIndex + i
        return (
          <SpotlightResultItem
            key={result.id}
            result={result}
            active={flatIndex === activeIndex}
            index={flatIndex}
            onMouseEnter={onMouseEnter}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
