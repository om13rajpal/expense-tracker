"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import { IconCalendar, IconQuestionMark } from "@tabler/icons-react"
import { stagger, fadeUp } from "@/lib/motion"
import { formatCompact } from "@/lib/format"
import type { BucketListItem } from "@/lib/types"

interface DreamTimelineProps {
  items: BucketListItem[]
}

const categoryColors: Record<string, string> = {
  electronics: "bg-blue-500",
  travel: "bg-emerald-500",
  vehicle: "bg-orange-500",
  home: "bg-purple-500",
  education: "bg-cyan-500",
  experience: "bg-pink-500",
  fashion: "bg-rose-500",
  health: "bg-green-500",
  other: "bg-gray-500",
}

function progressBarColor(pct: number): string {
  if (pct >= 75) return "bg-green-500"
  if (pct >= 50) return "bg-yellow-500"
  if (pct >= 25) return "bg-orange-500"
  return "bg-red-500"
}

export function DreamTimeline({ items }: DreamTimelineProps) {
  const { dated, undated } = useMemo(() => {
    const active = items.filter((i) => i.status !== "completed")
    const d = active.filter((i) => i.targetDate).sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""))
    const u = active.filter((i) => !i.targetDate)
    return { dated: d, undated: u }
  }, [items])

  // Group dated items by month
  const groups = useMemo(() => {
    const map = new Map<string, BucketListItem[]>()
    for (const item of dated) {
      const date = new Date(item.targetDate!)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: new Date(key + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      items,
    }))
  }, [dated])

  if (dated.length === 0 && undated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconCalendar className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No active items to show on the timeline.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dated items grouped by month */}
      {groups.map((group) => (
        <motion.div key={group.key} variants={stagger} initial="hidden" animate="show">
          <div className="flex items-center gap-2 mb-3">
            <IconCalendar className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">{group.label}</h3>
          </div>
          <div className="relative ml-2 border-l-2 border-border/50 pl-6 space-y-3">
            {group.items.map((item) => (
              <TimelineEntry key={item.id} item={item} />
            ))}
          </div>
        </motion.div>
      ))}

      {/* Undated items */}
      {undated.length > 0 && (
        <motion.div variants={stagger} initial="hidden" animate="show">
          <div className="flex items-center gap-2 mb-3">
            <IconQuestionMark className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground">No Target Date</h3>
          </div>
          <div className="relative ml-2 border-l-2 border-border/30 pl-6 space-y-3">
            {undated.map((item) => (
              <TimelineEntry key={item.id} item={item} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function TimelineEntry({ item }: { item: BucketListItem }) {
  const progress = item.targetAmount > 0
    ? Math.min(100, Math.round((item.savedAmount / item.targetAmount) * 100))
    : 0
  const dotColor = categoryColors[item.category] ?? categoryColors.other

  return (
    <motion.div variants={fadeUp} className="relative">
      {/* Timeline dot */}
      <div className={`absolute -left-[31px] top-2.5 size-3 rounded-full ${dotColor} ring-2 ring-background`} />

      <div className="rounded-lg border border-border/40 bg-card p-3 hover:border-border/70 transition-colors">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h4 className="text-sm font-medium truncate">{item.name}</h4>
          <span className="text-xs font-black tracking-tight tabular-nums shrink-0">{progress}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/50 mb-1.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor(progress)}`}
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{formatCompact(item.savedAmount)} / {formatCompact(item.targetAmount)}</span>
          {item.monthlyAllocation > 0 && (
            <span>{formatCompact(item.monthlyAllocation)}/mo</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
