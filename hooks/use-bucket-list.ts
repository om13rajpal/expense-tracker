/**
 * React Query hooks for the bucket list feature.
 * Provides data fetching, mutations, and cache invalidation
 * for bucket list CRUD, price search, AI strategy, and reordering.
 * @module hooks/use-bucket-list
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { BucketListItem, BucketListSummary, PerplexityPriceResult } from "@/lib/types"

// ─── Types ───────────────────────────────────────────────────────────

interface BucketListResponse {
  success: boolean
  items: BucketListItem[]
  summary: BucketListSummary
  message?: string
}

interface BucketItemResponse {
  success: boolean
  item: BucketListItem
  message?: string
}

interface DeleteResponse {
  success: boolean
  deletedCount: number
  message?: string
}

interface PriceSearchResponse {
  success: boolean
  prices: PerplexityPriceResult["prices"]
  deals: PerplexityPriceResult["deals"]
  citations: string[]
  summary: string
  cached: boolean
  message?: string
}

interface StrategyResponse {
  success: boolean
  strategy: string
  generatedAt: string
  message?: string
}

interface ReorderResponse {
  success: boolean
  modifiedCount: number
  message?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

async function fetchBucketList(): Promise<BucketListResponse> {
  const res = await fetch("/api/bucket-list", { credentials: "include" })
  const data: BucketListResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch bucket list")
  return data
}

async function createBucketItem(
  payload: Partial<BucketListItem>
): Promise<BucketItemResponse> {
  const res = await fetch("/api/bucket-list", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data: BucketItemResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to create item")
  return data
}

async function updateBucketItem(
  payload: Partial<BucketListItem> & { id: string; addAmount?: number }
): Promise<BucketItemResponse> {
  const res = await fetch("/api/bucket-list", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data: BucketItemResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to update item")
  return data
}

async function deleteBucketItem(id: string): Promise<DeleteResponse> {
  const res = await fetch(`/api/bucket-list?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  })
  const data: DeleteResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to delete item")
  return data
}

async function searchPrice(
  payload: { itemName: string; itemId?: string }
): Promise<PriceSearchResponse> {
  const res = await fetch("/api/bucket-list/price", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data: PriceSearchResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to search prices")
  return data
}

async function generateStrategy(
  payload: { itemId: string }
): Promise<StrategyResponse> {
  const res = await fetch("/api/bucket-list/strategy", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data: StrategyResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to generate strategy")
  return data
}

async function reorderItems(
  payload: { items: { id: string; sortOrder: number }[] }
): Promise<ReorderResponse> {
  const res = await fetch("/api/bucket-list/reorder", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data: ReorderResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to reorder items")
  return data
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** Fetch all bucket list items with summary stats. */
export function useBucketList() {
  const query = useQuery({
    queryKey: ["bucket-list"],
    queryFn: fetchBucketList,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return {
    data: query.data,
    items: query.data?.items ?? [],
    summary: query.data?.summary ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  }
}

/** Create a new bucket list item. Invalidates bucket-list and gamification caches. */
export function useCreateBucketItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBucketItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}

/** Update an existing bucket list item. Invalidates bucket-list and gamification caches. */
export function useUpdateBucketItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBucketItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}

/** Delete a bucket list item. Invalidates bucket-list cache. */
export function useDeleteBucketItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBucketItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
    },
  })
}

/** Search for current prices of a product via Perplexity Sonar. */
export function usePriceSearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: searchPrice,
    onSuccess: () => {
      // Refresh bucket list in case priceHistory was updated
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
    },
  })
}

/** Generate an AI savings strategy for a bucket list item. Invalidates bucket-list cache. */
export function useAiStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateStrategy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
    },
  })
}

/** Reorder bucket list items via drag-and-drop. */
export function useReorderItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
    },
  })
}
