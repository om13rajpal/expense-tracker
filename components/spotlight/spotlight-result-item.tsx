/**
 * Single result row inside the Spotlight search results list.
 * Renders a category-themed icon, title, optional subtitle, badge,
 * date, and amount with colour coding based on the result type.
 * @module components/spotlight/spotlight-result-item
 */
"use client"

import { formatINR } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SpotlightResult } from "@/lib/spotlight/types"

/**
 * Props for {@link SpotlightResultItem}.
 * @property result       - The search result data to render.
 * @property active       - Whether this item is currently highlighted.
 * @property index        - Flat index for ARIA and hover tracking.
 * @property onMouseEnter - Callback when the mouse enters this row.
 * @property onSelect     - Callback when this result is activated.
 */
interface SpotlightResultItemProps {
  result: SpotlightResult
  active: boolean
  index: number
  onMouseEnter: (index: number) => void
  onSelect: (result: SpotlightResult) => void
}

/**
 * Renders a single Spotlight result row with icon, title, subtitle,
 * optional badge/date/amount, and active-state highlight.
 */
export function SpotlightResultItem({
  result,
  active,
  index,
  onMouseEnter,
  onSelect,
}: SpotlightResultItemProps) {
  const Icon = result.icon

  return (
    <div
      id={`spotlight-item-${index}`}
      role="option"
      aria-selected={active}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 cursor-default transition-colors",
        active && "bg-accent"
      )}
      onMouseEnter={() => onMouseEnter(index)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(result)}
    >
      {Icon && (
        <div className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          result.category === "ai" ? "bg-purple-500/10" :
          result.category === "expense" ? "bg-emerald-500/10" :
          result.category === "calculator" ? "bg-amber-500/10" :
          "bg-muted/60"
        )}>
          <Icon className={cn(
            "size-4",
            result.category === "ai" ? "text-purple-500" :
            result.category === "expense" ? "text-emerald-500" :
            result.category === "calculator" ? "text-amber-500" :
            "text-muted-foreground"
          )} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">
          {result.title}
        </p>
        {result.subtitle && (
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {result.subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {result.badge && (
          <span className={cn(
            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            result.badge.className
          )}>
            {result.badge.label}
          </span>
        )}
        {result.date && (
          <span className="text-[10px] text-muted-foreground/60">
            {new Date(result.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}
        {result.amount !== undefined && (
          <span className={cn(
            "text-xs font-semibold tabular-nums",
            result.amountType === "income" ? "text-emerald-500" :
            result.category === "expense" ? "text-emerald-500" :
            "text-foreground"
          )}>
            {result.amountType === "income" ? "+" : result.amountType === "expense" && result.category === "transaction" ? "-" : ""}
            {formatINR(result.amount)}
          </span>
        )}
      </div>
    </div>
  )
}
