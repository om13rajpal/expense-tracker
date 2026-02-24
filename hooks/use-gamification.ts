/**
 * React Query hooks for the gamification system.
 * Provides data fetching for streaks, XP/levels, badges, and challenges,
 * as well as mutations for joining/skipping challenges and using streak freezes.
 * @module hooks/use-gamification
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Information about the user's daily login/activity streak.
 * @property currentStreak - Number of consecutive days the user has logged activity
 * @property longestStreak - The user's all-time longest streak in days
 * @property lastLogDate - ISO date string of the last recorded activity, or null if never logged
 * @property freezeTokens - Number of streak-freeze tokens available to protect the streak
 * @property streakStartDate - ISO date string when the current streak began, or null if no active streak
 */
export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  lastLogDate: string | null
  freezeTokens: number
  streakStartDate: string | null
}

/**
 * Experience points and leveling information for the user.
 * @property totalXP - Cumulative XP earned across all activities
 * @property level - Current numeric level derived from total XP
 * @property levelName - Human-readable name for the current level (e.g. "Budget Beginner", "Finance Guru")
 * @property progress - Percentage progress toward the next level (0-100)
 * @property nextLevelXP - XP threshold required to reach the next level, or null if at max level
 */
export interface XPInfo {
  totalXP: number
  level: number
  levelName: string
  progress: number
  nextLevelXP: number | null
}

/**
 * A single achievement badge that the user can unlock.
 * @property id - Unique badge identifier
 * @property name - Display name of the badge (e.g. "First Transaction", "Budget Master")
 * @property description - How the badge is earned, shown in the badge detail view
 * @property icon - Emoji or icon identifier for visual display
 * @property category - Grouping category (e.g. "streaks", "spending", "savings")
 * @property condition - Machine-readable condition string defining the unlock criteria
 * @property unlocked - Whether the user has earned this badge
 * @property unlockedAt - ISO timestamp of when the badge was unlocked, or null if still locked
 * @property notified - Whether the user has been shown the unlock notification for this badge
 */
export interface BadgeInfo {
  id: string
  name: string
  description: string
  icon: string
  category: string
  condition: string
  unlocked: boolean
  unlockedAt: string | null
  notified: boolean
}

/**
 * An active or available challenge the user can participate in.
 * @property challengeId - Unique identifier for the challenge definition
 * @property name - Display name of the challenge (e.g. "No Spend Weekend")
 * @property description - Detailed explanation of the challenge objective
 * @property target - Numeric target value to complete the challenge
 * @property current - The user's current progress toward the target
 * @property progress - Percentage completion (0-100)
 * @property status - Current challenge state (e.g. "available", "active", "completed", "failed")
 * @property xpReward - XP points awarded upon successful completion
 */
export interface ChallengeInfo {
  challengeId: string
  name: string
  description: string
  target: number
  current: number
  progress: number
  status: string
  xpReward: number
}

/**
 * A single XP earning event in the user's activity history.
 * @property action - The type of action that earned XP (e.g. "log_transaction", "complete_challenge")
 * @property xp - Number of XP points earned from this event
 * @property description - Human-readable description of the XP event
 * @property createdAt - ISO timestamp of when the XP was earned
 */
export interface XPEvent {
  action: string
  xp: number
  description: string
  createdAt: string
}

/**
 * Complete gamification dashboard response from the API.
 * @property success - Whether the API call succeeded
 * @property streak - Current streak information
 * @property xp - XP and level information
 * @property badges - All badges (locked and unlocked)
 * @property activeChallenges - Challenges the user has joined or that are available
 * @property recentXP - Most recent XP earning events for the activity feed
 * @property message - Optional error or status message
 */
interface GamificationResponse {
  success: boolean
  streak: StreakInfo
  xp: XPInfo
  badges: BadgeInfo[]
  activeChallenges: ChallengeInfo[]
  recentXP: XPEvent[]
  message?: string
}

/**
 * API response when fetching only badge data.
 * @property success - Whether the API call succeeded
 * @property badges - Array of all badge definitions with unlock status
 * @property message - Optional error or status message
 */
interface BadgesResponse {
  success: boolean
  badges: BadgeInfo[]
  message?: string
}

/**
 * API response when fetching only streak data.
 * @property success - Whether the API call succeeded
 * @property streak - Current streak information
 * @property message - Optional error or status message
 */
interface StreakResponse {
  success: boolean
  streak: StreakInfo
  message?: string
}

/**
 * Generic mutation response for gamification actions.
 * @property success - Whether the mutation succeeded
 * @property message - Optional error or status message
 */
interface MutationResponse {
  success: boolean
  message?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

/**
 * Fetches the complete gamification dashboard from `GET /api/gamification`.
 * @returns Full gamification data including streak, XP, badges, challenges, and recent activity
 * @throws {Error} If the API indicates failure
 */
async function fetchGamification(): Promise<GamificationResponse> {
  const res = await fetch("/api/gamification", { credentials: "include" })
  const data: GamificationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch gamification data")
  return data
}

/**
 * Fetches badge definitions and unlock status from `GET /api/gamification/badges`.
 * @returns All badges with their locked/unlocked state
 * @throws {Error} If the API indicates failure
 */
async function fetchBadges(): Promise<BadgesResponse> {
  const res = await fetch("/api/gamification/badges", { credentials: "include" })
  const data: BadgesResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch badges")
  return data
}

/**
 * Fetches streak data from `GET /api/gamification/streak`.
 * @returns Current and longest streak, freeze token count, and related dates
 * @throws {Error} If the API indicates failure
 */
async function fetchStreak(): Promise<StreakResponse> {
  const res = await fetch("/api/gamification/streak", { credentials: "include" })
  const data: StreakResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch streak")
  return data
}

/**
 * Enrolls the user in a challenge via `POST /api/gamification/challenges`.
 * @param challengeId - The unique ID of the challenge to join
 * @returns Mutation response confirming enrollment
 * @throws {Error} If the API indicates failure
 */
async function joinChallenge(challengeId: string): Promise<MutationResponse> {
  const res = await fetch("/api/gamification/challenges", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  })
  const data: MutationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to join challenge")
  return data
}

/**
 * Skips (dismisses) an available challenge via `PATCH /api/gamification/challenges`.
 * @param challengeId - The unique ID of the challenge to skip
 * @returns Mutation response confirming the challenge was skipped
 * @throws {Error} If the API indicates failure
 */
async function skipChallenge(challengeId: string): Promise<MutationResponse> {
  const res = await fetch("/api/gamification/challenges", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  })
  const data: MutationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to skip challenge")
  return data
}

/**
 * Consumes a streak-freeze token to protect the current streak via `POST /api/gamification/streak`.
 * @returns Mutation response confirming the freeze token was applied
 * @throws {Error} If the API indicates failure or no freeze tokens are available
 */
async function useFreeze(): Promise<MutationResponse> {
  const res = await fetch("/api/gamification/streak", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "use_freeze" }),
  })
  const data: MutationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to use freeze token")
  return data
}

// ─── Hooks ───────────────────────────────────────────────────────────

/**
 * Fetches the complete gamification dashboard including streak, XP, badges,
 * challenges, and recent XP events. Polls every 60 seconds and considers
 * data stale after 30 seconds.
 *
 * @returns An object containing:
 *   - `data` - The raw API response, or undefined while loading
 *   - `streak` - Current streak info, or null
 *   - `xp` - XP and level info, or null
 *   - `badges` - Array of all badges (defaults to empty array)
 *   - `activeChallenges` - Array of active/available challenges (defaults to empty array)
 *   - `recentXP` - Array of recent XP earning events (defaults to empty array)
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 */
export function useGamification() {
  const query = useQuery({
    queryKey: ["gamification"],
    queryFn: fetchGamification,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: 1,
  })

  return {
    data: query.data,
    streak: query.data?.streak ?? null,
    xp: query.data?.xp ?? null,
    badges: query.data?.badges ?? [],
    activeChallenges: query.data?.activeChallenges ?? [],
    recentXP: query.data?.recentXP ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}

/**
 * Fetches only badge definitions and unlock status.
 * Uses a narrower query key `["gamification", "badges"]` for independent caching.
 *
 * @returns An object containing:
 *   - `badges` - Array of all badge objects with unlock status (defaults to empty array)
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 */
export function useBadges() {
  const query = useQuery({
    queryKey: ["gamification", "badges"],
    queryFn: fetchBadges,
    staleTime: 30 * 1000,
    retry: 1,
  })

  return {
    badges: query.data?.badges ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}

/**
 * Fetches only streak data independently from the full gamification dashboard.
 * Polls every 60 seconds and uses the query key `["gamification", "streak"]`.
 *
 * @returns An object containing:
 *   - `streak` - Current streak info, or null
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 */
export function useStreak() {
  const query = useQuery({
    queryKey: ["gamification", "streak"],
    queryFn: fetchStreak,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: 1,
  })

  return {
    streak: query.data?.streak ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}

/**
 * Mutation hook to enroll the user in a gamification challenge.
 * Invalidates the entire `["gamification"]` query cache on success
 * to refresh streak, XP, and challenge data.
 *
 * @returns A React Query mutation object; call `mutate(challengeId)` to join a challenge
 */
export function useJoinChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: joinChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}

/**
 * Mutation hook to skip (dismiss) an available gamification challenge.
 * Invalidates the entire `["gamification"]` query cache on success.
 *
 * @returns A React Query mutation object; call `mutate(challengeId)` to skip a challenge
 */
export function useSkipChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: skipChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}

/**
 * Mutation hook to consume a streak-freeze token, protecting the user's
 * current streak for one missed day. Invalidates the `["gamification"]`
 * query cache on success to update the remaining freeze token count.
 *
 * @returns A React Query mutation object; call `mutate()` to use a freeze token
 */
export function useStreakFreeze() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: useFreeze,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}
