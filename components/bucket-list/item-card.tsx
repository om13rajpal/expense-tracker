"use client"

import { useState } from "react"
import { motion } from "motion/react"
import {
  IconCheck,
  IconSearch,
  IconBulb,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconTag,
} from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
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

const priorityColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

function progressColor(pct: number): string {
  if (pct >= 75) return "[&>div]:bg-green-500"
  if (pct >= 50) return "[&>div]:bg-yellow-500"
  if (pct >= 25) return "[&>div]:bg-orange-500"
  return "[&>div]:bg-red-500"
}

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

  const progress =
    item.targetAmount > 0
      ? Math.min(100, Math.round((item.savedAmount / item.targetAmount) * 100))
      : 0
  const isCompleted = item.status === "completed"

  return (
    <motion.div layout>
      <Card
        className={`py-4 gap-3 transition-opacity ${
          isCompleted ? "opacity-70" : ""
        }`}
      >
        <CardContent className="space-y-3">
          {/* Header: category badge + priority + deal badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 font-medium border-0 ${
                categoryColors[item.category] ?? categoryColors.other
              }`}
            >
              {item.category}
            </Badge>
            <span
              className={`size-2 rounded-full shrink-0 ${
                priorityColors[item.priority] ?? priorityColors.low
              }`}
              title={`${item.priority} priority`}
            />
            {item.dealAlerts.length > 0 && (
              <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 gap-0.5">
                <IconTag className="size-2.5" />
                Deal!
              </Badge>
            )}
          </div>

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
            <p className="text-[11px] text-muted-foreground/70">
              Target:{" "}
              {new Date(item.targetDate).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </p>
          )}

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {formatINR(item.savedAmount)}{" "}
                <span className="text-muted-foreground/50">/</span>{" "}
                {formatINR(item.targetAmount)}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress
              value={progress}
              className={`h-1.5 ${progressColor(progress)}`}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pt-1">
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
              title="Check prices"
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
          {showPrices && (
            <PricePanel
              prices={item.priceHistory}
              deals={item.dealAlerts}
              onRefresh={() => onPriceSearch(item.id)}
              isRefreshing={isPriceSearching}
            />
          )}
          {showStrategy && (
            <StrategyPanel
              strategy={item.aiStrategy}
              generatedAt={item.aiStrategyGeneratedAt}
              onRegenerate={() => onGetStrategy(item.id)}
              isGenerating={isStrategyLoading}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
