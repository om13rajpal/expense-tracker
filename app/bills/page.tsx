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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { SubscriptionsView } from "@/components/bills/subscriptions-view"
import { SplitsView } from "@/components/bills/splits-view"
import { TaxView } from "@/components/bills/tax-view"

const VALID_TABS = ["subscriptions", "splits", "tax"] as const
type TabValue = (typeof VALID_TABS)[number]

/**
 * Bills page component. Renders a three-tab layout (Subscriptions, Splits, Tax)
 * with URL-synced tab state. Delegates to `SubscriptionsView`, `SplitsView`, and
 * `TaxView` respectively. Auth-guarded -- redirects to login if unauthenticated.
 * @returns The bills page wrapped in the app sidebar layout.
 */
export default function BillsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Read tab from URL, default to "subscriptions"
  const tabParam = searchParams.get("tab")
  const activeTab: TabValue =
    tabParam && VALID_TABS.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : "subscriptions"

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/")
  }, [authLoading, isAuthenticated, router])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
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
            <div className="space-y-4 p-4">
              <Skeleton className="h-10 w-80" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
          </div>
          <div className="relative z-[1] @container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 flex-col">
              <div className="border-b border-border">
                <TabsList variant="line" className="h-10">
                  <TabsTrigger value="subscriptions">
                    <IconCreditCard className="h-4 w-4" />
                    Subscriptions
                  </TabsTrigger>
                  <TabsTrigger value="splits">
                    <IconUsers className="h-4 w-4" />
                    Split Expenses
                  </TabsTrigger>
                  <TabsTrigger value="tax">
                    <IconReceipt2 className="h-4 w-4" />
                    Tax Planner
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="subscriptions" className="flex-1 mt-0">
                <SubscriptionsView />
              </TabsContent>
              <TabsContent value="splits" className="flex-1 mt-0">
                <SplitsView />
              </TabsContent>
              <TabsContent value="tax" className="flex-1 mt-0">
                <TaxView />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
