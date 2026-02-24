/**
 * React Query hooks for income goal CRUD and progress tracking.
 * Provides hooks to fetch the active income goal and its fiscal-year progress,
 * create or update income goals, and delete them.
 * @module hooks/use-income-goals
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───

/**
 * A single expected income source within an income goal.
 * @property name - Human-readable label for the source (e.g. "Salary", "Freelance")
 * @property expected - The expected amount from this source per period
 * @property frequency - How often this income is received (e.g. "monthly", "quarterly")
 */
export interface IncomeSource {
  name: string
  expected: number
  frequency: string
}

/**
 * One month's aggregated income data within the fiscal year progress breakdown.
 * @property month - Month identifier string (e.g. "2026-01")
 * @property total - Total income received across all sources for this month
 * @property sources - Map of source name to amount received from that source
 */
export interface MonthlyBreakdownEntry {
  month: string
  total: number
  sources: Record<string, number>
}

/**
 * Fiscal-year income progress computed from actual transaction data.
 * @property totalIncome - Cumulative income earned so far in the fiscal year
 * @property monthlyBreakdown - Per-month income totals with source-level detail
 * @property monthOverMonthGrowth - Percentage change between the two most recent months, or null if insufficient data
 * @property incomeSources - Distinct list of income source names found in transactions
 * @property fiscalYearStart - ISO date string for the start of the current fiscal year
 * @property fiscalYearEnd - ISO date string for the end of the current fiscal year
 * @property monthsWithData - Number of months that contain at least one income transaction
 */
export interface IncomeProgress {
  totalIncome: number
  monthlyBreakdown: MonthlyBreakdownEntry[]
  monthOverMonthGrowth: number | null
  incomeSources: string[]
  fiscalYearStart: string
  fiscalYearEnd: string
  monthsWithData: number
}

/**
 * A persisted income goal with server-calculated tracking fields.
 * @property id - Unique identifier for the goal document
 * @property userId - The owner of this income goal
 * @property targetAmount - The total income target to reach by the target date
 * @property targetDate - ISO date string for the goal deadline
 * @property sources - List of expected income sources contributing to this goal
 * @property createdAt - ISO timestamp of when the goal was created
 * @property updatedAt - ISO timestamp of the most recent update
 * @property percentComplete - Percentage of target amount earned so far (0-100+)
 * @property remaining - Dollar amount still needed to reach the target
 * @property monthsRemaining - Number of months left until the target date
 * @property monthlyRequired - Required monthly income to meet the goal on time
 * @property onTrack - Whether current income pace is sufficient to meet the goal
 */
export interface IncomeGoal {
  id: string
  userId: string
  targetAmount: number
  targetDate: string
  sources: IncomeSource[]
  createdAt: string
  updatedAt: string
  percentComplete: number
  remaining: number
  monthsRemaining: number
  monthlyRequired: number
  onTrack: boolean
}

/**
 * API response when fetching the income goal and progress data.
 * @property success - Whether the API call succeeded
 * @property goal - The active income goal, or null if none is set
 * @property progress - Fiscal-year income progress metrics derived from transactions
 * @property error - Optional error message from the server
 * @property message - Optional status message from the server
 */
interface IncomeGoalResponse {
  success: boolean
  goal: IncomeGoal | null
  progress: IncomeProgress
  error?: string
  message?: string
}

/**
 * API response for create, update, and delete mutation endpoints.
 * @property success - Whether the mutation succeeded
 * @property goal - The created or updated goal object (absent on delete)
 * @property error - Optional error message from the server
 * @property message - Optional status message from the server
 */
interface MutationResponse {
  success: boolean
  goal?: IncomeGoal
  error?: string
  message?: string
}

/**
 * Payload for creating or updating an income goal.
 * @property targetAmount - The total income amount to target
 * @property targetDate - ISO date string for the goal deadline
 * @property sources - Optional list of expected income sources
 */
interface SetIncomeGoalPayload {
  targetAmount: number
  targetDate: string
  sources?: IncomeSource[]
}

// ─── Fetcher ───

/**
 * Fetches the active income goal and fiscal-year progress from `GET /api/income-goals`.
 * @returns The income goal response with goal details and progress metrics
 * @throws {Error} If the API indicates failure
 */
async function fetchIncomeGoal(): Promise<IncomeGoalResponse> {
  const res = await fetch("/api/income-goals", {
    credentials: "include",
  })
  const data: IncomeGoalResponse = await res.json()
  if (!data.success) {
    throw new Error(data.error || data.message || "Failed to fetch income goal")
  }
  return data
}

// ─── Hooks ───

/** React Query cache key for income goal data. */
const QUERY_KEY = ["income-goal"]

/**
 * Fetches the active income goal and fiscal-year progress.
 * Data is considered stale after 5 minutes and retries once on failure.
 * @returns A React Query result containing `IncomeGoalResponse` with `goal` and `progress` fields
 */
export function useIncomeGoal() {
  return useQuery<IncomeGoalResponse>({
    queryKey: QUERY_KEY,
    queryFn: fetchIncomeGoal,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
  })
}

/**
 * Creates or updates an income goal via `POST /api/income-goals`.
 * Invalidates the income goal query cache on success so the UI reflects
 * the latest goal and recalculated progress metrics.
 * @returns A React Query mutation object with `mutate` and `mutateAsync` for submitting the goal
 */
export function useSetIncomeGoal() {
  const queryClient = useQueryClient()

  return useMutation<MutationResponse, Error, SetIncomeGoalPayload>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/income-goals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data: MutationResponse = await res.json()
      if (!data.success) {
        throw new Error(data.error || data.message || "Failed to save income goal")
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

/**
 * Deletes the active income goal via `DELETE /api/income-goals`.
 * Invalidates the income goal query cache on success so the UI clears
 * the goal display and shows a "no goal set" state.
 * @returns A React Query mutation object with `mutate` and `mutateAsync` for triggering deletion
 */
export function useDeleteIncomeGoal() {
  const queryClient = useQueryClient()

  return useMutation<MutationResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/income-goals", {
        method: "DELETE",
        credentials: "include",
      })
      const data: MutationResponse = await res.json()
      if (!data.success) {
        throw new Error(data.error || data.message || "Failed to delete income goal")
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
