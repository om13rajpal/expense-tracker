"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionView } from "@/components/money/transaction-view"
import { AnalyticsView } from "@/components/money/analytics-view"

export default function MoneyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const tab = searchParams.get("tab") || "transactions"

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "transactions") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const qs = params.toString()
    router.replace(`/money${qs ? `?${qs}` : ""}`, { scroll: false })
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
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
        <SiteHeader title="Money" />
        <div className="flex flex-1 flex-col">
          <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-1 flex-col">
            <div className="border-b border-border/40 px-4 md:px-6">
              <TabsList variant="line" className="inline-flex h-10 items-center gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="transactions"
                  className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  Transactions
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="transactions" className="flex-1 mt-0">
              <TransactionView />
            </TabsContent>
            <TabsContent value="analytics" className="flex-1 mt-0">
              <AnalyticsView />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
