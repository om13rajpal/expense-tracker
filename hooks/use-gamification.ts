/**
 * React Query hooks for the gamification system.
 * @module hooks/use-gamification
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───────────────────────────────────────────────────────────

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  lastLogDate: string | null
  freezeTokens: number
  streakStartDate: string | null
}

export interface XPInfo {
  totalXP: number
  level: number
  levelName: string
  progress: number
  nextLevelXP: number | null
}

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

export interface XPEvent {
  action: string
  xp: number
  description: string
  createdAt: string
}

interface GamificationResponse {
  success: boolean
  streak: StreakInfo
  xp: XPInfo
  badges: BadgeInfo[]
  activeChallenges: ChallengeInfo[]
  recentXP: XPEvent[]
  message?: string
}

interface BadgesResponse {
  success: boolean
  badges: BadgeInfo[]
  message?: string
}

interface StreakResponse {
  success: boolean
  streak: StreakInfo
  message?: string
}

interface MutationResponse {
  success: boolean
  message?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

async function fetchGamification(): Promise<GamificationResponse> {
  const res = await fetch("/api/gamification", { credentials: "include" })
  const data: GamificationResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch gamification data")
  return data
}

async function fetchBadges(): Promise<BadgesResponse> {
  const res = await fetch("/api/gamification/badges", { credentials: "include" })
  const data: BadgesResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch badges")
  return data
}

async function fetchStreak(): Promise<StreakResponse> {
  const res = await fetch("/api/gamification/streak", { credentials: "include" })
  const data: StreakResponse = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch streak")
  return data
}

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

export function useJoinChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: joinChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}

export function useSkipChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: skipChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}

export function useStreakFreeze() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: useFreeze,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}
