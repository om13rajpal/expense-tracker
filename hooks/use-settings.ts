/**
 * React Query hooks for Telegram settings management.
 * Handles fetching link status, generating one-time link codes,
 * unlinking accounts, and updating notification preferences.
 * @module hooks/use-settings
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Per-feature toggle flags for Telegram push notifications.
 * Each flag controls whether the corresponding notification type
 * is forwarded to the user's linked Telegram account.
 * @property budgetBreach - Notify when spending exceeds a budget category threshold
 * @property weeklyDigest - Send a weekly spending and savings summary every Monday
 * @property renewalAlert - Warn about upcoming subscription renewals
 * @property aiInsights - Forward AI-generated financial insights
 * @property dailySummary - Send a brief end-of-day transaction summary
 */
export interface TelegramNotificationPrefs {
  budgetBreach: boolean
  weeklyDigest: boolean
  renewalAlert: boolean
  aiInsights: boolean
  dailySummary: boolean
}

/**
 * API response when fetching Telegram settings and link status.
 * @property success - Whether the API call succeeded
 * @property linked - Whether a Telegram account is currently linked
 * @property username - The linked Telegram username, if any
 * @property linkedAt - ISO timestamp of when the account was linked
 * @property notifications - Current notification preference toggles
 * @property message - Optional error or status message
 */
interface TelegramSettingsResponse {
  success: boolean
  linked: boolean
  username?: string
  linkedAt?: string
  notifications: TelegramNotificationPrefs
  message?: string
}

/**
 * API response when generating a new Telegram link code.
 * @property success - Whether the API call succeeded
 * @property code - The one-time code the user sends to the Telegram bot to link their account
 * @property expiresAt - ISO timestamp of when the link code expires
 * @property message - Optional error or status message
 */
interface LinkCodeResponse {
  success: boolean
  code: string
  expiresAt: string
  message?: string
}

/**
 * Generic mutation response for unlink and preference update operations.
 * @property success - Whether the mutation succeeded
 * @property message - Optional error or status message
 */
interface MutationResponse {
  success: boolean
  message?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

/**
 * Fetches Telegram integration settings from `GET /api/settings/telegram`.
 * @returns The settings response including link status and notification preferences
 * @throws {Error} If the API indicates failure
 */
async function fetchSettings(): Promise<TelegramSettingsResponse> {
  const res = await fetch("/api/settings/telegram", { credentials: "include" })
  const data: TelegramSettingsResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch settings")
  return data
}

/**
 * Generates a one-time Telegram link code via `POST /api/settings/telegram`.
 * The user sends this code to the Finova Telegram bot to link their account.
 * @returns The link code and its expiration timestamp
 * @throws {Error} If the API indicates failure
 */
async function generateLinkCode(): Promise<LinkCodeResponse> {
  const res = await fetch("/api/settings/telegram", {
    method: "POST",
    credentials: "include",
  })
  const data: LinkCodeResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to generate link code")
  return data
}

/**
 * Unlinks the Telegram account from the user's profile via `DELETE /api/settings/telegram`.
 * Stops all Telegram notifications and removes the association.
 * @returns Mutation response confirming the unlink
 * @throws {Error} If the API indicates failure
 */
async function unlinkTelegram(): Promise<MutationResponse> {
  const res = await fetch("/api/settings/telegram", {
    method: "DELETE",
    credentials: "include",
  })
  const data: MutationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to unlink")
  return data
}

/**
 * Updates Telegram notification preferences via `PATCH /api/settings/telegram`.
 * Accepts a partial object so individual toggles can be flipped independently.
 * @param notifications - Partial notification preferences to merge with existing settings
 * @returns Mutation response confirming the update
 * @throws {Error} If the API indicates failure
 */
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

/** React Query cache key for Telegram settings data. */
const QUERY_KEY = ["telegram-settings"]

/**
 * Fetches the current Telegram integration settings including link status
 * and notification preferences. Data is considered stale after 60 seconds.
 * @returns A React Query result containing `TelegramSettingsResponse`
 */
export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 60 * 1000,
    retry: 1,
  })
}

/**
 * Mutation hook to generate a one-time Telegram link code.
 * The returned code must be sent by the user to the Finova Telegram bot
 * within the expiry window. Invalidates Telegram settings cache on success.
 * @returns A React Query mutation object; call `mutate()` to generate a new link code
 */
export function useLinkTelegram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: generateLinkCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

/**
 * Mutation hook to unlink the Telegram account from the user's profile.
 * After unlinking, all Telegram notifications stop. Invalidates Telegram
 * settings cache on success.
 * @returns A React Query mutation object; call `mutate()` to unlink Telegram
 */
export function useUnlinkTelegram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

/**
 * Mutation hook to update individual Telegram notification preference toggles.
 * Accepts a partial preferences object so individual flags can be toggled
 * without affecting others. Invalidates Telegram settings cache on success.
 * @returns A React Query mutation object; call `mutate(prefs)` with a partial preferences object
 */
export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateNotificationPrefs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
