"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

export function HorizontalScrollSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const trigger = triggerRef.current
    const track = trackRef.current
    if (!section || !trigger || !track) return

    const ctx = gsap.context(() => {
      const scrollDistance = track.scrollWidth - window.innerWidth

      // Use a timeline with ScrollTrigger — proven pattern from Efficly reference
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trigger,
          start: "top top",
          end: () => `+=${scrollDistance * 1.1}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      // Single horizontal tween inside the timeline — ease MUST be "none"
      tl.to(track, {
        x: -scrollDistance,
        ease: "none",
      })

      // --- Sub-animations tied to horizontal scroll via containerAnimation ---
      // containerAnimation references the timeline (tl), not a direct tween

      // Reveal text animations (opacity + blur + y)
      section.querySelectorAll<HTMLElement>(".hs-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 40, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            scrollTrigger: {
              trigger: el,
              containerAnimation: tl,
              start: "left 85%",
              end: "left 55%",
              scrub: true,
            },
          }
        )
      })

      // Accent text (scale + opacity)
      section.querySelectorAll<HTMLElement>(".hs-accent").forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.9, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            scrollTrigger: {
              trigger: el,
              containerAnimation: tl,
              start: "left 80%",
              end: "left 50%",
              scrub: true,
            },
          }
        )
      })

      // Stat cards (y + scale + opacity)
      section.querySelectorAll<HTMLElement>(".hs-stat-card").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 60, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            scrollTrigger: {
              trigger: el,
              containerAnimation: tl,
              start: "left 75%",
              end: "left 45%",
              scrub: true,
            },
          }
        )
      })

      // Decorative lines (scaleX)
      section.querySelectorAll<HTMLElement>(".hs-line").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            scrollTrigger: {
              trigger: el,
              containerAnimation: tl,
              start: "left 70%",
              end: "left 40%",
              scrub: true,
            },
          }
        )
      })
    }, sectionRef)

    // Recalculate on resize
    const handleResize = () => ScrollTrigger.refresh()
    window.addEventListener("resize", handleResize)

    return () => {
      ctx.revert()
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <div ref={triggerRef} className="h-screen overflow-hidden relative">
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 text-white/20">
          <span className="text-[11px] font-bold uppercase tracking-[0.3em]">Scroll</span>
          <svg width="24" height="8" viewBox="0 0 24 8" fill="none">
            <path d="M0 4H22M22 4L18 1M22 4L18 7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Track: absolutely positioned, vertically centered */}
        <div
          ref={trackRef}
          className="absolute top-1/2 -translate-y-1/2 left-0 flex items-center"
          style={{ willChange: "transform" }}
        >
          {/* Panel 1 — Opening statement */}
          <div className="flex h-screen w-screen flex-shrink-0 flex-col items-center justify-center px-8 md:px-24">
            <p className="hs-reveal text-[clamp(3rem,8vw,8rem)] font-black uppercase leading-[0.9] tracking-tighter text-center text-white/[0.08]">
              EVERY MONTH
            </p>
            <p className="hs-accent mt-2 text-[clamp(3rem,8vw,8rem)] font-black uppercase leading-[0.9] tracking-tighter text-center text-white">
              MILLIONS
            </p>
            <p className="hs-reveal mt-4 text-[clamp(1.2rem,2.5vw,2.5rem)] font-black uppercase leading-[1] tracking-tight text-center">
              <span className="text-white/[0.08]">LOSE TRACK OF THEIR</span>{" "}
              <span className="text-lime-400">MONEY</span>
            </p>
            <div className="hs-line mt-8 h-px w-32 bg-white/10 origin-left" />
          </div>

          {/* Panel 2 — Stats */}
          <div className="flex h-screen w-screen flex-shrink-0 items-center justify-center gap-6 md:gap-10 px-8 md:px-24">
            {[
              { value: "67%", label: "never track spending" },
              { value: "40%", label: "have zero savings" },
              { value: "$1.5T", label: "in avoidable fees yearly" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="hs-stat-card flex flex-col items-center rounded-3xl border border-white/[0.06] bg-white/[0.02] px-10 py-12 md:px-14 md:py-16 backdrop-blur-sm"
              >
                <span className="text-5xl md:text-7xl font-black text-white tabular-nums tracking-tight">
                  {stat.value}
                </span>
                <span className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/35 text-center max-w-[160px]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Panel 3 — Persuasive italic text (fixed: w-screen instead of w-[85vw]) */}
          <div className="flex h-screen w-screen flex-shrink-0 flex-col items-start justify-center px-12 md:px-32">
            <p className="hs-reveal text-2xl md:text-[2.5rem] font-normal italic leading-snug text-white/15 max-w-3xl">
              your transactions scattered across apps,
            </p>
            <p className="hs-reveal text-2xl md:text-[2.5rem] font-normal italic leading-snug text-white/35 max-w-3xl mt-4">
              your goals forgotten in spreadsheets,
            </p>
            <p className="hs-accent text-2xl md:text-[2.5rem] font-normal italic leading-snug text-white max-w-3xl mt-4">
              your potential completely untapped.
            </p>
            <div className="hs-line mt-8 h-px w-24 bg-lime-400/30 origin-left" />
            <p className="hs-accent mt-8 text-3xl md:text-5xl font-black uppercase tracking-tight text-lime-400">
              Until now.
            </p>
          </div>

          {/* Panel 4 — Action words */}
          <div className="flex h-screen w-screen flex-shrink-0 items-center justify-center gap-10 md:gap-20 px-8 md:px-24">
            {["TRACK", "VISUALIZE", "ACHIEVE"].map((word, i) => (
              <span
                key={word}
                className={`hs-accent text-[clamp(3rem,6.5vw,7rem)] font-black uppercase tracking-[0.12em] ${
                  i === 2
                    ? "text-lime-400 underline decoration-lime-400/30 underline-offset-[12px] decoration-[3px]"
                    : "text-white/70"
                }`}
              >
                {word}
              </span>
            ))}
          </div>

          {/* Panel 5 — Closing with brand */}
          <div className="flex h-screen w-screen flex-shrink-0 flex-col items-center justify-center px-8 md:px-24">
            <div className="hs-reveal mb-10 flex items-center gap-3 rounded-full border border-lime-400/20 bg-lime-400/[0.06] px-6 py-3">
              <div className="h-5 w-5 rounded-md bg-lime-400" />
              <span className="text-sm font-bold text-lime-400 tracking-wide">Finova</span>
            </div>
            <p className="hs-accent text-4xl md:text-7xl font-black uppercase tracking-tighter text-white text-center leading-[0.9]">
              Your money.
            </p>
            <p className="hs-reveal mt-2 text-4xl md:text-7xl font-black uppercase tracking-tighter text-white/40 text-center leading-[0.9]">
              Finally understood.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
