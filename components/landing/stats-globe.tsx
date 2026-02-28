"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Globe } from "@/components/ui/globe"

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: 2.4, prefix: "$", suffix: "M+", label: "Tracked by Users", format: "millions" },
  { value: 12000, prefix: "", suffix: "+", label: "Active Users", format: "integer-comma" },
  { value: 99.9, prefix: "", suffix: "%", label: "Uptime SLA", format: "one-decimal" },
  { value: 150, prefix: "", suffix: "+", label: "Features Shipped", format: "integer" },
]

function formatValue(value: number, format: string): string {
  switch (format) {
    case "millions":
      return value.toFixed(1)
    case "integer-comma":
      return Math.round(value).toLocaleString("en-US", { maximumFractionDigits: 0 })
    case "one-decimal":
      return value.toFixed(1)
    case "integer":
      return Math.round(value).toString()
    default:
      return Math.round(value).toString()
  }
}

const globeConfig = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [0.15, 0.15, 0.15] as [number, number, number],
  markerColor: [0.64, 0.9, 0.21] as [number, number, number],
  glowColor: [0.3, 0.5, 0.1] as [number, number, number],
  markers: [
    { location: [14.5995, 120.9842] as [number, number], size: 0.03 },
    { location: [19.076, 72.8777] as [number, number], size: 0.1 },
    { location: [23.8103, 90.4125] as [number, number], size: 0.05 },
    { location: [30.0444, 31.2357] as [number, number], size: 0.07 },
    { location: [39.9042, 116.4074] as [number, number], size: 0.08 },
    { location: [-23.5505, -46.6333] as [number, number], size: 0.1 },
    { location: [19.4326, -99.1332] as [number, number], size: 0.1 },
    { location: [40.7128, -74.006] as [number, number], size: 0.1 },
    { location: [34.6937, 135.5022] as [number, number], size: 0.05 },
    { location: [41.0082, 28.9784] as [number, number], size: 0.06 },
  ],
}

export function StatsGlobe() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const statRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      stats.forEach((stat, i) => {
        const el = statRefs.current[i]
        if (!el) return

        const proxy = { val: 0 }
        gsap.to(proxy, {
          val: stat.value,
          duration: 2.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
          onUpdate: () => {
            el.textContent = `${stat.prefix}${formatValue(proxy.val, stat.format)}${stat.suffix}`
          },
        })
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Stats */}
          <div className="space-y-12 z-10">
            <div>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                Built for <span className="text-lime-400">scale</span>
              </h2>
              <p className="mt-4 text-lg text-white/50 max-w-md">
                Trusted by thousands worldwide. Growing every day.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              {stats.map((stat, i) => (
                <div key={stat.label} className="space-y-2">
                  <span
                    ref={(el) => { statRefs.current[i] = el }}
                    className="text-4xl md:text-5xl font-black text-white tabular-nums"
                  >
                    {stat.prefix}0{stat.suffix}
                  </span>
                  <p className="text-sm font-semibold uppercase tracking-wider text-white/40">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* MagicUI COBE Globe */}
          <div className="relative h-[500px] lg:h-[600px]">
            <Globe className="top-0" config={globeConfig} />
            {/* Bottom fade */}
            <div className="absolute w-full bottom-0 inset-x-0 h-40 bg-gradient-to-b pointer-events-none select-none from-transparent to-black z-40" />
          </div>
        </div>
      </div>
    </section>
  )
}
