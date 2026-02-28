"use client"

import { SpinningText } from "@/components/ui/spinning-text"

export function CTASection() {

  return (
    <section className="relative flex items-center justify-center min-h-[50vh] py-24 px-6 overflow-hidden">
      {/* Subtle ambient glow — reduced */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-lime-500/[0.06] blur-[160px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9]">
          <span className="relative inline-block">
            {/* Spinning text — centered on R, slightly right+down, behind the letter */}
            <SpinningText
              className="absolute top-[0.15em] left-[0.25em] text-[10px] font-bold tracking-widest uppercase text-lime-400/30 pointer-events-none -z-10"
              radius={6}
              duration={12}
            >
              {"• READY • SET • FINOVA •"}
            </SpinningText>
            R
          </span>
          eady to take<br />
          <span className="text-lime-400">control?</span>
        </h2>

        <p className="mt-6 text-lg text-white/50 max-w-lg mx-auto">
          Join thousands who have already transformed their relationship with money. It takes 30 seconds.
        </p>

      </div>
    </section>
  )
}
