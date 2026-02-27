/**
 * Price comparison panel for bucket list items.
 *
 * Displays real-time pricing data fetched from web searches via Perplexity Sonar.
 * The panel shows:
 * - **Deal alerts** — highlighted in lime with discount percentages and external links
 * - **Price comparisons** — list of prices from various retailers with source links
 * - **Freshness indicator** — shows when prices were last checked (e.g., "2h ago")
 * - **Refresh button** — triggers a new price search
 * - **Source citations** — numbered links to original data sources
 *
 * The panel renders nothing if both prices and deals arrays are empty,
 * keeping the card clean when no pricing data has been fetched yet.
 *
 * @module components/bucket-list/price-panel
 */
"use client"

import { IconRefresh, IconExternalLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/format"
import type { PriceSnapshot, DealAlert } from "@/lib/types"

/**
 * Props for the PricePanel component.
 *
 * @property prices - Array of price snapshots from different retailers
 * @property deals - Array of active deal alerts with discount info
 * @property citations - Optional array of source URLs from the Perplexity search
 * @property onRefresh - Callback to trigger a new price search
 * @property isRefreshing - Whether a price refresh is currently in progress
 */
interface PricePanelProps {
  prices: PriceSnapshot[]
  deals: DealAlert[]
  citations?: string[]
  onRefresh: () => void
  isRefreshing?: boolean
}

/**
 * Converts an ISO date string to a human-readable relative time string.
 *
 * @param dateStr - ISO 8601 date string to convert
 * @returns Relative time string like "just now", "5m ago", "2h ago", or "3d ago"
 */
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

/**
 * Renders a price comparison panel within a bucket list item card.
 *
 * Shows deal alerts prominently with lime highlighting, followed by a list
 * of prices from different sources. Each entry can link to the original retailer page.
 * Returns null when there is no price data to display.
 *
 * @param props - Component props (see PricePanelProps)
 * @returns The price panel JSX or null if no data
 */
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
              className="flex items-center justify-between rounded-md bg-lime-500/10 px-2.5 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge className="bg-lime-500 text-white text-[10px] px-1.5 py-0">
                  {deal.discountPercent
                    ? `${deal.discountPercent}% off`
                    : "Deal"}
                </Badge>
                <span className="truncate font-medium">{deal.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-lime-600 dark:text-lime-400">
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
