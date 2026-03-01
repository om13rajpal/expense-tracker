"use client"

import * as React from "react"
import { Suspense, lazy } from "react"
import { IconMinus, IconResize, IconGripHorizontal } from "@tabler/icons-react"
import { SectionErrorBoundary } from "@/components/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getWidgetDef,
  WIDGET_SIZES,
  type WidgetComponentProps,
  type WidgetSize,
} from "@/lib/widget-registry"

const widgetCache = new Map<string, React.LazyExoticComponent<React.ComponentType<WidgetComponentProps>>>()

function getOrCreateLazy(widgetId: string) {
  if (widgetCache.has(widgetId)) return widgetCache.get(widgetId)!
  const def = getWidgetDef(widgetId)
  if (!def) return null
  const LazyComp = lazy(def.component)
  widgetCache.set(widgetId, LazyComp)
  return LazyComp
}

interface WidgetWrapperProps {
  widgetId: string
  width: number
  height: number
  currentSize: WidgetSize
  isEditing: boolean
  onRemove: (id: string) => void
  onResize: (id: string, size: WidgetSize) => void
}

export function WidgetWrapper({
  widgetId,
  width,
  height,
  currentSize,
  isEditing,
  onRemove,
  onResize,
}: WidgetWrapperProps) {
  const def = getWidgetDef(widgetId)
  const LazyWidget = getOrCreateLazy(widgetId)

  if (!def || !LazyWidget) {
    return (
      <div className="h-full rounded-[1.75rem] widget-apple flex items-center justify-center text-sm text-muted-foreground">
        Unknown widget
      </div>
    )
  }

  return (
    <div
      className={`
        group/tile relative rounded-[1.75rem] h-full
        widget-apple
        transition-[box-shadow,opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${isEditing
          ? "widget-jiggle ring-1 ring-primary/15"
          : ""
        }
      `}
    >
      {/* ── Edit chrome: remove, drag, resize ── */}
      {/* Always rendered, animated via opacity/scale for smooth enter/exit */}
      <div
        className="absolute inset-0 z-20 pointer-events-none rounded-[1.75rem] transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ opacity: isEditing ? 1 : 0 }}
      >
        {/* Remove button — Apple-style minus badge */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(widgetId) }}
          className={`
            absolute top-2 left-2 z-[100] size-7 rounded-full
            bg-red-500 text-white
            flex items-center justify-center
            shadow-[0_2px_8px_rgba(220,38,38,0.4)]
            transition-all duration-200 ease-out
            hover:bg-red-600 hover:shadow-[0_4px_12px_rgba(220,38,38,0.5)]
            active:scale-90
            ${isEditing ? "pointer-events-auto scale-100" : "pointer-events-none scale-0"}
          `}
        >
          <IconMinus className="size-4 stroke-[3]" />
        </button>

        {/* Drag handle — subtle grip pill at top center */}
        <div
          className={`
            widget-drag-handle absolute top-0 inset-x-0 z-[50]
            flex items-center justify-center h-9
            cursor-grab active:cursor-grabbing
            rounded-t-3xl
            transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${isEditing ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
          `}
        >
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/[0.05] backdrop-blur-sm transition-colors duration-150 hover:bg-black/[0.1]">
            <IconGripHorizontal className="size-3.5 text-muted-foreground/70" />
          </div>
        </div>

        {/* Resize dropdown */}
        {def.allowedSizes.length > 1 && (
          <div
            className={`
              absolute top-2 right-2 z-[100]
              transition-all duration-200 ease-out
              ${isEditing ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-0 opacity-0"}
            `}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-7 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-shadow duration-150"
                >
                  <IconResize className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                {def.allowedSizes.map(s => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onResize(widgetId, s)}
                    className={s === currentSize ? "bg-accent font-semibold" : ""}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {WIDGET_SIZES[s].w}×{WIDGET_SIZES[s].h}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Widget content — smooth dim during edit */}
      <div
        className="relative h-full overflow-hidden rounded-[1.75rem] transition-[opacity,filter] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          opacity: isEditing ? 0.55 : 1,
          filter: isEditing ? "saturate(0.7)" : "none",
          pointerEvents: isEditing ? "none" : "auto",
          userSelect: isEditing ? "none" : "auto",
        }}
      >
        <SectionErrorBoundary name={def.name}>
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidget width={width} height={height} isEditing={isEditing} />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  )
}

function WidgetSkeleton() {
  return (
    <div className="p-6 space-y-3 animate-pulse">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}
