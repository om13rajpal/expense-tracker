"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { motion } from "motion/react"
import {
  IconCheck,
  IconEdit,
  IconTrash,
  IconSearch,
  IconBulb,
  IconCoin,
  IconCalendar,
  IconTag,
  IconArrowUp,
  IconExternalLink,
  IconRefresh,
  IconX,
} from "@tabler/icons-react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { StrategyView } from "@/components/bucket-list/strategy-view"
import { formatINR } from "@/lib/format"
import { categoryColors } from "./item-card"
import type { BucketListItem } from "@/lib/types"

// ─── Config ──────────────────────────────────────────────────────────────

const categoryGradients: Record<string, string> = {
  electronics: "from-blue-600/40 to-indigo-500/30",
  travel: "from-emerald-600/40 to-teal-500/30",
  vehicle: "from-orange-600/40 to-amber-500/30",
  home: "from-purple-600/40 to-violet-500/30",
  education: "from-cyan-600/40 to-sky-500/30",
  experience: "from-pink-600/40 to-rose-500/30",
  fashion: "from-rose-600/40 to-pink-500/30",
  health: "from-green-600/40 to-emerald-500/30",
  other: "from-gray-600/40 to-slate-500/30",
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

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "High", color: "bg-red-500", bg: "bg-red-500/10 text-red-600 dark:text-red-400" },
  medium: { label: "Medium", color: "bg-yellow-500", bg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  low: { label: "Low", color: "bg-green-500", bg: "bg-green-500/10 text-green-600 dark:text-green-400" },
}

const statusConfig: Record<string, { label: string; bg: string }> = {
  wishlist: { label: "Wishlist", bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  saving: { label: "Saving", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  completed: { label: "Completed", bg: "bg-lime-500/10 text-lime-600 dark:text-lime-400" },
}

const FUND_PRESETS = [500, 1000, 2000, 5000]

function progressColor(pct: number): string {
  if (pct >= 75) return "#22c55e"
  if (pct >= 50) return "#eab308"
  if (pct >= 25) return "#f97316"
  return "#ef4444"
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

// ─── Circular Progress Ring ──────────────────────────────────────────────

function ProgressRing({
  progress,
  size = 140,
  strokeWidth = 10,
  children,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary/50"
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor(progress)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────

interface ItemDetailSheetProps {
  item: BucketListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (item: BucketListItem) => void
  onDelete: (id: string) => void
  onQuickFund: (id: string, amount: number) => void
  onPriceSearch: (id: string) => void
  onAiStrategy: (id: string) => void
  onToggleComplete: (item: BucketListItem) => void
  priceSearching: boolean
  strategyLoading: boolean
  formatCurrency: (n: number) => string
}

// ─── Component ───────────────────────────────────────────────────────────

export function ItemDetailSheet({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onQuickFund,
  onPriceSearch,
  onAiStrategy,
  onToggleComplete,
  priceSearching,
  strategyLoading,
  formatCurrency,
}: ItemDetailSheetProps) {
  const [customAmount, setCustomAmount] = useState("")
  const [funded, setFunded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleFund = useCallback(
    (amount: number) => {
      if (!item) return
      const remaining = Math.max(0, item.targetAmount - item.savedAmount)
      const actual = Math.min(amount, remaining)
      if (actual <= 0) return
      onQuickFund(item.id, actual)
      setFunded(true)
      setTimeout(() => {
        setFunded(false)
        setCustomAmount("")
      }, 1500)
    },
    [item, onQuickFund]
  )

  const handleCustomSubmit = useCallback(() => {
    const val = Number(customAmount)
    if (val > 0) handleFund(val)
  }, [customAmount, handleFund])

  if (!item) return null

  const hasImage = (item.coverImageUrl || item.imageUrl) && !imgError
  const progress =
    item.targetAmount > 0
      ? Math.min(100, Math.round((item.savedAmount / item.targetAmount) * 100))
      : 0
  const isCompleted = item.status === "completed"
  const remaining = Math.max(0, item.targetAmount - item.savedAmount)
  const pCfg = priorityConfig[item.priority] ?? priorityConfig.low
  const sCfg = statusConfig[item.status] ?? statusConfig.saving

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-lg p-0 overflow-y-auto"
      >
        {/* Hidden accessible title/description */}
        <SheetTitle className="sr-only">{item.name}</SheetTitle>
        <SheetDescription className="sr-only">
          Details for {item.name}
        </SheetDescription>

        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/40 backdrop-blur-sm p-1.5 text-white hover:bg-black/60 transition-colors"
        >
          <IconX className="size-4" />
        </button>

        {/* ─── Hero Image ─────────────────────────── */}
        <div className="relative h-48 overflow-hidden">
          {hasImage ? (
            <Image
              src={item.coverImageUrl || item.imageUrl!}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 512px"
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
                <span className="text-6xl drop-shadow-md">
                  {categoryEmoji[item.category] ?? "\u{1F381}"}
                </span>
              </div>
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* ─── Body ───────────────────────────────── */}
        <div className="px-5 -mt-6 relative z-10 space-y-6 pb-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold leading-tight mb-2">
              {item.name}
            </h2>
            {item.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {item.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={`text-[11px] px-2 py-0.5 font-medium border-0 ${
                  categoryColors[item.category] ?? categoryColors.other
                }`}
              >
                {item.category}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-[11px] px-2 py-0.5 font-medium border-0 ${pCfg.bg}`}
              >
                {pCfg.label} priority
              </Badge>
              <Badge
                variant="secondary"
                className={`text-[11px] px-2 py-0.5 font-medium border-0 ${sCfg.bg}`}
              >
                {sCfg.label}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* ─── Progress Ring ─────────────────────── */}
          <div className="flex flex-col items-center gap-3">
            <ProgressRing progress={progress}>
              <span className="text-2xl font-black tracking-tight tabular-nums">
                {progress}%
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                saved
              </span>
            </ProgressRing>
            <p className="text-sm text-muted-foreground">
              <span className="font-black tracking-tight text-foreground">
                {formatCurrency(item.savedAmount)}
              </span>{" "}
              of{" "}
              <span className="font-black tracking-tight text-foreground">
                {formatCurrency(item.targetAmount)}
              </span>{" "}
              saved
            </p>
            {!isCompleted && remaining > 0 && (
              <p className="text-xs text-muted-foreground/70">
                {formatCurrency(remaining)} remaining
              </p>
            )}
          </div>

          <Separator />

          {/* ─── Quick Fund ───────────────────────── */}
          {!isCompleted && remaining > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-xl bg-amber-500/10">
                  <IconCoin className="size-3.5 text-amber-500" />
                </div>
                <h3 className="text-sm font-semibold">Quick Fund</h3>
              </div>

              {funded ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-2 py-4"
                >
                  <div className="size-10 rounded-full bg-lime-500/10 flex items-center justify-center">
                    <IconCheck className="size-5 text-lime-500" />
                  </div>
                  <p className="text-xs font-semibold">Funds Added!</p>
                </motion.div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {FUND_PRESETS.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold h-9"
                        disabled={amount > remaining}
                        onClick={() => handleFund(amount)}
                      >
                        {formatINR(amount)}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        type="number"
                        placeholder="Custom amount"
                        className="pl-7 h-9 text-sm"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleCustomSubmit()
                        }
                        min={1}
                        max={remaining}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-9 px-4"
                      disabled={
                        !customAmount || Number(customAmount) <= 0
                      }
                      onClick={handleCustomSubmit}
                    >
                      <IconArrowUp className="size-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <Separator />

          {/* ─── Details Grid ─────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <DetailCell
              label="Target Date"
              value={
                item.targetDate
                  ? new Date(item.targetDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Not set"
              }
              icon={<IconCalendar className="size-3.5" />}
            />
            <DetailCell
              label="Monthly"
              value={
                item.monthlyAllocation > 0
                  ? `${formatCurrency(item.monthlyAllocation)}/mo`
                  : "Not set"
              }
              icon={<IconCoin className="size-3.5" />}
            />
            <DetailCell
              label="Category"
              value={item.category}
              icon={
                <span className="text-xs">
                  {categoryEmoji[item.category] ?? "\u{1F381}"}
                </span>
              }
            />
            <DetailCell
              label="Priority"
              value={pCfg.label}
              icon={
                <span
                  className={`size-2.5 rounded-full ${pCfg.color} inline-block`}
                />
              }
            />
          </div>

          <Separator />

          {/* ─── Price History ─────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-xl bg-blue-500/10">
                  <IconSearch className="size-3.5 text-blue-500" />
                </div>
                <h3 className="text-sm font-semibold">Price Comparison</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => onPriceSearch(item.id)}
                disabled={priceSearching}
              >
                {priceSearching ? (
                  <IconRefresh className="size-3 animate-spin" />
                ) : (
                  <IconSearch className="size-3" />
                )}
                {priceSearching ? "Searching..." : "Search Prices"}
              </Button>
            </div>

            {/* Deal alerts */}
            {item.dealAlerts.length > 0 && (
              <div className="space-y-1.5">
                {item.dealAlerts.map((deal, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-lime-500/10 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className="bg-lime-500 text-white text-[10px] px-1.5 py-0 shrink-0">
                        {deal.discountPercent
                          ? `${deal.discountPercent}% off`
                          : "Deal"}
                      </Badge>
                      <span className="truncate font-medium">{deal.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-semibold text-lime-600 dark:text-lime-400">
                        {formatCurrency(deal.price)}
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

            {/* Price list */}
            {item.priceHistory.length > 0 ? (
              <div className="rounded-lg border border-border/50 divide-y divide-border/30">
                {item.priceHistory.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconTag className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground truncate">
                        {p.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-semibold">
                        {formatCurrency(p.price)}
                      </span>
                      {p.checkedAt && (
                        <span className="text-[10px] text-muted-foreground/50">
                          {timeAgo(p.checkedAt)}
                        </span>
                      )}
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
            ) : (
              !priceSearching && (
                <p className="text-xs text-muted-foreground/60 text-center py-3">
                  No price data yet. Search to compare prices.
                </p>
              )
            )}

            {priceSearching && (
              <div className="space-y-2 py-2">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-3/4 rounded-lg" />
              </div>
            )}
          </div>

          <Separator />

          {/* ─── AI Strategy ──────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-xl bg-amber-500/10">
                  <IconBulb className="size-3.5 text-amber-500" />
                </div>
                <h3 className="text-sm font-semibold">AI Strategy</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => onAiStrategy(item.id)}
                disabled={strategyLoading}
              >
                {strategyLoading ? (
                  <IconRefresh className="size-3 animate-spin" />
                ) : (
                  <IconBulb className="size-3" />
                )}
                {item.aiStrategy
                  ? "Regenerate"
                  : strategyLoading
                    ? "Generating..."
                    : "Generate Strategy"}
              </Button>
            </div>

            {strategyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ) : item.aiStrategy ? (
              <div className="rounded-lg border border-border/50 p-3">
                {item.aiStrategyGeneratedAt && (
                  <p className="text-[10px] text-muted-foreground/50 mb-2">
                    Generated {timeAgo(item.aiStrategyGeneratedAt)}
                  </p>
                )}
                <StrategyView
                  strategy={item.aiStrategy}
                  savedAmount={item.savedAmount}
                  targetAmount={item.targetAmount}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 text-center py-3">
                Get a personalized savings strategy powered by AI.
              </p>
            )}
          </div>

          <Separator />

          {/* ─── Actions Footer ───────────────────── */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 gap-1.5 text-xs"
              onClick={() => {
                onEdit(item)
                onOpenChange(false)
              }}
            >
              <IconEdit className="size-3.5" />
              Edit
            </Button>
            <Button
              variant={isCompleted ? "outline" : "default"}
              size="sm"
              className={`flex-1 h-9 gap-1.5 text-xs ${
                !isCompleted
                  ? "bg-lime-600 hover:bg-lime-700 text-white"
                  : ""
              }`}
              onClick={() => onToggleComplete(item)}
            >
              <IconCheck className="size-3.5" />
              {isCompleted ? "Mark Incomplete" : "Mark Complete"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => {
                onDelete(item.id)
                onOpenChange(false)
              }}
            >
              <IconTrash className="size-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Detail Cell ─────────────────────────────────────────────────────────

function DetailCell({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-3 space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium capitalize truncate">{value}</span>
      </div>
    </div>
  )
}
