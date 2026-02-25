/**
 * @module app/login/page
 * @description Authentication page for Finova. Renders a centered login form
 * with decorative gradient blurs in the background and an animated fire mascot.
 * The actual authentication logic (credential validation, session management)
 * is handled by the `LoginForm` component.
 */
"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import Lottie from "lottie-react"
import { LoginForm } from "@/components/login-form"

/**
 * Login page component that displays the Finova branding with an animated
 * fire mascot, and a secure sign-in form. Uses a minimal layout with
 * background gradient effects and the shared `LoginForm` component for
 * credential entry.
 * @returns The login page JSX with mascot animation, branding header, and login form.
 */
export default function LoginPage() {
  const [mascotData, setMascotData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch("/animations/fire-mascot.json")
      .then((r) => r.json())
      .then((data) => setMascotData(data))
      .catch(() => {})
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          {mascotData && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="mx-auto mb-4 h-[200px] w-[200px]"
            >
              <Lottie animationData={mascotData} loop autoplay className="h-full w-full" />
            </motion.div>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Finova</p>
          <h1 className="mt-3 text-3xl font-semibold">Secure access to your dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to view balance snapshots, trends, and budget controls.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
