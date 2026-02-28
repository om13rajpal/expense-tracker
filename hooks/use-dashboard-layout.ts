"use client"

/**
 * Hook for fetching, saving, and editing the dashboard widget layout.
 * Provides debounced persistence to MongoDB via the settings API.
 * @module hooks/use-dashboard-layout
 */

import { useState, useCallback, useEffect, useRef } from "react"
import {
  DEFAULT_DASHBOARD_LAYOUT,
  WIDGET_SIZES,
  type DashboardLayout,
  type WidgetLayoutItem,
  type WidgetSize,
} from "@/lib/widget-registry"

interface LayoutState {
  widgets: WidgetLayoutItem[]
  isEditing: boolean
  isLoading: boolean
  isSaving: boolean
}

export function useDashboardLayout() {
  const [state, setState] = useState<LayoutState>({
    widgets: DEFAULT_DASHBOARD_LAYOUT,
    isEditing: false,
    isLoading: true,
    isSaving: false,
  })
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const widgetsRef = useRef(state.widgets)
  widgetsRef.current = state.widgets

  // Fetch layout on mount
  useEffect(() => {
    fetch("/api/settings/dashboard-layout", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success && data.layout?.widgets?.length > 0) {
          setState(prev => ({ ...prev, widgets: data.layout.widgets, isLoading: false }))
        } else {
          setState(prev => ({ ...prev, isLoading: false }))
        }
      })
      .catch(() => setState(prev => ({ ...prev, isLoading: false })))
  }, [])

  // Debounced save
  const saveLayout = useCallback((widgets: WidgetLayoutItem[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setState(prev => ({ ...prev, isSaving: true }))
      try {
        const body: DashboardLayout = {
          version: 1,
          widgets,
          updatedAt: new Date().toISOString(),
        }
        await fetch("/api/settings/dashboard-layout", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } catch {
        // Silent fail — layout will resave on next interaction
      } finally {
        setState(prev => ({ ...prev, isSaving: false }))
      }
    }, 1000)
  }, [])

  // Toggle edit mode
  const toggleEditing = useCallback(() => {
    setState(prev => ({ ...prev, isEditing: !prev.isEditing }))
  }, [])

  const exitEditing = useCallback(() => {
    setState(prev => ({ ...prev, isEditing: false }))
    saveLayout(widgetsRef.current)
  }, [saveLayout])

  // Update layout from grid drag
  const updateLayout = useCallback((newLayout: { i: string; x: number; y: number; w: number; h: number }[]) => {
    setState(prev => {
      const updated = prev.widgets.map(widget => {
        const found = newLayout.find(l => l.i === widget.i)
        if (!found) return widget
        return { ...widget, x: found.x, y: found.y, w: found.w, h: found.h }
      })
      return { ...prev, widgets: updated }
    })
    saveLayout(widgetsRef.current)
  }, [saveLayout])

  // Resize a widget by preset
  const resizeWidget = useCallback((widgetId: string, newSize: WidgetSize) => {
    setState(prev => {
      const dim = WIDGET_SIZES[newSize]
      const updated = prev.widgets.map(w =>
        w.i === widgetId ? { ...w, w: dim.w, h: dim.h, size: newSize } : w
      )
      return { ...prev, widgets: updated }
    })
    // Save after state updates
    setTimeout(() => saveLayout(widgetsRef.current), 0)
  }, [saveLayout])

  // Remove a widget
  const removeWidget = useCallback((widgetId: string) => {
    setState(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.i !== widgetId),
    }))
    setTimeout(() => saveLayout(widgetsRef.current), 0)
  }, [saveLayout])

  // Add a widget
  const addWidget = useCallback((widgetId: string, size: WidgetSize) => {
    setState(prev => {
      if (prev.widgets.some(w => w.i === widgetId)) return prev
      const dim = WIDGET_SIZES[size]
      // Place at the bottom
      const maxY = prev.widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0)
      const newWidget: WidgetLayoutItem = {
        i: widgetId,
        x: 0,
        y: maxY,
        w: dim.w,
        h: dim.h,
        size,
      }
      return { ...prev, widgets: [...prev.widgets, newWidget] }
    })
    setTimeout(() => saveLayout(widgetsRef.current), 0)
  }, [saveLayout])

  // Reset to defaults
  const resetLayout = useCallback(() => {
    setState(prev => ({ ...prev, widgets: DEFAULT_DASHBOARD_LAYOUT }))
    saveLayout(DEFAULT_DASHBOARD_LAYOUT)
  }, [saveLayout])

  return {
    widgets: state.widgets,
    isEditing: state.isEditing,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    toggleEditing,
    exitEditing,
    updateLayout,
    resizeWidget,
    removeWidget,
    addWidget,
    resetLayout,
  }
}
