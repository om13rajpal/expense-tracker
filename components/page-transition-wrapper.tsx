"use client"

import { motion, AnimatePresence } from "motion/react"
import { usePathname } from "next/navigation"

export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
        transition={{ 
          duration: 0.4, 
          ease: [0.32, 0.72, 0, 1] // Smooth, non-jittery easing
        }}
        className="flex-1 flex flex-col min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
