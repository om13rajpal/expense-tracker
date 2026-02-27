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
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden dark:block">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-lime-500/[0.05] blur-[200px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[180px]" />
        </div>
        <div className="relative z-[1] flex h-full flex-col overflow-hidden">
        <SiteHeader title="AI Assistant" />
        <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-4">
            <TabsList variant="line" className="h-10">
              <TabsTrigger value="chat">
                <IconRobot className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="reports">
                <IconReportAnalytics className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="learn">
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
