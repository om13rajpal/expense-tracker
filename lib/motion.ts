/**
 * Shared Framer Motion animation variants and transition presets.
 *
 * Centralizes all animation constants so pages import them from a
 * single source rather than duplicating configs. Includes spring and
 * easing presets, stagger containers, fade/scale entrance variants,
 * and specialized variants for number counters and list items.
 *
 * @module lib/motion
 */

/** Transition presets for Framer Motion animations. */
export const spring = {
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },
  snappy: { type: "spring" as const, stiffness: 300, damping: 24 },
  smooth: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const },
  fast: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as const },
} as const

/** Container variant that staggers children by 60ms. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
} as const

/** Container variant that staggers children by 100ms. */
export const staggerSlow = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
} as const

/** Fade in from 12px below. */
export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring.smooth },
} as const

/** Fade in from 6px below (fast). */
export const fadeUpSmall = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: spring.fast },
} as const

/** Scale up from 92% with fade. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: spring.smooth },
} as const

// ─── Specialized variants ───

/** For animating number counters / big hero metrics */
export const numberPop = {
  hidden: { opacity: 0, scale: 0.85, y: 4 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const },
  },
} as const

/**
 * Factory for staggered list item entrance animations.
 *
 * @param index - Zero-based index of the item in the list (used to calculate stagger delay).
 * @returns Framer Motion props object with initial, animate, and transition.
 */
export const listItem = (index: number) => ({
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: {
    delay: 0.04 + index * 0.03,
    duration: 0.4,
    ease: [0.32, 0.72, 0, 1] as const,
  },
})

