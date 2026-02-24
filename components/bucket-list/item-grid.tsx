/**
 * Bucket list item grid component.
 *
 * Groups bucket list items by their status (saving, wishlist, completed)
 * and renders them in a responsive grid layout with animated transitions.
 *
 * The grid uses three columns on desktop, two on tablet, and one on mobile.
 * Items within each status group are rendered using the BucketListItemCard component
 * with staggered fade-up entrance animations.
 *
 * Status groups are sorted in a fixed order: saving first, then wishlist, then completed,
 * so active items are always prominent.
 *
 * @module components/bucket-list/item-grid
 */
"use client"

import { AnimatePresence, motion } from "motion/react"
import { IconLoader2, IconHeart, IconCircleCheck } from "@tabler/icons-react"
import { stagger, fadeUp } from "@/lib/motion"
import { BucketListItemCard } from "./item-card"
import type { BucketListItem } from "@/lib/types"

/**
 * Props for the BucketListItemGrid component.
 *
 * @property items - Filtered and sorted array of bucket list items to display
 * @property onUpdate - Callback to update an item's fields
 * @property onDelete - Callback to delete an item by ID
 * @property onPriceSearch - Callback to trigger a web price search for an item
 * @property onGetStrategy - Callback to generate an AI savings strategy for an item
 * @property onEdit - Callback to open the edit dialog for an item
 * @property priceSearchingId - ID of the item currently being price-searched (null if none)
 * @property strategyLoadingId - ID of the item currently generating strategy (null if none)
 */
interface ItemGridProps {
  items: BucketListItem[]
  onUpdate: (id: string, data: Partial<BucketListItem>) => void
  onDelete: (id: string) => void
  onPriceSearch: (id: string) => void
  onGetStrategy: (id: string) => void
  onEdit: (item: BucketListItem) => void
  priceSearchingId?: string | null
  strategyLoadingId?: string | null
}

/**
 * Display order for bucket list item statuses.
 * Lower values appear first in the UI.
 */
const statusOrder: Record<string, number> = {
  saving: 0,
  wishlist: 1,
  completed: 2,
}

/**
 * Human-readable labels for each bucket list status.
 */
const statusLabels: Record<string, string> = {
  saving: "Saving",
  wishlist: "Wishlist",
  completed: "Completed",
}

/**
 * Status-specific icon components for the section headers.
 */
const statusIcons: Record<string, typeof IconLoader2> = {
  saving: IconLoader2,
  wishlist: IconHeart,
  completed: IconCircleCheck,
}

/**
 * Status-specific accent colors for section header styling.
 */
const statusColors: Record<string, string> = {
  saving: "text-blue-500",
  wishlist: "text-pink-500",
  completed: "text-emerald-500",
}

/**
 * Renders grouped and animated grid of bucket list item cards.
 *
 * Items are grouped by their status field, then each group is rendered
 * as a labeled section with a responsive card grid. Groups are sorted
 * so that actively-saving items appear first, followed by wishlist, then completed.
 *
 * Uses AnimatePresence with popLayout mode to animate groups in/out smoothly.
 *
 * @param props - Component props (see ItemGridProps)
 */
export function BucketListItemGrid({
  items,
  onUpdate,
  onDelete,
  onPriceSearch,
  onGetStrategy,
  onEdit,
  priceSearchingId,
  strategyLoadingId,
}: ItemGridProps) {
  const groups = items.reduce<Record<string, BucketListItem[]>>((acc, item) => {
    const key = item.status
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const sortedKeys = Object.keys(groups).sort(
    (a, b) => (statusOrder[a] ?? 9) - (statusOrder[b] ?? 9)
  )

  return (
    <div className="space-y-8">
      <AnimatePresence mode="popLayout">
        {sortedKeys.map((status) => {
          const Icon = statusIcons[status] ?? IconLoader2
          const color = statusColors[status] ?? "text-muted-foreground"
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon className={`size-4 ${color}`} />
                <h2 className="text-sm font-semibold text-foreground">
                  {statusLabels[status] ?? status}
                </h2>
                <span className="text-xs text-muted-foreground/50 bg-muted/50 rounded-full px-2 py-0.5">
                  {groups[status].length}
                </span>
              </div>
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {groups[status].map((item) => (
                  <motion.div key={item.id} variants={fadeUp} layout>
                    <BucketListItemCard
                      item={item}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onPriceSearch={onPriceSearch}
                      onGetStrategy={onGetStrategy}
                      onEdit={onEdit}
                      isPriceSearching={priceSearchingId === item.id}
                      isStrategyLoading={strategyLoadingId === item.id}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
