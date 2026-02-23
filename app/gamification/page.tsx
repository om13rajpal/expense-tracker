"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import Lottie from "lottie-react"
import {
  IconFlame,
  IconSnowflake,
  IconTrophy,
  IconStar,
  IconLock,
  IconBolt,
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
import { useGamification, useStreakFreeze } from "@/hooks/use-gamification"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { XPProgressBar } from "@/components/xp-progress-bar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { BadgeCategory } from "@/lib/gamification"

// ─── Badge icon mapping ──────────────────────────────────────────────

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string; stroke?: number }>> = {
  IconReceipt,
  IconWallet,
  IconTarget: IconTrendingUp,
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

// ─── Badge colors per category — vibrant, distinct palettes ──────────

const CATEGORY_THEME: Record<BadgeCategory, {
  label: string
  gradient: string
  iconBg: string
  iconColor: string
  glowColor: string
  ringColor: string
  accentBg: string
}> = {
  onboarding: {
    label: "Getting Started",
    gradient: "from-blue-500 to-indigo-500",
    iconBg: "bg-gradient-to-br from-blue-500/15 to-indigo-500/15",
    iconColor: "text-blue-500",
    glowColor: "shadow-blue-500/20",
    ringColor: "ring-blue-500/25",
    accentBg: "bg-blue-500/8",
  },
  milestones: {
    label: "Milestones",
    gradient: "from-amber-500 to-orange-500",
    iconBg: "bg-gradient-to-br from-amber-500/15 to-orange-500/15",
    iconColor: "text-amber-500",
    glowColor: "shadow-amber-500/20",
    ringColor: "ring-amber-500/25",
    accentBg: "bg-amber-500/8",
  },
  behavioral: {
    label: "Good Habits",
    gradient: "from-emerald-500 to-teal-500",
    iconBg: "bg-gradient-to-br from-emerald-500/15 to-teal-500/15",
    iconColor: "text-emerald-500",
    glowColor: "shadow-emerald-500/20",
    ringColor: "ring-emerald-500/25",
    accentBg: "bg-emerald-500/8",
  },
  skill: {
    label: "Skill Mastery",
    gradient: "from-violet-500 to-purple-500",
    iconBg: "bg-gradient-to-br from-violet-500/15 to-purple-500/15",
    iconColor: "text-violet-500",
    glowColor: "shadow-violet-500/20",
    ringColor: "ring-violet-500/25",
    accentBg: "bg-violet-500/8",
  },
}

const CATEGORY_ORDER: BadgeCategory[] = ["onboarding", "milestones", "behavioral", "skill"]

// ─── Level title colors ───────────────────────────────────────────────

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

// ─── Animated badge card ──────────────────────────────────────────────

function BadgeCard({
  badge,
  theme,
  index,
  onSelect,
}: {
  badge: { id: string; name: string; description: string; icon: string; unlocked: boolean; unlockedAt: string | null }
  theme: typeof CATEGORY_THEME[BadgeCategory]
  index: number
  onSelect: (id: string) => void
}) {
  const BadgeIcon = BADGE_ICONS[badge.icon] ?? IconStar
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={badge.unlocked ? { y: -4, scale: 1.03 } : { scale: 1.01 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelect(badge.id)}
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 overflow-hidden",
        badge.unlocked
          ? cn(
              "bg-card border border-border/60 shadow-sm hover:shadow-xl",
              `hover:${theme.glowColor}`,
              `hover:${theme.ringColor} hover:ring-1`,
            )
          : "bg-muted/10 border border-dashed border-border/40 opacity-50 hover:opacity-70",
      )}
    >
      {/* Shine sweep animation on hover for unlocked badges */}
      {badge.unlocked && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -skew-x-12"
            animate={isHovered ? { x: ["-100%", "200%"] } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </motion.div>
      )}

      {/* Top accent gradient bar for unlocked */}
      {badge.unlocked && (
        <div className={cn(
          "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-60",
          theme.gradient,
        )} />
      )}

      {/* Badge icon — circular with glow */}
      <div className="relative">
        {/* Outer glow ring for unlocked */}
        {badge.unlocked && (
          <motion.div
            className={cn(
              "absolute -inset-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500",
              theme.iconBg,
            )}
            animate={isHovered ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div
          className={cn(
            "relative flex items-center justify-center size-14 rounded-full transition-all duration-300",
            badge.unlocked
              ? cn(theme.iconBg, "ring-2", theme.ringColor)
              : "bg-muted/50 ring-1 ring-border/30",
          )}
        >
          {badge.unlocked ? (
            <motion.div
              animate={isHovered ? { rotate: [0, -10, 10, -5, 0] } : {}}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <BadgeIcon
                className={cn("size-7", theme.iconColor)}
                stroke={1.5}
              />
            </motion.div>
          ) : (
            <IconLock
              className="size-4 text-muted-foreground/40"
              stroke={1.5}
            />
          )}
        </div>

        {/* Sparkle indicator for unlocked */}
        {badge.unlocked && (
          <motion.div
            className="absolute -top-0.5 -right-0.5"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className={cn(
              "flex items-center justify-center size-4 rounded-full shadow-sm",
              `bg-gradient-to-br ${theme.gradient}`,
            )}>
              <IconSparkles className="size-2.5 text-white" stroke={2.5} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Badge text */}
      <div className="space-y-1 relative z-10">
        <p
          className={cn(
            "text-xs font-semibold leading-tight",
            badge.unlocked ? "text-foreground" : "text-muted-foreground/60",
          )}
        >
          {badge.name}
        </p>
        <p className={cn(
          "text-[10px] leading-relaxed",
          badge.unlocked ? "text-muted-foreground" : "text-muted-foreground/40",
        )}>
          {badge.description}
        </p>
      </div>

      {/* Unlocked date */}
      {badge.unlocked && badge.unlockedAt && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5",
          theme.accentBg, theme.iconColor,
        )}>
          <IconCalendarEvent className="size-2.5" stroke={1.5} />
          {new Date(badge.unlockedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
      )}
    </motion.div>
  )
}

// ─── Badge detail modal with Lottie celebration ───────────────────────

function BadgeDetailOverlay({
  badge,
  theme,
  lottieData,
  onClose,
}: {
  badge: { id: string; name: string; description: string; icon: string; unlocked: boolean; unlockedAt: string | null; condition: string } | null
  theme: typeof CATEGORY_THEME[BadgeCategory] | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lottieData: any
  onClose: () => void
}) {
  if (!badge || !theme) return null

  const BadgeIcon = BADGE_ICONS[badge.icon] ?? IconStar

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative bg-card rounded-2xl border border-border/60 shadow-2xl max-w-xs w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Lottie celebration for unlocked badges */}
          {badge.unlocked && lottieData && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <Lottie
                animationData={lottieData}
                loop={false}
                autoplay
                className="w-full h-full"
              />
            </div>
          )}

          {/* Top gradient */}
          <div className={cn(
            "h-24 bg-gradient-to-br flex items-center justify-center relative",
            theme.gradient,
          )}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.15 }}
              className="flex items-center justify-center size-16 rounded-full bg-white/20 backdrop-blur-sm"
            >
              <BadgeIcon className="size-9 text-white" stroke={1.5} />
            </motion.div>
            {!badge.unlocked && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
                <IconLock className="size-8 text-white/70" stroke={1.5} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5 text-center space-y-3">
            <div>
              <h3 className="text-base font-bold text-foreground">{badge.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
              {badge.unlocked ? (
                <>
                  <IconCircleCheck className="size-3.5 text-emerald-500" stroke={2} />
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Unlocked</span>
                  {badge.unlockedAt && (
                    <span className="text-muted-foreground/60">
                      {new Date(badge.unlockedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <IconLock className="size-3.5" stroke={1.5} />
                  <span>{badge.condition}</span>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-2 rounded-xl bg-muted/50 hover:bg-muted/80 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main page ────────────────────────────────────────────────────────

export default function GamificationPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [confettiLottie, setConfettiLottie] = useState<any>(null)
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null)

  const {
    streak,
    xp,
    badges,
    recentXP,
    isLoading,
  } = useGamification()

  const freezeMutation = useStreakFreeze()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch confetti Lottie animation for badge detail modal
  useEffect(() => {
    fetch("https://lottie.host/f8e3f5a8-80f1-4108-8a68-5e3e4e39c8f5/confetti.json")
      .then((r) => r.json())
      .then(setConfettiLottie)
      .catch(() => {})
  }, [])

  const handleBadgeSelect = useCallback((id: string) => {
    setSelectedBadge(id)
  }, [])

  const selectedBadgeData = badges.find((b) => b.id === selectedBadge)
  const selectedBadgeTheme = selectedBadgeData
    ? CATEGORY_THEME[selectedBadgeData.category as BadgeCategory]
    : null

  const currentLevel = xp?.level ?? 1
  const heroGradient = LEVEL_GRADIENTS[currentLevel] ?? LEVEL_GRADIENTS[1]

  const totalBadges = badges.length
  const unlockedBadges = badges.filter((b) => b.unlocked).length
  const badgePercent = totalBadges > 0 ? Math.round((unlockedBadges / totalBadges) * 100) : 0

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
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {/* Current Streak - prominent card */}
                <div className="card-elevated rounded-xl bg-card overflow-hidden">
                  <div className="relative p-3 sm:p-5 flex flex-col items-center text-center">
                    {(streak?.currentStreak ?? 0) > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
                    )}
                    <div className="relative">
                      <motion.div
                        className={cn(
                          "flex items-center justify-center size-10 sm:size-16 rounded-2xl mb-2 sm:mb-3",
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
                        "text-2xl sm:text-4xl font-black tabular-nums",
                        (streak?.currentStreak ?? 0) > 0
                          ? "bg-gradient-to-br from-orange-500 to-red-500 bg-clip-text text-transparent"
                          : "text-muted-foreground",
                      )}
                    >
                      {streak?.currentStreak ?? 0}
                    </motion.div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
                      Day Streak
                    </p>
                  </div>
                </div>

                {/* Longest Streak */}
                <div className="card-elevated rounded-xl bg-card p-3 sm:p-5 flex flex-col items-center text-center justify-center">
                  <div className="flex items-center justify-center size-9 sm:size-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 mb-2 sm:mb-3">
                    <IconTrophy className="size-5 sm:size-6 text-amber-500" stroke={1.5} />
                  </div>
                  <motion.div
                    variants={numberPop}
                    className="text-xl sm:text-3xl font-black tabular-nums text-foreground"
                  >
                    {streak?.longestStreak ?? 0}
                  </motion.div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
                    Best Streak
                  </p>
                </div>

                {/* Freeze Tokens */}
                <div className="card-elevated rounded-xl bg-card p-3 sm:p-5 flex flex-col items-center text-center justify-center">
                  <div className="flex items-center justify-center size-9 sm:size-12 rounded-xl bg-primary/10 mb-2 sm:mb-3">
                    <IconSnowflake className="size-5 sm:size-6 text-primary" stroke={1.5} />
                  </div>
                  <motion.div
                    variants={numberPop}
                    className="text-xl sm:text-3xl font-black tabular-nums text-primary"
                  >
                    {streak?.freezeTokens ?? 0}
                  </motion.div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
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
            {/*  3. BADGES — redesigned with animations                   */}
            {/* ────────────────────────────────────────────────────────── */}
            <motion.div variants={fadeUp}>
              <div className="space-y-6">
                {/* Badges header with progress */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15">
                      <IconTrophy className="size-4 text-amber-500" stroke={1.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Badge Collection</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {unlockedBadges} of {totalBadges} unlocked ({badgePercent}%)
                      </p>
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${badgePercent}%` }}
                        transition={{ delay: 0.3, duration: 0.6, ease: [0, 0, 0.2, 1] }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {badgePercent}%
                    </span>
                  </div>
                </div>

                {CATEGORY_ORDER.map((category) => {
                  const categoryBadges = badges.filter((b) => b.category === category)
                  if (categoryBadges.length === 0) return null
                  const theme = CATEGORY_THEME[category]
                  const unlockedCount = categoryBadges.filter((b) => b.unlocked).length

                  return (
                    <motion.div key={category} variants={fadeUpSmall} className="space-y-3">
                      {/* Category header with colored accent */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-3 w-0.5 rounded-full bg-gradient-to-b", theme.gradient)} />
                          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                            {theme.label}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-[11px] font-bold tabular-nums",
                            unlockedCount === categoryBadges.length
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground",
                          )}>
                            {unlockedCount}/{categoryBadges.length}
                          </span>
                          {unlockedCount === categoryBadges.length && (
                            <IconCircleCheck className="size-3.5 text-emerald-500" stroke={2} />
                          )}
                        </div>
                      </div>

                      {/* Badge grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {categoryBadges.map((badge, idx) => (
                          <BadgeCard
                            key={badge.id}
                            badge={badge}
                            theme={theme}
                            index={idx}
                            onSelect={handleBadgeSelect}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* ────────────────────────────────────────────────────────── */}
            {/*  4. XP HISTORY                                            */}
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

      {/* Badge detail overlay */}
      <AnimatePresence>
        {selectedBadge && selectedBadgeData && (
          <BadgeDetailOverlay
            badge={selectedBadgeData}
            theme={selectedBadgeTheme}
            lottieData={confettiLottie}
            onClose={() => setSelectedBadge(null)}
          />
        )}
      </AnimatePresence>
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
          <Skeleton className="h-8 w-8 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-muted/15 p-4 flex flex-col items-center gap-3">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-24" />
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
