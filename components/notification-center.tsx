/**
 * Popup notification dropdown triggered from the site header bell icon.
 * Groups notifications by Today / Yesterday / Earlier and supports
 * mark-as-read, delete, and deep-link navigation.
 * @module components/notification-center
 */
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconBell,
  IconBellCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconCircleCheck,
  IconChecks,
  IconTrash,
} from "@tabler/icons-react"

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNotifications, type Notification } from "@/hooks/use-notifications"

// --- Helpers ----------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

function groupLabel(iso: string): "Today" | "Yesterday" | "Earlier" {
  const now = new Date()
  const d = new Date(iso)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  if (d >= todayStart) return "Today"
  if (d >= yesterdayStart) return "Yesterday"
  return "Earlier"
}

const severityConfig: Record<
  Notification["severity"],
  { icon: typeof IconAlertCircle; className: string }
> = {
  critical: { icon: IconAlertCircle, className: "text-red-500" },
  warning: { icon: IconAlertTriangle, className: "text-amber-500" },
  info: { icon: IconInfoCircle, className: "text-blue-500" },
  success: { icon: IconCircleCheck, className: "text-emerald-500" },
}

// --- Notification Item ------------------------------------------------------

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (url: string) => void
}) {
  const config = severityConfig[notification.severity] || severityConfig.info
  const Icon = config.icon

  return (
    <div
      className={cn(
        "group relative flex gap-2.5 rounded-md px-2.5 py-2 transition-colors",
        notification.read
          ? "opacity-50"
          : "bg-muted/40"
      )}
    >
      {/* Severity icon */}
      <div className="mt-0.5 shrink-0">
        <Icon className={cn("size-4", config.className)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-[13px] leading-tight",
              !notification.read && "font-medium text-foreground"
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground/60 mt-0.5">
            {relativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
          {notification.message}
        </p>

        {/* Action row */}
        <div className="mt-1 flex items-center gap-1.5">
          {notification.actionUrl && (
            <button
              onClick={() => {
                if (!notification.read) onMarkRead(notification._id)
                onNavigate(notification.actionUrl!)
              }}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              View details
            </button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {!notification.read && (
              <button
                onClick={() => onMarkRead(notification._id)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Mark as read"
              >
                <IconChecks className="size-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(notification._id)}
              className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Delete"
            >
              <IconTrash className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Empty State ------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center px-4">
      <div className="rounded-full bg-emerald-500/10 p-3">
        <IconBellCheck className="size-5 text-emerald-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          You're all caught up!
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Budget alerts, goal milestones, and weekly digests will appear here
        </p>
      </div>
    </div>
  )
}

// --- Notification Center ----------------------------------------------------

/** Notification bell icon with unread badge and a popover dropdown of grouped notifications. */
export function NotificationCenter() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    deleteNotification,
  } = useNotifications()

  function handleNavigate(url: string) {
    setOpen(false)
    router.push(url)
  }

  // Group notifications
  const grouped = React.useMemo(() => {
    const groups: Record<string, Notification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    }
    for (const n of notifications) {
      const label = groupLabel(n.createdAt)
      groups[label].push(n)
    }
    return groups
  }, [notifications])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <IconBell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconChecks className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto px-1.5 py-1.5">
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-0.5">
              {(["Today", "Yesterday", "Earlier"] as const).map((label) => {
                const items = grouped[label]
                if (items.length === 0) return null
                return (
                  <div key={label}>
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {label}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {items.map((n) => (
                        <NotificationItem
                          key={n._id}
                          notification={n}
                          onMarkRead={(id) => markAsRead([id])}
                          onDelete={deleteNotification}
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
