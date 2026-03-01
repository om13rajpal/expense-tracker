/**
 * @module app/bills/page
 * @description Bills hub page for Finova. Consolidates three billing-related features
 * into a single tabbed interface: Subscriptions (recurring payment tracker), Splits
 * (expense splitting and group settlements), and Tax (Indian tax planner). The active
 * tab is driven by the `?tab=` URL parameter, defaulting to "subscriptions". Each tab
 * renders a dedicated view component (`SubscriptionsView`, `SplitsView`, `TaxView`).
 */
"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  IconCreditCard,
  IconReceipt2,
  IconUsers,
} from "@tabler/icons-react"

import { useAuth } from "@/hooks/use-auth"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { SubscriptionsView } from "@/components/bills/subscriptions-view"
import { SplitsView } from "@/components/bills/splits-view"
import { TaxView } from "@/components/bills/tax-view"

const VALID_TABS = ["subscriptions", "splits", "tax"] as const
type TabValue = (typeof VALID_TABS)[number]

const TAB_CONFIG: { value: TabValue; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "subscriptions", label: "Subscriptions", icon: IconCreditCard },
  { value: "splits", label: "Split Expenses", icon: IconUsers },
  { value: "tax", label: "Tax Planner", icon: IconReceipt2 },
]

export default function BillsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const tabParam = searchParams.get("tab")
  const activeTab: TabValue =
    tabParam && VALID_TABS.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : "subscriptions"

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/")
  }, [authLoading, isAuthenticated, router])

  const handleTabChange = (value: TabValue) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "subscriptions") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const qs = params.toString()
    router.replace(`/bills${qs ? `?${qs}` : ""}`, { scroll: false })
  }

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
          <SiteHeader title="Tax & Bills" />
          <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
            <div className="page-content pt-6">
              <Skeleton className="h-11 w-full max-w-md rounded-xl" />
              <div className="metric-grid">
                <Skeleton className="h-24 rounded-2xl border border-border" />
                <Skeleton className="h-24 rounded-2xl border border-border" />
                <Skeleton className="h-24 rounded-2xl border border-border" />
              </div>
              <Skeleton className="h-96 rounded-2xl border border-border" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
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
        <SiteHeader title="Tax & Bills" />
        <div className="relative flex flex-1 flex-col overflow-y-auto min-h-0">
          {/* Ambient background glows */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
          </div>

          <div className="relative z-[1] @container/main flex flex-1 flex-col gap-0">
            {/* Apple-style pill tab bar */}
            <div className="sticky top-0 z-10 px-4 pt-4 pb-3 sm:px-6 lg:px-8">
              <div className="tab-scroll">
                {TAB_CONFIG.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.value
                  return (
                    <button
                      key={tab.value}
                      onClick={() => handleTabChange(tab.value)}
                      className={cn(
                        "relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 shrink-0",
                        isActive
                          ? "bg-card/80 backdrop-blur-xl border border-border/50 text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      {isActive && (
                        <motion.div
                          layoutId="bills-tab-indicator"
                          className="absolute inset-0 rounded-xl bg-card/80 backdrop-blur-xl border border-border/50 -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab content with crossfade */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="flex-1"
              >
                {activeTab === "subscriptions" && <SubscriptionsView />}
                {activeTab === "splits" && <SplitsView />}
                {activeTab === "tax" && <TaxView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
