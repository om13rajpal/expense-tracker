"use client"

import { useEffect, useRef } from "react"
import type { ResultGroup, SpotlightResult } from "@/lib/spotlight/types"
import { SpotlightGroup } from "./spotlight-group"

interface SpotlightResultsProps {
  groups: ResultGroup[]
  activeIndex: number
  onMouseEnter: (index: number) => void
  onSelect: (result: SpotlightResult) => void
}

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
