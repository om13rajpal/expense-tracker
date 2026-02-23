"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { IconFlame } from "@tabler/icons-react"

import { useAuth } from "@/hooks/use-auth"
import { useTransactions } from "@/hooks/use-transactions"
import { useGamification } from "@/hooks/use-gamification"
import { FinancialReels } from "@/components/ai/financial-reels"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

const TXN_QUERY = { limit: 500 } as const

export default function DiscoverPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { transactions, isLoading: txnLoading } = useTransactions(TXN_QUERY)
  const { streak, isLoading: gamLoading } = useGamification()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, authLoading, router])

  if (authLoading || !isAuthenticated) return null

  const isLoading = txnLoading || gamLoading

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Discover" subtitle="Fun facts from your finances" />
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <div className="@container/main flex flex-1 flex-col gap-5 p-4 md:p-6 max-w-2xl mx-auto w-full">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                <div className="text-center space-y-2">
                  <Skeleton className="h-6 w-48 mx-auto" />
                  <Skeleton className="h-4 w-64 mx-auto" />
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-[300px] rounded-2xl" />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FinancialReels transactions={transactions} streak={streak} />
              </motion.div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
