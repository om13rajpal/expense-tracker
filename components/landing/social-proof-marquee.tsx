"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const metrics = [
  { value: "$2.4M+", label: "Tracked" },
  { value: "12K+", label: "Users" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9★", label: "Rating" },
]

export function SocialProofMarquee() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".proof-metric",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-8">
          {metrics.map((m, i) => (
            <div key={m.label} className="proof-metric flex flex-col items-center text-center">
              <span className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tight">
                {m.value}
              </span>
              <span className="mt-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                {m.label}
              </span>
              {i < metrics.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden" />
              )}
            </div>
          ))}
        </div>
        {/* Subtle divider line */}
        <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </section>
  )
}
