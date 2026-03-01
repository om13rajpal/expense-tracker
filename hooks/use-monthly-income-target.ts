/**
 * React Query hooks for the monthly income target feature.
 * @module hooks/use-monthly-income-target
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface MonthlyIncomeTargetData {
  success: boolean
  month: string
  target: number | null
  actualIncome: number
  percentage: number | null
  achieved: boolean
  status: "achieved" | "on-track" | "behind" | null
  message?: string
}

async function fetchMonthlyIncomeTarget(): Promise<MonthlyIncomeTargetData> {
  const res = await fetch("/api/monthly-income-target", { credentials: "include" })
  const data: MonthlyIncomeTargetData = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch monthly income target")
  return data
}

async function setMonthlyIncomeTarget(target: number): Promise<{ success: boolean; month: string; target: number }> {
  const res = await fetch("/api/monthly-income-target", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to set monthly income target")
  return data
}

async function deleteMonthlyIncomeTarget(): Promise<{ success: boolean; deletedCount: number }> {
  const res = await fetch("/api/monthly-income-target", {
    method: "DELETE",
    credentials: "include",
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to delete monthly income target")
  return data
}

export function useMonthlyIncomeTarget() {
  const query = useQuery({
    queryKey: ["monthly-income-target"],
    queryFn: fetchMonthlyIncomeTarget,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  }
}

export function useSetMonthlyIncomeTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setMonthlyIncomeTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-income-target"] })
    },
  })
}

export function useDeleteMonthlyIncomeTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMonthlyIncomeTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-income-target"] })
    },
  })
}
