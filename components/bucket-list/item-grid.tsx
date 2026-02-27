"use client"

import { useCallback } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { IconLoader2, IconHeart, IconCircleCheck, IconPlus } from "@tabler/icons-react"
import { stagger, fadeUp } from "@/lib/motion"
import { useReorderItems } from "@/hooks/use-bucket-list"
import { BucketListItemCard } from "./item-card"
import type { BucketListItem } from "@/lib/types"

interface ItemGridProps {
  items: BucketListItem[]
  onUpdate: (id: string, data: Partial<BucketListItem>) => void
  onDelete: (id: string) => void
  onPriceSearch: (id: string) => void
  onGetStrategy: (id: string) => void
  onEdit: (item: BucketListItem) => void
  onQuickFund: (item: BucketListItem) => void
  onItemClick: (item: BucketListItem) => void
  priceSearchingId?: string | null
  strategyLoadingId?: string | null
  onAddClick?: () => void
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

const statusIcons: Record<string, typeof IconLoader2> = {
  saving: IconLoader2,
  wishlist: IconHeart,
  completed: IconCircleCheck,
}

const statusColors: Record<string, string> = {
  saving: "text-blue-500",
  wishlist: "text-pink-500",
  completed: "text-lime-500",
}

function SortableCard({
  item,
  ...props
}: {
  item: BucketListItem
  onUpdate: (id: string, data: Partial<BucketListItem>) => void
  onDelete: (id: string) => void
  onPriceSearch: (id: string) => void
  onGetStrategy: (id: string) => void
  onEdit: (item: BucketListItem) => void
  onQuickFund: (item: BucketListItem) => void
  onClick: (item: BucketListItem) => void
  isPriceSearching?: boolean
  isStrategyLoading?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BucketListItemCard
        item={item}
        isDragging={isDragging}
        dragHandleProps={listeners}
        {...props}
      />
    </div>
  )
}

export function BucketListItemGrid({
  items,
  onUpdate,
  onDelete,
  onPriceSearch,
  onGetStrategy,
  onEdit,
  onQuickFund,
  onItemClick,
  priceSearchingId,
  strategyLoadingId,
  onAddClick,
}: ItemGridProps) {
  const reorder = useReorderItems()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const groups = items.reduce<Record<string, BucketListItem[]>>((acc, item) => {
    const key = item.status
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const sortedKeys = Object.keys(groups).sort(
    (a, b) => (statusOrder[a] ?? 9) - (statusOrder[b] ?? 9)
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      // Find which status group both items belong to
      const activeItem = items.find((i) => i.id === active.id)
      const overItem = items.find((i) => i.id === over.id)
      if (!activeItem || !overItem || activeItem.status !== overItem.status) return

      const group = groups[activeItem.status]
      if (!group) return

      const oldIndex = group.findIndex((i) => i.id === active.id)
      const newIndex = group.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      // Compute new sort order
      const reordered = [...group]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      const reorderPayload = reordered.map((item, idx) => ({
        id: item.id,
        sortOrder: idx,
      }))

      reorder.mutate({ items: reorderPayload })
    },
    [items, groups, reorder]
  )

  return (
    <div className="space-y-8">
      <AnimatePresence mode="popLayout">
        {sortedKeys.map((status) => {
          const Icon = statusIcons[status] ?? IconLoader2
          const color = statusColors[status] ?? "text-muted-foreground"
          const groupItems = groups[status]
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Only show group headers when there are multiple status groups */}
              {sortedKeys.length > 1 && (
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`size-4 ${color}`} />
                  <h2 className="text-sm font-semibold text-foreground">
                    {statusLabels[status] ?? status}
                  </h2>
                  <span className="text-xs text-muted-foreground/50 bg-muted/50 rounded-full px-2 py-0.5">
                    {groupItems.length}
                  </span>
                </div>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={groupItems.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    <AnimatePresence>
                      {groupItems.map((item) => (
                        <motion.div key={item.id} variants={fadeUp} layout>
                          <SortableCard
                            item={item}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onPriceSearch={onPriceSearch}
                            onGetStrategy={onGetStrategy}
                            onEdit={onEdit}
                            onQuickFund={onQuickFund}
                            onClick={onItemClick}
                            isPriceSearching={priceSearchingId === item.id}
                            isStrategyLoading={strategyLoadingId === item.id}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {/* Add card placeholder -- only when less than 1 item total */}
                    {status === sortedKeys[0] && items.length < 1 && onAddClick && (
                      <motion.div variants={fadeUp}>
                        <button
                          type="button"
                          onClick={onAddClick}
                          className="w-full h-full min-h-[280px] rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-muted/20 flex flex-col items-center justify-center gap-3 transition-all duration-200 group/add"
                        >
                          <div className="flex items-center justify-center size-12 rounded-xl bg-muted/50 group-hover/add:bg-primary/10 transition-colors">
                            <IconPlus className="size-6 text-muted-foreground group-hover/add:text-primary transition-colors" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-muted-foreground group-hover/add:text-foreground transition-colors">
                              Add another dream
                            </p>
                            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                              Track something you want to save for
                            </p>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                </SortableContext>
              </DndContext>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
