/**
 * React Query hook for fetching and regenerating AI-generated financial insights.
 * Caches results for 10 minutes on the client (GC after 60 min) and supports
 * on-demand regeneration that bypasses the server-side cache.
 * @module hooks/use-ai-insights
 */
"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import type { AiInsightType, InsightSection } from "@/lib/ai-types"

/**
 * API response when fetching or regenerating an AI insight.
 * @property success - Whether the API call succeeded
 * @property content - Raw markdown/text content of the insight
 * @property sections - Structured sections with headings and bullet points, if available
 * @property structuredData - Machine-readable data extracted by the AI (charts, tables), if available
 * @property generatedAt - ISO timestamp of when the insight was generated
 * @property dataPoints - Number of transaction data points the AI analyzed to produce this insight
 * @property fromCache - Whether this response was served from the server-side cache
 * @property stale - Whether the cached insight is outdated and should be regenerated
 * @property searchContext - Web search context used by the AI, if any (queries and snippet count)
 * @property warning - Optional non-fatal warning message (e.g. limited data available)
 * @property message - Optional error message from the server
 */
interface InsightResponse {
  success: boolean
  content?: string
  sections?: InsightSection[] | null
  structuredData?: Record<string, unknown> | null
  generatedAt?: string
  dataPoints?: number
  fromCache?: boolean
  stale?: boolean
  searchContext?: { queries: string[]; snippetCount: number } | null
  warning?: string
  message?: string
}

/**
 * Shape of the object returned by the {@link useAiInsight} hook.
 * @property content - Raw markdown/text content of the insight, or null if not yet loaded
 * @property sections - Structured insight sections, or null
 * @property structuredData - Machine-readable extracted data, or null
 * @property generatedAt - ISO timestamp of generation, or null
 * @property fromCache - Whether the current data was served from server cache
 * @property stale - Whether the current cached data is outdated
 * @property isLoading - True during the initial fetch
 * @property isRegenerating - True while the regenerate mutation is in flight
 * @property error - Error message from the fetch or regeneration, or null
 * @property regenerate - Callback to trigger on-demand regeneration of the insight
 */
interface UseAiInsightReturn {
  content: string | null
  sections: InsightSection[] | null
  structuredData: Record<string, unknown> | null
  generatedAt: string | null
  fromCache: boolean
  stale: boolean
  isLoading: boolean
  isRegenerating: boolean
  error: string | null
  regenerate: () => void
}

/**
 * Fetches a cached AI insight by type from `GET /api/ai/insights?type=...`.
 * @param type - The insight category to fetch
 * @returns The insight response with content, sections, and metadata
 * @throws {Error} If the API indicates failure
 */
async function fetchInsight(type: AiInsightType): Promise<InsightResponse> {
  const response = await fetch(`/api/ai/insights?type=${type}`, {
    credentials: "include",
  })
  const data: InsightResponse = await response.json()
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch insight")
  }
  return data
}

/**
 * Forces regeneration of an AI insight via `POST /api/ai/insights`,
 * bypassing the server-side cache and re-analyzing current transaction data.
 * @param type - The insight category to regenerate
 * @returns The freshly generated insight response
 * @throws {Error} If the API indicates failure
 */
async function regenerateInsight(type: AiInsightType): Promise<InsightResponse> {
  const response = await fetch("/api/ai/insights", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  })
  const data: InsightResponse = await response.json()
  if (!data.success) {
    throw new Error(data.message || "Failed to regenerate insight")
  }
  return data
}

/**
 * Fetches a cached AI insight by type and provides a `regenerate` mutation
 * for on-demand re-analysis. Uses `keepPreviousData` so the UI remains
 * populated while new data loads, and does not refetch on window focus
 * to avoid unnecessary AI API calls.
 *
 * @param type - The insight category (e.g. `"spending_analysis"`, `"investment_insights"`,
 *   `"savings_opportunities"`, `"weekly_report"`, `"monthly_report"`)
 * @returns An object with insight content, metadata, loading states, and a regenerate callback
 */
export function useAiInsight(type: AiInsightType): UseAiInsightReturn {
  const queryClient = useQueryClient()
  const queryKey = ["ai-insight", type]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchInsight(type),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })

  const mutation = useMutation({
    mutationFn: () => regenerateInsight(type),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
    },
  })

  const data = query.data
  const queryError = query.error instanceof Error ? query.error.message : null
  const mutationError = mutation.error instanceof Error ? mutation.error.message : null

  return {
    content: data?.content ?? null,
    sections: data?.sections ?? null,
    structuredData: data?.structuredData ?? null,
    generatedAt: data?.generatedAt ?? null,
    fromCache: data?.fromCache ?? false,
    stale: data?.stale ?? false,
    isLoading: query.isLoading,
    isRegenerating: mutation.isPending,
    error: mutationError || queryError,
    regenerate: () => mutation.mutate(),
  }
}
