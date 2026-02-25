"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { motion } from "motion/react"
import {
  IconCheck,
  IconSearch,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconCoin,
  IconCalendar,
} from "@tabler/icons-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatINR } from "@/lib/format"
import type { BucketListItem } from "@/lib/types"

export const categoryColors: Record<string, string> = {
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

const categoryGradients: Record<string, string> = {
  electronics: "from-blue-600/30 via-indigo-500/20 to-blue-400/30",
  travel: "from-emerald-600/30 via-teal-500/20 to-emerald-400/30",
  vehicle: "from-orange-600/30 via-amber-500/20 to-orange-400/30",
  home: "from-purple-600/30 via-violet-500/20 to-purple-400/30",
  education: "from-cyan-600/30 via-sky-500/20 to-cyan-400/30",
  experience: "from-pink-600/30 via-rose-500/20 to-pink-400/30",
  fashion: "from-rose-600/30 via-pink-500/20 to-rose-400/30",
  health: "from-green-600/30 via-emerald-500/20 to-green-400/30",
  other: "from-gray-600/30 via-slate-500/20 to-gray-400/30",
}

const categoryEmoji: Record<string, string> = {
  electronics: "\u{1F4BB}",
  travel: "\u2708\uFE0F",
  vehicle: "\u{1F697}",
  home: "\u{1F3E0}",
  education: "\u{1F4DA}",
  experience: "\u{1F3AF}",
  fashion: "\u{1F455}",
  health: "\u{1F4AA}",
  other: "\u{1F381}",
}

const priorityConfig: Record<string, { color: string; bg: string }> = {
  high: { color: "bg-red-500", bg: "bg-red-500/10 text-red-600 dark:text-red-400" },
  medium: { color: "bg-yellow-500", bg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  low: { color: "bg-green-500", bg: "bg-green-500/10 text-green-600 dark:text-green-400" },
}

function progressGradient(pct: number): string {
  if (pct >= 75) return "from-green-400 to-green-500"
  if (pct >= 50) return "from-yellow-400 to-yellow-500"
  if (pct >= 25) return "from-orange-400 to-orange-500"
  return "from-red-400 to-red-500"
}

function progressTextColor(pct: number): string {
  if (pct >= 75) return "text-green-600 dark:text-green-400"
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-400"
  if (pct >= 25) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

interface ItemCardProps {
  item: BucketListItem
  onUpdate: (id: string, data: Partial<BucketListItem>) => void
  onDelete: (id: string) => void
  onPriceSearch: (id: string) => void
  onGetStrategy: (id: string) => void
  onEdit: (item: BucketListItem) => void
  onQuickFund?: (item: BucketListItem) => void
  onClick?: (item: BucketListItem) => void
  isPriceSearching?: boolean
  isStrategyLoading?: boolean
  isDragging?: boolean
  dragHandleProps?: Record<string, unknown>
}

export function BucketListItemCard({
  item,
  onUpdate,
  onDelete,
  onPriceSearch,
  onEdit,
  onQuickFund,
  onClick,
  isPriceSearching,
  isDragging,
}: ItemCardProps) {
  const [imgError, setImgError] = useState(false)

  const hasImage = (item.coverImageUrl || item.imageUrl) && !imgError

  const handleToggleComplete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const isCompleted = item.status === "completed"
      onUpdate(item.id, {
        status: isCompleted ? "saving" : "completed",
        savedAmount: isCompleted ? item.savedAmount : item.targetAmount,
      })
    },
    [item, onUpdate]
  )

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't trigger card click when clicking buttons/dropdowns
      const target = e.target as HTMLElement
      if (target.closest("button") || target.closest("[role='menu']")) return
      onClick?.(item)
    },
    [item, onClick]
  )

  const progress =
    item.targetAmount > 0
      ? Math.min(100, Math.round((item.savedAmount / item.targetAmount) * 100))
      : 0
  const isCompleted = item.status === "completed"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isDragging ? 0.8 : 1,
        scale: isDragging ? 1.05 : 1,
        rotate: isDragging ? 2 : 0,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={!isDragging ? { y: -3 } : undefined}
      transition={{ duration: 0.2 }}
      className={isDragging ? "z-50 shadow-2xl" : ""}
    >
      <Card
        onClick={handleCardClick}
        className={`card-elevated overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 group cursor-pointer ${
          isCompleted
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent"
            : ""
        }`}
      >
        {/* Image area - compact h-36 */}
        <div className="relative h-36 overflow-hidden">
          {hasImage ? (
            <Image
              src={item.coverImageUrl || item.imageUrl!}
              alt={item.name}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isCompleted ? "saturate-75" : ""}`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div
              className={`h-full w-full bg-gradient-to-br ${
                categoryGradients[item.category] ?? categoryGradients.other
              } relative`}
            >
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="relative h-full flex items-center justify-center">
                <span className="text-5xl drop-shadow-sm">
                  {categoryEmoji[item.category] ?? "\u{1F381}"}
                </span>
              </div>
            </div>
          )}

          {/* Completed overlay */}
          {isCompleted && (
            <div className="absolute inset-0 bg-emerald-500/15" />
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Top-left: category badge */}
          <div className="absolute top-2 left-2 z-[5]">
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 font-medium border-0 backdrop-blur-sm ${
                categoryColors[item.category] ?? categoryColors.other
              }`}
            >
              {item.category}
            </Badge>
          </div>

          {/* Top-right: priority dot */}
          <div className="absolute top-2.5 right-2.5 z-[5]">
            {isCompleted ? (
              <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 gap-0.5">
                <IconCheck className="size-2.5" />
                Done
              </Badge>
            ) : (
              <span
                className={`size-2.5 rounded-full block ring-2 ring-white/30 ${
                  (priorityConfig[item.priority] ?? priorityConfig.low).color
                }`}
                title={`${item.priority} priority`}
              />
            )}
          </div>
        </div>

        {/* Content area - compact */}
        <div className="p-3 space-y-2">
          {/* Item name */}
          <h3
            className={`text-sm font-semibold leading-tight truncate ${
              isCompleted ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.name}
          </h3>

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

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground truncate">
                {formatINR(item.savedAmount)}{" "}
                <span className="text-muted-foreground/40">/</span>{" "}
                {formatINR(item.targetAmount)}
              </span>
              <span
                className={`font-bold tabular-nums ml-2 shrink-0 ${progressTextColor(
                  progress
                )}`}
              >
                {progress}%
              </span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${progressGradient(
                  progress
                )}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progress, 2)}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>

          {/* Monthly allocation */}
          {item.monthlyAllocation > 0 && (
            <p className="text-[10px] text-muted-foreground/50">
              {formatINR(item.monthlyAllocation)}/mo
            </p>
          )}

          {/* Bottom strip: action buttons */}
          <div className="flex items-center gap-1 pt-1.5 border-t border-border/40">
            {!isCompleted && onQuickFund && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickFund(item)
                }}
                title="Quick Fund"
                className="text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <IconCoin className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation()
                onPriceSearch(item.id)
              }}
              disabled={isPriceSearching}
              title="Search prices"
            >
              <IconSearch
                className={`size-3 ${isPriceSearching ? "animate-pulse" : ""}`}
              />
            </Button>

            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDotsVertical className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleComplete}>
                    <IconCheck className="size-4" />
                    {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(item)
                    }}
                  >
                    <IconEdit className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(item.id)
                    }}
                  >
                    <IconTrash className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
