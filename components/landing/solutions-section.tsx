"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useAuth } from "@/hooks/use-auth"
import { IconArrowRight, IconUsers, IconUser } from "@tabler/icons-react"
import { GlowingBlob } from "@/components/landing/glowing-blob"
import { Scales } from "@/components/ui/scales"

gsap.registerPlugin(ScrollTrigger)

const cards = [
  {
    title: "For Individuals",
    description:
      "Track every dollar, visualize your goals, and let AI surface the insights that matter. Your complete financial cockpit.",
    cta: "Start Free",
    icon: IconUser,
    href: "/login",
    authHref: "/dashboard",
  },
  {
    title: "For Teams",
    description:
      "Split expenses, share budgets, and keep everyone aligned. Built for households, roommates, and partners.",
    cta: "Explore Splits",
    icon: IconUsers,
    href: "/login",
    authHref: "/dashboard",
  },
]

export function SolutionsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".solutions-card",
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            once: true,
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 px-6 overflow-hidden"
    >
      {/* Vertically concentrated glowing blob — centered column */}
      <GlowingBlob
        className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[600px] md:w-[400px] md:h-[800px] opacity-25"
        blur={100}
        speed={10}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400/60 mb-4">
            Solutions
          </p>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-[0.9]">
            Built for <span className="text-lime-400">everyone</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              className="solutions-card group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
            >
              {/* Scales grid line borders */}
              <div className="absolute -inset-y-[10%] -left-3 h-[120%] w-6 mask-t-from-90% mask-b-from-90% pointer-events-none z-20">
                <Scales size={8} className="rounded-lg" color="rgba(163,230,53,0.08)" />
              </div>
              <div className="absolute -inset-y-[10%] -right-3 h-[120%] w-6 mask-t-from-90% mask-b-from-90% pointer-events-none z-20">
                <Scales size={8} className="rounded-lg" color="rgba(163,230,53,0.08)" />
              </div>
              <div className="absolute -inset-x-[10%] -top-3 h-6 w-[120%] mask-r-from-90% mask-l-from-90% pointer-events-none z-20">
                <Scales size={8} className="rounded-lg" color="rgba(163,230,53,0.08)" />
              </div>
              <div className="absolute -inset-x-[10%] -bottom-3 h-6 w-[120%] mask-r-from-90% mask-l-from-90% pointer-events-none z-20">
                <Scales size={8} className="rounded-lg" color="rgba(163,230,53,0.08)" />
              </div>

              {/* Content */}
              <div className="relative z-10 p-8 md:p-12 flex flex-col min-h-[320px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center size-10 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                    <card.icon className="size-5 text-lime-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {card.title}
                  </h3>
                </div>

                <p className="text-white/40 text-base leading-relaxed mb-8 max-w-sm">
                  {card.description}
                </p>

                <div className="mt-auto">
                  <Link
                    href={isAuthenticated ? card.authHref : card.href}
                    className="inline-flex items-center gap-2 text-sm font-bold text-lime-400 hover:text-lime-300 transition-colors"
                  >
                    <span>{card.cta}</span>
                    <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
