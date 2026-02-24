/**
 * React Query hook for the notification system.
 * Polls for new notifications every 60 s and provides mark-read / delete mutations.
 * @module hooks/use-notifications
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A single user notification record from the database.
 * @property _id - MongoDB document identifier
 * @property userId - The owner of this notification
 * @property type - Notification category (e.g. "budget_breach", "renewal_alert")
 * @property title - Short headline displayed in the notification list
 * @property message - Full notification body text
 * @property severity - Visual severity level that controls icon and color treatment
 * @property read - Whether the user has marked this notification as read
 * @property actionUrl - Optional deep-link URL the user is taken to on click
 * @property dedupKey - Optional key used to prevent duplicate notifications for the same event
 * @property createdAt - ISO 8601 timestamp of when the notification was created
 */
export interface Notification {
  _id: string
  userId: string
  type: string
  title: string
  message: string
  severity: "critical" | "warning" | "info" | "success"
  read: boolean
  actionUrl?: string
  dedupKey?: string
  createdAt: string
}

/**
 * API response shape when fetching the notification list.
 * @property success - Whether the API call succeeded
 * @property notifications - Array of notification objects
 * @property message - Optional error or status message from the server
 */
interface NotificationsResponse {
  success: boolean
  notifications: Notification[]
  message?: string
}

/**
 * API response shape for mark-read and delete mutation endpoints.
 * @property success - Whether the mutation succeeded
 * @property modified - Number of notifications that were modified (mark-read)
 * @property deleted - Whether the targeted notification was deleted
 * @property message - Optional error or status message from the server
 */
interface MutationResponse {
  success: boolean
  modified?: number
  deleted?: boolean
  message?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

/**
 * Fetches all notifications for the current user from `GET /api/notifications`.
 * @returns The notifications response including the full notification array
 * @throws {Error} If the API indicates failure via `success: false`
 */
async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await fetch("/api/notifications", { credentials: "include" })
  const data: NotificationsResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch notifications")
  return data
}

/**
 * Marks one or more notifications as read via `PATCH /api/notifications`.
 * Can target specific IDs or mark all notifications read at once.
 * @param body - Either `{ ids: string[] }` for specific notifications or `{ markAllRead: true }` for all
 * @returns The mutation response with the count of modified documents
 * @throws {Error} If the API indicates failure
 */
async function markRead(body: { ids?: string[]; markAllRead?: boolean }): Promise<MutationResponse> {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data: MutationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to mark as read")
  return data
}

/**
 * Permanently deletes a single notification via `DELETE /api/notifications?id=...`.
 * @param id - The MongoDB `_id` of the notification to remove
 * @returns The mutation response confirming deletion
 * @throws {Error} If the API indicates failure
 */
async function deleteNotification(id: string): Promise<MutationResponse> {
  const res = await fetch(`/api/notifications?id=${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  const data: MutationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to delete notification")
  return data
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * Manages the notification list, unread count, and CRUD operations.
 * Polls the server every 60 seconds and considers data stale after 30 seconds.
 *
 * @returns An object containing:
 *   - `notifications` - Array of all notification objects for the current user
 *   - `unreadCount` - Number of notifications where `read` is false
 *   - `isLoading` - True during the initial fetch
 *   - `error` - Error message string if the fetch failed, otherwise null
 *   - `markAsRead(ids)` - Marks specific notification IDs as read
 *   - `markAllRead()` - Marks every notification as read in a single call
 *   - `deleteNotification(id)` - Permanently removes a notification by ID
 *   - `isMarkingRead` - True while a mark-read mutation is in flight
 *   - `isDeleting` - True while a delete mutation is in flight
 */
export function useNotifications() {
  const queryClient = useQueryClient()
  const queryKey = ["notifications"]

  const query = useQuery({
    queryKey,
    queryFn: fetchNotifications,
    refetchInterval: 60 * 1000, // poll every 60 seconds
    staleTime: 30 * 1000,
    retry: 1,
  })

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const notifications = query.data?.notifications ?? []
  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    markAsRead: (ids: string[]) => markReadMutation.mutate({ ids }),
    markAllRead: () => markReadMutation.mutate({ markAllRead: true }),
    deleteNotification: (id: string) => deleteMutation.mutate(id),
    isMarkingRead: markReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
