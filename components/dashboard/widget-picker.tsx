"use client"

/**
 * Sheet drawer that shows the full widget catalog for adding widgets.
 * Auto-closes after a widget is added so the user immediately sees it.
 * @module components/dashboard/widget-picker
 */

import { useState } from "react"
import {
  IconWallet,
  IconTarget,
  IconCalendar,
  IconSparkles,
  IconTrendingUp,
  IconReceipt2,
  IconRepeat,
  IconStar,
  IconFlame,
  IconUsers,
  IconPlus,
  IconCheck,
} from "@tabler/icons-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WIDGET_REGISTRY, type WidgetDefinition, type WidgetSize } from "@/lib/widget-registry"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IconWallet, IconTarget, IconCalendar, IconSparkles, IconTrendingUp,
  IconReceipt2, IconRepeat, IconStar, IconFlame, IconUsers,
}

/** Category-specific icon background tints */
const CATEGORY_ICON_STYLES: Record<string, { bg: string; text: string }> = {
  overview:    { bg: "bg-emerald-500/15 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
  spending:    { bg: "bg-sky-500/15 dark:bg-sky-500/20", text: "text-sky-600 dark:text-sky-400" },
  goals:       { bg: "bg-amber-500/15 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  investments: { bg: "bg-violet-500/15 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400" },
  tools:       { bg: "bg-rose-500/15 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400" },
}

const CATEGORY_LABELS: Record<string, string> = {
  overview: "Overview",
  spending: "Spending",
  goals: "Goals & Savings",
  investments: "Investments",
  tools: "Tools",
}

interface WidgetPickerProps {
  activeWidgetIds: string[]
  onAdd: (widgetId: string, size: WidgetSize) => void
}

export function WidgetPicker({ activeWidgetIds, onAdd }: WidgetPickerProps) {
  const [open, setOpen] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const categories = Object.keys(CATEGORY_LABELS)

  const handleAdd = (widgetId: string, size: WidgetSize) => {
    onAdd(widgetId, size)
    setJustAdded(widgetId)
    // Brief visual confirmation, then close
    setTimeout(() => {
      setOpen(false)
      setJustAdded(null)
    }, 400)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-full border-primary/30 text-primary hover:bg-primary/10"
        >
          <IconPlus className="size-4" />
          Add Widget
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Widget Catalog</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {categories.map(cat => {
            const widgets = WIDGET_REGISTRY.filter(w => w.category === cat)
            if (widgets.length === 0) return null
            const iconStyles = CATEGORY_ICON_STYLES[cat] || CATEGORY_ICON_STYLES.overview
            return (
              <div key={cat}>
                <h3 className="text-[13px] font-medium text-muted-foreground mb-3">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <div className="space-y-2">
                  {widgets.map(w => {
                    const isActive = activeWidgetIds.includes(w.id) || justAdded === w.id
                    const wasJustAdded = justAdded === w.id
                    const Icon = ICON_MAP[w.icon] || IconWallet
                    return (
                      <div
                        key={w.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                          wasJustAdded
                            ? "border-primary/50 bg-primary/10 scale-[0.98]"
                            : isActive
                              ? "border-border bg-muted/40 opacity-70"
                              : "border-border hover:border-primary/20 hover:bg-muted/30"
                        }`}
                      >
                        {/* Category-colored icon circle */}
                        <div className={`flex items-center justify-center size-9 rounded-full shrink-0 ${iconStyles.bg}`}>
                          <Icon className={`size-4 ${iconStyles.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{w.name}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{w.description}</p>
                        </div>
                        {wasJustAdded ? (
                          <Badge className="text-[10px] shrink-0 bg-primary text-primary-foreground">Added!</Badge>
                        ) : isActive ? (
                          <div className="flex items-center justify-center size-6 rounded-full bg-primary/15 shrink-0">
                            <IconCheck className="size-3.5 text-primary" />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-7 px-3 text-xs font-semibold rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition-colors duration-150"
                            onClick={() => handleAdd(w.id, w.defaultSize)}
                          >
                            <IconPlus className="size-3.5 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
