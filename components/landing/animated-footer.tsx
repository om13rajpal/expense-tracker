"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const links = [
  { label: "Dashboard", href: "#" },
  { label: "Budget", href: "#" },
  { label: "Goals", href: "#" },
  { label: "AI", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Careers", href: "#" },
]

export function AnimatedFooter() {
  const footerRef = useRef<HTMLElement>(null)
  const finovaRef = useRef<HTMLHeadingElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!footerRef.current) return

    const ctx = gsap.context(() => {
      // Giant FINOVA text — dramatic letter-spacing squeeze
      if (finovaRef.current) {
        gsap.fromTo(
          finovaRef.current,
          { letterSpacing: "0.4em", opacity: 0 },
          {
            letterSpacing: "-0.05em",
            opacity: 1,
            duration: 1.4,
            ease: "power3.out",
            scrollTrigger: {
              trigger: finovaRef.current,
              start: "top 95%",
              once: true,
            },
          }
        )
      }

      // Links fade in
      if (linksRef.current) {
        gsap.fromTo(
          linksRef.current.children,
          { y: 15, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.05,
            ease: "power2.out",
            scrollTrigger: {
              trigger: linksRef.current,
              start: "top 95%",
              once: true,
            },
          }
        )
      }
    }, footerRef)

    return () => ctx.revert()
  }, [])

  return (
    <footer
      ref={footerRef}
      className="relative z-20 bg-black pt-20 pb-8 px-6 overflow-hidden"
    >
      {/* Subtle top gradient blending into the page */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/0 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Giant FINOVA — the centerpiece */}
        <h2
          ref={finovaRef}
          className="text-center text-[18vw] md:text-[14vw] leading-[0.85] font-black tracking-tighter uppercase text-white/[0.04] select-none pointer-events-none"
        >
          FINOVA
        </h2>

        {/* Minimal nav links — single row */}
        <div
          ref={linksRef}
          className="flex items-center justify-center gap-6 md:gap-10 flex-wrap mt-8"
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-xs font-medium text-white/20 hover:text-white/50 transition-colors uppercase tracking-widest"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div className="mt-10 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Bottom bar */}
        <div className="mt-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gradient-to-br from-lime-400 to-lime-500" />
            <span className="text-[11px] font-bold text-white/20 tracking-tight">Finova</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="#" className="text-[11px] text-white/15 hover:text-white/30 transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-[11px] text-white/15 hover:text-white/30 transition-colors">
              Terms
            </Link>
            <span className="text-[11px] text-white/10">&copy; 2026</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
