"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  IconBrandTelegram,
  IconClock,
  IconCopy,
  IconDeviceFloppy,
  IconGhost,
  IconLinkOff,
  IconBell,
  IconCheck,
  IconArrowRight,
  IconUser,
  IconPuzzle,
  IconPalette,
  IconMoon,
  IconSun,
  IconDeviceDesktop,
  IconSettings,
  IconChevronRight,
} from "@tabler/icons-react"

import { useAuth } from "@/hooks/use-auth"
import { useSettings, useLinkTelegram, useUnlinkTelegram, useUpdateNotificationPrefs } from "@/hooks/use-settings"
import { formatINR } from "@/lib/format"
import { fadeUp, stagger } from "@/lib/motion"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Shared toggle switch ────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  )
}

// ─── Section nav items ───────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "profile", label: "Profile", icon: IconUser },
  { id: "integrations", label: "Integrations", icon: IconBrandTelegram },
  { id: "features", label: "Features", icon: IconPuzzle },
  { id: "appearance", label: "Appearance", icon: IconPalette },
] as const

type SectionId = (typeof NAV_SECTIONS)[number]["id"]

// ─── Telegram integration section ────────────────────────────────────

function TelegramCard() {
  const { data: settings, isLoading: settingsLoading } = useSettings()
  const linkMutation = useLinkTelegram()
  const unlinkMutation = useUnlinkTelegram()
  const updatePrefsMutation = useUpdateNotificationPrefs()

  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [codeExpiry, setCodeExpiry] = useState<string | null>(null)

  async function handleGenerateCode() {
    try {
      const result = await linkMutation.mutateAsync()
      setLinkCode(result.code)
      setCodeExpiry(result.expiresAt)
      toast.success("Link code generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate code")
    }
  }

  async function handleUnlink() {
    try {
      await unlinkMutation.mutateAsync()
      setLinkCode(null)
      toast.success("Telegram unlinked")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlink")
    }
  }

  function handleCopyCode() {
    if (linkCode) {
      navigator.clipboard.writeText(`/link ${linkCode}`)
      toast.success("Code copied! Send this to @capybara13bot on Telegram")
    }
  }

  async function toggleNotification(key: string, value: boolean) {
    try {
      await updatePrefsMutation.mutateAsync({ [key]: value })
    } catch {
      toast.error("Failed to update preference")
    }
  }

  if (settingsLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />
  }

  const linked = settings?.linked ?? false
  const notifs = settings?.notifications ?? {
    budgetBreach: true,
    weeklyDigest: true,
    renewalAlert: true,
    aiInsights: true,
    dailySummary: true,
  }

  return (
    <div className="card-elevated rounded-xl border border-sky-500/10 bg-card overflow-hidden">
      {/* Telegram header */}
      <div className="relative bg-gradient-to-r from-sky-500/8 via-blue-500/6 to-cyan-500/4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/10">
            <IconBrandTelegram className="h-5 w-5 text-sky-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">Telegram Bot</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log expenses, scan receipts, and get summaries via chat
            </p>
          </div>
          {linked ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              Not connected
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {!linked ? (
          <div className="space-y-4">
            {!linkCode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { text: "Send expenses like \"Coffee 250\"", step: "Chat" },
                    { text: "Snap a receipt photo to auto-log", step: "Scan" },
                    { text: "Daily and weekly spending summaries", step: "Track" },
                  ].map(({ text, step }) => (
                    <div
                      key={step}
                      className="rounded-xl bg-muted/30 border border-border/30 p-3 text-center"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-500 mb-1">{step}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleGenerateCode}
                  disabled={linkMutation.isPending}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                  size="lg"
                >
                  <IconBrandTelegram className="h-4 w-4 mr-2" />
                  {linkMutation.isPending ? "Generating Link Code..." : "Link Telegram Account"}
                  <IconArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-sky-500/5 border border-sky-500/15 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Send this command to <span className="font-semibold text-foreground">@capybara13bot</span> on Telegram:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-background border border-border px-3 py-2.5 text-sm font-mono font-bold tracking-wider text-center">
                      /link {linkCode}
                    </code>
                    <Button size="icon" variant="outline" className="h-10 w-10 shrink-0" onClick={handleCopyCode}>
                      <IconCopy className="h-4 w-4" />
                    </Button>
                  </div>
                  {codeExpiry && (
                    <p className="text-[11px] text-muted-foreground mt-2 text-center">
                      Code expires at {new Date(codeExpiry).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2.5">Quick steps:</p>
                  <ol className="text-sm text-foreground/80 space-y-2.5 pl-0">
                    {[
                      <>Open Telegram and search for <span className="font-semibold">@capybara13bot</span></>,
                      <>Send the command <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/link {linkCode}</code></>,
                      <>Done! Start sending expenses like <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Coffee 250</code></>,
                    ].map((content, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="flex items-center justify-center h-5 w-5 shrink-0 rounded-full bg-sky-500/10 text-[11px] font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed">{content}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Connected status */}
            <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/30 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Linked {settings?.username ? `as @${settings.username}` : ""}
                </p>
                {settings?.linkedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connected since {new Date(settings.linkedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleUnlink}
                disabled={unlinkMutation.isPending}
              >
                <IconLinkOff className="h-4 w-4 mr-1.5" />
                {unlinkMutation.isPending ? "Unlinking..." : "Unlink"}
              </Button>
            </div>

            {/* Notification Preferences */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gradient-to-br from-amber-500/15 to-orange-500/15">
                  <IconBell className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notification Preferences
                </p>
              </div>
              <div className="space-y-1">
                {[
                  { key: "budgetBreach", label: "Budget breach alerts", desc: "When spending exceeds a category budget" },
                  { key: "weeklyDigest", label: "Weekly spending digest", desc: "Summary of your week's spending" },
                  { key: "renewalAlert", label: "Subscription renewal alerts", desc: "Upcoming subscription renewals" },
                  { key: "aiInsights", label: "AI insights", desc: "Personalized spending insights" },
                  { key: "dailySummary", label: "Daily summary", desc: "End-of-day expense recap" },
                ].map(({ key, label, desc }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-foreground/90 font-medium">{label}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={notifs[key as keyof typeof notifs]}
                      onChange={() => toggleNotification(key, !notifs[key as keyof typeof notifs])}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main settings page ──────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Money in Hours state
  const [mihEnabled, setMihEnabled] = useState(false)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [workingHours, setWorkingHours] = useState(176)

  // Ghost Budget state
  const [ghostEnabled, setGhostEnabled] = useState(false)

  // Appearance state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  // Active section for nav highlighting
  const [activeSection, setActiveSection] = useState<SectionId>("profile")
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    profile: null,
    integrations: null,
    features: null,
    appearance: null,
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return
    fetch("/api/settings/hourly-rate", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMihEnabled(data.enabled)
          setMonthlyIncome(data.monthlyIncome)
          setWorkingHours(data.workingHoursPerMonth)
          setGhostEnabled(data.ghostBudgetEnabled)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  // Read theme from document class on mount
  useEffect(() => {
    const html = document.documentElement
    if (html.classList.contains("dark")) {
      setTheme("dark")
    } else if (html.classList.contains("light")) {
      setTheme("light")
    } else {
      setTheme("system")
    }
  }, [])

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId)
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    )

    for (const ref of Object.values(sectionRefs.current)) {
      if (ref) observer.observe(ref)
    }

    return () => observer.disconnect()
  }, [loading])

  const computedRate = workingHours > 0 ? monthlyIncome / workingHours : 0

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/hourly-rate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyIncome,
          workingHoursPerMonth: workingHours,
          enabled: mihEnabled,
          ghostBudgetEnabled: ghostEnabled,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Settings saved")
      } else {
        toast.error("Failed to save settings")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  function scrollToSection(id: SectionId) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function handleThemeChange(newTheme: "light" | "dark" | "system") {
    setTheme(newTheme)
    const html = document.documentElement
    html.classList.remove("light", "dark")
    if (newTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      html.classList.add(prefersDark ? "dark" : "light")
    } else {
      html.classList.add(newTheme)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Settings" subtitle="Preferences" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6">
            {loading ? (
              <div className="mx-auto w-full max-w-4xl space-y-5">
                <Skeleton className="h-28 w-full rounded-xl" />
                <div className="flex gap-6">
                  <Skeleton className="hidden lg:block h-48 w-52 rounded-xl" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-56 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-4xl flex flex-col gap-5">

                {/* ═══ Profile Header ═══ */}
                <motion.div
                  variants={fadeUp}
                  id="profile"
                  ref={(el) => { sectionRefs.current.profile = el }}
                  className="card-elevated rounded-xl bg-card overflow-hidden"
                >
                  <div className="relative bg-gradient-to-r from-primary/8 via-primary/5 to-transparent px-6 py-6">
                    {/* Subtle dots pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                    <div className="relative flex items-center gap-4">
                      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/10 text-primary text-xl font-bold">
                        OR
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold tracking-tight">Om Rajpal</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage your preferences and integrations</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/40 px-3 py-1">
                          <IconSettings className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">v1.0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* ═══ Main layout: sidebar nav + content ═══ */}
                <div className="flex gap-6">

                  {/* Desktop section nav */}
                  <motion.nav
                    variants={fadeUp}
                    className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-24 self-start"
                  >
                    {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => scrollToSection(id)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                          activeSection === id
                            ? "bg-primary/10 text-primary border border-primary/15"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        {activeSection === id && (
                          <IconChevronRight className="h-3.5 w-3.5 ml-auto" />
                        )}
                      </button>
                    ))}
                  </motion.nav>

                  {/* Content sections */}
                  <div className="flex-1 min-w-0 flex flex-col gap-5">

                    {/* ═══ Integrations ═══ */}
                    <motion.div
                      variants={fadeUp}
                      id="integrations"
                      ref={(el) => { sectionRefs.current.integrations = el }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-sky-500/15 to-blue-500/15">
                          <IconBrandTelegram className="h-4 w-4 text-sky-500" />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Integrations
                        </h3>
                      </div>
                      <TelegramCard />
                    </motion.div>

                    {/* ═══ Features ═══ */}
                    <motion.div
                      variants={fadeUp}
                      id="features"
                      ref={(el) => { sectionRefs.current.features = el }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/15 to-purple-500/15">
                          <IconPuzzle className="h-4 w-4 text-violet-500" />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Features
                        </h3>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* Money in Hours */}
                        <div className="card-elevated rounded-xl bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15 border border-blue-500/10">
                                <IconClock className="h-4.5 w-4.5 text-blue-500" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold">Money in Hours</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">See expenses as work hours to build perspective</p>
                              </div>
                            </div>
                            <ToggleSwitch checked={mihEnabled} onChange={() => setMihEnabled(!mihEnabled)} />
                          </div>

                          <AnimatePresence>
                            {mihEnabled && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/40 px-5 py-4 space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                                        Monthly Income
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={monthlyIncome || ""}
                                        onChange={e => setMonthlyIncome(Number(e.target.value) || 0)}
                                        placeholder="e.g. 80000"
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                                        Hours / Month
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={workingHours}
                                        onChange={e => setWorkingHours(Number(e.target.value) || 176)}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                                      />
                                    </div>
                                  </div>

                                  {computedRate > 0 && (
                                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Your hourly rate</p>
                                        <p className="text-lg font-bold tabular-nums">{formatINR(Math.round(computedRate))}<span className="text-xs font-normal text-muted-foreground">/hr</span></p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[11px] text-muted-foreground">A {formatINR(500)} expense</p>
                                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                          = {(500 / computedRate).toFixed(1)} hrs work
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Ghost Budget */}
                        <div className="card-elevated rounded-xl bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500/15 to-violet-500/15 border border-purple-500/10">
                                <IconGhost className="h-4.5 w-4.5 text-purple-500" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold">Ghost Budget</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Track what perfect budgeting would save you</p>
                              </div>
                            </div>
                            <ToggleSwitch checked={ghostEnabled} onChange={() => setGhostEnabled(!ghostEnabled)} />
                          </div>

                          <AnimatePresence>
                            {ghostEnabled && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/40 px-5 py-4">
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    Ghost Budget creates a shadow version of your spending that follows your budget perfectly.
                                    Compare your actual spending against the ideal to see potential savings over time.
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Save features button */}
                        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                          <IconDeviceFloppy className="h-4 w-4 mr-2" />
                          {saving ? "Saving..." : "Save Feature Settings"}
                        </Button>
                      </div>
                    </motion.div>

                    {/* ═══ Appearance ═══ */}
                    <motion.div
                      variants={fadeUp}
                      id="appearance"
                      ref={(el) => { sectionRefs.current.appearance = el }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/15">
                          <IconPalette className="h-4 w-4 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Appearance
                        </h3>
                      </div>

                      <div className="card-elevated rounded-xl bg-card px-5 py-4">
                        <p className="text-sm font-medium mb-3">Theme</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { value: "light" as const, icon: IconSun, label: "Light" },
                            { value: "dark" as const, icon: IconMoon, label: "Dark" },
                            { value: "system" as const, icon: IconDeviceDesktop, label: "System" },
                          ]).map(({ value, icon: Icon, label }) => (
                            <button
                              key={value}
                              onClick={() => handleThemeChange(value)}
                              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all duration-150 ${
                                theme === value
                                  ? "bg-primary/10 border-primary/20 text-primary"
                                  : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="text-xs">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
