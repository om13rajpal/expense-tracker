/**
 * Google Sheets sync button with loading spinner, toast feedback, and "last synced" tooltip.
 * Exports both a full-size (`SyncButton`) and a toolbar-friendly (`SyncButtonCompact`) variant.
 * @module components/sync-button
 */
"use client"

import * as React from "react"
import { IconRefresh, IconCheck, IconAlertCircle } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Props for the SyncButton component.
 * @property onSync    - Async callback performing the actual sync. Defaults to a 2s mock delay.
 * @property variant   - Button style variant (default "outline").
 * @property size      - Button size variant (default "default").
 * @property showLabel - Whether to display the "Sync with Sheets" label (default true).
 * @property className - Additional CSS classes for the button.
 */
interface SyncButtonProps {
  onSync?: () => Promise<void>
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
  className?: string
}

/** Full-size sync button with optional label and last-sync timestamp. */
export function SyncButton({
  onSync,
  variant = "outline",
  size = "default",
  showLabel = true,
  className,
}: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null)

  const handleSync = async () => {
    setIsSyncing(true)

    try {
      // If custom sync function provided, use it
      if (onSync) {
        await onSync()
      } else {
        // Default mock sync behavior
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      setLastSyncTime(new Date())
      toast.success("Sync completed", {
        description: "Your transactions have been updated from Google Sheets.",
        icon: <IconCheck className="size-4" />,
      })
    } catch (error) {
      console.error("Sync failed:", error)
      toast.error("Sync failed", {
        description: "Failed to sync with Google Sheets. Please try again.",
        icon: <IconAlertCircle className="size-4" />,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = () => {
    if (!lastSyncTime) return "Never synced"

    const now = new Date()
    const diffMs = now.getTime() - lastSyncTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return lastSyncTime.toLocaleDateString()
  }

  if (!showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={handleSync}
              disabled={isSyncing}
              className={className}
            >
              <IconRefresh
                className={`size-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Sync with Google Sheets</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              <div className="font-medium">Sync with Google Sheets</div>
              <div className="text-xs text-muted-foreground">
                Last sync: {formatLastSync()}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleSync}
        disabled={isSyncing}
        className={className}
      >
        <IconRefresh
          className={`size-4 ${isSyncing ? "animate-spin" : ""}`}
        />
        {isSyncing ? "Syncing..." : "Sync with Sheets"}
      </Button>
      {lastSyncTime && (
        <div className="text-xs text-muted-foreground text-center">
          Last sync: {formatLastSync()}
        </div>
      )}
    </div>
  )
}

/** Compact sync button for headers and toolbars. Uses toast.promise for feedback. */
export function SyncButtonCompact({
  onSync,
  className,
  lastSync,
}: Pick<SyncButtonProps, "onSync" | "className"> & { lastSync?: string | null }) {
  const [isSyncing, setIsSyncing] = React.useState(false)

  const handleSync = async () => {
    setIsSyncing(true)

    const promise = onSync
      ? onSync()
      : new Promise((resolve) => setTimeout(resolve, 2000))

    toast.promise(promise, {
      loading: "Syncing with Google Sheets...",
      success: "Transactions updated successfully",
      error: "Failed to sync. Please try again.",
    })

    try {
      await promise
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (iso: string | null | undefined): string => {
    if (!iso) return "Never synced"
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(iso).toLocaleDateString()
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className={className}
          >
            <IconRefresh
              className={`size-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            <span className="hidden lg:inline">Sync</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-1">
            <div className="font-medium">Sync with Google Sheets</div>
            <div className="text-xs text-muted-foreground">
              Last sync: {formatLastSync(lastSync)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
