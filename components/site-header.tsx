/**
 * Sticky site header with sidebar trigger, page title, command palette,
 * notifications, and theme toggler.
 * @module components/site-header
 */
"use client"

import * as React from "react"

import { Spotlight } from "@/components/spotlight"
import { NotificationCenter } from "@/components/notification-center"
import { StreakCounter } from "@/components/streak-counter"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

/**
 * Props for the SiteHeader component.
 * @property title    - Page title displayed in the header (defaults to "Dashboard").
 * @property subtitle - Optional secondary text beside the title.
 * @property actions  - Extra React nodes rendered in the right-side action area.
 */
interface SiteHeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

/**
 * Renders a sticky header bar with optional title, subtitle, and action slot.
 * @param title - Page title displayed in the header (defaults to "Dashboard").
 * @param subtitle - Optional secondary text beside the title.
 * @param actions - Extra React nodes rendered in the right-side action area.
 */
export function SiteHeader({
  title = "Dashboard",
  subtitle,
  actions,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) relative">
      {/* Gradient bottom border */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 opacity-50"
        />
        <div className="flex flex-1 items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-sm sm:text-base lg:text-lg font-semibold tracking-tight text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <>
                  <span className="hidden sm:inline text-muted-foreground/40 text-sm select-none" aria-hidden="true">&middot;</span>
                  <span className="hidden sm:inline text-xs font-normal text-muted-foreground/70 truncate max-w-[200px]">
                    {subtitle}
                  </span>
                </>
              )}
            </div>
            {subtitle && (
              <span className="block sm:hidden text-[11px] font-normal text-muted-foreground/60 truncate max-w-[180px]">
                {subtitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">
            <Spotlight />
            {actions}
            <span className="hidden sm:inline-flex"><StreakCounter linkTo="/gamification" /></span>
            <NotificationCenter />
          </div>
        </div>
      </div>
    </header>
  )
}
