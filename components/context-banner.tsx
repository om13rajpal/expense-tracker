/**
 * Dismissible context banner for inline info, warning, success, and error messages.
 * @module components/context-banner
 */
"use client"

import * as React from "react"
import { useState } from "react"
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconCircleCheck,
  IconAlertCircle,
  IconX,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"

const variantStyles = {
  info: "border-blue-200 bg-blue-50/80 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  warning: "border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  success: "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  error: "border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
}

const variantIcons = {
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  success: IconCircleCheck,
  error: IconAlertCircle,
}

interface ContextBannerProps {
  variant: "info" | "warning" | "success" | "error"
  title: string
  description?: string
  dismissible?: boolean
  icon?: React.ReactNode
  className?: string
}

/**
 * Renders a colored banner with icon, title, optional description, and dismiss button.
 * @param variant - Visual severity: info, warning, success, or error.
 * @param title - Primary message.
 * @param dismissible - Whether the user can dismiss the banner (default true).
 */
export function ContextBanner({
  variant,
  title,
  description,
  dismissible = true,
  icon,
  className,
}: ContextBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const Icon = variantIcons[variant]

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        variantStyles[variant],
        className
      )}
    >
      <div className="shrink-0 mt-0.5">
        {icon ?? <Icon className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs opacity-80">{description}</p>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
