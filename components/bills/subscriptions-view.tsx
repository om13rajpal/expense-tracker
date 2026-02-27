/**
 * Subscriptions & recurring bills management view.
 * Full CRUD for subscriptions with category filtering, cost summary,
 * renewal timeline, and upcoming-payment alerts.
 * @module components/bills/subscriptions-view
 */
"use client"

import * as React from "react"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  IconCreditCard,
  IconEdit,
  IconPlus,
  IconRepeat,
  IconTrash,
  IconCalendar,
  IconCurrencyRupee,
  IconPlayerPause,
  IconPlayerPlay,
  IconSearch,
  IconCheck,
  IconAlertTriangle,
  IconEye,
  IconUsers,
  IconMail,
  IconPhone,
  IconBell,
  IconX,
  IconUserPlus,
  IconDivide,
} from "@tabler/icons-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import { formatINR } from "@/lib/format"
import { TransactionCategory } from "@/lib/types"
import { stagger, fadeUp } from "@/lib/motion"

import { MetricTile } from "@/components/metric-tile"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- Popular Services (logo.dev domains + defaults) ---

const POPULAR_SERVICES = [
  { name: "Netflix", domain: "netflix.com", amount: 649, frequency: "monthly" as const, category: "Entertainment", color: "#E50914" },
  { name: "Spotify", domain: "spotify.com", amount: 119, frequency: "monthly" as const, category: "Entertainment", color: "#1DB954" },
  { name: "Apple Music", domain: "music.apple.com", amount: 99, frequency: "monthly" as const, category: "Entertainment", color: "#FA243C" },
  { name: "iCloud+", domain: "icloud.com", amount: 75, frequency: "monthly" as const, category: "Subscription", color: "#3693F3" },
  { name: "Google One", domain: "one.google.com", amount: 130, frequency: "monthly" as const, category: "Subscription", color: "#4285F4" },
  { name: "Amazon Prime", domain: "primevideo.com", amount: 1499, frequency: "yearly" as const, category: "Entertainment", color: "#00A8E1" },
  { name: "YouTube Premium", domain: "youtube.com", amount: 149, frequency: "monthly" as const, category: "Entertainment", color: "#FF0000" },
  { name: "Disney+ Hotstar", domain: "hotstar.com", amount: 299, frequency: "monthly" as const, category: "Entertainment", color: "#1A3068" },
  { name: "JioCinema", domain: "jiocinema.com", amount: 89, frequency: "monthly" as const, category: "Entertainment", color: "#E72E78" },
  { name: "Notion", domain: "notion.so", amount: 800, frequency: "monthly" as const, category: "Subscription", color: "#000000" },
  { name: "ChatGPT Plus", domain: "chatgpt.com", amount: 1700, frequency: "monthly" as const, category: "Subscription", color: "#74AA9C" },
  { name: "Claude Pro", domain: "claude.ai", amount: 1700, frequency: "monthly" as const, category: "Subscription", color: "#D4A574" },
  { name: "Adobe Creative Cloud", domain: "adobe.com", amount: 1675, frequency: "monthly" as const, category: "Subscription", color: "#FF0000" },
  { name: "Google Drive", domain: "drive.google.com", amount: 130, frequency: "monthly" as const, category: "Subscription", color: "#4285F4" },
  { name: "Microsoft 365", domain: "microsoft.com", amount: 489, frequency: "monthly" as const, category: "Subscription", color: "#0078D4" },
  { name: "Figma", domain: "figma.com", amount: 1050, frequency: "monthly" as const, category: "Subscription", color: "#F24E1E" },
  { name: "GitHub Pro", domain: "github.com", amount: 340, frequency: "monthly" as const, category: "Subscription", color: "#24292F" },
  { name: "LinkedIn Premium", domain: "linkedin.com", amount: 1500, frequency: "monthly" as const, category: "Subscription", color: "#0A66C2" },
]

// Build a lookup: lowercase name -> service info
const SERVICE_LOOKUP = new Map(
  POPULAR_SERVICES.map((s) => [s.name.toLowerCase(), s])
)

// Also build partial match aliases
const SERVICE_ALIASES: Record<string, string> = {
  netflix: "netflix.com",
  spotify: "spotify.com",
  "apple music": "music.apple.com",
  icloud: "icloud.com",
  "icloud+": "icloud.com",
  "google one": "one.google.com",
  "google drive": "drive.google.com",
  "amazon prime": "primevideo.com",
  prime: "primevideo.com",
  "prime video": "primevideo.com",
  youtube: "youtube.com",
  "youtube premium": "youtube.com",
  "disney+": "hotstar.com",
  "disney+ hotstar": "hotstar.com",
  hotstar: "hotstar.com",
  jiocinema: "jiocinema.com",
  notion: "notion.so",
  chatgpt: "chatgpt.com",
  "chatgpt plus": "chatgpt.com",
  openai: "chatgpt.com",
  claude: "claude.ai",
  "claude pro": "claude.ai",
  anthropic: "claude.ai",
  adobe: "adobe.com",
  "creative cloud": "adobe.com",
  microsoft: "microsoft.com",
  "microsoft 365": "microsoft.com",
  office: "microsoft.com",
  figma: "figma.com",
  github: "github.com",
  linkedin: "linkedin.com",
}

function getServiceDomain(name: string): string | null {
  const lower = name.toLowerCase().trim()
  // Exact match
  const service = SERVICE_LOOKUP.get(lower)
  if (service) return service.domain
  // Alias match
  if (SERVICE_ALIASES[lower]) return SERVICE_ALIASES[lower]
  // Partial match
  for (const [alias, domain] of Object.entries(SERVICE_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) return domain
  }
  return null
}

function getServiceColor(name: string): string {
  const lower = name.toLowerCase().trim()
  const service = SERVICE_LOOKUP.get(lower)
  if (service) return service.color
  // Hash-based color for unknown services
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash % 360)
  return `oklch(0.55 0.12 ${hue})`
}

const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || "pk_ajceTXQWTCGDlDmPsAhitg"

function getLogoUrl(domain: string, size: number): string {
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=${size}&format=png`
}

function ServiceLogo({ name, size = 32 }: { name: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const domain = getServiceDomain(name)

  if (!domain || imgError) {
    // Fallback: colored initial letter
    const color = getServiceColor(name)
    const initial = name.charAt(0).toUpperCase()
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg text-white font-bold"
        style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={getLogoUrl(domain, size * 2)}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="shrink-0 rounded-lg object-contain"
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  )
}

// --- Types ---

interface PaymentHistoryEntry {
  date: string
  amount: number
  transactionId?: string
  auto: boolean
  detectedAt: string
}

interface SharedMember {
  name: string
  email?: string
  phone?: string
  telegramChatId?: number
  share: number
  status: "pending" | "paid" | "overdue"
  lastPaidDate?: string
}

interface Subscription {
  _id: string
  userId: string
  name: string
  amount: number
  frequency: "monthly" | "yearly" | "weekly"
  category: string
  lastCharged: string
  nextExpected: string
  status: "active" | "cancelled" | "paused"
  autoDetected: boolean
  merchantPattern?: string
  notes?: string
  paymentHistory?: PaymentHistoryEntry[]
  // Shared subscription fields
  isShared?: boolean
  totalMembers?: number
  userShare?: number
  paidByUser?: boolean
  sharedWith?: SharedMember[]
  splitGroupId?: string
  autoCreateSplitExpense?: boolean
  createdAt: string
  updatedAt: string
}

interface LookupSuggestion {
  amount: number
  lastCharged: string
  frequency: string
  nextExpected: string
  confidence: number
  matchedMerchant: string
}

// --- Category badge colors ---

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  Subscription: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Entertainment: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Shopping: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Utilities: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Education: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Healthcare: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  Fitness: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Insurance: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Transport: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Dining: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Personal Care": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Miscellaneous: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
}

function getCategoryBadgeClass(category: string): string {
  return CATEGORY_BADGE_COLORS[category] || "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  active: { label: "Active", class: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400 border-lime-200 dark:border-lime-800" },
  paused: { label: "Paused", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  cancelled: { label: "Cancelled", class: "bg-slate-100 text-slate-500 dark:bg-slate-900/30 dark:text-slate-500 border-slate-200 dark:border-slate-800" },
}

// --- Payment Status ---

type PaymentStatus = "paid" | "due-soon" | "overdue" | "upcoming"

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; class: string }> = {
  paid: { label: "Paid", class: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400" },
  "due-soon": { label: "Due Soon", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  overdue: { label: "Overdue", class: "bg-destructive/10 text-destructive" },
  upcoming: { label: "Upcoming", class: "bg-muted text-muted-foreground" },
}

function getPaymentStatus(sub: Subscription): PaymentStatus {
  const days = daysUntil(sub.nextExpected)
  if (days < 0) return "overdue"
  if (days <= 3) return "due-soon"
  // Consider "paid" if lastCharged is within the current billing cycle
  if (sub.lastCharged) {
    const lastChargedDays = daysUntil(sub.lastCharged)
    // lastCharged is in the past, and nextExpected is in the future -- paid for this cycle
    if (lastChargedDays <= 0 && days > 3) return "paid"
  }
  return "upcoming"
}

// --- Helpers ---

function formatDate(iso: string): string {
  if (!iso) return "--"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "--"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function daysUntil(iso: string): number {
  if (!iso) return Infinity
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function normalizeToMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly": return amount * (52 / 12)
    case "yearly": return amount / 12
    default: return amount
  }
}

function frequencyLabel(freq: string): string {
  switch (freq) {
    case "weekly": return "/wk"
    case "yearly": return "/yr"
    default: return "/mo"
  }
}

// Available categories for the select dropdown
const CATEGORY_OPTIONS = Object.values(TransactionCategory).filter(
  (c) => !["Salary", "Freelance", "Business", "Investment Income", "Other Income"].includes(c)
)

// --- Blank form state ---

function blankForm() {
  return {
    name: "",
    amount: "",
    frequency: "monthly" as "monthly" | "yearly" | "weekly",
    category: "Subscription",
    nextExpected: new Date().toISOString().split("T")[0],
    lastCharged: "",
    notes: "",
    isShared: false,
    paidByUser: true,
    userShare: "",
    sharedWith: [] as { name: string; email: string; phone: string; share: string }[],
    autoCreateSplitExpense: false,
  }
}

/**
 * Top-level Subscriptions page exported for the `/bills` route's
 * "Subscriptions" tab. Provides an add/edit dialog, category filters,
 * monthly/yearly cost summaries, and a scrollable subscription card grid.
 * Auth-guarded: redirects to `/login` when not authenticated.
 */
export function SubscriptionsView() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [form, setForm] = useState(blankForm())
  const [editTarget, setEditTarget] = useState<Subscription | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Smart lookup state
  const [lookupName, setLookupName] = useState("")
  const [appliedSuggestion, setAppliedSuggestion] = useState(false)

  // --- Debounced lookup name ---
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleNameChangeForLookup = useCallback((name: string) => {
    setAppliedSuggestion(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLookupName(name.trim())
    }, 500)
  }, [])

  // --- Data fetching ---

  const {
    data: subsData,
    isLoading: subsLoading,
  } = useQuery<{ success: boolean; subscriptions: Subscription[] }>({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch subscriptions")
      return res.json()
    },
    enabled: isAuthenticated,
  })

  const subscriptions = subsData?.subscriptions ?? []

  // --- Subscription Lookup Query ---
  const { data: lookupData, isFetching: lookupFetching } = useQuery<{
    success: boolean
    matches: Array<{ _id: string; date: string; amount: number; merchant: string; description: string }>
    suggestion: LookupSuggestion | null
  }>({
    queryKey: ["subscription-lookup", lookupName],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: lookupName }),
      })
      if (!res.ok) throw new Error("Lookup failed")
      return res.json()
    },
    enabled: isAuthenticated && lookupName.length >= 3 && showAddDialog,
  })

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to create subscription")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      toast.success("Subscription added")
      setShowAddDialog(false)
      setForm(blankForm())
      setLookupName("")
      setAppliedSuggestion(false)
    },
    onError: (error: Error) => {
      toast.error("Failed to add subscription", { description: error.message })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update subscription")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      toast.success("Subscription updated")
      setShowEditDialog(false)
      setEditTarget(null)
    },
    onError: (error: Error) => {
      toast.error("Failed to update", { description: error.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/subscriptions?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete subscription")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      toast.success("Subscription deleted")
      setShowDeleteDialog(false)
      setDeleteTarget(null)
    },
    onError: (error: Error) => {
      toast.error("Failed to delete", { description: error.message })
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      const label = variables.status === "active" ? "resumed" : variables.status === "paused" ? "paused" : "cancelled"
      toast.success(`Subscription ${label}`)
    },
  })

  // --- Check Payments Mutation ---
  const checkPaymentsMutation = useMutation({
    mutationFn: async (subscriptionId: string | undefined) => {
      const res = await fetch("/api/subscriptions/check-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(subscriptionId ? { subscriptionId } : {}),
      })
      if (!res.ok) throw new Error("Failed to check payments")
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      const matched = data.summary?.matched || 0
      if (matched > 0) {
        toast.success(`Found ${matched} payment${matched > 1 ? "s" : ""}`, {
          description: "Subscription dates updated automatically.",
        })
      } else {
        toast.info("No new payments detected")
      }
    },
    onError: () => {
      toast.error("Failed to check payments")
    },
  })

  // --- Mark as Paid Mutation ---
  const markPaidMutation = useMutation({
    mutationFn: async ({ id, frequency }: { id: string; frequency: string }) => {
      const today = new Date().toISOString().split("T")[0]
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, markPaidDate: today }),
      })
      if (!res.ok) throw new Error("Failed to mark as paid")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      toast.success("Marked as paid", { description: "Next expected date has been updated." })
    },
    onError: () => {
      toast.error("Failed to mark as paid")
    },
  })

  // --- Notify Member Mutation ---
  const notifyMemberMutation = useMutation({
    mutationFn: async ({ subscriptionId, memberIndex, type }: { subscriptionId: string; memberIndex?: number; type: "reminder" | "new_share" }) => {
      const res = await fetch("/api/subscriptions/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscriptionId, memberIndex, type }),
      })
      if (!res.ok) throw new Error("Failed to send notification")
      return res.json()
    },
    onSuccess: (data) => {
      const total = (data.emailsSent || 0) + (data.telegramSent || 0)
      if (total > 0) {
        toast.success(`Reminder sent`, { description: data.message })
      } else {
        toast.info("No contact methods available for this member")
      }
    },
    onError: () => {
      toast.error("Failed to send reminder")
    },
  })

  // --- Update Shared Member Status Mutation ---
  const updateMemberStatusMutation = useMutation({
    mutationFn: async ({ subscriptionId, sharedWith }: { subscriptionId: string; sharedWith: SharedMember[] }) => {
      const res = await fetch("/api/subscriptions/shared", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: subscriptionId, sharedWith }),
      })
      if (!res.ok) throw new Error("Failed to update member status")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      toast.success("Member status updated")
    },
    onError: () => {
      toast.error("Failed to update member status")
    },
  })

  // --- Handlers ---

  const handleCreate = useCallback(() => {
    const amount = parseFloat(form.amount)
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter a valid amount"); return }
    if (!form.nextExpected) { toast.error("Next expected date is required"); return }

    // Validate shared members if shared
    if (form.isShared && form.sharedWith.length > 0) {
      for (const m of form.sharedWith) {
        if (!m.name.trim()) { toast.error("All shared members must have a name"); return }
        const share = parseFloat(m.share)
        if (!Number.isFinite(share) || share <= 0) { toast.error(`Enter a valid share for ${m.name || "member"}`); return }
      }
    }

    const userShare = form.isShared ? parseFloat(form.userShare) || 0 : amount

    createMutation.mutate({
      name: form.name.trim(),
      amount,
      frequency: form.frequency,
      category: form.category,
      nextExpected: form.nextExpected,
      lastCharged: form.lastCharged || "",
      notes: form.notes || "",
      status: "active",
      autoDetected: appliedSuggestion,
      ...(appliedSuggestion && lookupData?.suggestion?.matchedMerchant && {
        merchantPattern: lookupData.suggestion.matchedMerchant,
      }),
      // Shared subscription fields
      isShared: form.isShared,
      ...(form.isShared && {
        totalMembers: form.sharedWith.length + 1,
        userShare,
        paidByUser: form.paidByUser,
        autoCreateSplitExpense: form.autoCreateSplitExpense,
        sharedWith: form.sharedWith.map((m) => ({
          name: m.name.trim(),
          email: m.email.trim(),
          phone: m.phone.trim(),
          share: parseFloat(m.share) || 0,
          status: "pending",
        })),
      }),
    })
  }, [form, createMutation, appliedSuggestion, lookupData])

  const handleEdit = useCallback(() => {
    if (!editTarget) return
    const amount = parseFloat(form.amount)
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter a valid amount"); return }

    // Validate shared members if shared
    if (form.isShared && form.sharedWith.length > 0) {
      for (const m of form.sharedWith) {
        if (!m.name.trim()) { toast.error("All shared members must have a name"); return }
        const share = parseFloat(m.share)
        if (!Number.isFinite(share) || share <= 0) { toast.error(`Enter a valid share for ${m.name || "member"}`); return }
      }
    }

    const userShare = form.isShared ? parseFloat(form.userShare) || 0 : amount

    updateMutation.mutate({
      id: editTarget._id,
      name: form.name.trim(),
      amount,
      frequency: form.frequency,
      category: form.category,
      nextExpected: form.nextExpected,
      lastCharged: form.lastCharged,
      notes: form.notes,
      isShared: form.isShared,
      ...(form.isShared && {
        totalMembers: form.sharedWith.length + 1,
        userShare,
        paidByUser: form.paidByUser,
        autoCreateSplitExpense: form.autoCreateSplitExpense,
        sharedWith: form.sharedWith.map((m) => ({
          name: m.name.trim(),
          email: m.email.trim(),
          phone: m.phone.trim(),
          share: parseFloat(m.share) || 0,
          status: "pending",
        })),
      }),
      ...(!form.isShared && editTarget.isShared && {
        isShared: false,
      }),
    })
  }, [editTarget, form, updateMutation])

  const openEditDialog = useCallback((sub: Subscription) => {
    setEditTarget(sub)
    setForm({
      name: sub.name,
      amount: sub.amount.toString(),
      frequency: sub.frequency,
      category: sub.category,
      nextExpected: sub.nextExpected ? sub.nextExpected.split("T")[0] : "",
      lastCharged: sub.lastCharged ? sub.lastCharged.split("T")[0] : "",
      notes: sub.notes || "",
      isShared: sub.isShared || false,
      paidByUser: sub.paidByUser !== false,
      userShare: sub.userShare?.toString() || "",
      sharedWith: (sub.sharedWith || []).map((m) => ({
        name: m.name,
        email: m.email || "",
        phone: m.phone || "",
        share: m.share.toString(),
      })),
      autoCreateSplitExpense: sub.autoCreateSplitExpense || false,
    })
    setShowEditDialog(true)
  }, [])

  const openDeleteDialog = useCallback((sub: Subscription) => {
    setDeleteTarget(sub)
    setShowDeleteDialog(true)
  }, [])

  // --- Computed values ---

  const activeSubs = useMemo(() => subscriptions.filter((s) => s.status === "active"), [subscriptions])
  const pausedSubs = useMemo(() => subscriptions.filter((s) => s.status === "paused"), [subscriptions])
  const cancelledSubs = useMemo(() => subscriptions.filter((s) => s.status === "cancelled"), [subscriptions])

  const monthlyTotal = useMemo(
    () => activeSubs.reduce((sum, s) => sum + normalizeToMonthly(s.amount, s.frequency), 0),
    [activeSubs]
  )
  const yearlyProjection = monthlyTotal * 12

  // Filter subscriptions by search
  const filterSubs = useCallback(
    (subs: Subscription[]) => {
      if (!searchQuery.trim()) return subs
      const q = searchQuery.toLowerCase()
      return subs.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      )
    },
    [searchQuery]
  )

  // Upcoming renewals (within 7 days)
  const upcomingRenewals = useMemo(
    () => activeSubs.filter((s) => {
      const days = daysUntil(s.nextExpected)
      return days >= 0 && days <= 7
    }),
    [activeSubs]
  )

  // Overdue subscriptions
  const overdueSubs = useMemo(
    () => activeSubs.filter((s) => daysUntil(s.nextExpected) < 0),
    [activeSubs]
  )

  // --- Loading state ---

  const isLoading = subsLoading

  if (isLoading) {
    return <SubscriptionsLoadingSkeleton />
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end px-4 pt-4">
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => { setForm(blankForm()); setLookupName(""); setAppliedSuggestion(false); setShowAddDialog(true) }}
          >
            <IconPlus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <motion.div
          className="space-y-4 p-4 pt-3"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {/* --- Stat Tiles --- */}
          <motion.div variants={fadeUp}>
            <div className={`grid grid-cols-1 gap-3 ${overdueSubs.length > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              <MetricTile
                label="Active Subscriptions"
                value={activeSubs.length.toString()}
                trendLabel={pausedSubs.length > 0 ? `${pausedSubs.length} paused` : undefined}
                icon={<IconRepeat className="h-5 w-5" />}
                iconBg="bg-muted/80 dark:bg-muted"
                iconColor="text-foreground/70"
              />
              <MetricTile
                label="Monthly Total"
                value={formatINR(Math.round(monthlyTotal))}
                trendLabel={`across ${activeSubs.length} subscriptions`}
                icon={<IconCurrencyRupee className="h-5 w-5" />}
                iconBg="bg-muted/80 dark:bg-muted"
                iconColor="text-foreground/70"
              />
              <MetricTile
                label="Yearly Projection"
                value={formatINR(Math.round(yearlyProjection))}
                trendLabel="estimated annual spend"
                icon={<IconCalendar className="h-5 w-5" />}
                iconBg="bg-muted/80 dark:bg-muted"
                iconColor="text-foreground/70"
              />
              {overdueSubs.length > 0 && (
                <MetricTile
                  label="Overdue"
                  value={overdueSubs.length.toString()}
                  trendLabel="need attention"
                  icon={<IconAlertTriangle className="h-5 w-5" />}
                  iconBg="bg-destructive/10"
                  iconColor="text-destructive"
                />
              )}
            </div>
          </motion.div>

          {/* --- Overdue Subscriptions --- */}
          {overdueSubs.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-border bg-card relative overflow-hidden border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/10">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <IconAlertTriangle className="h-4 w-4 text-destructive" />
                        Overdue Subscriptions
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {overdueSubs.length} subscription{overdueSubs.length > 1 ? "s" : ""} past expected payment date
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-destructive/20 text-destructive hover:bg-destructive/10"
                      onClick={() => checkPaymentsMutation.mutate(undefined)}
                      disabled={checkPaymentsMutation.isPending}
                    >
                      <IconEye className="h-3 w-3" />
                      {checkPaymentsMutation.isPending ? "Checking..." : "Check All"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {overdueSubs.map((sub) => {
                      const days = Math.abs(daysUntil(sub.nextExpected))
                      return (
                        <div
                          key={sub._id}
                          className="flex items-center gap-2 rounded-xl border border-red-200/60 dark:border-red-800/30 bg-background px-3 py-2"
                        >
                          <ServiceLogo name={sub.name} size={20} />
                          <span className="text-sm font-medium">{sub.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatINR(sub.amount)}
                          </span>
                          <Badge variant="destructive" className="text-[11px] px-1.5 py-0 h-4">
                            {days}d overdue
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => checkPaymentsMutation.mutate(sub._id)}
                            disabled={checkPaymentsMutation.isPending}
                            title="Check Now"
                          >
                            <IconEye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-lime-600 dark:hover:text-lime-400"
                            onClick={() => markPaidMutation.mutate({ id: sub._id, frequency: sub.frequency })}
                            disabled={markPaidMutation.isPending}
                            title="Mark as Paid"
                          >
                            <IconCheck className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* --- Upcoming Renewals --- */}
          {upcomingRenewals.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-border bg-card relative overflow-hidden border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <IconCalendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Upcoming Renewals
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {upcomingRenewals.length} subscription{upcomingRenewals.length > 1 ? "s" : ""} renewing within 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {upcomingRenewals.map((sub) => {
                      const days = daysUntil(sub.nextExpected)
                      return (
                        <div
                          key={sub._id}
                          className="flex items-center gap-2 rounded-xl border border-amber-200/60 dark:border-amber-800/30 bg-background px-3 py-2"
                        >
                          <ServiceLogo name={sub.name} size={20} />
                          <span className="text-sm font-medium">{sub.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatINR(sub.amount)}
                          </span>
                          <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-4 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                            {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* --- Subscriptions Table --- */}
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border border-border bg-card relative overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <CardHeader className="pb-3 px-5 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">All Subscriptions</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Manage your recurring payments
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <IconSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search subscriptions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Tabs defaultValue="active" className="w-full">
                  <div className="px-5">
                    <TabsList className="h-8">
                      <TabsTrigger value="active" className="text-xs gap-1.5">
                        Active
                        {activeSubs.length > 0 && (
                          <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[11px]">
                            {activeSubs.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="paused" className="text-xs gap-1.5">
                        Paused
                        {pausedSubs.length > 0 && (
                          <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[11px]">
                            {pausedSubs.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="cancelled" className="text-xs gap-1.5">
                        Cancelled
                        {cancelledSubs.length > 0 && (
                          <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[11px]">
                            {cancelledSubs.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="active" className="mt-0">
                    <SubscriptionTable
                      subscriptions={filterSubs(activeSubs)}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      onToggleStatus={(sub) =>
                        toggleStatusMutation.mutate({ id: sub._id, status: "paused" })
                      }
                      toggleLabel="Pause"
                      toggleIcon={<IconPlayerPause className="h-3.5 w-3.5" />}
                      emptyMessage="No active subscriptions. Add one to get started."
                      onCheckPayment={(sub) => checkPaymentsMutation.mutate(sub._id)}
                      onMarkPaid={(sub) => markPaidMutation.mutate({ id: sub._id, frequency: sub.frequency })}
                      showPaymentStatus
                      onNotifyMember={(subscriptionId, memberIndex) =>
                        notifyMemberMutation.mutate({ subscriptionId, memberIndex, type: "reminder" })
                      }
                      onToggleMemberStatus={(sub, memberIndex) => {
                        if (!sub.sharedWith) return
                        const updated = sub.sharedWith.map((m, i) =>
                          i === memberIndex
                            ? { ...m, status: m.status === "paid" ? "pending" as const : "paid" as const, lastPaidDate: m.status === "paid" ? undefined : new Date().toISOString().split("T")[0] }
                            : m
                        )
                        updateMemberStatusMutation.mutate({ subscriptionId: sub._id, sharedWith: updated })
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="paused" className="mt-0">
                    <SubscriptionTable
                      subscriptions={filterSubs(pausedSubs)}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      onToggleStatus={(sub) =>
                        toggleStatusMutation.mutate({ id: sub._id, status: "active" })
                      }
                      toggleLabel="Resume"
                      toggleIcon={<IconPlayerPlay className="h-3.5 w-3.5" />}
                      emptyMessage="No paused subscriptions."
                    />
                  </TabsContent>

                  <TabsContent value="cancelled" className="mt-0">
                    <SubscriptionTable
                      subscriptions={filterSubs(cancelledSubs)}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      onToggleStatus={(sub) =>
                        toggleStatusMutation.mutate({ id: sub._id, status: "active" })
                      }
                      toggleLabel="Reactivate"
                      toggleIcon={<IconPlayerPlay className="h-3.5 w-3.5" />}
                      emptyMessage="No cancelled subscriptions."
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* --- Summary by Category --- */}
          {activeSubs.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-border bg-card relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <CardHeader className="pb-3 px-5 pt-4">
                  <CardTitle className="text-sm font-semibold">Spend by Category</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Monthly equivalent breakdown of active subscriptions
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="space-y-2.5">
                    {Object.entries(
                      activeSubs.reduce<Record<string, { monthly: number; count: number }>>((acc, sub) => {
                        const cat = sub.category || "Uncategorized"
                        if (!acc[cat]) acc[cat] = { monthly: 0, count: 0 }
                        acc[cat].monthly += normalizeToMonthly(sub.amount, sub.frequency)
                        acc[cat].count += 1
                        return acc
                      }, {})
                    )
                      .sort((a, b) => b[1].monthly - a[1].monthly)
                      .map(([cat, { monthly, count }]) => {
                        const pct = monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[11px] px-1.5 py-0 h-4 border-0 ${getCategoryBadgeClass(cat)}`}>
                                  {cat}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{count} sub{count > 1 ? "s" : ""}</span>
                              </div>
                              <span className="font-black tracking-tight tabular-nums text-sm">
                                {formatINR(Math.round(monthly))}
                                <span className="text-muted-foreground font-normal text-xs">/mo</span>
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* --- Add Subscription Dialog (Smart Form) --- */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setForm(blankForm()); setLookupName(""); setAppliedSuggestion(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
            <DialogDescription>Track a new recurring payment.</DialogDescription>
          </DialogHeader>
          <SmartSubscriptionForm
            form={form}
            setForm={setForm}
            suggestion={lookupData?.suggestion ?? null}
            lookupFetching={lookupFetching}
            appliedSuggestion={appliedSuggestion}
            onNameChange={handleNameChangeForLookup}
            onApplySuggestion={() => {
              const s = lookupData?.suggestion
              if (!s) return
              setForm((prev) => ({
                ...prev,
                amount: s.amount.toString(),
                frequency: (s.frequency === "weekly" || s.frequency === "monthly" || s.frequency === "yearly") ? s.frequency : "monthly",
                lastCharged: s.lastCharged,
                nextExpected: s.nextExpected,
              }))
              setAppliedSuggestion(true)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setForm(blankForm()); setLookupName(""); setAppliedSuggestion(false) }} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Edit Subscription Dialog --- */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditTarget(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>Update details for {editTarget?.name}.</DialogDescription>
          </DialogHeader>
          <SubscriptionForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditTarget(null) }} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmation Dialog --- */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) { setShowDeleteDialog(false); setDeleteTarget(null) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null) }} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Smart Subscription Form (for Add dialog -- with auto-detection) ---

interface SmartSubscriptionFormProps {
  form: ReturnType<typeof blankForm>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof blankForm>>>
  suggestion: LookupSuggestion | null
  lookupFetching: boolean
  appliedSuggestion: boolean
  onNameChange: (name: string) => void
  onApplySuggestion: () => void
}

function SmartSubscriptionForm({
  form,
  setForm,
  suggestion,
  lookupFetching,
  appliedSuggestion,
  onNameChange,
  onApplySuggestion,
}: SmartSubscriptionFormProps) {
  const handleQuickSelect = (service: (typeof POPULAR_SERVICES)[number]) => {
    setForm((prev) => ({
      ...prev,
      name: service.name,
      amount: service.amount.toString(),
      frequency: service.frequency,
      category: service.category,
    }))
    onNameChange(service.name)
  }

  return (
    <div className="space-y-4 py-2">
      {/* Quick-select popular services */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick Add</Label>
        <Select
          value=""
          onValueChange={(val) => {
            const svc = POPULAR_SERVICES.find((s) => s.name === val)
            if (svc) handleQuickSelect(svc)
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Choose a popular service..." />
          </SelectTrigger>
          <SelectContent>
            {POPULAR_SERVICES.map((svc) => (
              <SelectItem key={svc.name} value={svc.name}>
                <span className="flex items-center gap-2">
                  <ServiceLogo name={svc.name} size={18} />
                  <span>{svc.name}</span>
                  <span className="text-muted-foreground ml-auto">{formatINR(svc.amount)}/{svc.frequency === "yearly" ? "yr" : "mo"}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="sub-name">Name</Label>
          <div className="flex gap-2 items-center">
            {form.name && <ServiceLogo name={form.name} size={28} />}
            <Input
              id="sub-name"
              placeholder="e.g. Netflix, Spotify"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }))
                onNameChange(e.target.value)
              }}
              className="flex-1"
            />
          </div>
        </div>

        {/* Lookup loading indicator */}
        {lookupFetching && (
          <div className="col-span-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              Searching your transaction history...
            </div>
          </div>
        )}

        {/* Match Found card */}
        {suggestion && !appliedSuggestion && !lookupFetching && (
          <div className="col-span-2">
            <div className="rounded-xl border border-lime-200 dark:border-lime-800/40 bg-lime-50/50 dark:bg-lime-950/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconCheck className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400" />
                  <span className="text-xs font-semibold text-lime-700 dark:text-lime-400">Match Found</span>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-lime-300 dark:border-lime-700 text-lime-600 dark:text-lime-400">
                  {Math.round(suggestion.confidence * 100)}% confidence
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block">Amount</span>
                  <span className="font-medium">{formatINR(suggestion.amount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Last Paid</span>
                  <span className="font-medium">{formatDate(suggestion.lastCharged)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Frequency</span>
                  <span className="font-medium capitalize">{suggestion.frequency}</span>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                variant="outline"
                onClick={onApplySuggestion}
              >
                Apply Auto-Detected Details
              </Button>
            </div>
          </div>
        )}

        {/* Applied confirmation card */}
        {appliedSuggestion && (
          <div className="col-span-2">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/10 p-3">
              <div className="flex items-center gap-1.5">
                <IconCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-400">
                  Auto-filled from your transaction history. Next expected: {formatDate(form.nextExpected)}.
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="sub-amount">Amount (INR)</Label>
          <Input
            id="sub-amount"
            type="number"
            placeholder="499"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={form.frequency}
            onValueChange={(val) => setForm((prev) => ({ ...prev, frequency: val as "monthly" | "yearly" | "weekly" }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={form.category}
            onValueChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sub-next">Next Expected</Label>
          <Input
            id="sub-next"
            type="date"
            value={form.nextExpected}
            onChange={(e) => setForm((prev) => ({ ...prev, nextExpected: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sub-last">Last Charged</Label>
          <Input
            id="sub-last"
            type="date"
            value={form.lastCharged}
            onChange={(e) => setForm((prev) => ({ ...prev, lastCharged: e.target.value }))}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="sub-notes">Notes (optional)</Label>
          <Input
            id="sub-notes"
            placeholder="Family plan, shared with..."
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </div>

      <Separator />

      {/* --- Shared Subscription Section --- */}
      <SharedSubscriptionSection form={form} setForm={setForm} />
    </div>
  )
}

// --- Subscription Form (for Edit dialog -- simple, no lookup) ---

interface SubscriptionFormProps {
  form: ReturnType<typeof blankForm>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof blankForm>>>
}

function SubscriptionForm({ form, setForm }: SubscriptionFormProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="sub-name">Name</Label>
          <div className="flex gap-2 items-center">
            {form.name && <ServiceLogo name={form.name} size={28} />}
            <Input
              id="sub-name"
              placeholder="e.g. Netflix, Spotify"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="flex-1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sub-amount">Amount (INR)</Label>
          <Input
            id="sub-amount"
            type="number"
            placeholder="499"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={form.frequency}
            onValueChange={(val) => setForm((prev) => ({ ...prev, frequency: val as "monthly" | "yearly" | "weekly" }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={form.category}
            onValueChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sub-next">Next Expected</Label>
          <Input
            id="sub-next"
            type="date"
            value={form.nextExpected}
            onChange={(e) => setForm((prev) => ({ ...prev, nextExpected: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sub-last">Last Charged</Label>
          <Input
            id="sub-last"
            type="date"
            value={form.lastCharged}
            onChange={(e) => setForm((prev) => ({ ...prev, lastCharged: e.target.value }))}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="sub-notes">Notes (optional)</Label>
          <Input
            id="sub-notes"
            placeholder="Family plan, shared with..."
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </div>

      <Separator />

      {/* --- Shared Subscription Section --- */}
      <SharedSubscriptionSection form={form} setForm={setForm} />
    </div>
  )
}

// --- Shared Subscription Section (reusable across add/edit forms) ---

interface SharedSubscriptionSectionProps {
  form: ReturnType<typeof blankForm>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof blankForm>>>
}

function SharedSubscriptionSection({ form, setForm }: SharedSubscriptionSectionProps) {
  const amount = parseFloat(form.amount) || 0

  const addMember = () => {
    setForm((prev) => ({
      ...prev,
      sharedWith: [...prev.sharedWith, { name: "", email: "", phone: "", share: "" }],
    }))
  }

  const removeMember = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sharedWith: prev.sharedWith.filter((_, i) => i !== index),
    }))
  }

  const updateMember = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      sharedWith: prev.sharedWith.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }))
  }

  const splitEqually = () => {
    if (form.sharedWith.length === 0) return
    const totalPeople = form.sharedWith.length + 1 // members + the user
    const perPerson = Math.round((amount / totalPeople) * 100) / 100
    const remainder = Math.round((amount - perPerson * totalPeople) * 100) / 100

    setForm((prev) => ({
      ...prev,
      userShare: (perPerson + remainder).toString(),
      sharedWith: prev.sharedWith.map((m) => ({ ...m, share: perPerson.toString() })),
    }))
  }

  const memberSharesTotal = form.sharedWith.reduce((sum, m) => sum + (parseFloat(m.share) || 0), 0)
  const userShareNum = parseFloat(form.userShare) || 0
  const allSharesTotal = memberSharesTotal + userShareNum

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconUsers className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Shared Subscription</Label>
        </div>
        <Switch
          checked={form.isShared}
          onCheckedChange={(checked) => {
            setForm((prev) => ({
              ...prev,
              isShared: checked,
              ...(checked && prev.sharedWith.length === 0 && {
                sharedWith: [{ name: "", email: "", phone: "", share: "" }],
              }),
            }))
          }}
        />
      </div>

      <AnimatePresence>
        {form.isShared && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
              {/* Who pays? */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Who pays the full amount?</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.paidByUser ? "default" : "outline"}
                    className="h-7 text-xs flex-1"
                    onClick={() => setForm((prev) => ({ ...prev, paidByUser: true }))}
                  >
                    I pay
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!form.paidByUser ? "default" : "outline"}
                    className="h-7 text-xs flex-1"
                    onClick={() => setForm((prev) => ({ ...prev, paidByUser: false }))}
                  >
                    Someone else
                  </Button>
                </div>
              </div>

              {/* Your share */}
              <div className="space-y-1">
                <Label htmlFor="user-share" className="text-xs text-muted-foreground">Your share (INR)</Label>
                <Input
                  id="user-share"
                  type="number"
                  placeholder="0"
                  value={form.userShare}
                  onChange={(e) => setForm((prev) => ({ ...prev, userShare: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>

              {/* Members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Members</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] gap-1 px-2"
                      onClick={splitEqually}
                      disabled={form.sharedWith.length === 0 || amount <= 0}
                    >
                      <IconDivide className="h-3 w-3" />
                      Equal Split
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] gap-1 px-2"
                      onClick={addMember}
                    >
                      <IconUserPlus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {form.sharedWith.map((member, idx) => (
                    <div key={idx} className="rounded-lg border border-border/60 bg-background p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Avatar with initial */}
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {member.name ? member.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <Input
                          placeholder="Name"
                          value={member.name}
                          onChange={(e) => updateMember(idx, "name", e.target.value)}
                          className="h-7 text-xs flex-1"
                        />
                        <Input
                          placeholder="Share"
                          type="number"
                          value={member.share}
                          onChange={(e) => updateMember(idx, "share", e.target.value)}
                          className="h-7 text-xs w-20"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember(idx)}
                        >
                          <IconX className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex gap-2 pl-9">
                        <div className="relative flex-1">
                          <IconMail className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Email (optional)"
                            type="email"
                            value={member.email}
                            onChange={(e) => updateMember(idx, "email", e.target.value)}
                            className="h-7 text-xs pl-7"
                          />
                        </div>
                        <div className="relative flex-1">
                          <IconPhone className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Phone (optional)"
                            value={member.phone}
                            onChange={(e) => updateMember(idx, "phone", e.target.value)}
                            className="h-7 text-xs pl-7"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Split Summary */}
              {form.sharedWith.length > 0 && amount > 0 && (
                <div className="rounded-lg border border-border/60 bg-background p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {form.sharedWith.length + 1} members total
                    </span>
                    <span className={`font-medium ${Math.abs(allSharesTotal - amount) < 0.01 ? "text-lime-600 dark:text-lime-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {formatINR(allSharesTotal)} / {formatINR(amount)}
                      {Math.abs(allSharesTotal - amount) >= 0.01 && (
                        <span className="ml-1 text-[10px]">
                          ({allSharesTotal > amount ? "+" : ""}{formatINR(allSharesTotal - amount)})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Auto-create split expense toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Auto-create split on payment</Label>
                <Switch
                  checked={form.autoCreateSplitExpense}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, autoCreateSplitExpense: checked }))}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Shared Badge Indicator (for subscription table/cards) ---

function SharedBadge({ sub }: { sub: Subscription }) {
  if (!sub.isShared || !sub.sharedWith || sub.sharedWith.length === 0) return null

  const memberCount = sub.sharedWith.length + 1 // +1 for the user

  return (
    <div className="flex items-center gap-1">
      {/* Stacked avatar circles */}
      <div className="flex -space-x-1.5">
        {sub.sharedWith.slice(0, 3).map((m, i) => (
          <div
            key={i}
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary/15 text-[9px] font-bold text-primary"
            title={m.name}
          >
            {m.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {sub.sharedWith.length > 3 && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground">
            +{sub.sharedWith.length - 3}
          </div>
        )}
      </div>
      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/20 text-primary">
        {memberCount}
      </Badge>
    </div>
  )
}

// --- Member Status Dot ---

function MemberStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: "bg-lime-500",
    pending: "bg-amber-500",
    overdue: "bg-red-500",
  }
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[status] || colors.pending}`}
      title={status}
    />
  )
}

// --- Subscription Table ---

interface SubscriptionTableProps {
  subscriptions: Subscription[]
  onEdit: (sub: Subscription) => void
  onDelete: (sub: Subscription) => void
  onToggleStatus: (sub: Subscription) => void
  toggleLabel: string
  toggleIcon: React.ReactNode
  emptyMessage: string
  onCheckPayment?: (sub: Subscription) => void
  onMarkPaid?: (sub: Subscription) => void
  showPaymentStatus?: boolean
  onNotifyMember?: (subscriptionId: string, memberIndex?: number) => void
  onToggleMemberStatus?: (sub: Subscription, memberIndex: number) => void
}

function SubscriptionTable({
  subscriptions,
  onEdit,
  onDelete,
  onToggleStatus,
  toggleLabel,
  toggleIcon,
  emptyMessage,
  onCheckPayment,
  onMarkPaid,
  showPaymentStatus,
  onNotifyMember,
  onToggleMemberStatus,
}: SubscriptionTableProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70">Name</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70">Amount</TableHead>
            <TableHead className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70 hidden sm:table-cell">Frequency</TableHead>
            {showPaymentStatus && (
              <TableHead className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70 hidden sm:table-cell">Status</TableHead>
            )}
            <TableHead className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70 hidden md:table-cell">Category</TableHead>
            <TableHead className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70 hidden lg:table-cell">Last Charged</TableHead>
            <TableHead className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70">Next Expected</TableHead>
            <TableHead className="w-[140px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((sub) => {
            const days = daysUntil(sub.nextExpected)
            const isUpcoming = days >= 0 && days <= 3
            const isOverdue = days < 0
            const paymentStatus = showPaymentStatus ? getPaymentStatus(sub) : null
            const statusBadge = paymentStatus ? PAYMENT_STATUS_BADGE[paymentStatus] : null

            return (
              <React.Fragment key={sub._id}>
              <TableRow
                className="h-[52px] border-border group transition-colors hover:bg-muted/30"
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <ServiceLogo name={sub.name} size={32} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{sub.name}</p>
                        <SharedBadge sub={sub} />
                      </div>
                      {sub.isShared && sub.userShare != null ? (
                        <p className="text-[11px] text-muted-foreground">
                          Your share: {formatINR(sub.userShare)} / {formatINR(sub.amount)}
                        </p>
                      ) : sub.notes ? (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{sub.notes}</p>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm font-black tracking-tight tabular-nums">
                    {sub.isShared && sub.userShare != null ? formatINR(sub.userShare) : formatINR(sub.amount)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {sub.isShared ? "your share" : ""} {frequencyLabel(sub.frequency)}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground capitalize">{sub.frequency}</span>
                </TableCell>
                {showPaymentStatus && statusBadge && (
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className={`text-[11px] px-1.5 py-0 h-4 border-0 ${statusBadge.class}`}>
                      {statusBadge.label}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className={`text-[11px] px-1.5 py-0 h-4 border-0 ${getCategoryBadgeClass(sub.category)}`}>
                    {sub.category}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(sub.lastCharged)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs tabular-nums ${isOverdue ? "text-destructive font-medium" : isUpcoming ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                      {formatDate(sub.nextExpected)}
                    </span>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-[11px] px-1 py-0 h-4">Overdue</Badge>
                    )}
                    {isUpcoming && !isOverdue && (
                      <Badge variant="outline" className="text-[11px] px-1 py-0 h-4 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400">
                        {days === 0 ? "Today" : days === 1 ? "1d" : `${days}d`}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onCheckPayment && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => onCheckPayment(sub)}
                        title="Check Now"
                      >
                        <IconEye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onMarkPaid && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-lime-600 dark:hover:text-lime-400"
                        onClick={() => onMarkPaid(sub)}
                        title="Mark as Paid"
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {sub.isShared && onNotifyMember && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                        onClick={() => onNotifyMember(sub._id)}
                        title="Remind All Members"
                      >
                        <IconBell className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => onToggleStatus(sub)}
                      title={toggleLabel}
                    >
                      {toggleIcon}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(sub)}
                      title="Edit"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground/60 hover:text-destructive"
                      onClick={() => onDelete(sub)}
                      title="Delete"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {/* Shared members detail row */}
              {sub.isShared && sub.sharedWith && sub.sharedWith.length > 0 && (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={showPaymentStatus ? 8 : 7} className="py-1 px-5">
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      {sub.sharedWith.map((member, mIdx) => (
                        <div
                          key={mIdx}
                          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 py-1"
                        >
                          <MemberStatusDot status={member.status} />
                          <span className="text-[11px] font-medium">{member.name}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {formatINR(member.share)}
                          </span>
                          {onToggleMemberStatus && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-4 w-4 text-muted-foreground hover:text-lime-600 dark:hover:text-lime-400"
                              onClick={() => onToggleMemberStatus(sub, mIdx)}
                              title={member.status === "paid" ? "Mark Pending" : "Mark Paid"}
                            >
                              <IconCheck className="h-2.5 w-2.5" />
                            </Button>
                          )}
                          {onNotifyMember && (member.email || member.phone) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-4 w-4 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                              onClick={() => onNotifyMember(sub._id, mIdx)}
                              title={`Remind ${member.name}`}
                            >
                              <IconBell className="h-2.5 w-2.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// --- Loading Skeleton ---

function SubscriptionsLoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-[88px] rounded-2xl border border-border" />
        <Skeleton className="h-[88px] rounded-2xl border border-border" />
        <Skeleton className="h-[88px] rounded-2xl border border-border" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-2xl border border-border" />
      <Skeleton className="h-[200px] w-full rounded-2xl border border-border" />
    </div>
  )
}
