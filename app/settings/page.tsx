"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
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
  IconCurrencyRupee,
  IconSettings,
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

function TelegramSection() {
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
    return (
      <motion.div variants={fadeUp} className="card-elevated rounded-2xl bg-card p-6">
        <Skeleton className="h-40 w-full" />
      </motion.div>
    )
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
    <motion.div
      variants={fadeUp}
      className="card-elevated rounded-2xl border border-sky-500/10 bg-card overflow-hidden"
    >
      {/* Telegram header with gradient accent */}
      <div className="relative bg-gradient-to-r from-sky-500/8 via-blue-500/6 to-cyan-500/4 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/10">
            <IconBrandTelegram className="h-5 w-5 text-sky-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold">Telegram Integration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log expenses, scan receipts, and get summaries via chat
            </p>
          </div>
          {linked && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <IconCheck className="h-3 w-3" />
              Connected
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5">
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
    </motion.div>
  )
}

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
            <div className="mx-auto w-full max-w-2xl">
              {loading ? (
                <div className="space-y-5">
                  <Skeleton className="h-12 w-64 rounded-lg" />
                  <Skeleton className="h-56 w-full rounded-2xl" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
                  {/* Telegram Integration */}
                  <TelegramSection />

                  {/* Money in Hours */}
                  <motion.div variants={fadeUp} className="card-elevated rounded-xl bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/15">
                          <IconClock className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Money in Hours</h3>
                          <p className="text-[11px] text-muted-foreground">See expenses as work hours</p>
                        </div>
                      </div>
                      <ToggleSwitch checked={mihEnabled} onChange={() => setMihEnabled(!mihEnabled)} />
                    </div>

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

                    {mihEnabled && computedRate > 0 && (
                      <div className="mt-3 rounded-lg bg-muted/40 border border-border/40 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Hourly rate</p>
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
                  </motion.div>

                  {/* Ghost Budget */}
                  <motion.div variants={fadeUp} className="card-elevated rounded-xl bg-card p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500/15 to-violet-500/15">
                          <IconGhost className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Ghost Budget</h3>
                          <p className="text-[11px] text-muted-foreground">Track what perfect budgeting saves</p>
                        </div>
                      </div>
                      <ToggleSwitch checked={ghostEnabled} onChange={() => setGhostEnabled(!ghostEnabled)} />
                    </div>
                  </motion.div>

                  {/* Save Button */}
                  <motion.div variants={fadeUp}>
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                      <IconDeviceFloppy className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Settings"}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
