"use client"

/**
 * Full-page grid overlay that cuts the landing page into a subtle grid.
 * Renders vertical + horizontal lines at fixed intervals for a modern,
 * editorial / dashboard aesthetic. Purely decorative — pointer-events-none.
 */
export function GridOverlay({
  columns = 6,
  rows = 0,
  color = "rgba(255,255,255,0.04)",
  className = "",
}: {
  columns?: number
  rows?: number
  color?: string
  className?: string
}) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[1] ${className}`}
      aria-hidden="true"
    >
      {/* Vertical lines */}
      {Array.from({ length: columns - 1 }).map((_, i) => {
        const left = ((i + 1) / columns) * 100
        return (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${left}%`, backgroundColor: color }}
          />
        )
      })}
      {/* Optional horizontal lines */}
      {rows > 0 &&
        Array.from({ length: rows - 1 }).map((_, i) => {
          const top = ((i + 1) / rows) * 100
          return (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 h-px"
              style={{ top: `${top}%`, backgroundColor: color }}
            />
          )
        })}
    </div>
  )
}
