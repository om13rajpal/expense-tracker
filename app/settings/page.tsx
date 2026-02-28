/**
 * @module app/settings/page
 * @description User settings page for Finova. Organized into sections: Profile
 * (display name, avatar), Integrations (Telegram bot linking with code generation,
 * notification preferences for daily summary, budget alerts, and weekly digest),
 * Features (ghost budget toggle, other feature flags), and Appearance (theme toggle
 * for light/dark/system modes). Telegram integration supports link/unlink flows with
 * code expiry. Settings are persisted via the `useSettings` and related mutation hooks
 * against `/api/settings` endpoints.
 */
"use client"

import * as React from "react"
import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  IconBrandTelegram,
  IconBrandOpenai,
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
  IconBrain,
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

/**
 * Accessible toggle switch component styled as a sliding pill.
 * Used throughout the settings page for boolean preference toggles.
 * @param props - Contains `checked` state and `onChange` callback.
 */
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

// ─── ChatGPT integration section ─────────────────────────────────────

function ChatGPTCard() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [planType, setPlanType] = useState<string | null>(null)
  const [authMethod, setAuthMethod] = useState<string | null>(null)
  const [connectedAt, setConnectedAt] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showManualKey, setShowManualKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [deviceCode, setDeviceCode] = useState<{ userCode: string; verificationUrl: string } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Handle OAuth callback redirect params
  useEffect(() => {
    if (searchParams.get("openai_connected") === "true") {
      toast.success("ChatGPT account connected!")
      // Clean up URL params
      window.history.replaceState({}, "", "/settings")
    }
    const oauthError = searchParams.get("openai_error")
    if (oauthError) {
      toast.error(`ChatGPT connection failed: ${oauthError}`)
      window.history.replaceState({}, "", "/settings")
    }
  }, [searchParams])

  useEffect(() => {
    fetch("/api/auth/openai/status", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.connected) {
          setConnected(true)
          setMaskedKey(data.maskedKey || null)
          setEmail(data.email || null)
          setPlanType(data.planType || null)
          setAuthMethod(data.authMethod || null)
          setConnectedAt(data.connectedAt || null)
        }
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false))
  }, [searchParams])

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Re-check connection status when the user switches back to this tab
  // (handles case where they completed auth in another tab)
  useEffect(() => {
    function handleFocus() {
      if (connected) return
      fetch("/api/auth/openai/status", { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.connected) {
            if (pollRef.current) clearInterval(pollRef.current)
            setDeviceCode(null)
            setConnecting(false)
            setConnected(true)
            setMaskedKey(data.maskedKey || null)
            setEmail(data.email || null)
            setPlanType(data.planType || null)
            setAuthMethod(data.authMethod || null)
            setConnectedAt(data.connectedAt || null)
            toast.success("ChatGPT account connected!")
          }
        })
        .catch(() => {})
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [connected])

  /** Handle poll success — update all state and clean up. */
  function onPollConnected(pollData: { email?: string; planType?: string }) {
    if (pollRef.current) clearInterval(pollRef.current)
    setDeviceCode(null)
    setConnecting(false)
    setConnected(true)
    setEmail(pollData.email || null)
    setPlanType(pollData.planType || null)
    setAuthMethod("oauth-device")
    setConnectedAt(new Date().toISOString())
    toast.success("ChatGPT account connected!")
  }

  async function handleOAuthConnect() {
    setConnecting(true)
    try {
      const res = await fetch("/api/auth/openai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "device-code" }),
      })
      const data = await res.json()
      if (data.success && data.flow === "device-code") {
        setDeviceCode({ userCode: data.userCode, verificationUrl: data.verificationUrl })
        // Open verification page in new tab
        window.open(data.verificationUrl, "_blank", "noopener")

        // Start polling every 5 seconds
        pollRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch("/api/auth/openai/poll", {
              method: "POST",
              credentials: "include",
            })
            const pollData = await pollRes.json()

            if (pollData.status === "connected") {
              onPollConnected(pollData)
            } else if (pollData.status === "expired" || pollData.status === "no_session") {
              // no_session could mean exchange succeeded on a prev poll but
              // the response was lost — check status to be sure
              const statusRes = await fetch("/api/auth/openai/status", { credentials: "include" })
              const statusData = await statusRes.json()
              if (statusData.success && statusData.connected) {
                onPollConnected(statusData)
              } else {
                if (pollRef.current) clearInterval(pollRef.current)
                setDeviceCode(null)
                setConnecting(false)
                if (pollData.status === "expired") {
                  toast.error("Code expired. Please try again.")
                }
              }
            } else if (pollData.status === "error") {
              // Server-side exchange error — show it but keep polling
              // (the session is still intact, next poll will retry)
              console.warn("OpenAI poll error:", pollData.message)
            }
            // "pending" — do nothing, keep polling
          } catch {
            // Ignore transient network errors, keep polling
          }
        }, 5000)
      } else {
        toast.error(data.message || "Failed to start authentication")
        setConnecting(false)
      }
    } catch {
      toast.error("Failed to start authentication")
      setConnecting(false)
    }
  }

  function handleCancelDeviceCode() {
    if (pollRef.current) clearInterval(pollRef.current)
    setDeviceCode(null)
    setConnecting(false)
  }

  async function handleManualKeyConnect() {
    if (!apiKeyInput.trim()) {
      toast.error("Please enter your OpenAI API key")
      return
    }
    setConnecting(true)
    try {
      const res = await fetch("/api/auth/openai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setConnected(true)
        setApiKeyInput("")
        setShowManualKey(false)
        setAuthMethod("api-key")
        toast.success("OpenAI API key connected!")
        const statusRes = await fetch("/api/auth/openai/status", { credentials: "include" })
        const statusData = await statusRes.json()
        if (statusData.success && statusData.connected) {
          setMaskedKey(statusData.maskedKey || null)
          setConnectedAt(statusData.connectedAt || null)
        }
      } else {
        toast.error(data.message || "Failed to connect API key")
      }
    } catch {
      toast.error("Failed to connect API key")
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/auth/openai/disconnect", { method: "POST", credentials: "include" })
      const data = await res.json()
      if (data.success) {
        setConnected(false)
        setMaskedKey(null)
        setEmail(null)
        setPlanType(null)
        setAuthMethod(null)
        setConnectedAt(null)
        toast.success("ChatGPT disconnected")
      } else {
        toast.error("Failed to disconnect")
      }
    } catch {
      toast.error("Failed to disconnect")
    } finally {
      setDisconnecting(false)
    }
  }

  if (statusLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl border border-border" />
  }

  const planLabel = planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : null

  return (
    <div className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="relative bg-gradient-to-r from-primary/8 via-primary/5 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-muted/80 dark:bg-muted border border-border">
            <IconBrandOpenai className="h-5 w-5 text-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">ChatGPT</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Sign in with your ChatGPT subscription for AI features</p>
          </div>
          {connected ? (
            <span className="flex items-center gap-1.5 rounded-full bg-lime-500/10 border border-lime-500/15 px-3 py-1 text-xs font-medium text-lime-600 dark:text-lime-400">
              <span className="h-2 w-2 rounded-full bg-lime-500 animate-pulse" />
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
        {!connected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { text: "Uses your ChatGPT Plus/Pro subscription", step: "Free" },
                { text: "GPT-4o for financial analysis & chat", step: "Powerful" },
                { text: "Falls back to Claude if disconnected", step: "Flexible" },
              ].map(({ text, step }) => (
                <div key={step} className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1">{step}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* Primary: Device Code OAuth sign-in */}
            {deviceCode ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-3">
                  <p className="text-xs text-muted-foreground">Enter this code on the OpenAI page that opened:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground bg-muted px-4 py-2 rounded-lg border border-border">
                      {deviceCode.userCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(deviceCode.userCode); toast.success("Code copied!") }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <IconCopy className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Waiting for you to sign in...
                  </div>
                  <a
                    href={deviceCode.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    Didn&apos;t open? Click here
                    <IconArrowRight className="h-3 w-3" />
                  </a>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleCancelDeviceCode}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleOAuthConnect}
                  disabled={connecting}
                  className="w-full bg-[#10a37f] hover:bg-[#0d8c6c] text-white"
                  size="lg"
                >
                  <IconBrandOpenai className="h-4 w-4 mr-2" />
                  {connecting ? "Connecting..." : "Sign in with ChatGPT"}
                  <IconArrowRight className="h-4 w-4 ml-auto" />
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Uses your existing ChatGPT Plus, Pro, or Max subscription. No extra cost.
                </p>
              </>
            )}

            {/* Secondary: Manual API key */}
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setShowManualKey(!showManualKey)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <IconChevronRight className={`h-3 w-3 transition-transform ${showManualKey ? "rotate-90" : ""}`} />
                Or enter an API key manually
              </button>
              {showManualKey && (
                <div className="mt-3 space-y-3">
                  <div>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      placeholder="sk-..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
                      onKeyDown={e => { if (e.key === "Enter") handleManualKeyConnect() }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Get your key from{" "}
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        platform.openai.com/api-keys
                      </a>
                    </p>
                  </div>
                  <Button
                    onClick={handleManualKeyConnect}
                    disabled={connecting || !apiKeyInput.trim()}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {connecting ? "Validating..." : "Connect API Key"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                {(authMethod === "oauth" || authMethod === "oauth-device") && email ? (
                  <>
                    <p className="text-sm font-medium text-foreground">{email}</p>
                    {planLabel && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ChatGPT {planLabel} subscription
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    Key: <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{maskedKey || "Connected"}</code>
                  </p>
                )}
                {connectedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">Connected since {new Date(connectedAt).toLocaleDateString()}</p>
                )}
              </div>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDisconnect} disabled={disconnecting}>
                <IconLinkOff className="h-4 w-4 mr-1.5" />
                {disconnecting ? "..." : "Disconnect"}
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <IconBrain className="h-4 w-4 text-lime-600 dark:text-lime-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Active AI Model</p>
              </div>
              <p className="text-sm font-medium text-foreground">Using GPT-4o (OpenAI)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {authMethod === "oauth" || authMethod === "oauth-device"
                  ? "Billed against your ChatGPT subscription"
                  : "Powered by your OpenAI API key"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Telegram integration section ────────────────────────────────────

/**
 * Telegram integration card component. Handles the full Telegram bot linking flow:
 * generating a link code, displaying it with expiry countdown, unlinking,
 * and configuring notification preferences (daily summary, budget alerts, weekly digest).
 */
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
    return <Skeleton className="h-48 w-full rounded-2xl border border-border" />
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
    <div className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      {/* Telegram header */}
      <div className="relative bg-gradient-to-r from-primary/8 via-primary/5 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-muted/80 dark:bg-muted border border-border">
            <IconBrandTelegram className="h-5 w-5 text-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">Telegram Bot</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log expenses, scan receipts, and get summaries via chat
            </p>
          </div>
          {linked ? (
            <span className="flex items-center gap-1.5 rounded-full bg-lime-500/10 border border-lime-500/15 px-3 py-1 text-xs font-medium text-lime-600 dark:text-lime-400">
              <span className="h-2 w-2 rounded-full bg-lime-500 animate-pulse" />
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
                      className="rounded-xl border border-border bg-card p-3 text-center"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1">{step}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleGenerateCode}
                  disabled={linkMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  <IconBrandTelegram className="h-4 w-4 mr-2" />
                  {linkMutation.isPending ? "Generating Link Code..." : "Link Telegram Account"}
                  <IconArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
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
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2.5">Quick steps:</p>
                  <ol className="text-sm text-foreground/80 space-y-2.5 pl-0">
                    {[
                      <>Open Telegram and search for <span className="font-semibold">@capybara13bot</span></>,
                      <>Send the command <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/link {linkCode}</code></>,
                      <>Done! Start sending expenses like <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Coffee 250</code></>,
                    ].map((content, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="flex items-center justify-center size-5 shrink-0 rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
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
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
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
                <div className="flex items-center justify-center size-6 rounded-lg bg-muted/80 dark:bg-muted">
                  <IconBell className="h-3.5 w-3.5 text-foreground/70" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
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

/**
 * Settings page component. Renders a section-based settings UI with a side navigation
 * panel (Profile, Integrations, Features, Appearance) and corresponding content sections
 * with smooth scroll-to behavior. Auth-guarded -- redirects to `/login` if unauthenticated.
 * @returns The settings page wrapped in the app sidebar layout.
 */
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
        <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
          {/* Ambient glow orbs */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
          </div>
          <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6 relative z-[1]">
            {loading ? (
              <div className="mx-auto w-full max-w-4xl space-y-5">
                <Skeleton className="h-28 w-full rounded-2xl border border-border" />
                <div className="flex gap-6">
                  <Skeleton className="hidden lg:block h-48 w-52 rounded-2xl border border-border" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-56 w-full rounded-2xl border border-border" />
                    <Skeleton className="h-40 w-full rounded-2xl border border-border" />
                    <Skeleton className="h-32 w-full rounded-2xl border border-border" />
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
                  className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
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
                        <div className="flex items-center justify-center size-8 rounded-xl bg-muted/80 dark:bg-muted">
                          <IconBrandTelegram className="h-4 w-4 text-foreground/70" />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70">
                          Integrations
                        </h3>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl border border-border" />}>
                          <ChatGPTCard />
                        </Suspense>
                        <TelegramCard />
                      </div>
                    </motion.div>

                    {/* ═══ Features ═══ */}
                    <motion.div
                      variants={fadeUp}
                      id="features"
                      ref={(el) => { sectionRefs.current.features = el }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center size-8 rounded-xl bg-muted/80 dark:bg-muted">
                          <IconPuzzle className="h-4 w-4 text-foreground/70" />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70">
                          Features
                        </h3>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* Money in Hours */}
                        <div className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                          <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center size-9 rounded-xl bg-muted/80 dark:bg-muted">
                                <IconClock className="h-4.5 w-4.5 text-foreground/70" />
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
                                    <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Your hourly rate</p>
                                        <p className="text-lg font-black tracking-tight tabular-nums">{formatINR(Math.round(computedRate))}<span className="text-xs font-normal text-muted-foreground">/hr</span></p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[11px] text-muted-foreground">A {formatINR(500)} expense</p>
                                        <p className="text-xs font-semibold text-lime-600 dark:text-lime-400">
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
                        <div className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                          <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center size-9 rounded-xl bg-muted/80 dark:bg-muted">
                                <IconGhost className="h-4.5 w-4.5 text-foreground/70" />
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
                        <div className="flex items-center justify-center size-8 rounded-xl bg-muted/80 dark:bg-muted">
                          <IconPalette className="h-4 w-4 text-foreground/70" />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70">
                          Appearance
                        </h3>
                      </div>

                      <div className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden px-5 py-4">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
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
