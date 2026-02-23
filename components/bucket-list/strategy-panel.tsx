"use client"

import { IconRefresh, IconBulb } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { InsightMarkdown } from "@/components/insight-markdown"

interface StrategyPanelProps {
  strategy?: string
  generatedAt?: string
  onRegenerate: () => void
  isGenerating?: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function StrategyPanel({
  strategy,
  generatedAt,
  onRegenerate,
  isGenerating,
}: StrategyPanelProps) {
  if (!strategy && !isGenerating) return null

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IconBulb className="size-3.5 text-amber-500" />
          <p className="text-xs font-medium text-muted-foreground">
            AI Strategy
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="text-[11px] text-muted-foreground/60">
              {timeAgo(generatedAt)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            <IconRefresh
              className={`size-3 ${isGenerating ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {isGenerating ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ) : strategy ? (
        <div className="text-muted-foreground">
          <InsightMarkdown content={strategy} />
        </div>
      ) : null}
    </div>
  )
}
