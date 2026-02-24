/**
 * Application sidebar with flat nav items, a dashboard link, and user menu.
 * @module components/app-sidebar
 */
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconChecklist,
  IconDashboard,
  IconFileInvoice,
  IconPigMoney,
  IconReceipt2,
  IconSparkles,
  IconTargetArrow,
  IconTrendingUp,
} from "@tabler/icons-react"

import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { SidebarXP } from "@/components/sidebar-xp"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

/** Flat list of primary sidebar navigation items (Money through Bucket List). */
const navItems: NavItem[] = [
  { title: "Money",        url: "/money",        icon: IconReceipt2 },
  { title: "Budget",       url: "/budget",       icon: IconPigMoney },
  { title: "Goals",        url: "/goals",        icon: IconTargetArrow },
  { title: "Investments",  url: "/investments",  icon: IconTrendingUp },
  { title: "Tax & Bills",  url: "/bills",        icon: IconFileInvoice },
  { title: "AI Assistant", url: "/ai",           icon: IconSparkles },
  { title: "Bucket List",  url: "/bucket-list",  icon: IconChecklist },
]

/** Static user profile data shown in the sidebar footer. */
const userData = {
  name: "Om Rajpal",
  email: "omrajpal",
  avatar: "",
}

/** Off-canvas sidebar with flat navigation and user footer. */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const isDashboard = pathname === "/dashboard" || pathname === "/"

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
                <span className="text-base font-semibold">Finova</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2 py-2">
        <NavMain dashboardActive={isDashboard} items={navItems} />
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarXP />
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
