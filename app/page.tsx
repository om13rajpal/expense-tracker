"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useAuth } from "@/hooks/use-auth"
import { IconArrowRight, IconChevronDown } from "@tabler/icons-react"
import { DollarSign, Activity, TrendingUp } from "lucide-react"
import Lottie from "lottie-react"
import { LineShadowText } from "@/components/ui/line-shadow-text"
import { MorphingParticleBlobs } from "@/components/landing/morphing-particle-blobs"
import { FloatingNode } from "@/components/floating-node"
import { AuroraBackground } from "@/components/aurora-background"
import { LightRays } from "@/components/ui/light-rays"
import { CapsuleNavbar } from "@/components/landing/capsule-navbar"
import { SocialProofMarquee } from "@/components/landing/social-proof-marquee"
import { GsapTextReveal } from "@/components/landing/gsap-text-reveal"
import { AppShowcase } from "@/components/landing/app-showcase"
import { StatsGlobe } from "@/components/landing/stats-globe"
import { CTASection } from "@/components/landing/cta-section"
import { AnimatedFooter } from "@/components/landing/animated-footer"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { AuroraText } from "@/components/ui/aurora-text"
import { MaskContainer } from "@/components/ui/svg-mask-effect"

gsap.registerPlugin(ScrollTrigger)

/* Reusable gradient fade divider — no hard borders between sections */
function SectionFade({ direction = "down", className = "" }: { direction?: "down" | "up"; className?: string }) {
  return (
    <div
      className={`relative w-full h-32 md:h-48 pointer-events-none ${className}`}
      style={{
        background:
          direction === "down"
            ? "linear-gradient(to bottom, transparent, black)"
            : "linear-gradient(to top, transparent, black)",
      }}
    />
  )
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth()
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const chevronRef = useRef<HTMLDivElement>(null)
  const [mascotData, setMascotData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch("/animations/fire-mascot.json")
      .then((r) => r.json())
      .then((data) => setMascotData(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { y: 100, opacity: 0, rotationX: -90 },
        { y: 0, opacity: 1, rotationX: 0, duration: 1.5, ease: "power4.out", delay: 0.2 }
      )

      gsap.fromTo(
        subtitleRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.8 }
      )

      gsap.fromTo(
        ".hero-btn",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)", delay: 1, stagger: 0.1 }
      )

      if (chevronRef.current) {
        gsap.fromTo(
          chevronRef.current,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.8, delay: 1.5, ease: "power2.out" }
        )
        gsap.to(chevronRef.current, {
          opacity: 0,
          scrollTrigger: { start: 0, end: 200, scrub: true },
        })
      }
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="relative text-white selection:bg-lime-500/30 overflow-x-hidden bg-black">
      {/* Fixed aurora background */}
      <AuroraBackground />

      {/* Capsule Navbar */}
      <CapsuleNavbar />

      {/* ─── 1. HERO ─── */}
      <section
        ref={heroRef}
        className="relative h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden z-10"
      >
        <LightRays
          count={6}
          color="rgba(163, 230, 53, 0.12)"
          blur={44}
          speed={16}
          length="80vh"
          className="z-0"
        />

        <div className="relative z-10 max-w-5xl mx-auto mt-16" style={{ perspective: "1000px" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.04] blur-[120px] rounded-full pointer-events-none" />

          <FloatingNode
            label="Volume"
            value="+$800.00"
            subtext="Settled • 0.0ms"
            icon={<DollarSign size={20} className="text-lime-400" />}
            className="top-[5%] left-[-40%] hidden md:flex"
            delay={0.2}
          />
          <FloatingNode
            label="Throughput"
            value="10k TPS"
            subtext="Optimal"
            icon={<Activity size={20} className="text-cyan-400" />}
            className="bottom-[20%] right-[-40%] hidden md:flex"
            delay={1.5}
            duration={12}
          />
          <FloatingNode
            label="Portfolio"
            value="+12.4%"
            subtext="YTD Return"
            icon={<TrendingUp size={20} className="text-emerald-400" />}
            className="bottom-[5%] left-[-30%] hidden md:flex"
            delay={2.5}
            duration={14}
          />

          <h1
            ref={titleRef}
            className="text-[clamp(4rem,12vw,8rem)] font-black leading-[0.85] tracking-tighter uppercase font-sans relative z-30"
            style={{ transformOrigin: "50% 100%" }}
          >
            MONEY IN<br />
            <LineShadowText className="text-lime-400 italic" shadowColor="white">
              MOTION
            </LineShadowText>
          </h1>

          <p
            ref={subtitleRef}
            className="mt-8 text-lg sm:text-xl text-white/50 max-w-2xl mx-auto font-medium z-30 relative leading-relaxed"
          >
            The ultra-modern, zero-friction financial hub designed for the next generation.
            Experience analytics that feel alive.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 z-30 relative">
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="hero-btn group relative flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
            >
              <span>{isAuthenticated ? "Enter Workspace" : "Join the Waitlist"}</span>
              <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button className="hero-btn rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 active:scale-95">
              Watch Demo
            </button>
          </div>
        </div>

        <div ref={chevronRef} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
          <IconChevronDown className="size-6 text-white/30 animate-bounce" />
        </div>
      </section>

      {/* ─── Fade hero → social proof ─── */}
      <SectionFade direction="down" className="-mt-32 relative z-20" />

      {/* ─── 2. SOCIAL PROOF ─── */}
      <SocialProofMarquee />

      {/* ─── 3. TEXT REVEAL ─── */}
      <GsapTextReveal
        text="We built Finova because managing money should feel powerful not painful. Every dollar tracked. Every goal visualized. Every insight actionable. This is finance redesigned for people who refuse to settle."
        lottieUrl="/animations/text-reveal-lottie.json"
      />

      {/* ─── 4. APP SHOWCASE BENTO ─── */}
      <AppShowcase />

      {/* ─── Fade into mascot section ─── */}
      <SectionFade direction="down" className="-mb-32 relative z-10" />

      {/* ─── 5. PARTICLE + MASCOT ─── */}
      <section className="relative isolate z-20 h-[65vh] md:h-[75vh] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-auto z-10">
          <MorphingParticleBlobs />
        </div>

        {mascotData && (
          <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] md:w-[260px] md:h-[260px] pointer-events-none z-30">
            <Lottie animationData={mascotData} loop autoplay className="w-full h-full drop-shadow-[0_0_40px_rgba(163,230,53,0.25)]" />
          </div>
        )}

        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center w-full max-w-2xl px-6">
          <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Every dollar has a <AuroraText>purpose</AuroraText>.
          </p>
          <p className="mt-2 text-sm md:text-base text-white/40 font-medium">
            Hover near the mascot to see your money come alive.
          </p>

          <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
            {["Smart Tracking", "AI Insights", "Zero Friction"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm"
              >
                <AnimatedShinyText className="text-xs font-semibold">
                  {label}
                </AnimatedShinyText>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. SVG MASK REVEAL ─── */}
      <section className="relative overflow-hidden">
        <MaskContainer
          revealText={
            <p className="mx-auto max-w-4xl text-center text-3xl md:text-5xl font-black tracking-tight text-white">
              The financial cockpit you never knew you needed.{" "}
              <span className="text-lime-400">Until now.</span>
            </p>
          }
          className="h-[50vh] md:h-[60vh] border-0 bg-black text-white/30"
          revealSize={500}
        >
          <span className="text-2xl md:text-4xl font-bold">
            See what&apos;s <span className="text-lime-400">hidden</span> in your finances.
            Move your cursor to <span className="text-lime-400">reveal</span> the truth.
          </span>
        </MaskContainer>
      </section>

      {/* ─── 7. GLOBE + STATS ─── */}
      <StatsGlobe />

      {/* ─── 8. CTA ─── */}
      <CTASection />

      {/* ─── 9. FOOTER ─── */}
      <AnimatedFooter />
    </div>
  )
}
