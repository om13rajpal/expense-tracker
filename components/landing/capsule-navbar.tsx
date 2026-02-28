"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { gsap } from "gsap"
import { useAuth } from "@/hooks/use-auth"

export function CapsuleNavbar() {
  const { isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const collapsedRef = useRef(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !headerRef.current) return

    const el = headerRef.current

    // Define the two states
    const expandedState = {
      maxWidth: "100%",
      borderRadius: "0px",
      paddingTop: "16px",
      paddingBottom: "16px",
      paddingLeft: "24px",
      paddingRight: "24px",
      top: "0px",
      backgroundColor: "rgba(0,0,0,0)",
      backdropFilter: "blur(0px)",
      borderColor: "rgba(255,255,255,0)",
      boxShadow: "0 0 0 0 rgba(0,0,0,0)",
    }

    const collapsedState = {
      maxWidth: "680px",
      borderRadius: "9999px",
      paddingTop: "10px",
      paddingBottom: "10px",
      paddingLeft: "20px",
      paddingRight: "20px",
      top: "12px",
      backgroundColor: "rgba(13,13,13,0.35)",
      backdropFilter: "blur(20px)",
      borderColor: "rgba(255,255,255,0.08)",
      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
    }

    // Set initial state based on scroll position
    const isScrolled = window.scrollY > 50
    collapsedRef.current = isScrolled
    gsap.set(el, isScrolled ? collapsedState : expandedState)

    const onScroll = () => {
      const shouldCollapse = window.scrollY > 50

      if (shouldCollapse === collapsedRef.current) return
      collapsedRef.current = shouldCollapse

      gsap.to(el, {
        ...(shouldCollapse ? collapsedState : expandedState),
        duration: 0.6,
        ease: "power3.inOut",
        overwrite: true,
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [mounted])

  const navbar = (
    <header
      ref={headerRef}
      className="fixed left-0 right-0 z-[9999] mx-auto flex items-center justify-between border border-transparent"
      style={{
        maxWidth: "100%",
        borderRadius: "0px",
        padding: "16px 24px",
        top: "0px",
        backgroundColor: "rgba(0,0,0,0)",
        willChange: "max-width, border-radius, padding, top, background-color, backdrop-filter",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-lime-400" />
        <span className="text-xl font-bold tracking-tight text-white">Finova</span>
      </div>
      <nav className="flex items-center gap-4">
        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="group relative text-sm font-medium px-4 py-2 rounded-full border border-lime-500/50 hover:bg-lime-500/10 transition-colors text-white"
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold px-5 py-2 rounded-full border border-lime-400/50 bg-white/5 text-white hover:bg-lime-500/20 transition-colors backdrop-blur-md"
            >
              Get Started
            </Link>
          </>
        )}
      </nav>
    </header>
  )

  if (!mounted) return null
  return createPortal(navbar, document.body)
}
