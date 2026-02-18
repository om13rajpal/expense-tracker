/**
 * Small info-circle icon that shows explanatory text in a tooltip on hover.
 * @module components/info-tooltip
 */
"use client"

import * as React from "react"
import { IconInfoCircle } from "@tabler/icons-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InfoTooltipProps {
  text: string
  className?: string
  iconClassName?: string
  side?: "top" | "right" | "bottom" | "left"
}

/**
 * Renders a small info icon that displays tooltip text on hover.
 * @param text - Tooltip content.
 * @param side - Preferred tooltip placement (default "top").
 */
export function InfoTooltip({
  text,
  className,
  iconClassName,
  side = "top",
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground transition-colors ${className ?? ""}`}
          aria-label="More info"
        >
          <IconInfoCircle className={`h-3.5 w-3.5 ${iconClassName ?? ""}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[260px]">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}
