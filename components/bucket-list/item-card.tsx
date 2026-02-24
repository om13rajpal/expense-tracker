/**
 * Bucket list item card component.
 *
 * Renders a single bucket list item as a visually rich card featuring:
 * - A product/item image fetched via web search (with gradient fallback)
 * - Category badge, priority indicator, and deal alert badges
 * - Progress bar showing savings progress toward target amount
 * - Action buttons for completing, price searching, AI strategy, editing, and deleting
 * - Expandable panels for price comparisons and AI savings strategy
 *
 * The card adapts its appearance based on completion status (dimmed + strikethrough)
 * and uses Framer Motion for layout animations.
 *
 * @module components/bucket-list/item-card
 */
"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import {
  IconCheck,
  IconSearch,
  IconBulb,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconTag,
  IconCalendar,
  IconCurrencyRupee,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatINR } from "@/lib/format"
import { PricePanel } from "./price-panel"
import { StrategyPanel } from "./strategy-panel"
import type { BucketListItem } from "@/lib/types"

/**
 * Category color mappings for badge styling.
 * Each category gets a distinct background + text color combination
 * that works in both light and dark themes.
 */
const categoryColors: Record<string, string> = {
  electronics: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  travel: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  vehicle: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  home: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  education: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  experience: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  fashion: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  health: "bg-green-500/10 text-green-600 dark:text-green-400",
  other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
}

/**
 * Category-specific gradient backgrounds used as fallback when no product image is available.
 * These provide visual differentiation between categories even without images.
 */
const categoryGradients: Record<string, string> = {
  electronics: "from-blue-500/20 via-indigo-500/10 to-blue-600/20",
  travel: "from-emerald-500/20 via-teal-500/10 to-emerald-600/20",
  vehicle: "from-orange-500/20 via-amber-500/10 to-orange-600/20",
  home: "from-purple-500/20 via-violet-500/10 to-purple-600/20",
  education: "from-cyan-500/20 via-sky-500/10 to-cyan-600/20",
  experience: "from-pink-500/20 via-rose-500/10 to-pink-600/20",
  fashion: "from-rose-500/20 via-pink-500/10 to-rose-600/20",
  health: "from-green-500/20 via-emerald-500/10 to-green-600/20",
  other: "from-gray-500/20 via-slate-500/10 to-gray-600/20",
}

/**
 * Category emoji icons for use in the fallback image area.
 * Displayed when no product image is available for the item.
 */
const categoryEmoji: Record<string, string> = {
  electronics: "💻",
  travel: "✈️",
  vehicle: "🚗",
  home: "🏠",
  education: "📚",
  experience: "🎯",
  fashion: "👕",
  health: "💪",
  other: "🎁",
}

/**
 * Priority dot color mappings for the visual priority indicator.
 * High = red, medium = yellow, low = green.
 */
const priorityColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

/**
 * Returns the Tailwind class for the progress bar color based on savings percentage.
 *
 * @param pct - The savings progress percentage (0-100)
 * @returns Tailwind CSS class string for the progress bar fill color
 */
function progressColor(pct: number): string {
  if (pct >= 75) return "[&>div]:bg-green-500"
  if (pct >= 50) return "[&>div]:bg-yellow-500"
  if (pct >= 25) return "[&>div]:bg-orange-500"
  return "[&>div]:bg-red-500"
}

/**
 * Props for the BucketListItemCard component.
 *
 * @property item - The bucket list item data to display
 * @property onUpdate - Callback to update an item's fields
 * @property onDelete - Callback to delete an item by ID
 * @property onPriceSearch - Callback to trigger a web price search for an item
 * @property onGetStrategy - Callback to generate an AI savings strategy for an item
 * @property onEdit - Callback to open the edit dialog for an item
 * @property isPriceSearching - Whether a price search is currently in progress for this item
 * @property isStrategyLoading - Whether an AI strategy is currently being generated for this item
 */
interface ItemCardProps {
  item: BucketListItem
  onUpdate: (id: string, data: Partial<BucketListItem>) => void
  onDelete: (id: string) => void
  onPriceSearch: (id: string) => void
  onGetStrategy: (id: string) => void
  onEdit: (item: BucketListItem) => void
  isPriceSearching?: boolean
  isStrategyLoading?: boolean
}

/**
 * Renders a single bucket list item as a rich card with image, progress, and actions.
 *
 * Features:
 * - Product image display (from web search) with category-gradient fallback
 * - Savings progress visualization with color-coded progress bar
 * - Quick action buttons (complete, price search, AI strategy)
 * - Expandable price comparison and strategy panels
 * - Deal alert badges overlaid on the image area
 * - Completion state with visual dimming and strikethrough
 *
 * @param props - Component props (see ItemCardProps)
 */
export function BucketListItemCard({
  item,
  onUpdate,
  onDelete,
  onPriceSearch,
  onGetStrategy,
  onEdit,
  isPriceSearching,
  isStrategyLoading,
}: ItemCardProps) {
  const [showPrices, setShowPrices] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [imgError, setImgError] = useState(false)

  const progress =
    item.targetAmount > 0
      ? Math.min(100, Math.round((item.savedAmount / item.targetAmount) * 100))
      : 0
  const isCompleted = item.status === "completed"

  return (
    <motion.div layout>
      <Card
        className={`overflow-hidden transition-all duration-300 border-border/50 hover:border-border hover:shadow-lg group ${
          isCompleted ? "opacity-70" : ""
        }`}
      >
        {/* Image / visual header area */}
        <div className="relative h-36 overflow-hidden">
          {item.imageUrl && !imgError ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div
              className={`h-full w-full bg-gradient-to-br ${
                categoryGradients[item.category] ?? categoryGradients.other
              } flex items-center justify-center`}
            >
              <span className="text-4xl opacity-60">
                {categoryEmoji[item.category] ?? "🎁"}
              </span>
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Top-left: category + priority */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 font-medium border-0 backdrop-blur-sm ${
                categoryColors[item.category] ?? categoryColors.other
              }`}
            >
              {item.category}
            </Badge>
            <span
              className={`size-2 rounded-full shrink-0 ring-2 ring-white/30 ${
                priorityColors[item.priority] ?? priorityColors.low
              }`}
              title={`${item.priority} priority`}
            />
          </div>

          {/* Top-right: deal alert */}
          {item.dealAlerts.length > 0 && (
            <Badge className="absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[10px] px-1.5 py-0 gap-0.5 animate-pulse">
              <IconTag className="size-2.5" />
              Deal!
            </Badge>
          )}

          {/* Bottom: price overlay */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between">
            <div>
              <p className="text-white/70 text-[10px] font-medium">Target</p>
              <p className="text-white text-sm font-bold flex items-center">
                <IconCurrencyRupee className="size-3.5" />
                {formatINR(item.targetAmount).replace("₹", "")}
              </p>
            </div>
            {isCompleted && (
              <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5">
                <IconCheck className="size-3 mr-0.5" />
                Done
              </Badge>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="p-4 space-y-3">
          {/* Name + description */}
          <div>
            <h3
              className={`text-sm font-semibold leading-tight ${
                isCompleted ? "line-through text-muted-foreground" : ""
              }`}
            >
              {item.name}
            </h3>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>

          {/* Target date */}
          {item.targetDate && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <IconCalendar className="size-3" />
              {new Date(item.targetDate).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </div>
          )}

          {/* Progress section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {formatINR(item.savedAmount)}{" "}
                <span className="text-muted-foreground/40">of</span>{" "}
                {formatINR(item.targetAmount)}
              </span>
              <span
                className={`font-bold text-xs ${
                  progress >= 75
                    ? "text-green-600 dark:text-green-400"
                    : progress >= 50
                      ? "text-yellow-600 dark:text-yellow-400"
                      : progress >= 25
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-red-600 dark:text-red-400"
                }`}
              >
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              className={`h-1.5 ${progressColor(progress)}`}
            />
            {item.monthlyAllocation > 0 && (
              <p className="text-[10px] text-muted-foreground/50">
                {formatINR(item.monthlyAllocation)}/mo allocation
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pt-1 border-t border-border/40">
            <Button
              variant={isCompleted ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() =>
                onUpdate(item.id, {
                  status: isCompleted ? "saving" : "completed",
                  savedAmount: isCompleted
                    ? item.savedAmount
                    : item.targetAmount,
                })
              }
              title={isCompleted ? "Mark incomplete" : "Mark complete"}
            >
              <IconCheck
                className={`size-3 ${
                  isCompleted ? "text-emerald-500" : ""
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                onPriceSearch(item.id)
                setShowPrices(true)
              }}
              disabled={isPriceSearching}
              title="Search prices & image"
            >
              <IconSearch
                className={`size-3 ${
                  isPriceSearching ? "animate-pulse" : ""
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                onGetStrategy(item.id)
                setShowStrategy(true)
              }}
              disabled={isStrategyLoading}
              title="Get AI strategy"
            >
              <IconBulb
                className={`size-3 ${
                  isStrategyLoading ? "animate-pulse" : ""
                }`}
              />
            </Button>

            {/* Expand/collapse toggle for panels */}
            {(item.priceHistory.length > 0 || item.aiStrategy) && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  if (!showPrices && !showStrategy) {
                    if (item.priceHistory.length > 0) setShowPrices(true)
                    else if (item.aiStrategy) setShowStrategy(true)
                  } else {
                    setShowPrices(false)
                    setShowStrategy(false)
                  }
                }}
                title="Toggle details"
              >
                {showPrices || showStrategy ? (
                  <IconChevronUp className="size-3" />
                ) : (
                  <IconChevronDown className="size-3" />
                )}
              </Button>
            )}

            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <IconDotsVertical className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <IconEdit className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(item.id)}
                  >
                    <IconTrash className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Expandable panels */}
          <AnimatePresence>
            {showPrices && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <PricePanel
                  prices={item.priceHistory}
                  deals={item.dealAlerts}
                  onRefresh={() => onPriceSearch(item.id)}
                  isRefreshing={isPriceSearching}
                />
              </motion.div>
            )}
            {showStrategy && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <StrategyPanel
                  strategy={item.aiStrategy}
                  generatedAt={item.aiStrategyGeneratedAt}
                  onRegenerate={() => onGetStrategy(item.id)}
                  isGenerating={isStrategyLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}
