"use client"

import React, { useEffect, useRef } from "react"
import gsap from "gsap"
import { ArrowUpRight, Code, Database, Globe, Hexagon, Loader, Shuffle, Terminal, Zap } from "lucide-react"

export function GenZDoodles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const elements = containerRef.current.querySelectorAll(".doodle-element")
    
    // Slow, organic, randomized floating for every element
    elements.forEach((el) => {
      const duration = 15 + Math.random() * 20
      const delay = Math.random() * -20 // Start at random times
      
      gsap.to(el, {
        x: () => `+=${Math.random() * 100 - 50}`,
        y: () => `+=${Math.random() * 100 - 50}`,
        rotation: () => `+=${Math.random() * 90 - 45}`,
        duration: duration,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: delay
      })
    })
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-20">
      {/* Abstract SVG Squiggles */}
      <svg className="doodle-element absolute top-[10%] left-[5%] w-32 h-32 stroke-lime-400/50 fill-none stroke-[2]" viewBox="0 0 100 100">
        <path d="M10,50 Q25,20 50,50 T90,50" />
      </svg>
      <svg className="doodle-element absolute bottom-[20%] right-[10%] w-40 h-40 stroke-cyan-400/50 fill-none stroke-[2]" viewBox="0 0 100 100">
        <path d="M20,80 C20,20 80,20 80,80" />
        <circle cx="50" cy="50" r="10" />
      </svg>
      <svg className="doodle-element absolute top-[40%] right-[15%] w-24 h-24 stroke-fuchsia-400/50 fill-none stroke-[2]" viewBox="0 0 100 100">
        <polyline points="10,90 30,10 50,90 70,10 90,90" />
      </svg>

      {/* Lucide Tech/Finance Hacks */}
      <div className="doodle-element absolute top-[15%] right-[25%] text-lime-400/40">
        <ArrowUpRight size={64} strokeWidth={1} />
      </div>
      <div className="doodle-element absolute bottom-[15%] left-[20%] text-cyan-400/40">
        <Globe size={80} strokeWidth={1} />
      </div>
      <div className="doodle-element absolute top-[60%] left-[10%] text-fuchsia-400/30">
        <Hexagon size={100} strokeWidth={1} />
      </div>
      <div className="doodle-element absolute top-[25%] left-[35%] text-white/20">
        <Terminal size={48} strokeWidth={1} />
      </div>
      <div className="doodle-element absolute bottom-[30%] right-[30%] text-white/20">
        <Shuffle size={54} strokeWidth={1} />
      </div>
      <div className="doodle-element absolute top-[5%] left-[50%] text-lime-400/20">
        <Zap size={72} strokeWidth={1} />
      </div>
      
      {/* Abstract Plus Signs */}
      <div className="doodle-element absolute top-[70%] right-[5%] text-3xl text-cyan-400/50 font-mono">+</div>
      <div className="doodle-element absolute top-[30%] right-[50%] text-4xl text-fuchsia-400/30 font-mono">+</div>
      <div className="doodle-element absolute bottom-[10%] left-[45%] text-2xl text-lime-400/40 font-mono">+</div>
      <div className="doodle-element absolute top-[45%] left-[65%] text-5xl text-white/10 font-mono">+</div>
    </div>
  )
}
