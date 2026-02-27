/**
 * @module app/cron/page
 * @description Cron Jobs admin dashboard for Finova. Displays the status
 * of scheduled background jobs (price refresh, sheet sync, AI analysis),
 * allows manual triggering of individual jobs via a CRON_SECRET prompt,
 * and shows a table of the 10 most recent cron execution history entries.
 * Status and history data are fetched from `/api/cron/status`.
 */
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  IconClock,
  IconPlayerPlay,
  IconCheck,
  IconX,
  IconRefresh,
} from "@tabler/icons-react"

import { useAuth } from "@/hooks/use-auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface CronJobStatus {
  status: string
  results?: Record<string, unknown> | null
  error?: string | null
  startedAt?: string
  finishedAt?: string
  durationMs?: number | null
}

interface CronHistoryEntry {
  job: string
  status: string
  startedAt: string
  finishedAt: string
  durationMs: number | null
  error: string | null
}

const JOB_CONFIG: Record<string, { label: string; description: string; schedule: string }> = {
  prices: {
    label: "Price Refresh",
    description: "Updates stock prices and mutual fund NAVs from Yahoo Finance and MFAPI",
    schedule: "Weekdays at 10:00 AM IST",
  },
  sync: {
    label: "Sheet Sync",
    description: "Syncs transactions from Google Sheets into MongoDB",
    schedule: "Every 6 hours",
  },
  analyze: {
    label: "AI Analysis",
    description: "Generates weekly AI spending analysis for all users",
    schedule: "Mondays at 9:00 AM IST",
  },
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds, or null/undefined.
 * @returns A formatted string like "1.2s" or "350ms", or "-" if no value.
 */
function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "-"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Formats an ISO timestamp to a localized Indian date-time string.
 * @param iso - An ISO 8601 date string, or undefined.
 * @returns A locale-formatted string like "24 Feb 2026, 10:00 AM", or "Never".
 */
function formatTime(iso: string | undefined): string {
  if (!iso) return "Never"
  const d = new Date(iso)
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/**
 * Returns a styled Badge component reflecting the cron job execution status.
 * @param status - One of "success", "error", "skipped", or any other value (renders "Never run").
 * @returns A JSX Badge element with appropriate color and icon.
 */
function statusBadge(status: string) {
  if (status === "success") {
    return (
      <Badge className="bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-800">
        <IconCheck className="h-3 w-3 mr-1" /> Success
      </Badge>
    )
  }
  if (status === "error") {
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
        <IconX className="h-3 w-3 mr-1" /> Error
      </Badge>
    )
  }
  if (status === "skipped") {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">
        Skipped
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <IconClock className="h-3 w-3 mr-1" /> Never run
    </Badge>
  )
}

/**
 * Cron Jobs dashboard page component. Renders job status cards for each
 * configured cron job, a manual trigger button (requires CRON_SECRET),
 * and a recent-runs history table. Auth-guarded -- redirects to `/login`
 * if the user is not authenticated.
 * @returns The cron dashboard wrapped in the app sidebar layout.
 */
export default function CronPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [jobStatus, setJobStatus] = useState<Record<string, CronJobStatus>>({})
  const [history, setHistory] = useState<CronHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) loadStatus()
  }, [isAuthenticated])

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/cron/status")
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setJobStatus(data.status || {})
        setHistory(data.history || [])
      }
    } catch (err) {
      console.error("Failed to load cron status:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTrigger = async (job: string) => {
    setTriggering(job)
    setTriggerMessage(null)
    try {
      const cronSecret = prompt("Enter CRON_SECRET to trigger this job:")
      if (!cronSecret) {
        setTriggering(null)
        return
      }
      const res = await fetch(`/api/cron/${job}`, {
        headers: { "x-cron-secret": cronSecret },
      })
      const data = await res.json()
      if (data.success) {
        setTriggerMessage(`${JOB_CONFIG[job]?.label || job} completed successfully`)
        await loadStatus()
      } else {
        setTriggerMessage(`Failed: ${data.message || "Unknown error"}`)
      }
    } catch {
      setTriggerMessage("Network error")
    } finally {
      setTriggering(null)
      setTimeout(() => setTriggerMessage(null), 4000)
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
        <SiteHeader
          title="Cron Jobs"
          actions={
            <>
              {triggerMessage && (
                <Badge variant="outline" className="text-xs">
                  {triggerMessage}
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={loadStatus}>
                <IconRefresh className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </>
          }
        />
        <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
          {/* Ambient glow orbs */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Skeleton className="h-96 w-full max-w-4xl mx-6" />
            </div>
          ) : (
            <div className="space-y-6 p-6 relative z-[1]">
              {/* Job cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(JOB_CONFIG).map(([key, config]) => {
                  const status = jobStatus[key]
                  return (
                    <Card key={key} className="rounded-2xl border border-border relative overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{config.label}</CardTitle>
                          {statusBadge(status?.status || "never_run")}
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Schedule</p>
                            <p className="font-medium text-xs">{config.schedule}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Last Run</p>
                            <p className="font-medium text-xs">{formatTime(status?.finishedAt)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="font-medium text-xs">{formatDuration(status?.durationMs)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="font-medium text-xs capitalize">{status?.status || "Never run"}</p>
                          </div>
                        </div>
                        {status?.error && (
                          <p className="text-xs text-destructive bg-destructive/5 p-2 rounded-xl">
                            {status.error}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={triggering === key}
                          onClick={() => handleTrigger(key)}
                        >
                          <IconPlayerPlay className="h-3.5 w-3.5 mr-1" />
                          {triggering === key ? "Running..." : "Trigger Now"}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Recent run history */}
              <Card className="rounded-2xl border border-border relative overflow-hidden">
                <CardHeader>
                  <CardTitle>Recent Runs</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Last 10 cron executions across all jobs
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Finished</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No cron runs recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        history.map((entry, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {JOB_CONFIG[entry.job]?.label || entry.job}
                            </TableCell>
                            <TableCell>{statusBadge(entry.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTime(entry.startedAt)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTime(entry.finishedAt)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatDuration(entry.durationMs)}
                            </TableCell>
                            <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                              {entry.error || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
