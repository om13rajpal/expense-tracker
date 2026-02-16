/**
 * Shared animation variants and transition configs.
 * Import from here instead of duplicating in each page.
 */

// ─── Transition presets ───

export const spring = {
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },
  snappy: { type: "spring" as const, stiffness: 300, damping: 24 },
  smooth: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  fast: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
} as const

// ─── Container variants (stagger children) ───

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
} as const

export const staggerFast = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
} as const

export const staggerSlow = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
} as const

// ─── Item variants ───

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: spring.fast },
} as const

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring.smooth },
} as const

export const fadeUpSmall = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: spring.fast },
} as const

export const fadeDown = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: spring.smooth },
} as const

export const fadeLeft = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: spring.smooth },
} as const

export const fadeRight = {
  hidden: { opacity: 0, x: 12 },
  show: { opacity: 1, x: 0, transition: spring.smooth },
} as const

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: spring.smooth },
} as const

export const slideUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
} as const

// ─── Specialized variants ───

/** For animating number counters / big hero metrics */
export const numberPop = {
  hidden: { opacity: 0, scale: 0.85, y: 4 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
  },
} as const

/** For progress bars / width animations */
export const barGrow = (delay = 0.2) => ({
  initial: { width: 0 },
  animate: { width: "var(--bar-width)" },
  transition: { delay, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
})

/** For list items (staggered row entrance) */
export const listItem = (index: number) => ({
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: {
    delay: 0.04 + index * 0.03,
    duration: 0.25,
    ease: [0.25, 0.1, 0.25, 1] as const,
  },
})

/** Card hover lift effect */
export const cardHover = {
  rest: { y: 0, boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
  hover: {
    y: -2,
    boxShadow: "0 8px 30px -12px rgba(0,0,0,0.12)",
    transition: spring.fast,
  },
} as const
