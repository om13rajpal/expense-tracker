"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { cn } from "@/lib/utils"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { Marquee } from "@/components/ui/marquee"
import {
  IconLayoutDashboard,
  IconChartPie,
  IconTargetArrow,
  IconRobot,
  IconTrendingUp,
  IconTrophy,
} from "@tabler/icons-react"

gsap.registerPlugin(ScrollTrigger)

// Fake file cards for the Marquee background (adapted from user's example)
const financeFiles = [
  { name: "portfolio.csv", body: "Track your investment allocation across stocks, bonds, and crypto with real-time pricing." },
  { name: "budget.xlsx", body: "Monthly budget template with automated categorization and spending limits per category." },
  { name: "goals.json", body: "Your financial goals structured with milestones, timelines, and progress tracking." },
  { name: "taxes.pdf", body: "Tax optimization report with deductions, credits, and estimated savings for the year." },
  { name: "savings.txt", body: "Emergency fund tracker with automated transfers and interest calculations." },
]

// Notification items for animated list background
const notifications = [
  { title: "Budget Alert", desc: "You're 80% through your dining budget" },
  { title: "Goal Reached!", desc: "Emergency fund hit $5,000 target" },
  { title: "Bill Due", desc: "Netflix subscription due in 3 days" },
  { title: "Investment", desc: "Portfolio up 2.4% this week" },
  { title: "Savings", desc: "Auto-saved $200 to vacation fund" },
  { title: "Cashback", desc: "Earned $12.50 cashback this month" },
]

function NotificationList({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 p-4", className)}>
      {notifications.map((n, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-black/40 p-3 backdrop-blur-sm"
        >
          <div className="mt-0.5 h-2 w-2 rounded-full bg-lime-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white/80">{n.title}</p>
            <p className="text-[11px] text-white/40">{n.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

const features = [
  {
    name: "Dashboard",
    description: "Your complete financial overview at a glance.",
    Icon: IconLayoutDashboard,
    href: "#",
    cta: "View Dashboard",
    className: "col-span-3 lg:col-span-1",
    background: (
      <Marquee
        pauseOnHover
        className="absolute top-10 [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] [--duration:20s]"
      >
        {financeFiles.map((f, idx) => (
          <figure
            key={idx}
            className={cn(
              "relative w-36 cursor-pointer overflow-hidden rounded-xl border p-4",
              "border-white/[0.04] bg-black/30 hover:bg-black/50",
              "transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none"
            )}
          >
            <div className="flex flex-col">
              <figcaption className="text-sm font-medium text-white">{f.name}</figcaption>
            </div>
            <blockquote className="mt-2 text-xs text-white/50">{f.body}</blockquote>
          </figure>
        ))}
      </Marquee>
    ),
  },
  {
    name: "AI Insights",
    description: "Get personalized financial advice powered by AI.",
    Icon: IconRobot,
    href: "#",
    cta: "Try AI",
    className: "col-span-3 lg:col-span-2",
    background: (
      <NotificationList className="absolute right-2 top-4 h-[300px] w-full scale-[0.85] origin-top-right border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90" />
    ),
  },
  {
    name: "Investments",
    description: "Track your portfolio performance in real time.",
    Icon: IconTrendingUp,
    href: "#",
    cta: "View Investments",
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="absolute inset-0 [mask-image:linear-gradient(to_top,transparent_20%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-105">
        <img
          src="/review-investments.png"
          alt=""
          className="h-full w-full object-cover object-top opacity-40 transition-opacity duration-300 group-hover:opacity-60"
        />
      </div>
    ),
  },
  {
    name: "Goals",
    description: "Visualize and track every financial goal.",
    Icon: IconTargetArrow,
    href: "#",
    cta: "View Goals",
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="absolute inset-0 [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-95">
        <img
          src="/review-goals.png"
          alt=""
          className="h-full w-full object-cover object-top opacity-30 transition-opacity duration-300 group-hover:opacity-50"
        />
      </div>
    ),
  },
  {
    name: "Budget",
    description: "Smart budget tracking with AI-powered dial.",
    Icon: IconChartPie,
    href: "#",
    cta: "View Budget",
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="absolute inset-0 [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-95">
        <img
          src="/review-budget.png"
          alt=""
          className="h-full w-full object-cover object-top opacity-30 transition-opacity duration-300 group-hover:opacity-50"
        />
      </div>
    ),
  },
  {
    name: "Gamification",
    description: "Earn rewards for building good financial habits.",
    Icon: IconTrophy,
    href: "#",
    cta: "View Rewards",
    className: "col-span-3 lg:col-span-2",
    background: (
      <Marquee
        reverse
        pauseOnHover
        className="absolute top-10 [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] [--duration:25s]"
      >
        {[
          { emoji: "🔥", label: "7-day streak" },
          { emoji: "🏆", label: "Budget master" },
          { emoji: "💎", label: "Diamond saver" },
          { emoji: "🎯", label: "Goal crusher" },
          { emoji: "⚡", label: "Speed payer" },
          { emoji: "🌟", label: "Top investor" },
        ].map((badge, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-black/40 px-4 py-3 backdrop-blur-sm"
          >
            <span className="text-lg">{badge.emoji}</span>
            <span className="text-xs font-semibold text-white/60">{badge.label}</span>
          </div>
        ))}
      </Marquee>
    ),
  },
]

export function AppShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".showcase-header",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
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
    <section ref={sectionRef} className="relative pt-20 pb-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="showcase-header text-center mb-20">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-400/60 mb-4">
            The Platform
          </p>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
            See it in <span className="text-lime-400">action</span>
          </h2>
          <p className="mt-5 text-lg text-white/40 max-w-lg mx-auto leading-relaxed">
            Every screen designed to make finance feel effortless.
          </p>
        </div>

        {/* Bento Grid — matching the example pattern */}
        <BentoGrid>
          {features.map((feature, idx) => (
            <BentoCard key={idx} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  )
}
