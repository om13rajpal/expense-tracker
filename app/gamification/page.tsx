"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  IconFlame,
  IconSnowflake,
  IconTrophy,
  IconStar,
  IconLock,
  IconBolt,
  IconTarget,
  IconHistory,
  IconReceipt,
  IconWallet,
  IconTrendingUp,
  IconCircleCheck,
  IconNumber100Small,
  IconStarFilled,
  IconCake,
  IconShieldCheck,
  IconHammer,
  IconUmbrella,
  IconPigMoney,
  IconBrain,
  IconTags,
  IconCrown,
  IconHeartbeat,
  IconSparkles,
  IconCalendarEvent,
  IconArrowUp,
} from "@tabler/icons-react"

import { stagger, fadeUp, fadeUpSmall, scaleIn, numberPop } from "@/lib/motion"
import { useAuth } from "@/hooks/use-auth"
import { useGamification, useJoinChallenge, useSkipChallenge, useStreakFreeze } from "@/hooks/use-gamification"
import { CHALLENGES } from "@/lib/gamification"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { XPProgressBar } from "@/components/xp-progress-bar"
import { ChallengeCard } from "@/components/challenge-card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { BadgeCategory } from "@/lib/gamification"

// ─── Badge icon mapping ──────────────────────────────────────────────

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string; stroke?: number }>> = {
  IconReceipt,
  IconWallet,
  IconTarget,
  IconTrendingUp,
  IconCircleCheck,
  IconNumber100Small,
  IconStarFilled,
  IconTrophy,
  IconCake,
  IconFlame,
  IconShieldCheck,
  IconHammer,
  IconUmbrella,
  IconPigMoney,
  IconBrain,
  IconTags,
  IconCrown,
  IconHeartbeat,
}

// ─── Badge colors per category ───────────────────────────────────────

const CATEGORY_THEME: Record<BadgeCategory, {
  label: string
  iconBg: string
  iconColor: string
}> = {
  onboarding: {
    label: "Getting Started",
    iconBg: "bg-primary/10",
    iconColor: "text-foreground",
  },
  milestones: {
    label: "Milestones",
    iconBg: "bg-primary/10",
    iconColor: "text-foreground",
  },
  behavioral: {
    label: "Good Habits",
    iconBg: "bg-primary/10",
    iconColor: "text-foreground",
  },
  skill: {
    label: "Skill Mastery",
    iconBg: "bg-primary/10",
    iconColor: "text-foreground",
  },
}

const CATEGORY_ORDER: BadgeCategory[] = ["onboarding", "milestones", "behavioral", "skill"]

// ─── Level title colors (more fun as you level up) ───────────────────

const LEVEL_GRADIENTS: Record<number, string> = {
  1: "from-slate-600 to-slate-500",
  2: "from-primary/80 to-primary",
  3: "from-primary/80 to-primary",
  4: "from-primary to-primary/90",
  5: "from-primary to-primary/90",
  6: "from-primary to-primary/80",
  7: "from-primary to-primary/80",
  8: "from-amber-600 to-amber-500",
  9: "from-amber-600 to-amber-500",
  10: "from-amber-500 to-amber-400",
}

export default function GamificationPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const {
    streak,
    xp,
    badges,
    activeChallenges,
    recentXP,
    isLoading,
  } = useGamification()

  const joinMutation = useJoinChallenge()
  const skipMutation = useSkipChallenge()
  const freezeMutation = useStreakFreeze()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Available challenges that user hasn't joined
  const joinedIds = new Set(activeChallenges.map((c) => c.challengeId))
  const availableChallenges = CHALLENGES.filter((c) => !joinedIds.has(c.id))

  const currentLevel = xp?.level ?? 1
  const heroGradient = LEVEL_GRADIENTS[currentLevel] ?? LEVEL_GRADIENTS[1]

  if (authLoading) {
    return (
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader title="Achievements" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-5 p-4 md:p-6">
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!isAuthenticated) return null

  if (isLoading) {
    return (
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader title="Achievements" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-5 p-4 md:p-6">
              <GamificationLoadingSkeleton />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Achievements" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-5 p-4 md:p-6">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* ────────────────────────────────────────────────────────── */}
            {/*  1. LEVEL HERO CARD                                       */}
            {/* ────────────────────────────────────────────────────────── */}
            <motion.div variants={fadeUp}>
              <div className="card-elevated rounded-xl">
                <div className="p-5 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    {/* Level badge circle */}
                    <div className="relative shrink-0">
                      <motion.div
                        variants={scaleIn}
                        className={cn(
                          "flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br text-white font-black text-3xl shadow-lg",
                          heroGradient,
                        )}
                      >
                        {currentLevel}
                      </motion.div>
                      {/* Sparkle accent */}
                      <div className="absolute -top-1 -right-1">
                        <IconSparkles className="size-5 text-amber-400 drop-shadow-sm" stroke={2} />
                      </div>
                    </div>

                    {/* Level info + XP bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-foreground">
                          {xp?.levelName ?? "Beginner"}
                        </h2>
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <IconBolt className="size-3 mr-0.5" stroke={2.5} />
                          {(xp?.totalXP ?? 0).toLocaleString()} XP
                        </span>
                      </div>
                      <XPProgressBar
                        totalXP={xp?.totalXP ?? 0}
                        level={xp?.level ?? 1}
                        levelName={xp?.levelName ?? "Beginner"}
                        progress={xp?.progress ?? 0}
                        nextLevelXP={xp?.nextLevelXP ?? 100}
                        compact
                        className="mt-3"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ────────────────────────────────────────────────────────── */}
            {/*  2. STREAK + STATS ROW                                    */}
            {/* ────────────────────────────────────────────────────────── */}
            <motion.div variants={fadeUp}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Current Streak - prominent card */}
                <div className="card-elevated rounded-xl bg-card overflow-hidden sm:col-span-1">
                  <div className="relative p-5 flex flex-col items-center text-center">
                    {/* Background flame glow for active streaks */}
                    {(streak?.currentStreak ?? 0) > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
                    )}

                    <div className="relative">
                      {/* Animated flame container */}
                      <motion.div
                        className={cn(
                          "flex items-center justify-center size-16 rounded-2xl mb-3",
                          (streak?.currentStreak ?? 0) > 0
                            ? "bg-gradient-to-br from-primary/15 to-primary/10"
                            : "bg-muted",
                        )}
                        animate={
                          (streak?.currentStreak ?? 0) > 0
                            ? { scale: [1, 1.05, 1] }
                            : {}
                        }
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut",
                        }}
                      >
                        <IconFlame
                          className={cn(
                            "size-8",
                            (streak?.currentStreak ?? 0) > 0
                              ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                              : "text-muted-foreground",
                          )}
                          stroke={1.5}
                        />
                      </motion.div>
                    </div>

                    <motion.div
                      variants={numberPop}
                      className={cn(
                        "text-4xl font-black tabular-nums",
                        (streak?.currentStreak ?? 0) > 0
                          ? "bg-gradient-to-br from-orange-500 to-red-500 bg-clip-text text-transparent"
                          : "text-muted-foreground",
                      )}
                    >
                      {streak?.currentStreak ?? 0}
                    </motion.div>
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                      Day Streak
                    </p>
                  </div>
                </div>

                {/* Longest Streak */}
                <div className="card-elevated rounded-xl bg-card p-5 flex flex-col items-center text-center justify-center">
                  <div className="flex items-center justify-center size-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 mb-3">
                    <IconTrophy className="size-6 text-amber-500" stroke={1.5} />
                  </div>
                  <motion.div
                    variants={numberPop}
                    className="text-3xl font-black tabular-nums text-foreground"
                  >
                    {streak?.longestStreak ?? 0}
                  </motion.div>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    Best Streak
                  </p>
                </div>

                {/* Freeze Tokens */}
                <div className="card-elevated rounded-xl bg-card p-5 flex flex-col items-center text-center justify-center">
                  <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 mb-3">
                    <IconSnowflake className="size-6 text-primary" stroke={1.5} />
                  </div>
                  <motion.div
                    variants={numberPop}
                    className="text-3xl font-black tabular-nums text-primary"
                  >
                    {streak?.freezeTokens ?? 0}
                  </motion.div>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    Freeze Tokens
                  </p>
                  {(streak?.freezeTokens ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => freezeMutation.mutate()}
                      disabled={freezeMutation.isPending}
                    >
                      <IconSnowflake className="size-3 mr-1" stroke={2} />
                      {freezeMutation.isPending ? "Using..." : "Use Freeze"}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ────────────────────────────────────────────────────────── */}
            {/*  3. BADGES                                                */}
            {/* ────────────────────────────────────────────────────────── */}
            <motion.div variants={fadeUp}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/15">
                      <IconTrophy className="size-4 text-amber-500" stroke={1.5} />
                    </div>
                    <h3 className="text-sm font-semibold">Badges</h3>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {badges.filter((b) => b.unlocked).length}/{badges.length} unlocked
                  </span>
                </div>

                {CATEGORY_ORDER.map((category) => {
                  const categoryBadges = badges.filter((b) => b.category === category)
                  if (categoryBadges.length === 0) return null
                  const theme = CATEGORY_THEME[category]
                  const unlockedCount = categoryBadges.filter((b) => b.unlocked).length

                  return (
                    <motion.div key={category} variants={fadeUpSmall} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                          {theme.label}
                        </h3>
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                          {unlockedCount}/{categoryBadges.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {categoryBadges.map((badge) => {
                          const BadgeIcon = BADGE_ICONS[badge.icon] ?? IconStar

                          return (
                            <motion.div
                              key={badge.id}
                              whileHover={badge.unlocked ? { y: -2, scale: 1.02 } : {}}
                              transition={{ duration: 0.2 }}
                              className={cn(
                                "group relative flex flex-col items-center gap-2.5 rounded-xl p-4 text-center transition-all duration-300",
                                badge.unlocked
                                  ? "card-elevated bg-card hover:shadow-lg"
                                  : "bg-muted/20 border border-dashed border-border/50 opacity-60",
                              )}
                            >
                              {/* Badge icon container with glow for unlocked */}
                              <div className="relative">
                                <div
                                  className={cn(
                                    "flex items-center justify-center size-12 rounded-xl transition-all duration-300",
                                    badge.unlocked
                                      ? cn(theme.iconBg, "ring-1 ring-border")
                                      : "bg-muted ring-1 ring-border/40",
                                  )}
                                >
                                  {badge.unlocked ? (
                                    <BadgeIcon
                                      className={cn("size-6", theme.iconColor)}
                                      stroke={1.5}
                                    />
                                  ) : (
                                    <IconLock
                                      className="size-4 text-muted-foreground/50"
                                      stroke={1.5}
                                    />
                                  )}
                                </div>
                                {/* Unlocked glow effect */}
                                {badge.unlocked && (
                                  <div
                                    className="absolute inset-0 rounded-xl bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md -z-10"
                                  />
                                )}
                              </div>

                              {/* Badge text */}
                              <div className="space-y-0.5">
                                <p
                                  className={cn(
                                    "text-xs font-semibold leading-tight",
                                    badge.unlocked
                                      ? "text-foreground"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {badge.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  {badge.description}
                                </p>
                              </div>

                              {/* Unlocked date */}
                              {badge.unlocked && badge.unlockedAt && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <IconCalendarEvent className="size-2.5" stroke={1.5} />
                                  {new Date(badge.unlockedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* ────────────────────────────────────────────────────────── */}
            {/*  4. CHALLENGES                                            */}
            {/* ────────────────────────────────────────────────────────── */}
            <motion.div variants={fadeUp}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-primary/15 to-emerald-500/15">
                      <IconTarget className="size-4 text-primary" stroke={1.5} />
                    </div>
                    <h3 className="text-sm font-semibold">Monthly Challenges</h3>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {activeChallenges.length}/{CHALLENGES.length} active
                  </span>
                </div>

                {activeChallenges.length === 0 && availableChallenges.length === 0 && (
                  <div className="card-elevated rounded-xl bg-card overflow-hidden">
                    <div className="bg-gradient-to-br from-primary/5 via-blue-500/5 to-violet-500/5">
                      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150" />
                          <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-5">
                            <IconTarget className="h-8 w-8 text-primary" stroke={1.5} />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No challenges yet</p>
                        <p className="text-xs text-muted-foreground">Join a challenge below to start tracking progress!</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Active / completed challenges first */}
                  {activeChallenges.map((ch) => (
                    <ChallengeCard
                      key={ch.challengeId}
                      {...ch}
                      joined
                      onSkip={(id) => skipMutation.mutate(id)}
                      isSkipping={skipMutation.isPending}
                    />
                  ))}
                  {/* Available challenges */}
                  {availableChallenges.map((ch) => (
                    <ChallengeCard
                      key={ch.id}
                      challengeId={ch.id}
                      name={ch.name}
                      description={ch.description}
                      target={ch.target}
                      current={0}
                      progress={0}
                      xpReward={ch.xpReward}
                      status="available"
                      joined={false}
                      onJoin={(id) => joinMutation.mutate(id)}
                      isJoining={joinMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ────────────────────────────────────────────────────────── */}
            {/*  5. XP HISTORY                                            */}
            {/* ────────────────────────────────────────────────────────── */}
            <motion.div variants={fadeUp}>
              <div className="card-elevated rounded-xl bg-card overflow-hidden">
                <div className="p-5 pb-0">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500/15 to-yellow-500/15">
                      <IconHistory className="size-4 text-amber-500" stroke={1.5} />
                    </div>
                    <h3 className="text-sm font-semibold">Recent XP</h3>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  {recentXP.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted/40 mb-3">
                        <IconBolt className="h-6 w-6 text-muted-foreground/40" stroke={1.5} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No XP events yet. Start logging expenses!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {recentXP.map((event, i) => (
                        <motion.div
                          key={`${event.createdAt}-${i}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.04 + i * 0.03, duration: 0.25 }}
                          className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 shrink-0">
                              <IconBolt className="size-3.5 text-amber-500" stroke={2} />
                            </div>
                            <span className="truncate text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                              {event.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 ml-4">
                            <span className="inline-flex items-center gap-0.5 font-bold text-sm text-amber-600 dark:text-amber-400">
                              <IconArrowUp className="size-3" stroke={2.5} />
                              {event.xp} XP
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {new Date(event.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────────

function GamificationLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="card-elevated rounded-xl">
        <div className="p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Skeleton className="size-20 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Streak row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-elevated rounded-xl bg-card p-5 flex flex-col items-center">
            <Skeleton className="size-12 rounded-xl mb-3" />
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Badges skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted/20 p-4 flex flex-col items-center gap-2.5">
              <Skeleton className="size-12 rounded-xl" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Challenges skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-elevated rounded-xl bg-card p-5 space-y-3">
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* XP History skeleton */}
      <div className="card-elevated rounded-xl bg-card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
