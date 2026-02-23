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
          <div className="flex flex-1 flex-col">
            <div className="space-y-4 p-4">
              <Skeleton className="h-10 w-80" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
              <Skeleton className="h-96 rounded-xl" />
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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 flex-col">
              <div className="border-b border-border/40 overflow-x-auto">
                <TabsList variant="line" className="inline-flex h-10 items-center gap-1 bg-transparent p-0 min-w-max">
                  <TabsTrigger
                    value="subscriptions"
                    className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  >
                    <IconCreditCard className="h-4 w-4" />
                    Subscriptions
                  </TabsTrigger>
                  <TabsTrigger
                    value="splits"
                    className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  >
                    <IconUsers className="h-4 w-4" />
                    Split Expenses
                  </TabsTrigger>
                  <TabsTrigger
                    value="tax"
                    className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  >
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
