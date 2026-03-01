"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "motion/react"
import { IconAlertCircle, IconPencil, IconRefresh } from "@tabler/icons-react"

import { stagger } from "@/lib/motion"
import { getPartialMonthInfo } from "@/lib/edge-cases"
import { ContextBanner } from "@/components/context-banner"
import { useTransactions } from "@/hooks/use-transactions"
import { useAuth } from "@/hooks/use-auth"
import { getCurrentMonth, getMonthTransactions } from "@/lib/monthly-utils"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SyncButtonCompact } from "@/components/sync-button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { DashboardDataProvider } from "@/lib/dashboard-context"
import { WidgetGrid } from "@/components/dashboard/widget-grid"
import { EditModeOverlay } from "@/components/dashboard/edit-mode-overlay"
import { useDashboardLayout } from "@/hooks/use-dashboard-layout"

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    syncFromSheets,
    refresh,
    lastSync,
  } = useTransactions()

  const {
    widgets,
    isEditing,
    isLoading: layoutLoading,
    isSaving,
    toggleEditing,
    exitEditing,
    updateLayout,
    resizeWidget,
    removeWidget,
    addWidget,
    resetLayout,
  } = useDashboardLayout()

  // Auto-sync from Google Sheets on first authenticated mount
  const hasAutoSynced = useRef(false)
  useEffect(() => {
    if (isAuthenticated && !authLoading && !hasAutoSynced.current) {
      hasAutoSynced.current = true
      syncFromSheets(true).catch(() => {})
    }
  }, [isAuthenticated, authLoading, syncFromSheets])

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, authLoading, router])

  const isLoading = authLoading || transactionsLoading || layoutLoading

  // Get month transactions for the partial month info banner
  const { year, month } = getCurrentMonth()
  const monthTransactions = getMonthTransactions(transactions, year, month)

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
          title="Dashboard"
          actions={
            <div className="flex items-center gap-1.5">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleEditing}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <IconPencil className="size-4 mr-1" />
                  <span className="hidden sm:inline text-xs">Edit</span>
                </Button>
              )}
              <SyncButtonCompact
                onSync={async () => {
                  const r = await syncFromSheets(true)
                  if (r.success && r.subscriptionMatches > 0)
                    toast.success(
                      `${r.subscriptionMatches} subscription${r.subscriptionMatches > 1 ? "s" : ""} auto-detected as paid`
                    )
                }}
                lastSync={lastSync}
              />
            </div>
          }
        />
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto min-h-0 relative">
          {/* Ambient background glow */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/10 dark:bg-primary/5 blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-sky-300/10 dark:bg-sky-500/5 blur-[180px]" />
          </div>

          <div className="flex flex-1 flex-col p-3 md:p-4 relative z-[1]">
            {isLoading ? (
              <DashboardLoadingSkeleton />
            ) : transactionsError ? (
              <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] gap-4">
                <IconAlertCircle className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Failed to load data</h3>
                  <p className="text-sm text-muted-foreground mt-1">{transactionsError}</p>
                </div>
                <Button variant="outline" onClick={() => refresh()}>
                  <IconRefresh className="mr-2 h-4 w-4" /> Try Again
                </Button>
              </div>
            ) : (
              <DashboardDataProvider transactions={transactions} isLoading={isLoading}>
                {/* Edit mode overlay */}
                <EditModeOverlay
                  isEditing={isEditing}
                  isSaving={isSaving}
                  activeWidgetIds={widgets.map(w => w.i)}
                  onDone={exitEditing}
                  onReset={resetLayout}
                  onAddWidget={addWidget}
                />

                {/* Partial month banner */}
                {(() => {
                  const partialInfo = getPartialMonthInfo(monthTransactions, year, month)
                  return partialInfo.isPartial ? (
                    <div className="mb-4">
                      <ContextBanner variant="info" title={partialInfo.message} />
                    </div>
                  ) : null
                })()}

                {/* The widget grid */}
                <WidgetGrid
                  widgets={widgets}
                  isEditing={isEditing}
                  onLayoutChange={updateLayout}
                  onRemove={removeWidget}
                  onResize={resizeWidget}
                />
              </DashboardDataProvider>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/* ─── Loading Skeleton ─── */

function DashboardLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <div className="col-span-2 row-span-2 rounded-2xl border border-border bg-card p-7 min-h-[320px]">
        <Skeleton className="h-4 w-32 mb-6" />
        <Skeleton className="h-14 w-56 mb-6" />
        <Skeleton className="h-20 w-full rounded-lg mb-4" />
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          {[0, 1, 2].map(i => <div key={i} className="space-y-1"><Skeleton className="h-2 w-12" /><Skeleton className="h-5 w-20" /></div>)}
        </div>
      </div>
      {[0, 1].map(i => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6">
          <Skeleton className="size-10 rounded-xl mb-3" />
          <Skeleton className="h-2.5 w-14 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
      <div className="col-span-2 rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="col-span-2 row-span-2 rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-28 mb-4" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
      <div className="col-span-2 rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-24 mb-4" />
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-4 w-full mb-3" />)}
      </div>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="size-9 rounded-lg mb-2" />
          <Skeleton className="h-2 w-14 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
