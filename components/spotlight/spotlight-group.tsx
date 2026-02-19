"use client"

import type { ResultGroup, SpotlightResult } from "@/lib/spotlight/types"
import { SpotlightResultItem } from "./spotlight-result-item"

interface SpotlightGroupProps {
  group: ResultGroup
  startIndex: number
  activeIndex: number
  onMouseEnter: (index: number) => void
  onSelect: (result: SpotlightResult) => void
}

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
