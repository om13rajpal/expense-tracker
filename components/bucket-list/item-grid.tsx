"use client"

import { AnimatePresence, motion } from "motion/react"
import { stagger, fadeUp } from "@/lib/motion"
import { BucketListItemCard } from "./item-card"
import type { BucketListItem } from "@/lib/types"

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

const statusOrder: Record<string, number> = {
  saving: 0,
  wishlist: 1,
  completed: 2,
}

const statusLabels: Record<string, string> = {
  saving: "Saving",
  wishlist: "Wishlist",
  completed: "Completed",
}

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
  // Group items by status
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
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {sortedKeys.map((status) => (
          <motion.div
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {statusLabels[status] ?? status}{" "}
              <span className="text-muted-foreground/50">
                ({groups[status].length})
              </span>
            </h2>
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
        ))}
      </AnimatePresence>
    </div>
  )
}
