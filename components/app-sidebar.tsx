"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconCalculator,
  IconChartLine,
  IconDashboard,
  IconHeartbeat,
  IconReceipt,
  IconReceipt2,
  IconRepeat,
  IconTarget,
  IconWallet,
  IconPigMoney,
  IconSparkles,
  IconTrendingUp,
  IconHome,
  IconCalendarStats,
  IconBuildingBank,
  IconRobot,
  IconSchool,
} from "@tabler/icons-react"

import { NavMain, type NavGroup } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { HelpDialog } from "@/components/help-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Om Rajpal",
    email: "omrajpal",
    avatar: "/avatars/user.jpg",
  },
  navGroups: [
    {
      label: "Overview",
      icon: IconHome,
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: IconDashboard,
          description: "Monthly overview of income, expenses, and balance",
        },
        {
          title: "Transactions",
          url: "/transactions",
          icon: IconReceipt,
          description: "Browse, search, and filter all transactions",
        },
      ],
    },
    {
      label: "Planning",
      icon: IconCalendarStats,
      items: [
        {
          title: "Analytics",
          url: "/analytics",
          icon: IconChartLine,
          description: "Spending trends, categories, and weekly patterns",
        },
        {
          title: "Budget",
          url: "/budget",
          icon: IconWallet,
          description: "Set budgets and track spending against limits",
        },
        {
          title: "Finance Planner",
          url: "/planner",
          icon: IconCalculator,
          description: "Plan income allocation across investments, savings, needs & wants",
        },
        {
          title: "Tax Planner",
          url: "/tax",
          icon: IconReceipt2,
          description: "Estimate income tax under Old and New regimes (FY 2025-26)",
        },
        {
          title: "Subscriptions",
          url: "/subscriptions",
          icon: IconRepeat,
          description: "Track recurring payments and subscriptions",
        },
      ],
    },
    {
      label: "Wealth",
      icon: IconBuildingBank,
      items: [
        {
          title: "Investments",
          url: "/investments",
          icon: IconTrendingUp,
          description: "Stocks, mutual funds, and SIP portfolio",
        },
        {
          title: "Financial Health",
          url: "/financial-health",
          icon: IconHeartbeat,
          description: "Freedom score, emergency fund, and wellness metrics",
        },
        {
          title: "Goals",
          url: "/goals",
          icon: IconTarget,
          description: "Savings goals, FIRE calculator, and projections",
        },
      ],
    },
    {
      label: "Intelligence",
      icon: IconSparkles,
      items: [
        {
          title: "AI Insights",
          url: "/ai-insights",
          icon: IconSparkles,
          description: "AI-powered analysis of your financial data",
        },
        {
          title: "Finance Agent",
          url: "/agent",
          icon: IconRobot,
          description: "Chat with an AI advisor about your finances",
        },
        {
          title: "Learn",
          url: "/learn",
          icon: IconSchool,
          description: "Master financial concepts and investment basics",
        },
      ],
    },
  ] satisfies NavGroup[],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconPigMoney className="!size-5" />
                <span className="text-base font-semibold">Finance Tracker</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={data.navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <HelpDialog />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
