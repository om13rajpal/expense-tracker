"use client"

/**
 * WidgetGrid — react-grid-layout wrapper for the customizable dashboard.
 * Handles responsive breakpoints, drag/drop, and layout callbacks.
 *
 * Uses dynamic import because react-grid-layout requires browser APIs (window)
 * and cannot be server-side rendered.
 *
 * IMPORTANT: Layout persistence only happens on user drag (onDragStop), NOT on
 * onLayoutChange which fires on every breakpoint switch and would corrupt the
 * lg layout with md/sm single-column positions.
 *
 * @module components/dashboard/widget-grid
 */

import { useMemo, useCallback, useRef, useState, useEffect } from "react"
import { WidgetWrapper } from "./widget-wrapper"
import type { WidgetLayoutItem, WidgetSize } from "@/lib/widget-registry"

interface WidgetGridProps {
  widgets: WidgetLayoutItem[]
  isEditing: boolean
  onLayoutChange: (layout: { i: string; x: number; y: number; w: number; h: number }[]) => void
  onRemove: (id: string) => void
  onResize: (id: string, size: WidgetSize) => void
}

export function WidgetGrid({
  widgets,
  isEditing,
  onLayoutChange,
  onRemove,
  onResize,
}: WidgetGridProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [RGL, setRGL] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const breakpointRef = useRef<string>("lg")

  // Dynamic import to avoid SSR issues
  useEffect(() => {
    import("react-grid-layout/legacy").then(mod => {
      const m = mod as any // eslint-disable-line @typescript-eslint/no-explicit-any
      const Responsive = m.Responsive ?? m.default?.Responsive
      const WidthProvider = m.WidthProvider ?? m.default?.WidthProvider
      if (Responsive && WidthProvider) {
        setRGL(() => WidthProvider(Responsive))
      } else {
        console.warn("[WidgetGrid] Could not resolve Responsive/WidthProvider from react-grid-layout/legacy")
      }
    }).catch((err: unknown) => {
      console.error("[WidgetGrid] Failed to load react-grid-layout/legacy:", err)
    })
    // @ts-expect-error -- CSS module import
    import("react-grid-layout/css/styles.css")
  }, [])

  // Build layout objects for RGL
  const layouts = useMemo(() => {
    const lg = widgets.map(w => ({
      i: w.i,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: 3,
      minH: 3,
    }))

    // Mobile: stack everything in single column, full width
    let smY = 0
    const sm = widgets.map((w) => {
      const item = {
        i: w.i,
        x: 0,
        y: smY,
        w: 6,
        h: Math.min(w.h, 4),
        minW: 3,
        minH: 3,
      }
      smY += item.h
      return item
    })

    // Medium: 6 cols, arrange in 2-column flow
    let mdY = 0
    let mdCol = 0
    const mdItems: typeof lg = []
    for (const w of widgets) {
      const clamped = Math.min(w.w, 6)
      const isWide = clamped > 3
      if (isWide) {
        if (mdCol > 0) { mdCol = 0 }
        mdItems.push({ i: w.i, x: 0, y: mdY, w: 6, h: w.h, minW: 3, minH: 3 })
        mdY += w.h
      } else {
        mdItems.push({ i: w.i, x: mdCol * 3, y: mdY, w: 3, h: w.h, minW: 3, minH: 3 })
        mdCol++
        if (mdCol >= 2) { mdCol = 0; mdY += w.h }
      }
    }

    return { lg, md: mdItems, sm }
  }, [widgets])

  // Track breakpoint changes
  const handleBreakpointChange = useCallback((newBreakpoint: string) => {
    breakpointRef.current = newBreakpoint
  }, [])

  // Only persist layout on actual user drag (not breakpoint switches)
  const handleDragStop = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (layout: any[]) => {
      // Only save lg-breakpoint positions to avoid corrupting with md/sm values
      if (breakpointRef.current !== "lg") return
      onLayoutChange(layout.map((l: { i: string; x: number; y: number; w: number; h: number }) => ({
        i: l.i, x: l.x, y: l.y, w: l.w, h: l.h,
      })))
    },
    [onLayoutChange]
  )

  const ResponsiveGridLayout = RGL

  if (!ResponsiveGridLayout) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {widgets.map(w => (
          <div
            key={w.i}
            className={w.w >= 6 ? "sm:col-span-2" : ""}
            style={{ minHeight: w.h * 40 + (w.h - 1) * 20 }}
          >
            <WidgetWrapper
              widgetId={w.i}
              width={w.w}
              height={w.h}
              currentSize={w.size}
              isEditing={isEditing}
              onRemove={onRemove}
              onResize={onResize}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="transition-[padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ paddingTop: isEditing ? 4 : 0 }}>
      <ResponsiveGridLayout
        layouts={layouts}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }}
        cols={{ lg: 12, md: 6, sm: 6 }}
        rowHeight={40}
        margin={[20, 20]}
        containerPadding={[0, 0]}
        isDraggable={isEditing}
        isResizable={false}
        compactType="vertical"
        onBreakpointChange={handleBreakpointChange}
        onDragStop={handleDragStop}
        draggableHandle=".widget-drag-handle"
        useCSSTransforms
      >
        {widgets.map(w => (
          <div key={w.i} style={{ overflow: "visible", height: "100%" }}>
            <WidgetWrapper
              widgetId={w.i}
              width={w.w}
              height={w.h}
              currentSize={w.size}
              isEditing={isEditing}
              onRemove={onRemove}
              onResize={onResize}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}
