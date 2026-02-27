/**
 * Sidebar navigation with flat nav items and a standalone Dashboard link.
 * @module components/nav-main
 */
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type Icon, IconDashboard } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

/**
 * Shape of a flat navigation item.
 * @property title - Display label shown in the sidebar.
 * @property url   - Route path the link navigates to.
 * @property icon  - Tabler icon component rendered beside the title.
 */
export interface NavItem {
  title: string
  url: string
  icon: Icon
}

/**
 * Primary sidebar nav rendering a standalone Dashboard link followed by flat nav items.
 * @param items - Array of navigation items to render.
 * @param dashboardActive - Whether the Dashboard link should be highlighted.
 */
export function NavMain({ items, dashboardActive }: { items: NavItem[]; dashboardActive?: boolean }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="space-y-0.5">
        {/* Dashboard - standalone top item */}
        <Link
          href="/dashboard"
          className={cn(
            "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
            dashboardActive
              ? "text-sidebar-primary-foreground bg-gradient-to-r from-primary/90 to-primary/70 shadow-[0_0_20px_-4px] shadow-primary/25"
              : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.04]"
          )}
        >
          <IconDashboard
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              dashboardActive
                ? "text-sidebar-primary-foreground"
                : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60"
            )}
          />
          <span>Dashboard</span>
        </Link>

        {/* Flat nav items */}
        {items.map((item) => {
          const isActive = pathname.startsWith(item.url.split("?")[0])
          const ItemIcon = item.icon

          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-sidebar-primary-foreground bg-gradient-to-r from-primary/90 to-primary/70 shadow-[0_0_20px_-4px] shadow-primary/25"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.04]"
              )}
            >
              <ItemIcon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60"
                )}
              />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
