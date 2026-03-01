"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
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
  IconTarget,
  IconChevronRight,
  IconChevronDown,
  IconChecklist,
  IconTag,
  IconUserPlus,
  IconUsers,
  IconTrash,
  IconEdit,
} from "@tabler/icons-react"

import { stagger, fadeUp, fadeUpSmall, scaleIn, numberPop } from "@/lib/motion"
import { useAuth } from "@/hooks/use-auth"
import {
  useGamification,
  useStreakFreeze,
  useJoinChallenge,
  useSkipChallenge,
} from "@/hooks/use-gamification"
import { useFriends, useCreateFriend, useUpdateFriend, useDeleteFriend } from "@/hooks/use-friends"
import type { FriendProfile } from "@/hooks/use-friends"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
  IconChecklist,
  IconTag,
}

// ─── Badge colors per category ───────────────────────────────────────

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
    gradient: "from-lime-500 to-lime-600",
    iconBg: "bg-gradient-to-br from-lime-500/15 to-lime-600/15",
    iconColor: "text-lime-500",
    glowColor: "shadow-lime-500/20",
    ringColor: "ring-lime-500/25",
    accentBg: "bg-lime-500/8",
  },
  skill: {
    label: "Skill Mastery",
    gradient: "from-slate-500 to-slate-600",
    iconBg: "bg-gradient-to-br from-slate-500/15 to-slate-600/15",
    iconColor: "text-slate-500",
    glowColor: "shadow-muted-foreground/20",
    ringColor: "ring-slate-500/25",
    accentBg: "bg-slate-500/8",
  },
}

const CATEGORY_ORDER: BadgeCategory[] = ["onboarding", "milestones", "behavioral", "skill"]

// ─── Avatar preset colors ────────────────────────────────────────────

const AVATAR_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
]

// ─── XP Ring Component ───────────────────────────────────────────────

function XPRing({ progress, level, size = 60, mascotData }: { progress: number; level: number; size?: number; mascotData?: object | null }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg] absolute inset-0">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted/40"
          fill="none"
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-primary"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
        />
      </svg>
      {mascotData ? (
        <div className="absolute" style={{ width: size * 0.7, height: size * 0.7 }}>
          <Lottie animationData={mascotData} loop autoplay className="w-full h-full" />
        </div>
      ) : (
        <span className="absolute text-lg font-black text-foreground">{level}</span>
      )}
    </div>
  )
}

// ─── Badge Card (Showcase) ───────────────────────────────────────────

function BadgeShowcaseCard({
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

  if (!badge.unlocked) {
    // Greyed-out locked badge in showcase
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        onClick={() => onSelect(badge.id)}
        className="flex flex-col items-center gap-1.5 min-w-[72px] cursor-pointer group"
      >
        <div className="flex items-center justify-center size-12 rounded-full bg-muted/60 dark:bg-muted/40 backdrop-blur-sm ring-1 ring-border group-hover:ring-border transition-all">
          <IconLock className="size-4 text-foreground/70" stroke={1.5} />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/40 text-center leading-tight truncate max-w-[72px]">
          {badge.name}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      whileHover={{ y: -2, scale: 1.05 }}
      onClick={() => onSelect(badge.id)}
      className="flex flex-col items-center gap-1.5 min-w-[72px] cursor-pointer group"
    >
      <div className={cn(
        "relative flex items-center justify-center size-12 rounded-full transition-all duration-200",
        theme.iconBg, "ring-2", theme.ringColor,
        "group-hover:shadow-lg",
      )}>
        <BadgeIcon className={cn("size-5", theme.iconColor)} stroke={1.5} />
        <motion.div
          className="absolute -top-0.5 -right-0.5"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={cn(
            "flex items-center justify-center size-3.5 rounded-full",
            `bg-gradient-to-br ${theme.gradient}`,
          )}>
            <IconSparkles className="size-2 text-white" stroke={2.5} />
          </div>
        </motion.div>
      </div>
      <span className="text-[10px] font-semibold text-foreground text-center leading-tight truncate max-w-[72px]">
        {badge.name}
      </span>
    </motion.div>
  )
}

// ─── Badge Card (Full Grid) ──────────────────────────────────────────

function BadgeCard({
  badge,
  theme,
  index,
  onSelect,
  compact = false,
}: {
  badge: { id: string; name: string; description: string; icon: string; unlocked: boolean; unlockedAt: string | null }
  theme: typeof CATEGORY_THEME[BadgeCategory]
  index: number
  onSelect: (id: string) => void
  compact?: boolean
}) {
  const BadgeIcon = BADGE_ICONS[badge.icon] ?? IconStar

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.02, duration: 0.2 }}
        onClick={() => onSelect(badge.id)}
        className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/50 px-3 py-2.5 cursor-pointer hover:bg-muted/30 hover:border-border/70 transition-all"
      >
        <div className="flex items-center justify-center size-8 rounded-xl bg-muted/60 dark:bg-muted/40 backdrop-blur-sm shrink-0">
          <IconLock className="size-3.5 text-foreground/70" stroke={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground/50 truncate">{badge.name}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -4, scale: 1.03 }}
      onClick={() => onSelect(badge.id)}
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 overflow-hidden",
        "bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm hover:shadow-xl",
      )}
    >
      <div className={cn(
        "absolute inset-0 pointer-events-none bg-gradient-to-br to-transparent",
        theme.gradient.includes("blue") ? "from-blue-500/5" :
        theme.gradient.includes("amber") ? "from-amber-500/5" :
        theme.gradient.includes("lime") ? "from-lime-500/5" :
        "from-muted/5",
      )} />

      <div className="relative">
        <div className={cn(
          "relative flex items-center justify-center size-14 rounded-full transition-all duration-300",
          theme.iconBg, "ring-2", theme.ringColor,
        )}>
          <BadgeIcon className={cn("size-7", theme.iconColor)} stroke={1.5} />
        </div>
        <motion.div
          className="absolute -top-0.5 -right-0.5"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={cn(
            "flex items-center justify-center size-4.5 rounded-full shadow-sm",
            `bg-gradient-to-br ${theme.gradient}`,
          )}>
            <IconSparkles className="size-2.5 text-white" stroke={2.5} />
          </div>
        </motion.div>
      </div>

      <div className="space-y-1 relative z-10">
        <p className="text-xs font-semibold leading-tight text-foreground">{badge.name}</p>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{badge.description}</p>
      </div>

      {badge.unlockedAt && (
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

// ─── Badge detail modal ─────────────────────────────────────────────

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
          className="relative bg-card/90 backdrop-blur-2xl rounded-2xl border border-border/50 shadow-2xl max-w-xs w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {badge.unlocked && lottieData && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <Lottie animationData={lottieData} loop={false} autoplay className="w-full h-full" />
            </div>
          )}

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

          <div className="p-5 text-center space-y-3">
            <div>
              <h3 className="text-base font-black tracking-tight text-foreground">{badge.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
              {badge.unlocked ? (
                <>
                  <IconCircleCheck className="size-3.5 text-lime-500" stroke={2} />
                  <span className="font-medium text-lime-600 dark:text-lime-400">Unlocked</span>
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
              className="w-full mt-2 rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl hover:bg-muted/80 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Add/Edit Friend Dialog ──────────────────────────────────────────

function FriendDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  editFriend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; avatarColor: string; savingsRate: number; healthScore: number; budgetAdherence: number }) => void
  isPending: boolean
  editFriend?: FriendProfile | null
}) {
  const [name, setName] = useState("")
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])
  const [savingsRate, setSavingsRate] = useState("")
  const [healthScore, setHealthScore] = useState("")
  const [budgetAdherence, setBudgetAdherence] = useState("")

  useEffect(() => {
    if (editFriend) {
      setName(editFriend.name)
      setAvatarColor(editFriend.avatarColor)
      setSavingsRate(String(editFriend.savingsRate))
      setHealthScore(String(editFriend.healthScore))
      setBudgetAdherence(String(editFriend.budgetAdherence))
    } else {
      setName("")
      setAvatarColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
      setSavingsRate("")
      setHealthScore("")
      setBudgetAdherence("")
    }
  }, [editFriend, open])

  const canSubmit =
    name.trim().length > 0 &&
    savingsRate !== "" && Number(savingsRate) >= 0 && Number(savingsRate) <= 100 &&
    healthScore !== "" && Number(healthScore) >= 0 && Number(healthScore) <= 100 &&
    budgetAdherence !== "" && Number(budgetAdherence) >= 0 && Number(budgetAdherence) <= 100

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      avatarColor,
      savingsRate: Number(savingsRate),
      healthScore: Number(healthScore),
      budgetAdherence: Number(budgetAdherence),
    })
  }

  const initials = name.trim()
    ? name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editFriend ? "Edit Friend" : "Add Friend"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar preview + color picker */}
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center size-14 rounded-full text-white font-bold text-lg shrink-0 transition-colors"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="friend-name" className="text-xs">Name</Label>
              <Input
                id="friend-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Friend's name"
                autoFocus
              />
            </div>
          </div>

          {/* Color selection */}
          <div className="space-y-1.5">
            <Label className="text-xs">Avatar Color</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={cn(
                    "size-7 rounded-full transition-all",
                    avatarColor === color
                      ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                      : "hover:scale-105 opacity-60 hover:opacity-100",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="friend-savings" className="text-xs">Savings Rate %</Label>
              <Input
                id="friend-savings"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={savingsRate}
                onChange={(e) => setSavingsRate(e.target.value)}
                placeholder="0-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="friend-health" className="text-xs">Health Score</Label>
              <Input
                id="friend-health"
                type="number"
                min="0"
                max="100"
                step="1"
                value={healthScore}
                onChange={(e) => setHealthScore(e.target.value)}
                placeholder="0-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="friend-budget" className="text-xs">Budget Adh. %</Label>
              <Input
                id="friend-budget"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={budgetAdherence}
                onChange={(e) => setBudgetAdherence(e.target.value)}
                placeholder="0-100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isPending ? "Saving..." : editFriend ? "Update" : "Add Friend"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Score indicator dot ─────────────────────────────────────────────

function ScoreDot({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-lime-500" :
    value >= 60 ? "bg-amber-500" :
    value >= 40 ? "bg-orange-500" :
    "bg-destructive"
  return <span className={cn("inline-block size-2 rounded-full", color)} />
}

// ─── Main page ────────────────────────────────────────────────────────

export default function GamificationPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, username } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [confettiLottie, setConfettiLottie] = useState<any>(null)
  const [mascotData, setMascotData] = useState<object | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null)
  const [showAllBadges, setShowAllBadges] = useState(false)
  const [friendDialogOpen, setFriendDialogOpen] = useState(false)
  const [editingFriend, setEditingFriend] = useState<FriendProfile | null>(null)

  const {
    streak,
    xp,
    badges,
    activeChallenges,
    recentXP,
    isLoading,
  } = useGamification()

  const { friends, isLoading: friendsLoading } = useFriends()
  const createFriendMutation = useCreateFriend()
  const updateFriendMutation = useUpdateFriend()
  const deleteFriendMutation = useDeleteFriend()

  const freezeMutation = useStreakFreeze()
  const joinMutation = useJoinChallenge()
  const skipMutation = useSkipChallenge()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    fetch("/animations/fire-mascot.json")
      .then((r) => r.json())
      .then((data) => {
        setConfettiLottie(data)
        setMascotData(data)
      })
      .catch(() => {})
  }, [])

  const handleBadgeSelect = useCallback((id: string) => {
    setSelectedBadge(id)
  }, [])

  const handleAddFriend = useCallback(() => {
    setEditingFriend(null)
    setFriendDialogOpen(true)
  }, [])

  const handleEditFriend = useCallback((friend: FriendProfile) => {
    setEditingFriend(friend)
    setFriendDialogOpen(true)
  }, [])

  const handleFriendSubmit = useCallback((data: { name: string; avatarColor: string; savingsRate: number; healthScore: number; budgetAdherence: number }) => {
    if (editingFriend) {
      updateFriendMutation.mutate(
        { id: editingFriend.id, ...data },
        { onSuccess: () => setFriendDialogOpen(false) }
      )
    } else {
      createFriendMutation.mutate(data, {
        onSuccess: () => setFriendDialogOpen(false),
      })
    }
  }, [editingFriend, createFriendMutation, updateFriendMutation])

  const handleDeleteFriend = useCallback((id: string) => {
    deleteFriendMutation.mutate(id)
  }, [deleteFriendMutation])

  const selectedBadgeData = badges.find((b) => b.id === selectedBadge)
  const selectedBadgeTheme = selectedBadgeData
    ? CATEGORY_THEME[selectedBadgeData.category as BadgeCategory]
    : null

  const currentLevel = xp?.level ?? 1
  const totalBadges = badges.length
  const unlockedBadges = badges.filter((b) => b.unlocked)
  const lockedBadges = badges.filter((b) => !b.unlocked)
  const badgePercent = totalBadges > 0 ? Math.round((unlockedBadges.length / totalBadges) * 100) : 0

  // Group unlocked badges by category
  const unlockedByCategory = useMemo(() => {
    const map: Record<string, typeof badges> = {}
    for (const b of unlockedBadges) {
      if (!map[b.category]) map[b.category] = []
      map[b.category].push(b)
    }
    return map
  }, [unlockedBadges])

  // ─── Leaderboard: Build "You" row + sort by health score ──────────

  const myStats = useMemo(() => ({
    id: "__you__",
    name: username || "You",
    avatarColor: "#3b82f6",
    healthScore: xp?.level ? Math.min(xp.level * 10 + (xp.progress ?? 0) * 0.3, 100) : 50,
    savingsRate: 0, // will be enriched from API if available
    budgetAdherence: 0,
    isYou: true as const,
  }), [username, xp])

  const leaderboardRows = useMemo(() => {
    const rows = [
      {
        id: myStats.id,
        name: myStats.name,
        avatarColor: myStats.avatarColor,
        healthScore: Math.round(myStats.healthScore),
        savingsRate: myStats.savingsRate,
        budgetAdherence: myStats.budgetAdherence,
        isYou: true,
      },
      ...friends.map((f) => ({
        id: f.id,
        name: f.name,
        avatarColor: f.avatarColor,
        healthScore: f.healthScore,
        savingsRate: f.savingsRate,
        budgetAdherence: f.budgetAdherence,
        isYou: false,
      })),
    ]
    // Sort by health score descending
    rows.sort((a, b) => b.healthScore - a.healthScore)
    return rows
  }, [myStats, friends])

  if (authLoading || !isAuthenticated) return null

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
          <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
              <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
              <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
            </div>
            <div className="relative z-[1] @container/main flex flex-1 flex-col gap-5 p-4 md:p-6 max-w-5xl mx-auto w-full">
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
        <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
          </div>
          <div className="relative z-[1] @container/main flex flex-1 flex-col gap-5 p-4 md:p-6 max-w-5xl mx-auto w-full">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-5"
            >
              {/* ────────────────────────────────────────────────────────── */}
              {/*  A. COMPACT PROFILE ROW                                   */}
              {/* ────────────────────────────────────────────────────────── */}
              <motion.div variants={fadeUp}>
                <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl relative overflow-hidden p-4">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* XP Ring */}
                    <motion.div variants={scaleIn}>
                      <XPRing
                        progress={xp?.progress ?? 0}
                        level={currentLevel}
                        size={60}
                        mascotData={mascotData}
                      />
                    </motion.div>

                    {/* Level info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black tracking-tight text-foreground truncate">
                          {xp?.levelName ?? "Beginner"}
                        </h2>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-black tracking-tight text-primary">
                          <IconBolt className="size-3" stroke={2.5} />
                          {(xp?.totalXP ?? 0).toLocaleString()} XP
                        </span>
                      </div>
                      {xp?.nextLevelXP && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(xp.nextLevelXP - (xp.totalXP ?? 0)).toLocaleString()} XP to next level
                        </p>
                      )}
                    </div>

                    {/* Quick stat pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                        (streak?.currentStreak ?? 0) > 0
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          : "bg-muted/50 text-muted-foreground",
                      )}>
                        <IconFlame className="size-3.5" stroke={2} />
                        {streak?.currentStreak ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 text-xs font-medium">
                        <IconTrophy className="size-3.5" stroke={2} />
                        {unlockedBadges.length}/{totalBadges}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2.5 py-1 text-xs font-medium">
                        <IconSnowflake className="size-3.5" stroke={2} />
                        {streak?.freezeTokens ?? 0}
                        {(streak?.freezeTokens ?? 0) > 0 && (
                          <button
                            onClick={() => freezeMutation.mutate()}
                            disabled={freezeMutation.isPending}
                            className="ml-0.5 underline text-[10px] hover:no-underline"
                          >
                            use
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ────────────────────────────────────────────────────────── */}
              {/*  B. ACTIVE CHALLENGES                                     */}
              {/* ────────────────────────────────────────────────────────── */}
              {activeChallenges.length > 0 && (
                <motion.div variants={fadeUp}>
                  <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    <div className="relative p-5">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="flex items-center justify-center size-9 rounded-xl bg-orange-500/15">
                          <IconTarget className="size-4 text-orange-600 dark:text-orange-400" stroke={1.5} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Monthly Challenges</h3>
                          <p className="text-[11px] text-muted-foreground/70">Complete challenges to earn bonus XP</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {activeChallenges.map((challenge, i) => (
                          <motion.div
                            key={challenge.challengeId}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-black tracking-tight text-foreground">{challenge.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{challenge.description}</p>
                              </div>
                              <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-black tracking-tight text-amber-600 dark:text-amber-400">
                                <IconBolt className="size-2.5" stroke={2.5} />
                                {challenge.xpReward}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                                <motion.div
                                  className={cn(
                                    "absolute inset-y-0 left-0 rounded-full",
                                    challenge.status === "completed"
                                      ? "bg-lime-500"
                                      : "bg-gradient-to-r from-primary to-primary/80",
                                  )}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(challenge.progress, 100)}%` }}
                                  transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                  {challenge.current} / {challenge.target}
                                </span>
                                {challenge.status === "completed" ? (
                                  <span className="text-[10px] font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-0.5">
                                    <IconCircleCheck className="size-3" stroke={2} />
                                    Complete
                                  </span>
                                ) : challenge.status === "available" ? (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => joinMutation.mutate(challenge.challengeId)}
                                      disabled={joinMutation.isPending}
                                      className="text-[10px] font-semibold text-primary hover:underline"
                                    >
                                      Join
                                    </button>
                                    <button
                                      onClick={() => skipMutation.mutate(challenge.challengeId)}
                                      disabled={skipMutation.isPending}
                                      className="text-[10px] text-muted-foreground hover:underline"
                                    >
                                      Skip
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                                    {Math.round(challenge.progress)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/*  C. FRIEND LEADERBOARD                                    */}
              {/* ────────────────────────────────────────────────────────── */}
              <motion.div variants={fadeUp}>
                <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="relative p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center size-9 rounded-xl bg-blue-500/15">
                          <IconUsers className="size-4 text-blue-600 dark:text-blue-400" stroke={1.5} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Leaderboard</h3>
                          <p className="text-[11px] text-muted-foreground/70">Compare your progress with friends</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1"
                        onClick={handleAddFriend}
                      >
                        <IconUserPlus className="size-3.5" stroke={2} />
                        Add Friend
                      </Button>
                    </div>

                    {friendsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 rounded-2xl border border-border" />
                        ))}
                      </div>
                    ) : leaderboardRows.length === 1 && friends.length === 0 ? (
                      /* Only "You" row, no friends added yet */
                      <div className="text-center py-6">
                        <div className="flex items-center justify-center size-12 rounded-full bg-muted/60 dark:bg-muted/40 backdrop-blur-sm mx-auto mb-3">
                          <IconUserPlus className="size-5 text-foreground/70" stroke={1.5} />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No friends yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-3">
                          Add friends to compare savings rates, health scores, and budget adherence.
                        </p>
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleAddFriend}>
                          <IconUserPlus className="size-3.5" stroke={2} />
                          Add Your First Friend
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {/* Table header */}
                        <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_2.5rem] gap-2 px-3 pb-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                          <span>#</span>
                          <span>Name</span>
                          <span className="text-right">Health</span>
                          <span className="text-right">Savings</span>
                          <span className="text-right">Budget</span>
                          <span />
                        </div>

                        {leaderboardRows.map((row, idx) => (
                          <motion.div
                            key={row.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 + idx * 0.04, duration: 0.25 }}
                            className={cn(
                              "grid grid-cols-[2rem_1fr_5rem_5rem_5rem_2.5rem] gap-2 items-center px-3 py-2.5 rounded-xl transition-colors",
                              row.isYou
                                ? "bg-primary/5 ring-1 ring-primary/15"
                                : "hover:bg-muted/30",
                            )}
                          >
                            {/* Rank */}
                            <span className={cn(
                              "text-sm font-black tracking-tight tabular-nums",
                              idx === 0 ? "text-amber-500" :
                              idx === 1 ? "text-slate-400" :
                              idx === 2 ? "text-amber-700 dark:text-amber-600" :
                              "text-muted-foreground",
                            )}>
                              {idx + 1}
                            </span>

                            {/* Avatar + Name */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="flex items-center justify-center size-7 rounded-full text-white text-[10px] font-bold shrink-0"
                                style={{ backgroundColor: row.avatarColor }}
                              >
                                {row.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <span className={cn(
                                "text-sm truncate",
                                row.isYou ? "font-semibold text-foreground" : "text-foreground",
                              )}>
                                {row.name}
                                {row.isYou && (
                                  <span className="ml-1 text-[10px] font-medium text-primary">(you)</span>
                                )}
                              </span>
                            </div>

                            {/* Health Score */}
                            <div className="flex items-center justify-end gap-1.5">
                              <ScoreDot value={row.healthScore} />
                              <span className="text-sm font-black tracking-tight tabular-nums text-foreground">
                                {row.healthScore}
                              </span>
                            </div>

                            {/* Savings Rate */}
                            <span className="text-sm text-right tabular-nums text-muted-foreground">
                              {row.savingsRate}%
                            </span>

                            {/* Budget Adherence */}
                            <span className="text-sm text-right tabular-nums text-muted-foreground">
                              {row.budgetAdherence}%
                            </span>

                            {/* Actions (only for friends, not "You") */}
                            <div className="flex items-center justify-end">
                              {!row.isYou && (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => handleEditFriend(friends.find(f => f.id === row.id)!)}
                                    className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit"
                                  >
                                    <IconEdit className="size-3" stroke={1.5} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFriend(row.id)}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Remove"
                                  >
                                    <IconTrash className="size-3" stroke={1.5} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ────────────────────────────────────────────────────────── */}
              {/*  D. BADGE SHOWCASE                                        */}
              {/* ────────────────────────────────────────────────────────── */}
              <motion.div variants={fadeUp}>
                <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="relative p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15">
                          <IconTrophy className="size-4 text-amber-500" stroke={1.5} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Your Badges</h3>
                          <p className="text-[11px] text-muted-foreground/70">
                            {unlockedBadges.length} of {totalBadges} unlocked
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${badgePercent}%` }}
                            transition={{ delay: 0.3, duration: 0.6, ease: [0, 0, 0.2, 1] }}
                          />
                        </div>
                        <span className="text-[11px] font-black tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
                          {badgePercent}%
                        </span>
                      </div>
                    </div>

                    {/* Horizontal scrollable badge showcase */}
                    {unlockedBadges.length > 0 || lockedBadges.length > 0 ? (
                      <>
                        <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-none">
                          {/* Unlocked badges first */}
                          {unlockedBadges.map((badge, idx) => {
                            const theme = CATEGORY_THEME[badge.category as BadgeCategory] ?? CATEGORY_THEME.onboarding
                            return (
                              <BadgeShowcaseCard
                                key={badge.id}
                                badge={badge}
                                theme={theme}
                                index={idx}
                                onSelect={handleBadgeSelect}
                              />
                            )
                          })}
                          {/* Show a few locked badges at the end */}
                          {lockedBadges.slice(0, 4).map((badge, idx) => {
                            const theme = CATEGORY_THEME[badge.category as BadgeCategory] ?? CATEGORY_THEME.onboarding
                            return (
                              <BadgeShowcaseCard
                                key={badge.id}
                                badge={badge}
                                theme={theme}
                                index={unlockedBadges.length + idx}
                                onSelect={handleBadgeSelect}
                              />
                            )
                          })}
                        </div>

                        {/* View All Badges toggle */}
                        <button
                          type="button"
                          onClick={() => setShowAllBadges(!showAllBadges)}
                          className="flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:underline transition-colors"
                        >
                          {showAllBadges ? (
                            <>
                              <IconChevronDown className="size-3.5" stroke={2} />
                              Hide All Badges
                            </>
                          ) : (
                            <>
                              <IconChevronRight className="size-3.5" stroke={2} />
                              View All {totalBadges} Badges
                            </>
                          )}
                        </button>

                        {/* Expanded full badge grid */}
                        <AnimatePresence>
                          {showAllBadges && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 space-y-5">
                                {CATEGORY_ORDER.map((category) => {
                                  const categoryBadges = badges.filter(b => b.category === category)
                                  if (categoryBadges.length === 0) return null
                                  const theme = CATEGORY_THEME[category]
                                  const categoryUnlocked = categoryBadges.filter(b => b.unlocked)
                                  const categoryLocked = categoryBadges.filter(b => !b.unlocked)

                                  return (
                                    <div key={category} className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <div className={cn("h-3 w-0.5 rounded-full bg-gradient-to-b", theme.gradient)} />
                                        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                                          {theme.label}
                                        </h3>
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {categoryUnlocked.map((badge, idx) => (
                                          <BadgeCard
                                            key={badge.id}
                                            badge={badge}
                                            theme={theme}
                                            index={idx}
                                            onSelect={handleBadgeSelect}
                                          />
                                        ))}
                                        {categoryLocked.map((badge, idx) => (
                                          <BadgeCard
                                            key={badge.id}
                                            badge={badge}
                                            theme={theme}
                                            index={categoryUnlocked.length + idx}
                                            onSelect={handleBadgeSelect}
                                            compact
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="flex items-center justify-center size-12 rounded-2xl bg-muted/60 dark:bg-muted/40 backdrop-blur-sm mb-3">
                          <IconTrophy className="size-6 text-foreground/70" stroke={1.5} />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No badges yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs text-center">
                          Start using Finova to unlock your first badge. Log an expense, create a budget, or set a goal!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ────────────────────────────────────────────────────────── */}
              {/*  E. RECENT XP ACTIVITY                                    */}
              {/* ────────────────────────────────────────────────────────── */}
              <motion.div variants={fadeUp}>
                <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="relative p-5 pb-0">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="flex items-center justify-center size-8 rounded-xl bg-violet-500/15">
                        <IconHistory className="size-4 text-violet-600 dark:text-violet-400" stroke={1.5} />
                      </div>
                      <h3 className="text-sm font-semibold">Recent Activity</h3>
                    </div>
                  </div>

                  <div className="relative px-5 pb-5">
                    {recentXP.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-muted/60 dark:bg-muted/40 backdrop-blur-sm mb-3">
                          <IconBolt className="size-5 text-foreground/70" stroke={1.5} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No XP events yet. Start logging expenses!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {recentXP.slice(0, 10).map((event, i) => (
                          <motion.div
                            key={`${event.createdAt}-${i}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.04 + i * 0.03, duration: 0.25 }}
                            className="group flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-muted/40"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex items-center justify-center size-6 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 shrink-0">
                                <IconBolt className="size-3 text-amber-500" stroke={2} />
                              </div>
                              <span className="truncate text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                {event.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              <span className="inline-flex items-center gap-0.5 font-black tracking-tight text-xs text-amber-600 dark:text-amber-400">
                                <IconArrowUp className="size-2.5" stroke={2.5} />
                                {event.xp} XP
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
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

      {/* Friend dialog */}
      <FriendDialog
        open={friendDialogOpen}
        onOpenChange={setFriendDialogOpen}
        onSubmit={handleFriendSubmit}
        isPending={createFriendMutation.isPending || updateFriendMutation.isPending}
        editFriend={editingFriend}
      />
    </SidebarProvider>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────────

function GamificationLoadingSkeleton() {
  return (
    <div className="space-y-5">
      {/* Compact profile row skeleton */}
      <Skeleton className="h-[76px] rounded-2xl border border-border" />

      {/* Challenge skeleton */}
      <Skeleton className="h-[140px] rounded-2xl border border-border" />

      {/* Leaderboard skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-2xl border border-border" />
        ))}
      </div>

      {/* Badge showcase skeleton */}
      <Skeleton className="h-[140px] rounded-2xl border border-border" />

      {/* Activity skeleton */}
      <Skeleton className="h-[180px] rounded-2xl border border-border" />
    </div>
  )
}
