/**
 * React Query hooks for friend profiles used in the gamification leaderboard.
 * Provides data fetching and mutations for CRUD operations on friend profiles.
 * @module hooks/use-friends
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A manually-added friend profile for leaderboard comparison.
 * @property id - Unique identifier
 * @property userId - The authenticated user who created this friend profile
 * @property name - Friend's display name
 * @property avatarColor - Hex color for the initials avatar circle
 * @property savingsRate - Savings rate as a percentage (0-100)
 * @property healthScore - Financial health score (0-100)
 * @property budgetAdherence - Budget adherence as a percentage (0-100)
 * @property createdAt - ISO timestamp of creation
 * @property updatedAt - ISO timestamp of last update
 */
export interface FriendProfile {
  id: string
  userId: string
  name: string
  avatarColor: string
  savingsRate: number
  healthScore: number
  budgetAdherence: number
  createdAt: string
  updatedAt: string
}

/**
 * API response when fetching all friend profiles.
 */
interface FriendsResponse {
  success: boolean
  friends: FriendProfile[]
  message?: string
}

/**
 * API response for single-friend create and update operations.
 */
interface FriendItemResponse {
  success: boolean
  friend: FriendProfile
  message?: string
}

/**
 * API response when deleting a friend profile.
 */
interface DeleteResponse {
  success: boolean
  deletedCount: number
  message?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

/**
 * Fetches all friend profiles from `GET /api/friends`.
 * @returns The friends response with an array of friend profiles
 * @throws {Error} If the API indicates failure
 */
async function fetchFriends(): Promise<FriendsResponse> {
  const res = await fetch("/api/friends", { credentials: "include" })
  const data: FriendsResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch friends")
  return data
}

/**
 * Creates a new friend profile via `POST /api/friends`.
 * @param payload - Friend data (name, savingsRate, healthScore, budgetAdherence, avatarColor?)
 * @returns The created friend profile with server-assigned ID
 * @throws {Error} If the API indicates failure
 */
async function createFriend(
  payload: Omit<FriendProfile, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<FriendItemResponse> {
  const res = await fetch("/api/friends", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data: FriendItemResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to create friend")
  return data
}

/**
 * Updates an existing friend profile via `PUT /api/friends`.
 * @param payload - Object with required `id` and optional fields to update
 * @returns The updated friend profile
 * @throws {Error} If the API indicates failure
 */
async function updateFriend(
  payload: Partial<FriendProfile> & { id: string }
): Promise<FriendItemResponse> {
  const res = await fetch("/api/friends", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data: FriendItemResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to update friend")
  return data
}

/**
 * Deletes a friend profile by ID via `DELETE /api/friends?id=...`.
 * @param id - The unique ID of the friend profile to delete
 * @returns Response confirming the deletion
 * @throws {Error} If the API indicates failure
 */
async function deleteFriend(id: string): Promise<DeleteResponse> {
  const res = await fetch(`/api/friends?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  })
  const data: DeleteResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to delete friend")
  return data
}

// ─── Hooks ───────────────────────────────────────────────────────────

/**
 * Fetches all friend profiles for the leaderboard.
 * Data is considered stale after 5 minutes and retries once on failure.
 *
 * @returns An object containing:
 *   - `friends` - Array of friend profiles (defaults to empty array)
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 *   - `refetch` - Function to manually trigger a re-fetch
 */
export function useFriends() {
  const query = useQuery({
    queryKey: ["friends"],
    queryFn: fetchFriends,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return {
    friends: query.data?.friends ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  }
}

/**
 * Mutation hook to create a new friend profile.
 * Invalidates the friends cache on success.
 * @returns A React Query mutation object; call `mutate(payload)` with friend data
 */
export function useCreateFriend() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] })
    },
  })
}

/**
 * Mutation hook to update an existing friend profile.
 * Invalidates the friends cache on success.
 * @returns A React Query mutation object; call `mutate(payload)` with `{ id, ...updates }`
 */
export function useUpdateFriend() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] })
    },
  })
}

/**
 * Mutation hook to delete a friend profile by ID.
 * Invalidates the friends cache on success.
 * @returns A React Query mutation object; call `mutate(id)` with the friend ID to delete
 */
export function useDeleteFriend() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] })
    },
  })
}
