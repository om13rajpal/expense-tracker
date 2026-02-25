/**
 * @module app/ai/page
 * @description Unified AI Assistant hub for Finova. Consolidates three AI-powered
 * features into a single tabbed interface: Chat (conversational AI agent), Reports
 * (AI-generated financial reports/insights), and Learn (financial literacy education).
 * The active tab is controlled via the `?tab=` URL search parameter, defaulting to "chat".
 * Each tab renders a dedicated view component (`ChatView`, `ReportsView`, `LearnView`).
 */
"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  IconRobot,
  IconReportAnalytics,
  IconSchool,
} from "@tabler/icons-react"

import { useAuth } from "@/hooks/use-auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatView } from "@/components/ai/chat-view"
import { ReportsView } from "@/components/ai/reports-view"
import { LearnView } from "@/components/ai/learn-view"

const VALID_TABS = ["chat", "reports", "learn"] as const
type TabValue = (typeof VALID_TABS)[number]

/**
 * AI Assistant page component. Renders a tabbed layout with Chat, Reports,
 * and Learn tabs. Reads the initial tab from the `?tab=` search parameter and
 * delegates rendering to `ChatView`, `ReportsView`, or `LearnView` respectively.
 * Auth-guarded -- redirects to `/login` if the user is not authenticated.
 * @returns The AI assistant page wrapped in the app sidebar layout.
 */
export default function AiPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get("tab")
  const defaultTab: TabValue =
    tabParam && VALID_TABS.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : "chat"

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, authLoading, router])

  if (authLoading || !isAuthenticated) return null

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-dvh overflow-hidden">
        <SiteHeader title="AI Assistant" />
        <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border/40 px-4 overflow-x-auto">
            <TabsList variant="line" className="inline-flex h-10 items-center gap-1 bg-transparent p-0">
              <TabsTrigger
                value="chat"
                className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                <IconRobot className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                <IconReportAnalytics className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger
                value="learn"
                className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                <IconSchool className="h-4 w-4" />
                Learn
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
            <ChatView />
          </TabsContent>
          <TabsContent value="reports" className="flex-1 overflow-auto mt-0">
            <ReportsView />
          </TabsContent>
          <TabsContent value="learn" className="flex-1 overflow-auto mt-0">
            <LearnView />
          </TabsContent>
        </Tabs>
      </SidebarInset>
    </SidebarProvider>
  )
}
