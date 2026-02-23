"use client"

import { IconRefresh, IconExternalLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/format"
import type { PriceSnapshot, DealAlert } from "@/lib/types"

interface PricePanelProps {
  prices: PriceSnapshot[]
  deals: DealAlert[]
  citations?: string[]
  onRefresh: () => void
  isRefreshing?: boolean
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

export function PricePanel({
  prices,
  deals,
  citations,
  onRefresh,
  isRefreshing,
}: PricePanelProps) {
  if (prices.length === 0 && deals.length === 0) return null

  const lastChecked = prices[0]?.checkedAt

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Price Comparison
        </p>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[11px] text-muted-foreground/60">
              {timeAgo(lastChecked)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <IconRefresh
              className={`size-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {deals.length > 0 && (
        <div className="space-y-1.5">
          {deals.map((deal, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                  {deal.discountPercent
                    ? `${deal.discountPercent}% off`
                    : "Deal"}
                </Badge>
                <span className="truncate font-medium">{deal.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatINR(deal.price)}
                </span>
                {deal.url && (
                  <a
                    href={deal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <IconExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {prices.length > 0 && (
        <div className="space-y-1">
          {prices.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs py-1"
            >
              <span className="text-muted-foreground truncate mr-2">
                {p.source}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium">{formatINR(p.price)}</span>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <IconExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {citations && citations.length > 0 && (
        <div className="pt-1 border-t border-border/40">
          <p className="text-[10px] text-muted-foreground/50 mb-1">Sources</p>
          <div className="flex flex-wrap gap-1">
            {citations.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground/60 hover:text-foreground truncate max-w-[200px]"
              >
                [{i + 1}]
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
