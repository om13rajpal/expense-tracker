"use client"

import { useState, useMemo, useCallback } from "react"
import { motion } from "motion/react"
import Lottie from "lottie-react"
import {
  IconPlus,
  IconSearch,
  IconCoin,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconCheck,
  IconCalendar,
  IconFilter,
  IconSortAscending,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AddItemDialog } from "@/components/bucket-list/add-item-dialog"
import { EditItemDialog } from "@/components/bucket-list/edit-item-dialog"
import { ItemDetailSheet } from "@/components/bucket-list/item-detail-sheet"
import { QuickFundSheet } from "@/components/bucket-list/quick-fund-sheet"
import { CompletionCelebration } from "@/components/bucket-list/completion-celebration"
import {
  useBucketList,
  useCreateBucketItem,
  useUpdateBucketItem,
  useDeleteBucketItem,
  usePriceSearch,
  useAiStrategy,
} from "@/hooks/use-bucket-list"
import { formatINR } from "@/lib/format"
import { stagger, fadeUp, fadeUpSmall, scaleIn } from "@/lib/motion"
import type { BucketListItem } from "@/lib/types"

// ─── Config ───────────────────────────────────────────────────────────────

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

const categoryColors: Record<string, string> = {
  electronics: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  travel: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
  vehicle: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  home: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  education: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  experience: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  fashion: "bg-destructive/10 text-destructive",
  health: "bg-green-500/10 text-green-600 dark:text-green-400",
  other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: "High", color: "bg-destructive/10 text-destructive" },
  medium: { label: "Med", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  low: { label: "Low", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
}

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "electronics", label: "Electronics" },
  { value: "travel", label: "Travel" },
  { value: "vehicle", label: "Vehicle" },
  { value: "home", label: "Home" },
  { value: "education", label: "Education" },
  { value: "experience", label: "Experience" },
  { value: "fashion", label: "Fashion" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
]

const sortOptions = [
  { value: "priority", label: "Priority" },
  { value: "progress", label: "Progress" },
  { value: "amount", label: "Amount" },
  { value: "date", label: "Target Date" },
  { value: "name", label: "Name" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function getProgressGradient(pct: number): string {
  if (pct >= 75) return "from-green-500 to-lime-400"
  if (pct >= 50) return "from-yellow-500 to-amber-400"
  if (pct >= 25) return "from-orange-500 to-amber-500"
  return "from-destructive to-destructive/70"
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "No date"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

// ─── Component ────────────────────────────────────────────────────────────

export function BucketListTab() {
  // Data
  const { items, summary, isLoading, error } = useBucketList()
  const createItem = useCreateBucketItem()
  const updateItem = useUpdateBucketItem()
  const deleteItem = useDeleteBucketItem()
  const priceSearch = usePriceSearch()
  const aiStrategy = useAiStrategy()

  // Filter / sort state
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<string>("priority")

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BucketListItem | null>(null)

  // Detail state
  const [selectedItem, setSelectedItem] = useState<BucketListItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Quick fund state
  const [quickFundItem, setQuickFundItem] = useState<BucketListItem | null>(null)
  const [quickFundOpen, setQuickFundOpen] = useState(false)

  // Celebration
  const [celebrationItem, setCelebrationItem] = useState<string | null>(null)

  // Mascot animation
  const [mascotData, setMascotData] = useState<object | null>(null)

  // ─── Filtered + Sorted Items ────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let result = [...items]

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((item) => item.category === categoryFilter)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
      )
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
        case "progress": {
          const pA = a.targetAmount > 0 ? a.savedAmount / a.targetAmount : 0
          const pB = b.targetAmount > 0 ? b.savedAmount / b.targetAmount : 0
          return pB - pA
        }
        case "amount":
          return b.targetAmount - a.targetAmount
        case "date": {
          const dA = a.targetDate ? new Date(a.targetDate).getTime() : Infinity
          const dB = b.targetDate ? new Date(b.targetDate).getTime() : Infinity
          return dA - dB
        }
        case "name":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return result
  }, [items, statusFilter, categoryFilter, searchQuery, sortBy])

  // ─── Callbacks ──────────────────────────────────────────────────────────

  const handleQuickFund = useCallback((item: BucketListItem) => {
    setQuickFundItem(item)
    setQuickFundOpen(true)
  }, [])

  const handleEdit = useCallback((item: BucketListItem) => {
    setEditingItem(item)
    setEditDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      deleteItem.mutate(id)
    },
    [deleteItem]
  )

  const handleToggleComplete = useCallback(
    (item: BucketListItem) => {
      if (item.status === "completed") {
        updateItem.mutate({ id: item.id, status: "saving" })
      } else {
        updateItem.mutate(
          { id: item.id, status: "completed", savedAmount: item.targetAmount },
          {
            onSuccess: () => {
              setCelebrationItem(item.name)
            },
          }
        )
      }
    },
    [updateItem]
  )

  const handleItemClick = useCallback((item: BucketListItem) => {
    setSelectedItem(item)
    setDetailOpen(true)
  }, [])

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const activeCount = items.filter((i) => i.status === "saving").length
    const completedCount = summary?.completedItems ?? 0
    const totalTarget = summary?.totalTargetAmount ?? 0
    const totalSaved = summary?.totalSavedAmount ?? 0
    const monthlyAlloc = summary?.totalMonthlyAllocation ?? 0
    return {
      total: items.length,
      active: activeCount,
      completed: completedCount,
      totalTarget,
      totalSaved,
      monthlyAlloc,
    }
  }, [items, summary])

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-28 rounded-2xl border border-border" />
        </div>
        {/* Stats skeleton */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-32 shrink-0 rounded-2xl border border-border" />
          ))}
        </div>
        {/* Filter skeleton */}
        <Skeleton className="h-10 w-full rounded-2xl border border-border" />
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl border border-border" />
          ))}
        </div>
      </div>
    )
  }

  // ─── Empty state mascot loader ──────────────────────────────────────────

  if (filteredItems.length === 0 && !mascotData) {
    fetch("/animations/fire-mascot.json")
      .then((res) => res.json())
      .then(setMascotData)
      .catch(() => {})
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-black tracking-tight">Bucket List</h2>
          <p className="text-sm text-muted-foreground/70">
            Track and save for your dreams
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="gap-1.5 rounded-xl"
        >
          <IconPlus size={16} />
          Add Item
        </Button>
      </motion.div>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {[
          { label: "Total", value: String(stats.total), sub: "items" },
          { label: "Saving", value: String(stats.active), sub: "active" },
          { label: "Done", value: String(stats.completed), sub: "completed" },
          { label: "Target", value: formatINR(stats.totalTarget), sub: "" },
          { label: "Saved", value: formatINR(stats.totalSaved), sub: "" },
          { label: "Monthly", value: formatINR(stats.monthlyAlloc), sub: "allocation" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="shrink-0 rounded-2xl border border-border bg-card relative overflow-hidden px-4 py-2.5 min-w-[7.5rem]"
          >
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
              {stat.label}
            </p>
            <p className="text-sm font-black tracking-tight tabular-nums">{stat.value}</p>
            {stat.sub && (
              <p className="text-[10px] text-muted-foreground/70">{stat.sub}</p>
            )}
          </div>
        ))}
      </motion.div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUpSmall}
        className="flex flex-wrap items-center gap-2"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-sm rounded-xl"
          />
        </div>

        {/* Status */}
        <div className="flex rounded-xl border bg-muted/40 p-0.5">
          {["all", "saving", "wishlist", "completed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {/* Category */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-auto min-w-[140px] gap-1 rounded-xl text-xs">
            <IconFilter size={14} className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.value !== "all" && (
                  <span className="mr-1.5">{categoryEmoji[opt.value]}</span>
                )}
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-9 w-auto min-w-[120px] gap-1 rounded-xl text-xs">
            <IconSortAscending size={14} className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* ── Card Grid ───────────────────────────────────────────────────── */}
      {filteredItems.length === 0 ? (
        <motion.div
          variants={scaleIn}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          {mascotData && (
            <div className="mb-4 w-32 h-32">
              <Lottie animationData={mascotData} loop />
            </div>
          )}
          <h3 className="text-lg font-black tracking-tight">No items yet</h3>
          <p className="mt-1 text-sm text-muted-foreground/70 max-w-xs">
            {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
              ? "No items match your filters. Try adjusting your search."
              : "Start adding things you dream of owning or experiencing."}
          </p>
          {!searchQuery && statusFilter === "all" && categoryFilter === "all" && (
            <Button
              size="sm"
              className="mt-4 gap-1.5 rounded-xl"
              onClick={() => setAddDialogOpen(true)}
            >
              <IconPlus size={16} />
              Add Your First Item
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredItems.map((item) => {
            const progress =
              item.targetAmount > 0
                ? Math.min(100, Math.round((item.savedAmount / item.targetAmount) * 100))
                : 0

            return (
              <motion.div
                key={item.id}
                variants={fadeUp}
                className="rounded-2xl border border-border bg-card relative overflow-hidden p-4 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 hover:border-primary/20 cursor-pointer group flex flex-col"
                onClick={() => handleItemClick(item)}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                {/* Top: Emoji + Name + Badges */}
                <div className="flex items-start gap-3">
                  {/* Category Emoji */}
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/80 dark:bg-muted text-xl">
                    {categoryEmoji[item.category] ?? "\u{1F381}"}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <h3 className="font-black tracking-tight text-sm leading-snug truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>

                    {/* Badges row */}
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          categoryColors[item.category] ?? categoryColors.other
                        }`}
                      >
                        {item.category}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          priorityConfig[item.priority]?.color ?? priorityConfig.low.color
                        }`}
                      >
                        {priorityConfig[item.priority]?.label ?? "Low"}
                      </span>
                      {item.status === "completed" && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-lime-500/10 px-1.5 py-0.5 text-[10px] font-medium text-lime-600 dark:text-lime-400">
                          <IconCheck size={10} />
                          Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Target date */}
                {item.targetDate && (
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                    <IconCalendar size={12} />
                    <span>{formatDate(item.targetDate)}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-medium tabular-nums">{progress}%</span>
                    <span className="text-muted-foreground/70 tabular-nums">
                      {formatINR(item.savedAmount)} / {formatINR(item.targetAmount)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient(progress)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </div>
                </div>

                {/* Bottom row: monthly + actions */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[11px] text-muted-foreground/70">
                    {formatINR(item.monthlyAllocation)}/mo
                  </span>

                  <div className="flex items-center gap-0.5">
                    {/* Quick Fund */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-xl text-muted-foreground hover:text-amber-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuickFund(item)
                      }}
                    >
                      <IconCoin size={15} />
                    </Button>

                    {/* More menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-xl text-muted-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconDotsVertical size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(item)
                          }}
                        >
                          <IconEdit size={14} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleComplete(item)
                          }}
                        >
                          <IconCheck size={14} className="mr-2" />
                          {item.status === "completed" ? "Mark Active" : "Complete"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(item.id)
                          }}
                        >
                          <IconTrash size={14} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* ── Dialogs / Sheets ────────────────────────────────────────────── */}

      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => {
          createItem.mutate(data, {
            onSuccess: () => setAddDialogOpen(false),
          })
        }}
        onPriceLookup={async (query) => {
          const result = await priceSearch.mutateAsync({ itemName: query })
          const prices = result.prices ?? []
          if (prices.length === 0) return null
          const avg =
            prices.reduce((sum, p) => sum + p.price, 0) / prices.length
          return Math.round(avg)
        }}
        isPriceLooking={priceSearch.isPending}
      />

      <EditItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={editingItem}
        onSubmit={(id, data) => {
          updateItem.mutate(
            { id, ...data },
            { onSuccess: () => setEditDialogOpen(false) }
          )
        }}
        onPriceLookup={async (query) => {
          const result = await priceSearch.mutateAsync({ itemName: query })
          const prices = result.prices ?? []
          if (prices.length === 0) return null
          const avg =
            prices.reduce((sum, p) => sum + p.price, 0) / prices.length
          return Math.round(avg)
        }}
        isPriceLooking={priceSearch.isPending}
      />

      <ItemDetailSheet
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(item) => {
          setDetailOpen(false)
          handleEdit(item)
        }}
        onDelete={(id) => {
          setDetailOpen(false)
          handleDelete(id)
        }}
        onQuickFund={(id, amount) => {
          updateItem.mutate({ id, addAmount: amount })
        }}
        onPriceSearch={(id) => {
          const item = items.find((i) => i.id === id)
          if (item) priceSearch.mutate({ itemName: item.name, itemId: id })
        }}
        onAiStrategy={(id) => {
          aiStrategy.mutate({ itemId: id })
        }}
        onToggleComplete={handleToggleComplete}
        priceSearching={priceSearch.isPending}
        strategyLoading={aiStrategy.isPending}
        formatCurrency={formatINR}
      />

      <QuickFundSheet
        open={quickFundOpen}
        onOpenChange={setQuickFundOpen}
        item={quickFundItem}
        onFund={(id, amount) => {
          updateItem.mutate(
            { id, addAmount: amount },
            { onSuccess: () => setQuickFundOpen(false) }
          )
        }}
        isPending={updateItem.isPending}
      />

      <CompletionCelebration
        itemName={celebrationItem}
        onDismiss={() => setCelebrationItem(null)}
      />
    </motion.div>
  )
}
