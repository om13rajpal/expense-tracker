"use client"

/**
 * WidgetGrid — react-grid-layout wrapper for the customizable dashboard.
 * Handles responsive breakpoints, drag/drop, and layout callbacks.
 *
 * Uses dynamic import because react-grid-layout requires browser APIs (window)
 * and cannot be server-side rendered.
 * @module components/dashboard/widget-grid
 */

import { useMemo, useCallback, useRef, useState, useEffect } from "react"
import { WidgetWrapper } from "./widget-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
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

  // Dynamic import to avoid SSR issues
  // NOTE: v2.2.2 moved WidthProvider to /legacy — main export uses hooks API
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
    // Also import styles
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

    // Mobile: stack everything in 2 columns
    const sm = widgets.map((w, idx) => ({
      i: w.i,
      x: (idx % 2) * 3,
      y: Math.floor(idx / 2) * 3,
      w: Math.min(w.w, 6),
      h: w.h,
      minW: 3,
      minH: 3,
    }))

    // Medium: 6 cols, clamp widths
    const md = widgets.map((w, idx) => ({
      i: w.i,
      x: w.w > 6 ? 0 : (w.x % 6),
      y: idx * 3,
      w: Math.min(w.w, 6),
      h: w.h,
      minW: 3,
      minH: 3,
    }))

    return { lg, md, sm }
  }, [widgets])

  const handleLayoutChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (layout: any[]) => {
      onLayoutChange(layout.map((l: { i: string; x: number; y: number; w: number; h: number }) => ({
        i: l.i, x: l.x, y: l.y, w: l.w, h: l.h,
      })))
    },
    [onLayoutChange]
  )

  const ResponsiveGridLayout = RGL

  if (!ResponsiveGridLayout) {
    // SSR or loading fallback: render widgets in a simple grid
    // Pass isEditing through so edit chrome works even before RGL loads
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {widgets.map(w => (
          <div
            key={w.i}
            className={w.w >= 6 ? "col-span-2" : ""}
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
        onLayoutChange={handleLayoutChange}
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
