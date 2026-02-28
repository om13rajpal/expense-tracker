"use client"

import React, { useEffect, useRef } from "react"
import gsap from "gsap"
import { cn } from "@/lib/utils"

interface FloatingNodeProps {
  label: string
  value: string
  subtext?: string
  className?: string
  icon?: React.ReactNode
  delay?: number
  duration?: number
  yoyo?: boolean
}

export function FloatingNode({
  label,
  value,
  subtext,
  className,
  icon,
  delay = 0,
  duration = 10,
  yoyo = true
}: FloatingNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!nodeRef.current) return

    // Slow vertical breathing
    gsap.to(nodeRef.current, {
      y: "-=30",
      duration: duration,
      delay: delay,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    })
  }, [duration, delay, yoyo])

  return (
    <div
      ref={nodeRef}
      className={cn(
        "absolute will-change-[transform,opacity]",
        className
      )}
    >
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center gap-4">
        {icon && (
          <div className="flex size-10 items-center justify-center rounded-full bg-white/5 border border-white/10">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</span>
          <span className="text-lg font-black tracking-tighter text-white">{value}</span>
          {subtext && <span className="text-[10px] text-lime-400 font-mono tracking-widest uppercase mt-0.5">{subtext}</span>}
        </div>
      </div>
    </div>
  )
}
