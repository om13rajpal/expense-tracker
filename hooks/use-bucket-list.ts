/**
 * React Query hooks for the bucket list feature.
 * Provides data fetching, mutations, and cache invalidation
 * for bucket list CRUD, price search via Perplexity Sonar,
 * AI savings strategy generation, and drag-and-drop reordering.
 * @module hooks/use-bucket-list
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { BucketListItem, BucketListSummary, PerplexityPriceResult } from "@/lib/types"

// ─── Types ───────────────────────────────────────────────────────────

/**
 * API response when fetching all bucket list items.
 * @property success - Whether the API call succeeded
 * @property items - Array of all bucket list items sorted by sortOrder
 * @property summary - Aggregated statistics (total cost, saved, remaining, etc.)
 * @property message - Optional error or status message
 */
interface BucketListResponse {
  success: boolean
  items: BucketListItem[]
  summary: BucketListSummary
  message?: string
}

/**
 * API response for single-item create and update operations.
 * @property success - Whether the mutation succeeded
 * @property item - The created or updated bucket list item
 * @property message - Optional error or status message
 */
interface BucketItemResponse {
  success: boolean
  item: BucketListItem
  message?: string
}

/**
 * API response when deleting a bucket list item.
 * @property success - Whether the deletion succeeded
 * @property deletedCount - Number of documents removed (should be 1)
 * @property message - Optional error or status message
 */
interface DeleteResponse {
  success: boolean
  deletedCount: number
  message?: string
}

/**
 * API response from the Perplexity Sonar price search endpoint.
 * @property success - Whether the price search succeeded
 * @property prices - Array of price points found across retailers
 * @property deals - Array of current deals, coupons, or discounts found
 * @property citations - Source URLs referenced by the AI for price data
 * @property summary - Human-readable summary of the price research findings
 * @property cached - Whether this result was served from the server-side price cache
 * @property message - Optional error or status message
 */
interface PriceSearchResponse {
  success: boolean
  prices: PerplexityPriceResult["prices"]
  deals: PerplexityPriceResult["deals"]
  citations: string[]
  summary: string
  cached: boolean
  message?: string
}

/**
 * API response from the AI savings strategy generation endpoint.
 * @property success - Whether the strategy generation succeeded
 * @property strategy - Markdown-formatted AI-generated savings plan for the item
 * @property generatedAt - ISO timestamp of when the strategy was generated
 * @property message - Optional error or status message
 */
interface StrategyResponse {
  success: boolean
  strategy: string
  generatedAt: string
  message?: string
}

/**
 * API response from the drag-and-drop reorder endpoint.
 * @property success - Whether the reorder operation succeeded
 * @property modifiedCount - Number of items whose sortOrder was updated
 * @property message - Optional error or status message
 */
interface ReorderResponse {
  success: boolean
  modifiedCount: number
  message?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

/**
 * Fetches all bucket list items and summary stats from `GET /api/bucket-list`.
 * @returns The bucket list response with items array and aggregated summary
 * @throws {Error} If the API indicates failure
 */
async function fetchBucketList(): Promise<BucketListResponse> {
  const res = await fetch("/api/bucket-list", { credentials: "include" })
  const data: BucketListResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch bucket list")
  return data
}

/**
 * Creates a new bucket list item via `POST /api/bucket-list`.
 * @param payload - Partial item data (name, estimatedCost, category, etc.)
 * @returns The created item with server-assigned ID and defaults
 * @throws {Error} If the API indicates failure
 */
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

/**
 * Updates an existing bucket list item via `PUT /api/bucket-list`.
 * Supports partial updates and an `addAmount` field for incrementing saved amounts.
 * @param payload - Object with required `id` and optional fields to update
 * @returns The updated item reflecting all changes
 * @throws {Error} If the API indicates failure
 */
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

/**
 * Deletes a bucket list item by ID via `DELETE /api/bucket-list?id=...`.
 * @param id - The unique ID of the item to delete
 * @returns Response confirming the deletion with count of removed documents
 * @throws {Error} If the API indicates failure
 */
async function deleteBucketItem(id: string): Promise<DeleteResponse> {
  const res = await fetch(`/api/bucket-list?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  })
  const data: DeleteResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to delete item")
  return data
}

/**
 * Searches for current market prices of a product using Perplexity Sonar AI
 * via `POST /api/bucket-list/price`. Results may be cached server-side.
 * @param payload - Object with `itemName` to search for and optional `itemId` to attach price history
 * @returns Price data including price points, deals, citations, and a summary
 * @throws {Error} If the API indicates failure
 */
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

/**
 * Generates an AI-powered savings strategy for a specific bucket list item
 * via `POST /api/bucket-list/strategy`. The strategy considers the item's
 * cost, current savings progress, and the user's financial profile.
 * @param payload - Object with the `itemId` to generate a strategy for
 * @returns The generated strategy text and timestamp
 * @throws {Error} If the API indicates failure
 */
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

/**
 * Persists a new sort order for bucket list items after drag-and-drop
 * via `PUT /api/bucket-list/reorder`.
 * @param payload - Object with an `items` array of `{ id, sortOrder }` pairs
 * @returns Response with the count of modified documents
 * @throws {Error} If the API indicates failure
 */
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

/**
 * Fetches all bucket list items with summary statistics.
 * Data is considered stale after 5 minutes and retries once on failure.
 *
 * @returns An object containing:
 *   - `data` - The raw API response, or undefined while loading
 *   - `items` - Array of bucket list items (defaults to empty array)
 *   - `summary` - Aggregated summary stats (total cost, saved, etc.), or null
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 *   - `refetch` - Function to manually trigger a re-fetch
 */
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

/**
 * Mutation hook to create a new bucket list item.
 * Invalidates both the bucket-list and gamification caches on success,
 * since adding items may award XP or progress challenge goals.
 * @returns A React Query mutation object; call `mutate(payload)` with partial item data
 */
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

/**
 * Mutation hook to update an existing bucket list item (name, cost, saved amount, status, etc.).
 * Invalidates both the bucket-list and gamification caches on success,
 * since completing items may unlock badges or award XP.
 * @returns A React Query mutation object; call `mutate(payload)` with `{ id, ...updates }`
 */
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

/**
 * Mutation hook to delete a bucket list item by ID.
 * Invalidates the bucket-list cache on success.
 * @returns A React Query mutation object; call `mutate(id)` with the item ID to delete
 */
export function useDeleteBucketItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBucketItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
    },
  })
}

/**
 * Mutation hook to search for current market prices of a product using Perplexity Sonar AI.
 * Also invalidates the bucket-list cache on success, since the server may update the
 * item's price history as a side effect of the search.
 * @returns A React Query mutation object; call `mutate({ itemName, itemId? })` to search
 */
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

/**
 * Mutation hook to generate an AI-powered savings strategy for a bucket list item.
 * The strategy considers the item's estimated cost, current savings, and the user's
 * overall financial profile. Invalidates the bucket-list cache on success.
 * @returns A React Query mutation object; call `mutate({ itemId })` to generate a strategy
 */
export function useAiStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateStrategy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
    },
  })
}

/**
 * Mutation hook to persist a new sort order for bucket list items after drag-and-drop.
 * Invalidates the bucket-list cache on success to reflect the updated order.
 * @returns A React Query mutation object; call `mutate({ items: [{ id, sortOrder }] })` to reorder
 */
export function useReorderItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] })
    },
  })
}
