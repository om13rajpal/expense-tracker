"use client"

import { cn } from "@/lib/utils"

interface GlowingBlobProps {
  colors?: string[]
  blur?: number
  scale?: number
  speed?: number
  className?: string
}

export function GlowingBlob({
  colors = ["#a3e635", "#22d3ee", "#a78bfa", "#ffffff"],
  blur = 100,
  scale = 2,
  speed = 8,
  className,
}: GlowingBlobProps) {
  const gradient = `conic-gradient(${colors.join(", ")}, ${colors[0]})`

  return (
    <div
      className={cn("absolute pointer-events-none", className)}
      style={{ filter: `blur(${blur}px)` }}
    >
      <div className="w-full h-full rounded-[99999px] overflow-hidden">
        <div
          className="w-full h-full animate-spin-blob"
          style={{
            background: gradient,
            transform: `scale(${scale})`,
            animationDuration: `${speed}s`,
          }}
        />
      </div>
    </div>
  )
}
