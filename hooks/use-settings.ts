/**
 * React Query hooks for Telegram settings management.
 * @module hooks/use-settings
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───────────────────────────────────────────────────────────

export interface TelegramNotificationPrefs {
  budgetBreach: boolean
  weeklyDigest: boolean
  renewalAlert: boolean
  aiInsights: boolean
  dailySummary: boolean
}

interface TelegramSettingsResponse {
  success: boolean
  linked: boolean
  username?: string
  linkedAt?: string
  notifications: TelegramNotificationPrefs
  message?: string
}

interface LinkCodeResponse {
  success: boolean
  code: string
  expiresAt: string
  message?: string
}

interface MutationResponse {
  success: boolean
  message?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

async function fetchSettings(): Promise<TelegramSettingsResponse> {
  const res = await fetch("/api/settings/telegram", { credentials: "include" })
  const data: TelegramSettingsResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch settings")
  return data
}

async function generateLinkCode(): Promise<LinkCodeResponse> {
  const res = await fetch("/api/settings/telegram", {
    method: "POST",
    credentials: "include",
  })
  const data: LinkCodeResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to generate link code")
  return data
}

async function unlinkTelegram(): Promise<MutationResponse> {
  const res = await fetch("/api/settings/telegram", {
    method: "DELETE",
    credentials: "include",
  })
  const data: MutationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to unlink")
  return data
}

async function updateNotificationPrefs(
  notifications: Partial<TelegramNotificationPrefs>
): Promise<MutationResponse> {
  const res = await fetch("/api/settings/telegram", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notifications }),
  })
  const data: MutationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to update preferences")
  return data
}

// ─── Hooks ──────────────────────────────────────────────────────────

const QUERY_KEY = ["telegram-settings"]

export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 60 * 1000,
    retry: 1,
  })
}

export function useLinkTelegram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: generateLinkCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useUnlinkTelegram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateNotificationPrefs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
