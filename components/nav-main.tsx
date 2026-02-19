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

/** Shape of a flat navigation item. */
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
            "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-150",
            dashboardActive
              ? "text-primary bg-primary/8"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <IconDashboard
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              dashboardActive
                ? "text-primary"
                : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60"
            )}
          />
          <span>Dashboard</span>
        </Link>

        {/* Flat nav items */}
        {items.map((item) => {
          const isActive = pathname.startsWith(item.url)
          const ItemIcon = item.icon

          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "text-primary bg-primary/8"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <ItemIcon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60"
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
