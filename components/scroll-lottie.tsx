"use client"

import React, { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lottie, { LottieRefCurrentProps } from "lottie-react"
import { cn } from "@/lib/utils"

gsap.registerPlugin(ScrollTrigger)

interface ScrollBoundLottieProps {
  animationData: any // Replace with specific Lottie JSON import type if available
  className?: string
  start?: string
  end?: string
}

export function ScrollBoundLottie({
  animationData,
  className,
  start = "top center",
  end = "bottom top"
}: ScrollBoundLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !lottieRef.current || !isLoaded) return

    const lottieInst = lottieRef.current
    const totalFrames = lottieInst.getDuration(true) ?? 0 // Get total frames

    // Create a proxy object that GSAP can animate
    const playhead = { frame: 0 }

    const ctx = gsap.context(() => {
      gsap.to(playhead, {
        frame: totalFrames - 1, // Animate from frame 0 to last frame
        ease: "none", // Linear scrub
        scrollTrigger: {
          trigger: containerRef.current,
          start: start,
          end: end,
          scrub: 1, // 1 second smoothing so it feels premium and weighty
          onUpdate: () => {
            // Force the Lottie animation to render the exact GSAP-calculated frame
            if (lottieInst) {
              lottieInst.goToAndStop(Math.round(playhead.frame), true)
            }
          }
        }
      })
    }, containerRef)

    return () => ctx.revert()
  }, [isLoaded, start, end])

  return (
    <div ref={containerRef} className={cn("relative z-20 pointer-events-none", className)}>
      <Lottie 
        lottieRef={lottieRef}
        animationData={animationData} 
        loop={false}
        autoplay={false} // Crucial: We manage playback manually via GSAP
        onDOMLoaded={() => setIsLoaded(true)}
        className="w-full h-full drop-shadow-[0_0_80px_rgba(163,230,53,0.3)]"
      />
    </div>
  )
}
