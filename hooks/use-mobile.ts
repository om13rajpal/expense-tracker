/**
 * Responsive breakpoint hook.
 * @module hooks/use-mobile
 */
import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Returns `true` when the viewport width is below {@link MOBILE_BREAKPOINT} (768 px).
 * Uses `matchMedia` for efficient change detection.
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
