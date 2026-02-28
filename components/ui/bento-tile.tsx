"use client"

import * as React from "react"
import { motion } from "motion/react"
import { fadeUpSmall } from "@/lib/motion"

/**
 * BentoTile — shared card wrapper with cinematic dark-mode styling.
 * Used on Dashboard and Money pages for the lime-on-black cockpit aesthetic.
 * Provides rounded-2xl shape, border, gradient overlay, top edge light line,
 * and subtle hover lift.
 */
export function BentoTile({
  children,
  className = "",
  gradient,
  hoverBorder,
}: {
  children: React.ReactNode
  className?: string
  gradient?: string
  hoverBorder?: string
}) {
  return (
    <motion.div
      variants={fadeUpSmall}
      className={`
        group/tile relative rounded-2xl overflow-hidden
        border border-border
        bg-card card-elevated
        transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        hover:-translate-y-0.5
        ${hoverBorder || "hover:border-primary/20"}
        ${className}
      `}
    >
      {gradient && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none transition-opacity duration-500 dark:opacity-100`} />
      )}
      {/* Top edge light line — dark mode only */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none hidden dark:block" />
      <div className="relative h-full">{children}</div>
    </motion.div>
  )
}
