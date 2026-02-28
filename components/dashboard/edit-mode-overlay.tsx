"use client"

/**
 * Edit mode top bar overlay with Done/Reset buttons.
 * Slides in smoothly when entering edit mode.
 * @module components/dashboard/edit-mode-overlay
 */

import { useRef, useEffect, useState } from "react"
import { IconCheck, IconArrowBackUp, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { WidgetPicker } from "./widget-picker"
import type { WidgetSize } from "@/lib/widget-registry"

interface EditModeOverlayProps {
  isEditing: boolean
  isSaving: boolean
  activeWidgetIds: string[]
  onDone: () => void
  onReset: () => void
  onAddWidget: (widgetId: string, size: WidgetSize) => void
}

export function EditModeOverlay({
  isEditing,
  isSaving,
  activeWidgetIds,
  onDone,
  onReset,
  onAddWidget,
}: EditModeOverlayProps) {
  // Keep mounted briefly after exit for exit animation
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (isEditing) {
      setMounted(true)
      // Trigger enter animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      // Unmount after exit transition
      timeoutRef.current = setTimeout(() => setMounted(false), 300)
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [isEditing])

  if (!mounted) return null

  return (
    <div
      className="sticky top-0 z-40 -mx-3 md:-mx-4 mb-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card/80 backdrop-blur-xl border border-primary/20 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">Editing Dashboard</span>
          {isSaving && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-1">
              <IconLoader2 className="size-3 animate-spin" /> Saving...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <WidgetPicker activeWidgetIds={activeWidgetIds} onAdd={onAddWidget} />
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <IconArrowBackUp className="size-4 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={onDone}
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
          >
            <IconCheck className="size-4 mr-1" />
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
