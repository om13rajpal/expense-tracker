/**
 * Responsive breakpoint hook.
 * Detects whether the current viewport width falls below the mobile breakpoint
 * using `window.matchMedia` for efficient, event-driven change detection.
 * @module hooks/use-mobile
 */
import * as React from "react"

/**
 * The pixel width threshold below which the viewport is considered "mobile".
 * Viewports with a width of 768 px or more are treated as desktop/tablet.
 */
const MOBILE_BREAKPOINT = 768

/**
 * Returns `true` when the viewport width is below {@link MOBILE_BREAKPOINT} (768 px).
 * Uses `matchMedia` for efficient change detection rather than polling or resize listeners.
 *
 * On the server (SSR), returns `false` since `window` is unavailable. The value
 * is hydrated on mount via `useEffect`.
 *
 * @returns `true` if the viewport width is less than 768 px, `false` otherwise
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
