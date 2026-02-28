"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"

export function AuroraBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Create organic, slow-drifting animations for the color orbs
      gsap.to(".aurora-orb-1", {
        x: "random(-20vw, 20vw)",
        y: "random(-20vh, 20vh)",
        duration: "random(10, 20)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      })
      gsap.to(".aurora-orb-2", {
        x: "random(-20vw, 20vw)",
        y: "random(-20vh, 20vh)",
        duration: "random(12, 22)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      })
      gsap.to(".aurora-orb-3", {
        x: "random(-10vw, 30vw)",
        y: "random(-30vh, 10vh)",
        duration: "random(15, 25)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[-10] w-full h-full overflow-hidden pointer-events-none"
    >
      {/* Cyan/Blue Orb */}
      <div 
        className="aurora-orb-1 absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.8) 0%, rgba(6,182,212,0) 70%)" }}
      />
      
      {/* Lime Green Orb */}
      <div 
        className="aurora-orb-2 absolute top-[40%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen opacity-30 blur-[150px]"
        style={{ background: "radial-gradient(circle, rgba(163,230,53,0.8) 0%, rgba(163,230,53,0) 70%)" }}
      />

      {/* Deep Violet/Fuchsia Orb */}
      <div 
        className="aurora-orb-3 absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] rounded-full mix-blend-screen opacity-30 blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.6) 0%, rgba(168,85,247,0) 70%)" }}
      />
    </div>
  )
}
