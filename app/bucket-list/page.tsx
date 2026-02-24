/**
 * Bucket list page — tracks items the user wants to buy or experience.
 *
 * This is the main page for the bucket list feature at `/bucket-list`.
 * It provides a full CRUD interface for dream items with:
 * - **Summary cards** — aggregate stats (total items, completed, target, progress)
 * - **Filtering** — by status (wishlist/saving/completed) and category
 * - **Sorting** — by priority, progress, amount, date, or name
 * - **Item cards** — rich visual cards with product images, progress bars, and actions
 * - **Price search** — web-powered price lookup with image retrieval via Perplexity Sonar
 * - **AI strategy** — per-item savings strategies generated using financial context
 * - **Add/Edit dialogs** — modal forms for creating and updating items
 *
 * Authentication is required; unauthenticated users are redirected to `/login`.
 * All data operations use React Query hooks for cache management and optimistic updates.
 *
 * @module app/bucket-list/page
 */
"use client"

import * as React from "react"
import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { IconChecklist, IconPlus } from "@tabler/icons-react"

import { useAuth } from "@/hooks/use-auth"
import {
  useBucketList,
  useCreateBucketItem,
  useUpdateBucketItem,
  useDeleteBucketItem,
  usePriceSearch,
  useAiStrategy,
} from "@/hooks/use-bucket-list"
import { BucketListSummaryCards } from "@/components/bucket-list/summary-cards"
import { BucketListToolbar } from "@/components/bucket-list/toolbar"
import { BucketListItemGrid } from "@/components/bucket-list/item-grid"
import { AddItemDialog } from "@/components/bucket-list/add-item-dialog"
import { EditItemDialog } from "@/components/bucket-list/edit-item-dialog"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import type {
  BucketListCategory,
  BucketListStatus,
  BucketListItem,
} from "@/lib/types"

const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export default function BucketListPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { items, summary, isLoading } = useBucketList()
  const createItem = useCreateBucketItem()
  const updateItem = useUpdateBucketItem()
  const deleteItem = useDeleteBucketItem()
  const priceSearch = usePriceSearch()
  const aiStrategy = useAiStrategy()

  const [statusFilter, setStatusFilter] = useState<BucketListStatus | "all">(
    "all"
  )
  const [categoryFilter, setCategoryFilter] = useState<
    BucketListCategory | "all"
  >("all")
  const [sortBy, setSortBy] = useState("priority")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BucketListItem | null>(null)
  const [priceSearchingId, setPriceSearchingId] = useState<string | null>(null)
  const [strategyLoadingId, setStrategyLoadingId] = useState<string | null>(
    null
  )

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, authLoading, router])

  const filteredItems = useMemo(() => {
    let result = [...items]

    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter)
    }
    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category === categoryFilter)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return (
            (priorityOrder[a.priority] ?? 9) -
            (priorityOrder[b.priority] ?? 9)
          )
        case "progress": {
          const pA =
            a.targetAmount > 0 ? a.savedAmount / a.targetAmount : 0
          const pB =
            b.targetAmount > 0 ? b.savedAmount / b.targetAmount : 0
          return pB - pA
        }
        case "amount":
          return b.targetAmount - a.targetAmount
        case "date":
          return (a.targetDate ?? "9999").localeCompare(
            b.targetDate ?? "9999"
          )
        case "name":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return result
  }, [items, statusFilter, categoryFilter, sortBy])

  const handleCreate = useCallback(
    (data: {
      name: string
      targetAmount: number
      category: BucketListCategory
      priority: string
      targetDate?: string
      monthlyAllocation: number
      description?: string
    }) => {
      createItem.mutate(data as Partial<BucketListItem>)
    },
    [createItem]
  )

  const handleUpdate = useCallback(
    (id: string, data: Partial<BucketListItem>) => {
      updateItem.mutate({ ...data, id })
    },
    [updateItem]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteItem.mutate(id)
    },
    [deleteItem]
  )

  const handleEdit = useCallback((item: BucketListItem) => {
    setEditingItem(item)
    setEditDialogOpen(true)
  }, [])

  const handleEditSubmit = useCallback(
    (id: string, data: Partial<BucketListItem> & { addAmount?: number }) => {
      updateItem.mutate({ ...data, id })
    },
    [updateItem]
  )

  const handlePriceSearch = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      setPriceSearchingId(id)
      priceSearch.mutate(
        { itemName: item.name, itemId: id },
        { onSettled: () => setPriceSearchingId(null) }
      )
    },
    [items, priceSearch]
  )

  const handleGetStrategy = useCallback(
    (id: string) => {
      setStrategyLoadingId(id)
      aiStrategy.mutate(
        { itemId: id },
        { onSettled: () => setStrategyLoadingId(null) }
      )
    },
    [aiStrategy]
  )

  const handlePriceLookup = useCallback(
    async (query: string): Promise<number | null> => {
      try {
        const result = await priceSearch.mutateAsync({
          itemName: query,
        })
        if (result.prices.length > 0) {
          return result.prices[0].price
        }
        return null
      } catch {
        return null
      }
    },
    [priceSearch]
  )

  if (authLoading || !isAuthenticated) return null

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title="Bucket List"
          subtitle="Track and save for what you want"
        />
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <div className="@container/main flex flex-1 flex-col gap-5 p-4 md:p-6 max-w-6xl mx-auto w-full">
            {isLoading ? (
              <div className="space-y-4">
                {/* Summary skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[88px] rounded-xl" />
                  ))}
                </div>
                {/* Toolbar skeleton */}
                <Skeleton className="h-9 w-full max-w-md" />
                {/* Grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[220px] rounded-xl" />
                  ))}
                </div>
              </div>
            ) : items.length === 0 ? (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-1 flex-col items-center justify-center text-center py-20"
              >
                <div className="rounded-2xl bg-muted/50 p-6 mb-4">
                  <IconChecklist className="size-12 text-muted-foreground/40" />
                </div>
                <h2 className="text-lg font-semibold mb-1">
                  Your bucket list is empty
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Start tracking things you want to buy or experience. Get
                  price alerts and AI savings strategies.
                </p>
                <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                  <IconPlus className="size-4" />
                  Add your first bucket list item
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                {summary && <BucketListSummaryCards summary={summary} />}

                <BucketListToolbar
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  categoryFilter={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onAddClick={() => setAddDialogOpen(true)}
                />

                <BucketListItemGrid
                  items={filteredItems}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onPriceSearch={handlePriceSearch}
                  onGetStrategy={handleGetStrategy}
                  onEdit={handleEdit}
                  priceSearchingId={priceSearchingId}
                  strategyLoadingId={strategyLoadingId}
                />
              </motion.div>
            )}
          </div>
        </div>

        <AddItemDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={handleCreate}
          onPriceLookup={handlePriceLookup}
          isPriceLooking={priceSearch.isPending}
        />

        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={editingItem}
          onSubmit={handleEditSubmit}
          onPriceLookup={handlePriceLookup}
          isPriceLooking={priceSearch.isPending}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
