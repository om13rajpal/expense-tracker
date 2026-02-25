"use client"

import { useMemo } from "react"
import Image from "next/image"
import { motion } from "motion/react"
import { IconRocket, IconTag, IconFlame } from "@tabler/icons-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCompact, formatINR } from "@/lib/format"
import { fadeUp } from "@/lib/motion"
import type { BucketListItem } from "@/lib/types"

interface FeaturedSpotlightProps {
  items: BucketListItem[]
  onQuickFund: (item: BucketListItem) => void
}

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

function selectFeaturedItem(items: BucketListItem[]): BucketListItem | null {
  const active = items.filter((i) => i.status !== "completed")
  if (active.length === 0) return null

  // Priority 1: item with deal alert
  const withDeal = active.find((i) => i.dealAlerts.length > 0)
  if (withDeal) return withDeal

  // Priority 2: closest to completion (>50%)
  const closestToCompletion = active
    .filter((i) => i.targetAmount > 0 && i.savedAmount / i.targetAmount > 0.5)
    .sort((a, b) => b.savedAmount / b.targetAmount - a.savedAmount / a.targetAmount)
  if (closestToCompletion.length > 0) return closestToCompletion[0]

  // Priority 3: nearest deadline
  const withDeadline = active
    .filter((i) => i.targetDate)
    .sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""))
  if (withDeadline.length > 0) return withDeadline[0]

  return null
}

export function FeaturedSpotlight({ items, onQuickFund }: FeaturedSpotlightProps) {
  const featured = useMemo(() => selectFeaturedItem(items), [items])
  if (!featured) return null

  const progress = featured.targetAmount > 0
    ? Math.min(100, Math.round((featured.savedAmount / featured.targetAmount) * 100))
    : 0
  const remaining = Math.max(0, featured.targetAmount - featured.savedAmount)
  const hasDeal = featured.dealAlerts.length > 0
  const isAlmostDone = progress > 50

  // Projected completion date from monthly allocation
  let projectedDate: string | null = null
  if (featured.monthlyAllocation > 0 && remaining > 0) {
    const monthsLeft = Math.ceil(remaining / featured.monthlyAllocation)
    const date = new Date()
    date.setMonth(date.getMonth() + monthsLeft)
    projectedDate = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
  }

  const contextLabel = hasDeal ? "Deal found!" : isAlmostDone ? "Almost there!" : "Next up"
  const contextIcon = hasDeal ? IconTag : isAlmostDone ? IconFlame : IconRocket
  const ContextIcon = contextIcon

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <Card className="overflow-hidden border-border/50 hover:border-border transition-colors">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-[200px] h-40 sm:h-auto shrink-0 overflow-hidden">
            {(featured.coverImageUrl || featured.imageUrl) ? (
              <Image
                src={featured.coverImageUrl || featured.imageUrl!}
                alt={featured.name}
                fill
                className="object-cover"
                sizes="200px"
                unoptimized
              />
            ) : (
              <div className={`h-full w-full bg-gradient-to-br ${categoryGradients[featured.category] ?? categoryGradients.other} flex items-center justify-center`}>
                <span className="text-5xl opacity-50">
                  {categoryEmoji[featured.category] ?? "🎁"}
                </span>
              </div>
            )}
            {hasDeal && (
              <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0 gap-0.5 animate-pulse">
                <IconTag className="size-2.5" />
                Deal!
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                <ContextIcon className="size-3" />
                {contextLabel}
              </Badge>
            </div>

            <div>
              <h3 className="text-base font-semibold leading-tight">{featured.name}</h3>
              {featured.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{featured.description}</p>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatINR(featured.savedAmount)} of {formatINR(featured.targetAmount)}
                </span>
                <span className="font-bold">{progress}%</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary/60">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progress, 2)}%` }}
                  transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-auto">
              <div className="text-xs text-muted-foreground">
                {projectedDate && (
                  <span>Est. completion: <span className="font-medium text-foreground">{projectedDate}</span></span>
                )}
              </div>
              <Button size="sm" onClick={() => onQuickFund(featured)} className="gap-1.5 shrink-0">
                <IconRocket className="size-3.5" />
                Quick Fund
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
